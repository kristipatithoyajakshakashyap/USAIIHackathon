"""Per-track motion features: speed, acceleration, direction change.

We keep a short ring of recent centers per track id and derive kinematics in
*normalised* units (fraction of frame diagonal per second) so thresholds are
resolution-independent. This is the "Movement Analysis — custom Python features"
box in the spec.
"""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque, Dict, List

import numpy as np

from .tracker import FrameResult, TrackedPerson


@dataclass
class MotionState:
    """Smoothed kinematics for one track at the current frame."""

    track_id: int
    speed: float            # normalised units / second
    acceleration: float     # normalised units / second^2
    direction_change: float # radians of heading change since previous step


class MotionTracker:
    """Maintains per-track history and computes motion features each frame."""

    def __init__(self, frame_diag: float, history_frames: int, fps: float):
        self.frame_diag = max(frame_diag, 1.0)
        self.fps = max(fps, 1.0)
        # store (timestamp, center) tuples
        self._hist: Dict[int, Deque] = defaultdict(lambda: deque(maxlen=history_frames))
        self._last_speed: Dict[int, float] = {}

    def update(self, frame: FrameResult) -> Dict[int, MotionState]:
        states: Dict[int, MotionState] = {}
        for p in frame.persons:
            states[p.track_id] = self._update_one(p, frame.timestamp)
        self._evict(frame.persons)
        return states

    def _update_one(self, p: TrackedPerson, ts: float) -> MotionState:
        hist = self._hist[p.track_id]
        hist.append((ts, p.center))

        if len(hist) < 2:
            self._last_speed[p.track_id] = 0.0
            return MotionState(p.track_id, 0.0, 0.0, 0.0)

        (t_prev, c_prev) = hist[-2]
        (t_now, c_now) = hist[-1]
        dt = max(t_now - t_prev, 1e-3)

        disp = (c_now - c_prev) / self.frame_diag
        speed = float(np.linalg.norm(disp) / dt)

        prev_speed = self._last_speed.get(p.track_id, speed)
        accel = float((speed - prev_speed) / dt)
        self._last_speed[p.track_id] = speed

        direction_change = self._heading_change(hist)
        return MotionState(p.track_id, speed, accel, direction_change)

    @staticmethod
    def _heading_change(hist: Deque) -> float:
        if len(hist) < 3:
            return 0.0
        (_, a), (_, b), (_, c) = hist[-3], hist[-2], hist[-1]
        v1, v2 = b - a, c - b
        n1, n2 = np.linalg.norm(v1), np.linalg.norm(v2)
        if n1 < 1e-6 or n2 < 1e-6:
            return 0.0
        cosang = float(np.clip(np.dot(v1, v2) / (n1 * n2), -1.0, 1.0))
        return float(np.arccos(cosang))

    def _evict(self, persons: List[TrackedPerson]) -> None:
        live = {p.track_id for p in persons}
        stale = [tid for tid in self._hist if tid not in live]
        # Keep histories briefly so re-id flicker doesn't reset motion; here we
        # drop immediately for simplicity — ByteTrack ids are fairly stable.
        for tid in stale:
            self._hist.pop(tid, None)
            self._last_speed.pop(tid, None)
