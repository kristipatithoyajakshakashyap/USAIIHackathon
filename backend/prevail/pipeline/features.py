"""Feature engineering: turn extractor outputs into the structured vector.

This is the contract between perception and the risk head. ``FEATURE_NAMES``
is the canonical, ordered schema — the heuristic model, the trainable MLP, and
SHAP all index into it, so keep order stable. All features are pre-normalised
to roughly 0..1.
"""

from __future__ import annotations

from typing import Dict, List

import numpy as np

from .crowd import CrowdState
from .motion import MotionState
from .pose_features import PoseState, aggregate_pose

# Canonical feature order (spec: "Suggested Input Features for the Risk Model").
FEATURE_NAMES: List[str] = [
    "person_count",          # crowd
    "crowd_density",
    "proximity",             # 1 - min_pair_distance (closeness)
    "convergence",
    "avg_speed",             # motion
    "max_acceleration",
    "max_direction_change",
    "pose_raised_arms",      # pose
    "pose_forward_lean",
    "pose_limb_motion",
    "audio_anger",           # audio (0 when disabled)
    "audio_fear",
    "audio_intensity",
    "scene_sensitivity",     # scene (0 when disabled)
    "risk_trend",            # temporal: slope of recent risk
]

N_FEATURES = len(FEATURE_NAMES)


def build_feature_dict(
    crowd: CrowdState,
    motion: Dict[int, MotionState],
    pose: Dict[int, PoseState],
    audio: Dict[str, float],
    scene_sensitivity: float,
    risk_trend: float,
) -> Dict[str, float]:
    """Assemble the named feature dict for one analysed frame."""
    speeds = [m.speed for m in motion.values()] or [0.0]
    accels = [abs(m.acceleration) for m in motion.values()] or [0.0]
    dchg = [m.direction_change for m in motion.values()] or [0.0]
    pose_agg = aggregate_pose(pose)

    feats = {
        "person_count": _norm_count(crowd.person_count),
        "crowd_density": float(crowd.density),
        "proximity": float(np.clip(1.0 - crowd.min_pair_distance, 0.0, 1.0)),
        "convergence": float(crowd.convergence),
        "avg_speed": float(np.clip(np.mean(speeds) / 0.5, 0.0, 1.0)),
        "max_acceleration": float(np.clip(np.max(accels) / 1.0, 0.0, 1.0)),
        "max_direction_change": float(np.clip(np.max(dchg) / np.pi, 0.0, 1.0)),
        "pose_raised_arms": pose_agg["pose_raised_arms"],
        "pose_forward_lean": pose_agg["pose_forward_lean"],
        "pose_limb_motion": pose_agg["pose_limb_motion"],
        "audio_anger": float(audio.get("anger", 0.0)),
        "audio_fear": float(audio.get("fear", 0.0)),
        "audio_intensity": float(audio.get("intensity", 0.0)),
        "scene_sensitivity": float(scene_sensitivity),
        "risk_trend": float(np.clip(risk_trend, 0.0, 1.0)),
    }
    return feats


def to_vector(feats: Dict[str, float]) -> np.ndarray:
    """Ordered numpy vector matching FEATURE_NAMES."""
    return np.array([feats[name] for name in FEATURE_NAMES], dtype=np.float32)


def _norm_count(n: int) -> float:
    # Saturating count: 0 people -> 0, ~10+ -> 1.
    return float(np.clip(n / 10.0, 0.0, 1.0))
