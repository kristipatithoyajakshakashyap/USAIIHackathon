"""Scene understanding via CLIP (optional, --scene).

We embed the frame with CLIP and score it against a small set of
"sensitive context" text prompts using zero-shot similarity. This yields a
0..1 ``scene_sensitivity`` feature without any training, matching the spec's
"SigLIP/CLIP scene embeddings" stage. Swap the model id for SigLIP if desired.

Runs every Nth analysed frame (settings.scene_every_n) to stay within budget;
the last value is cached between runs.
"""

from __future__ import annotations

from typing import List, Optional

import numpy as np

from ..config import Settings

# Prompts whose similarity we treat as "risk-relevant context".
_SENSITIVE_PROMPTS = [
    "a fight breaking out", "people arguing aggressively", "a violent confrontation",
    "a crowd pushing and shoving", "a person threatening another person",
]
_NEUTRAL_PROMPTS = [
    "people walking calmly", "an empty street", "people standing peacefully",
    "normal everyday activity", "people talking quietly",
]


class SceneAnalyzer:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._device = "cpu"
        self._last_score = 0.0
        self._counter = 0
        self._model = None
        self._processor = None
        self._text_feats = None

    def _lazy_init(self):
        if self._model is not None:
            return
        import torch
        from transformers import CLIPModel, CLIPProcessor

        self._device = "cuda" if (self.settings.device != "cpu" and torch.cuda.is_available()) else "cpu"
        self._model = CLIPModel.from_pretrained(self.settings.scene_model).to(self._device).eval()
        self._processor = CLIPProcessor.from_pretrained(self.settings.scene_model)

        prompts = _SENSITIVE_PROMPTS + _NEUTRAL_PROMPTS
        with torch.no_grad():
            inputs = self._processor(text=prompts, return_tensors="pt", padding=True).to(self._device)
            feats = self._model.get_text_features(**inputs)
            feats = feats / feats.norm(dim=-1, keepdim=True)
        self._text_feats = feats

    def update(self, frame_bgr: np.ndarray) -> float:
        """Return scene sensitivity 0..1; only recomputes every Nth call."""
        self._counter += 1
        if (self._counter % max(self.settings.scene_every_n, 1)) != 1 and self._model is not None:
            return self._last_score
        try:
            self._lazy_init()
            self._last_score = self._score(frame_bgr)
        except Exception:
            # Scene is optional; never let it break the live loop.
            self._last_score = self._last_score
        return self._last_score

    def _score(self, frame_bgr: np.ndarray) -> float:
        import torch
        from PIL import Image

        rgb = frame_bgr[:, :, ::-1]
        img = Image.fromarray(rgb)
        with torch.no_grad():
            inputs = self._processor(images=img, return_tensors="pt").to(self._device)
            feat = self._model.get_image_features(**inputs)
            feat = feat / feat.norm(dim=-1, keepdim=True)
            sims = (feat @ self._text_feats.T).squeeze(0)  # (10,)
            probs = torch.softmax(sims * 100.0, dim=-1)     # CLIP logit scale
        sensitive = float(probs[: len(_SENSITIVE_PROMPTS)].sum().item())
        return sensitive
