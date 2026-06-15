"""PrevailEngine — orchestrates the full pipeline over a video source.

Usage:
    engine = PrevailEngine(settings)
    for out in engine.run("clip.mp4"):
        # out.frame is the annotated-ready BGR frame
        # out.risk, out.reasons, out.features, out.persons available

The engine is a generator so the CLI (live window) and the API (WebSocket
stream) can both consume it without buffering the whole video.
"""

from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, field
from typing import Dict, Iterator, List, Optional

import numpy as np

from ..config import Settings
from .crowd import CrowdAnalyzer, CrowdState
from .features import build_feature_dict, FEATURE_NAMES
from .motion import MotionState, MotionTracker
from .pose_features import PoseAnalyzer, PoseState
from .risk import RiskResult, build_risk_model
from .explain import top_reasons
from .tracker import FrameResult, PersonTracker, TrackedPerson


@dataclass
class EngineOutput:
    frame_index: int
    timestamp: float
    frame: np.ndarray
    persons: List[TrackedPerson]
    features: Dict[str, float]
    risk: RiskResult
    reasons: List[tuple]            # [(label, points), ...]
    proc_fps: float
    device: str
    model_name: str


class PrevailEngine:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.tracker = PersonTracker(settings)
        self.risk_model = build_risk_model(settings)
        self._scene = None
        self._audio = None
        self._risk_hist: deque = deque(maxlen=settings.history_frames())
        self._risk_ema: Optional[float] = None

    # --- public API ---
    def run(self, video_path: str) -> Iterator[EngineOutput]:
        import cv2

        # Reset per-clip state so one engine instance can process many clips
        # back-to-back (used by extract_features.py) without leakage.
        self.tracker.reset()
        self._risk_hist.clear()
        self._risk_ema = None

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise FileNotFoundError(f"Cannot open video: {video_path}")

        src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        self.settings.source_fps = src_fps
        stride = max(1, int(round(src_fps / self.settings.target_fps)))

        w = cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1280
        h = cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 720
        frame_diag = float(np.hypot(w, h))

        motion = MotionTracker(frame_diag, self.settings.history_frames(), self.settings.target_fps)
        crowd = CrowdAnalyzer(frame_diag, self.settings.near_distance_frac)
        pose = PoseAnalyzer()
        self._init_optional(video_path)

        raw_idx, ana_idx = 0, 0
        try:
            while True:
                ok, frame = cap.read()
                if not ok:
                    break
                if raw_idx % stride != 0:
                    raw_idx += 1
                    continue

                t0 = time.time()
                ts = raw_idx / src_fps
                out = self._process_frame(frame, ana_idx, ts, motion, crowd, pose)
                out.proc_fps = 1.0 / max(time.time() - t0, 1e-3)
                yield out

                raw_idx += 1
                ana_idx += 1
        finally:
            cap.release()

    # --- internals ---
    def _init_optional(self, video_path: str) -> None:
        if self.settings.use_scene:
            from .scene import SceneAnalyzer
            self._scene = SceneAnalyzer(self.settings)
        if self.settings.use_audio:
            from .audio_emotion import AudioEmotionTrack
            print("[audio] extracting + classifying audio track ...")
            self._audio = AudioEmotionTrack(self.settings).build(video_path)
            print(f"[audio] {len(self._audio.windows)} windows ready")

    def _process_frame(self, frame, idx, ts, motion, crowd, pose) -> EngineOutput:
        fr: FrameResult = self.tracker.process(frame, idx, ts)
        motion_states: Dict[int, MotionState] = motion.update(fr)
        crowd_state: CrowdState = crowd.update(fr, motion_states)
        pose_states: Dict[int, PoseState] = pose.update(fr)

        scene_sens = 0.0
        if self._scene is not None:
            scene_sens = self._scene.update(frame)

        audio_feats = {"anger": 0.0, "fear": 0.0, "intensity": 0.0}
        if self._audio is not None:
            win = self._audio.at(ts)
            if win is not None:
                audio_feats = {"anger": win.anger, "fear": win.fear, "intensity": win.intensity}

        risk_trend = self._risk_trend()
        feats = build_feature_dict(
            crowd_state, motion_states, pose_states, audio_feats, scene_sens, risk_trend
        )
        risk = self.risk_model.predict(feats)

        smoothed = self._smooth(risk.score)
        risk.score = smoothed
        from ..config import risk_band
        risk.band = risk_band(smoothed)
        self._risk_hist.append(smoothed)

        reasons = top_reasons(risk.contributions, k=4)
        return EngineOutput(
            frame_index=idx, timestamp=ts, frame=frame, persons=fr.persons,
            features=feats, risk=risk, reasons=reasons, proc_fps=0.0,
            device=self.tracker.device, model_name=self.risk_model.name,
        )

    def _smooth(self, score: float) -> float:
        a = self.settings.risk_ema_alpha
        if self._risk_ema is None:
            self._risk_ema = score
        else:
            self._risk_ema = a * score + (1 - a) * self._risk_ema
        return float(self._risk_ema)

    def _risk_trend(self) -> float:
        """Normalised positive slope of recent risk (0..1)."""
        if len(self._risk_hist) < 4:
            return 0.0
        y = np.array(self._risk_hist, dtype=np.float32)
        x = np.arange(len(y), dtype=np.float32)
        slope = float(np.polyfit(x, y, 1)[0])   # points per frame
        # ~1 risk-point per frame upward => strong trend.
        return float(np.clip(slope, 0.0, 1.0))
