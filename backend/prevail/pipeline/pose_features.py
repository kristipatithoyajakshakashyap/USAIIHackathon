"""Pose-derived aggression indicators from COCO-17 keypoints.

Cheap, explainable geometric heuristics (spec: "Pose — raised arms, forward
lean, sudden limb movement"). Each returns 0..1 so they slot straight into the
feature vector and the heuristic risk model.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import numpy as np

from .tracker import KP, FrameResult, TrackedPerson

_MIN_KP_CONF = 0.3


@dataclass
class PoseState:
    track_id: int
    raised_arms: float       # 0..1, wrists at/above shoulder line
    forward_lean: float      # 0..1, torso tilted from vertical
    limb_motion: float       # 0..1, wrist velocity vs body scale


class PoseAnalyzer:
    """Computes per-person pose indicators with light temporal memory."""

    def __init__(self):
        self._prev_wrists: Dict[int, np.ndarray] = {}

    def update(self, frame: FrameResult) -> Dict[int, PoseState]:
        states: Dict[int, PoseState] = {}
        live = set()
        for p in frame.persons:
            states[p.track_id] = self._one(p)
            live.add(p.track_id)
        for tid in list(self._prev_wrists):
            if tid not in live:
                self._prev_wrists.pop(tid, None)
        return states

    def _one(self, p: TrackedPerson) -> PoseState:
        kp, kc = p.keypoints, p.kp_conf
        scale = max(p.height, 1.0)

        raised = self._raised_arms(kp, kc, scale)
        lean = self._forward_lean(kp, kc)
        motion = self._limb_motion(p, kp, kc, scale)
        return PoseState(p.track_id, raised, lean, motion)

    def _ok(self, kc, *idx) -> bool:
        return all(kc[i] >= _MIN_KP_CONF for i in idx)

    def _raised_arms(self, kp, kc, scale) -> float:
        score = 0.0
        for wrist, shoulder in (
            (KP["left_wrist"], KP["left_shoulder"]),
            (KP["right_wrist"], KP["right_shoulder"]),
        ):
            if not self._ok(kc, wrist, shoulder):
                continue
            # In image coords y grows downward, so wrist above shoulder => smaller y.
            lift = (kp[shoulder][1] - kp[wrist][1]) / scale
            score = max(score, float(np.clip(lift / 0.5, 0.0, 1.0)))
        return score

    def _forward_lean(self, kp, kc) -> float:
        if not self._ok(kc, KP["left_shoulder"], KP["right_shoulder"],
                        KP["left_hip"], KP["right_hip"]):
            return 0.0
        shoulder = (kp[KP["left_shoulder"]] + kp[KP["right_shoulder"]]) / 2.0
        hip = (kp[KP["left_hip"]] + kp[KP["right_hip"]]) / 2.0
        torso = shoulder - hip
        vlen = np.linalg.norm(torso)
        if vlen < 1e-6:
            return 0.0
        # Angle of torso from vertical axis (0,-1).
        cos_v = float(np.clip(np.dot(torso / vlen, np.array([0.0, -1.0])), -1.0, 1.0))
        angle = np.arccos(cos_v)  # 0 = upright
        return float(np.clip(angle / (np.pi / 4), 0.0, 1.0))  # 45deg => 1.0

    def _limb_motion(self, p, kp, kc, scale) -> float:
        wrists = []
        for w in (KP["left_wrist"], KP["right_wrist"]):
            if kc[w] >= _MIN_KP_CONF:
                wrists.append(kp[w])
        if not wrists:
            self._prev_wrists.pop(p.track_id, None)
            return 0.0
        cur = np.mean(wrists, axis=0)
        prev = self._prev_wrists.get(p.track_id)
        self._prev_wrists[p.track_id] = cur
        if prev is None:
            return 0.0
        disp = float(np.linalg.norm(cur - prev)) / scale
        return float(np.clip(disp / 0.6, 0.0, 1.0))


def aggregate_pose(states: Dict[int, PoseState]) -> Dict[str, float]:
    """Reduce per-person pose states to frame-level maxima for the risk model."""
    if not states:
        return {"pose_raised_arms": 0.0, "pose_forward_lean": 0.0, "pose_limb_motion": 0.0}
    return {
        "pose_raised_arms": max(s.raised_arms for s in states.values()),
        "pose_forward_lean": max(s.forward_lean for s in states.values()),
        "pose_limb_motion": max(s.limb_motion for s in states.values()),
    }
