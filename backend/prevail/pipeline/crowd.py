"""Crowd-level features: density, proximity, convergence.

Distance/motion rules per the spec ("Crowd Interaction — distance-based and
motion-based rules"). Convergence measures whether close pairs are approaching
each other, which is a strong pre-confrontation signal.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

import numpy as np

from .motion import MotionState
from .tracker import FrameResult


@dataclass
class CrowdState:
    person_count: int
    density: float            # persons per (frame-diagonal^2) proxy, 0..1-ish
    min_pair_distance: float  # closest pair, normalised by frame diagonal
    mean_pair_distance: float
    convergence: float        # 0..1: fraction-weighted approach among near pairs


class CrowdAnalyzer:
    def __init__(self, frame_diag: float, near_frac: float):
        self.frame_diag = max(frame_diag, 1.0)
        self.near_frac = near_frac
        self._prev_centers: Dict[int, np.ndarray] = {}

    def update(self, frame: FrameResult, motion: Dict[int, MotionState]) -> CrowdState:
        persons = frame.persons
        n = len(persons)
        if n == 0:
            self._prev_centers = {}
            return CrowdState(0, 0.0, 1.0, 1.0, 0.0)

        centers = {p.track_id: p.center for p in persons}
        ids = list(centers.keys())

        if n == 1:
            self._prev_centers = centers
            return CrowdState(1, self._density(persons), 1.0, 1.0, 0.0)

        dists, pairs = [], []
        for i in range(n):
            for j in range(i + 1, n):
                a, b = ids[i], ids[j]
                d = float(np.linalg.norm(centers[a] - centers[b])) / self.frame_diag
                dists.append(d)
                pairs.append((a, b, d))

        dists_arr = np.array(dists)
        convergence = self._convergence(pairs, centers)
        self._prev_centers = centers

        return CrowdState(
            person_count=n,
            density=self._density(persons),
            min_pair_distance=float(dists_arr.min()),
            mean_pair_distance=float(dists_arr.mean()),
            convergence=convergence,
        )

    def _density(self, persons) -> float:
        # Convex-hull-free proxy: people per area of their bounding spread.
        cs = np.array([p.center for p in persons]) / self.frame_diag
        spread = (cs.max(axis=0) - cs.min(axis=0))
        area = max(float(spread[0] * spread[1]), 1e-3)
        return float(min(len(persons) / (area * 50.0), 1.0))

    def _convergence(self, pairs, centers) -> float:
        """Mean approach rate among *near* pairs, normalised to ~0..1."""
        approaches = []
        for a, b, d in pairs:
            if d > self.near_frac * 2.5:
                continue  # only consider reasonably close pairs
            if a not in self._prev_centers or b not in self._prev_centers:
                continue
            prev_d = float(np.linalg.norm(
                self._prev_centers[a] - self._prev_centers[b])) / self.frame_diag
            closing = prev_d - d  # positive when getting closer
            approaches.append(max(closing, 0.0))
        if not approaches:
            return 0.0
        # Scale: a closing rate of ~3% of the frame per frame is "strong".
        return float(min(np.mean(approaches) / 0.03, 1.0))
