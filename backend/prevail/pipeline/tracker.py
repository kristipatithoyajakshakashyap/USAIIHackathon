"""Person detection + tracking + pose in a single YOLO11-pose pass.

Running one pose model with Ultralytics' built-in ByteTrack gives us, per frame
and per person: a bounding box, a stable track id, and 17 COCO keypoints — which
covers three spec pipeline stages (detection, tracking, pose) on one GPU model.
This is the most VRAM-frugal option for a 16 GB card.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

import numpy as np

import os

from ..config import MODELS_DIR, Settings

# COCO-17 keypoint index map (Ultralytics pose order).
KP = {
    "nose": 0, "left_eye": 1, "right_eye": 2, "left_ear": 3, "right_ear": 4,
    "left_shoulder": 5, "right_shoulder": 6, "left_elbow": 7, "right_elbow": 8,
    "left_wrist": 9, "right_wrist": 10, "left_hip": 11, "right_hip": 12,
    "left_knee": 13, "right_knee": 14, "left_ankle": 15, "right_ankle": 16,
}


@dataclass
class TrackedPerson:
    """One person in one frame."""

    track_id: int
    bbox: np.ndarray          # [x1, y1, x2, y2] in pixels
    conf: float
    keypoints: np.ndarray     # (17, 2) pixel coords; (0,0) where missing
    kp_conf: np.ndarray       # (17,) per-keypoint confidence

    @property
    def center(self) -> np.ndarray:
        x1, y1, x2, y2 = self.bbox
        return np.array([(x1 + x2) / 2.0, (y1 + y2) / 2.0])

    @property
    def height(self) -> float:
        return float(self.bbox[3] - self.bbox[1])


@dataclass
class FrameResult:
    """Everything the extractors produced for a single analysed frame."""

    frame_index: int
    timestamp: float
    persons: List[TrackedPerson] = field(default_factory=list)


class PersonTracker:
    """Thin wrapper over an Ultralytics YOLO11-pose model in tracking mode."""

    def __init__(self, settings: Settings):
        self.settings = settings
        # Imported lazily so `--help` and unit imports don't require torch/CUDA.
        from ultralytics import YOLO

        self.model = YOLO(self._resolve_weights(settings.pose_weights))
        self._device = self._resolve_device(settings.device)

    @staticmethod
    def _resolve_weights(weights: str) -> str:
        """Prefer a local copy under models/ before letting Ultralytics download."""
        if os.path.isfile(weights):
            return weights
        candidate = MODELS_DIR / os.path.basename(weights)
        if candidate.is_file():
            return str(candidate)
        return weights  # bare name -> Ultralytics auto-downloads

    @staticmethod
    def _resolve_device(requested: str) -> str:
        if requested == "cpu":
            return "cpu"
        try:
            import torch

            if torch.cuda.is_available():
                return "cuda"
        except Exception:
            pass
        return "cpu"

    @property
    def device(self) -> str:
        return self._device

    def reset(self) -> None:
        """Clear ByteTrack state so track ids restart for a new clip."""
        try:
            for tr in self.model.predictor.trackers:
                tr.reset()
        except Exception:
            # No predictor yet (model never run) or API change — safe to ignore.
            pass

    def process(self, frame: np.ndarray, frame_index: int, timestamp: float) -> FrameResult:
        """Run tracking on a single BGR frame and return structured persons."""
        s = self.settings
        results = self.model.track(
            frame,
            persist=True,
            tracker=s.tracker_cfg,
            imgsz=s.imgsz,
            conf=s.conf,
            iou=s.iou,
            classes=[0],                 # person only
            half=s.half and self._device == "cuda",
            device=self._device,
            verbose=False,
        )

        persons: List[TrackedPerson] = []
        if results:
            persons = self._parse(results[0])
        return FrameResult(frame_index=frame_index, timestamp=timestamp, persons=persons)

    @staticmethod
    def _parse(result) -> List[TrackedPerson]:
        boxes = result.boxes
        if boxes is None or boxes.id is None:
            return []

        xyxy = boxes.xyxy.cpu().numpy()
        confs = boxes.conf.cpu().numpy()
        ids = boxes.id.int().cpu().numpy()

        kpts_xy = None
        kpts_conf = None
        if result.keypoints is not None and result.keypoints.xy is not None:
            kpts_xy = result.keypoints.xy.cpu().numpy()          # (N, 17, 2)
            if result.keypoints.conf is not None:
                kpts_conf = result.keypoints.conf.cpu().numpy()  # (N, 17)

        persons: List[TrackedPerson] = []
        for i in range(len(xyxy)):
            kp = kpts_xy[i] if kpts_xy is not None else np.zeros((17, 2))
            kc = kpts_conf[i] if kpts_conf is not None else np.zeros(17)
            persons.append(
                TrackedPerson(
                    track_id=int(ids[i]),
                    bbox=xyxy[i].astype(float),
                    conf=float(confs[i]),
                    keypoints=kp.astype(float),
                    kp_conf=kc.astype(float),
                )
            )
        return persons
