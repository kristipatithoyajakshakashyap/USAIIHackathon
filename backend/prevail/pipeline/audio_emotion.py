"""Audio emotion features via wav2vec2 (optional, --audio).

For a *file-based* demo, real-time audio threading is unnecessary complexity.
Instead we extract the whole audio track up front, slice it into windows, and
classify each window once. At runtime the engine looks up the window covering
the current video timestamp. This keeps the live loop GPU-light and perfectly
in sync with the video.

Outputs per window:  anger 0..1, fear 0..1, intensity 0..1 (RMS loudness).

NOTE on the model: any wav2vec2 speech-emotion checkpoint works; set
``settings.audio_model``. If loading the classifier fails (or no speech model is
available offline), we degrade gracefully to *intensity only* from raw loudness,
so the demo still shows an audio signal.
"""

from __future__ import annotations

import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

import numpy as np

from ..config import Settings

_SR = 16000


@dataclass
class AudioWindow:
    start: float
    end: float
    anger: float
    fear: float
    intensity: float
    label: str = "n/a"          # top predicted emotion (e.g. "angry", "calm")
    scores: dict = field(default_factory=dict)   # full emotion -> probability


class AudioEmotionTrack:
    """Pre-computed per-window emotion for one media file."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.windows: List[AudioWindow] = []
        self._has_classifier = False

    def build(self, video_path: str) -> "AudioEmotionTrack":
        wav = self._extract_audio(video_path)
        if wav is None:
            return self
        samples, sr = wav
        self._build_windows(samples, sr)
        return self

    def build_from_wav(self, wav_path: str) -> "AudioEmotionTrack":
        """Build windows directly from an audio file (no video / ffmpeg needed)."""
        import soundfile as sf
        data, sr = sf.read(wav_path)
        if getattr(data, "ndim", 1) > 1:
            data = data.mean(axis=1)
        data = data.astype(np.float32)
        if sr != _SR:  # wav2vec2 expects 16 kHz
            import librosa
            data = librosa.resample(data, orig_sr=sr, target_sr=_SR)
            sr = _SR
        self._build_windows(data, sr)
        return self

    @staticmethod
    def _ffmpeg_exe() -> str:
        """System ffmpeg if present, else the bundled imageio-ffmpeg binary."""
        import shutil
        exe = shutil.which("ffmpeg")
        if exe:
            return exe
        try:
            import imageio_ffmpeg
            return imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            return "ffmpeg"

    def at(self, timestamp: float) -> Optional[AudioWindow]:
        for w in self.windows:
            if w.start <= timestamp < w.end:
                return w
        return self.windows[-1] if self.windows else None

    # --- internals ---
    def _extract_audio(self, video_path: str):
        try:
            import soundfile as sf
        except Exception:
            return None
        tmp = Path(tempfile.gettempdir()) / "prevail_audio.wav"
        cmd = [
            self._ffmpeg_exe(), "-y", "-i", video_path, "-ac", "1", "-ar", str(_SR),
            "-vn", str(tmp),
        ]
        try:
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            data, sr = sf.read(str(tmp))
            if data.ndim > 1:
                data = data.mean(axis=1)
            return data.astype(np.float32), sr
        except Exception:
            return None

    def _build_windows(self, samples: np.ndarray, sr: int) -> None:
        classifier = self._load_classifier()
        win = int(self.settings.audio_window_s * sr)
        if win <= 0:
            return
        peak = float(np.abs(samples).max()) or 1.0
        for start_idx in range(0, len(samples), win):
            chunk = samples[start_idx:start_idx + win]
            if len(chunk) < win // 2:
                break
            t0 = start_idx / sr
            t1 = (start_idx + len(chunk)) / sr
            rms = float(np.sqrt(np.mean(chunk ** 2)))
            intensity = float(np.clip(rms / (peak * 0.5), 0.0, 1.0))
            anger, fear, label, scores = 0.0, 0.0, "loudness-only", {}
            if classifier is not None:
                anger, fear, label, scores = self._classify(classifier, chunk, sr)
            else:
                # Loudness-only fallback: treat loud audio as elevated anger proxy.
                anger = intensity * 0.6
            self.windows.append(AudioWindow(t0, t1, anger, fear, intensity, label, scores))

    def _load_classifier(self):
        try:
            from transformers import pipeline
            clf = pipeline(
                "audio-classification",
                model=self.settings.audio_model,
                device=0 if self.settings.device != "cpu" else -1,
            )
            self._has_classifier = True
            return clf
        except Exception:
            self._has_classifier = False
            return None

    @staticmethod
    def _classify(clf, chunk: np.ndarray, sr: int):
        try:
            preds = clf({"array": chunk, "sampling_rate": sr}, top_k=None)
            scores = {p["label"].lower(): float(p["score"]) for p in preds}
            anger = max((v for k, v in scores.items() if "ang" in k), default=0.0)
            fear = max((v for k, v in scores.items() if "fear" in k), default=0.0)
            top = max(scores.items(), key=lambda kv: kv[1])[0] if scores else "n/a"
            return float(anger), float(fear), top, scores
        except Exception:
            return 0.0, 0.0, "n/a", {}
