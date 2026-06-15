"""Central configuration for the PREVAIL pipeline.

All tunables live here so the CLI, the API, and tests share one source of truth.
Values follow the spec's "Recommended Runtime Settings" (640px, 10-15 FPS,
FP16, batch 1-2) and are safe for a single 16 GB GPU.

Nothing here reads or writes data files; it only holds in-memory settings and
filesystem *paths* to model weights (auto-downloaded on first use).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

# Repo-relative locations -----------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BACKEND_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)


# Risk bucket thresholds (spec: "Risk Levels"). Upper bound is inclusive.
RISK_BANDS = (
    (25, "SAFE"),
    (50, "LOW"),
    (75, "MODERATE"),
    (90, "HIGH"),
    (100, "CRITICAL"),
)


def risk_band(score: float) -> str:
    """Map a 0-100 score to its named band."""
    for upper, label in RISK_BANDS:
        if score <= upper:
            return label
    return "CRITICAL"


@dataclass
class Settings:
    """Runtime settings for one pipeline instance.

    Construct with defaults and override via the CLI flags in ``run_live.py``.
    """

    # --- Device / precision ---
    device: str = "cuda"          # "cuda" or "cpu"; falls back to cpu if no GPU
    half: bool = True             # FP16 inference (spec default)

    # --- Detection + pose (single YOLO11-pose model does both) ---
    pose_weights: str = "yolo11s-pose.pt"   # auto-downloads to CWD/models on first run
    imgsz: int = 640
    conf: float = 0.35            # person confidence threshold
    iou: float = 0.5
    tracker_cfg: str = "bytetrack.yaml"     # Ultralytics ships this config

    # --- Frame sampling ---
    target_fps: float = 12.0      # analysis FPS; source is subsampled to this

    # --- Temporal smoothing ---
    history_seconds: float = 5.0  # window for motion + risk-trend features
    risk_ema_alpha: float = 0.4   # smoothing for the displayed risk score

    # --- Optional modalities (off by default to keep first run light) ---
    use_scene: bool = False
    scene_model: str = "openai/clip-vit-base-patch32"
    scene_every_n: int = 15       # run scene embedding every N analysed frames

    use_audio: bool = False
    audio_model: str = "Dpngtm/wav2vec2-emotion-recognition"  # RAVDESS 8-class (safetensors)
    audio_window_s: float = 3.0

    # --- Risk head ---
    risk_weights: str = ""        # path to trained MLP head; empty => heuristic
    use_heuristic_when_untrained: bool = True

    # --- Crowd geometry ---
    near_distance_frac: float = 0.12   # "people are close" if gap < frac * frame diag

    # --- Derived / mutable runtime fields ---
    source_fps: float = field(default=30.0)   # filled in from the video at open time

    def history_frames(self) -> int:
        """Number of analysed frames that fit in the history window."""
        return max(1, int(round(self.history_seconds * self.target_fps)))
