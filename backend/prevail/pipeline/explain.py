"""Explainability: turn risk contributions into human-readable reasons.

For the heuristic and the MLP we already have per-feature contributions; this
module ranks them and renders the spec's "Main Reasons" list. A true SHAP
explainer can be plugged in for the trained MLP (see train_risk_head.py), but
the contribution ranking is enough for a live, legible demo.
"""

from __future__ import annotations

from typing import Dict, List, Tuple

# Human labels for the feature keys.
_LABELS: Dict[str, str] = {
    "person_count": "Many people present",
    "crowd_density": "High crowd density",
    "proximity": "People very close together",
    "convergence": "People converging / approaching",
    "avg_speed": "Rapid movement",
    "max_acceleration": "Sudden acceleration",
    "max_direction_change": "Erratic direction changes",
    "pose_raised_arms": "Raised arms / aggressive posture",
    "pose_forward_lean": "Forward-leaning stance",
    "pose_limb_motion": "Sudden limb movement",
    "audio_anger": "Angry voice tone",
    "audio_fear": "Fearful voice tone",
    "audio_intensity": "High voice intensity",
    "scene_sensitivity": "Sensitive scene context",
    "risk_trend": "Risk rising over time",
}


def top_reasons(contributions: Dict[str, float], k: int = 4, min_points: float = 2.0
                ) -> List[Tuple[str, float]]:
    """Return up to k (label, points) pairs, highest contribution first."""
    ranked = sorted(contributions.items(), key=lambda kv: kv[1], reverse=True)
    out: List[Tuple[str, float]] = []
    for key, pts in ranked:
        if pts < min_points:
            break
        out.append((_LABELS.get(key, key), round(pts, 1)))
        if len(out) >= k:
            break
    return out


def reasons_text(contributions: Dict[str, float], k: int = 4) -> List[str]:
    return [label for label, _ in top_reasons(contributions, k)]
