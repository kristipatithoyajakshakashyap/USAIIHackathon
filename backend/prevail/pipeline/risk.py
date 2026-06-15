"""Risk prediction head.

Two implementations behind one interface:

* ``HeuristicRiskModel`` — a transparent weighted sum over the feature vector.
  This is the DEFAULT so the demo produces meaningful, debuggable risk *before*
  any training. Its weights double as ground-truth-free feature attributions.

* ``MLPRiskModel`` — the spec's 2-layer MLP head. Loads trained weights from
  ``settings.risk_weights``; this is the only component intended to be
  fine-tuned. Falls back to the heuristic if weights are missing.

Both return a 0..100 score plus a per-feature contribution dict used by the
explainability layer and the overlay.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

import numpy as np

from ..config import Settings, risk_band
from .features import FEATURE_NAMES, N_FEATURES, to_vector


@dataclass
class RiskResult:
    score: float                       # 0..100
    band: str                          # SAFE..CRITICAL
    contributions: Dict[str, float]    # feature -> points contributed (sums ~score)


# Hand-tuned weights (points out of 100 at feature value 1.0). Reflect the
# spec's "Risk Factors" emphasis: convergence, proximity, aggressive pose, and
# audio anger weigh heavily; raw person_count weighs little.
_HEURISTIC_WEIGHTS: Dict[str, float] = {
    "person_count": 3.0,
    "crowd_density": 6.0,
    "proximity": 12.0,
    "convergence": 16.0,
    "avg_speed": 8.0,
    "max_acceleration": 10.0,
    "max_direction_change": 5.0,
    "pose_raised_arms": 14.0,
    "pose_forward_lean": 8.0,
    "pose_limb_motion": 10.0,
    "audio_anger": 13.0,
    "audio_fear": 5.0,
    "audio_intensity": 6.0,
    "scene_sensitivity": 12.0,
    "risk_trend": 8.0,
}


class HeuristicRiskModel:
    """Explainable weighted-sum scorer; no training required."""

    name = "heuristic"

    def predict(self, feats: Dict[str, float]) -> RiskResult:
        contribs = {k: float(feats.get(k, 0.0) * w) for k, w in _HEURISTIC_WEIGHTS.items()}
        raw = sum(contribs.values())
        score = float(np.clip(raw, 0.0, 100.0))
        return RiskResult(score=score, band=risk_band(score), contributions=contribs)


class MLPRiskModel:
    """2-layer MLP head (spec). Loads a TorchScript or state_dict checkpoint."""

    name = "mlp"

    def __init__(self, weights_path: str, settings: Settings):
        import torch
        import torch.nn as nn

        self._torch = torch
        self.net = nn.Sequential(
            nn.Linear(N_FEATURES, 64), nn.ReLU(),
            nn.Linear(64, 1), nn.Sigmoid(),
        )
        state = torch.load(weights_path, map_location="cpu", weights_only=True)
        self.net.load_state_dict(state)
        self.net.eval()

    def predict(self, feats: Dict[str, float]) -> RiskResult:
        torch = self._torch
        vec = to_vector(feats)
        with torch.no_grad():
            x = torch.from_numpy(vec).unsqueeze(0)
            score = float(self.net(x).item() * 100.0)
        # Gradient-free contribution proxy: feature value x first-layer weight L1.
        w = self.net[0].weight.detach().abs().mean(dim=0).numpy()
        contribs = {n: float(vec[i] * w[i]) for i, n in enumerate(FEATURE_NAMES)}
        total = sum(contribs.values()) or 1.0
        contribs = {k: v / total * score for k, v in contribs.items()}
        return RiskResult(score=score, band=risk_band(score), contributions=contribs)


def build_risk_model(settings: Settings):
    """Pick MLP if trained weights exist, else the heuristic."""
    if settings.risk_weights:
        from pathlib import Path

        if Path(settings.risk_weights).is_file():
            try:
                return MLPRiskModel(settings.risk_weights, settings)
            except Exception as exc:  # noqa: BLE001
                print(f"[risk] failed to load MLP weights ({exc}); using heuristic")
    return HeuristicRiskModel()
