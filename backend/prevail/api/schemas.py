"""Pydantic response models for the PREVAIL API (consistent envelope)."""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from pydantic import BaseModel


class PersonOut(BaseModel):
    track_id: int
    bbox: List[float]
    conf: float


class RiskOut(BaseModel):
    score: float
    band: str
    reasons: List[str]
    contributions: Dict[str, float]


class FrameOut(BaseModel):
    """One analysed frame's structured result (sent over the WebSocket)."""

    frame_index: int
    timestamp: float
    persons: List[PersonOut]
    features: Dict[str, float]
    risk: RiskOut
    proc_fps: float


class AudioWindowOut(BaseModel):
    start: float
    end: float
    label: str                 # top emotion for this window (angry/calm/fearful/...)
    anger: float
    fear: float
    intensity: float


class AudioEmotionResponse(BaseModel):
    """Result of POST /analyze-audio (audio-only emotion classification)."""

    success: bool
    file: str
    windows: int
    top_emotion: str           # most frequent window emotion overall
    mean_anger: float
    mean_fear: float
    mean_intensity: float
    timeline: List[AudioWindowOut]
    error: Optional[str] = None


class PredictResponse(BaseModel):
    """Aggregate result for POST /predict over a whole clip."""

    success: bool
    video: str
    frames_analysed: int
    duration_s: float
    peak_risk: float
    peak_band: str
    mean_risk: float
    timeline: List[Tuple[float, float]]   # (timestamp, score)
    error: Optional[str] = None
