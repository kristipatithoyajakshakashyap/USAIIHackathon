"""FastAPI app: REST batch prediction + live WebSocket risk stream.

Endpoints (subset of the spec's API surface, wired to the real pipeline):
    GET  /health                  - liveness + device/head info
    POST /predict   {video_path}  - run a clip, return risk timeline + peak
    POST /upload                  - upload a video, returns a server path
    WS   /live-risk?video=PATH    - stream per-frame risk JSON for a dashboard

Run:  uvicorn prevail.api.app:app --reload --port 8000
Or:   python -m prevail.api.app
"""

from __future__ import annotations

import asyncio
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from ..config import Settings, risk_band
from ..pipeline.engine import PrevailEngine
from ..pipeline.explain import reasons_text
from ..security.audit import AuditMiddleware, init_audit_db
from ..security.inference_guard import InferenceGuardMiddleware
from .schemas import (AudioEmotionResponse, AudioWindowOut, FrameOut, PersonOut,
                      PredictResponse, RiskOut)

app = FastAPI(title="PREVAIL API", version="0.1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)
app.add_middleware(AuditMiddleware)
app.add_middleware(InferenceGuardMiddleware)

@app.on_event("startup")
async def startup():
    await init_audit_db()

UPLOAD_DIR = Path(tempfile.gettempdir()) / "prevail_uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


def _settings(scene: bool = False, audio: bool = False, risk_weights: str = "") -> Settings:
    return Settings(use_scene=scene, use_audio=audio, risk_weights=risk_weights)


@app.get("/health")
def health() -> dict:
    s = _settings()
    eng = PrevailEngine(s)
    return {"success": True, "status": "ok",
            "device": eng.tracker.device, "risk_head": eng.risk_model.name}


@app.post("/upload")
async def upload(file: UploadFile = File(...)) -> dict:
    dest = UPLOAD_DIR / file.filename
    with open(dest, "wb") as f:
        f.write(await file.read())
    return {"success": True, "path": str(dest)}


@app.post("/analyze", response_model=PredictResponse)
async def analyze(file: UploadFile = File(...), scene: bool = False,
                  audio: bool = False) -> PredictResponse:
    """One-call endpoint for the frontend: upload a video, get the full result."""
    dest = UPLOAD_DIR / file.filename
    with open(dest, "wb") as f:
        f.write(await file.read())
    return predict(str(dest), scene=scene, audio=audio)


@app.post("/analyze-audio", response_model=AudioEmotionResponse)
async def analyze_audio(file: UploadFile = File(...)) -> AudioEmotionResponse:
    """Audio-only emotion classification: upload audio/video, get the emotion."""
    import collections
    from ..pipeline.audio_emotion import AudioEmotionTrack

    dest = UPLOAD_DIR / file.filename
    with open(dest, "wb") as f:
        f.write(await file.read())

    track = AudioEmotionTrack(_settings())
    if str(dest).lower().endswith((".wav", ".flac", ".ogg")):
        track.build_from_wav(str(dest))
    else:
        track.build(str(dest))

    ws = track.windows
    if not ws:
        return AudioEmotionResponse(success=False, file=str(dest), windows=0,
                                    top_emotion="n/a", mean_anger=0, mean_fear=0,
                                    mean_intensity=0, timeline=[], error="no audio decoded")
    top = collections.Counter(w.label for w in ws).most_common(1)[0][0]
    mean = lambda fn: round(sum(fn(w) for w in ws) / len(ws), 3)
    return AudioEmotionResponse(
        success=True, file=str(dest), windows=len(ws), top_emotion=top,
        mean_anger=mean(lambda w: w.anger), mean_fear=mean(lambda w: w.fear),
        mean_intensity=mean(lambda w: w.intensity),
        timeline=[AudioWindowOut(start=round(w.start, 2), end=round(w.end, 2),
                                 label=w.label, anger=round(w.anger, 3),
                                 fear=round(w.fear, 3), intensity=round(w.intensity, 3))
                  for w in ws],
    )


@app.post("/predict", response_model=PredictResponse)
def predict(video_path: str, scene: bool = False, audio: bool = False) -> PredictResponse:
    if not Path(video_path).is_file():
        return PredictResponse(success=False, video=video_path, frames_analysed=0,
                               duration_s=0, peak_risk=0, peak_band="SAFE",
                               mean_risk=0, timeline=[], error="video not found")
    engine = PrevailEngine(_settings(scene, audio))
    timeline, scores, n, last_ts = [], [], 0, 0.0
    for out in engine.run(video_path):
        timeline.append((round(out.timestamp, 2), round(out.risk.score, 1)))
        scores.append(out.risk.score)
        n += 1
        last_ts = out.timestamp
    peak = max(scores) if scores else 0.0
    mean = sum(scores) / len(scores) if scores else 0.0
    return PredictResponse(
        success=True, video=video_path, frames_analysed=n, duration_s=round(last_ts, 2),
        peak_risk=round(peak, 1), peak_band=risk_band(peak), mean_risk=round(mean, 1),
        timeline=timeline,
    )


@app.websocket("/live-risk")
async def live_risk(ws: WebSocket) -> None:
    await ws.accept()
    video = ws.query_params.get("video", "")
    scene = ws.query_params.get("scene", "0") in ("1", "true")
    audio = ws.query_params.get("audio", "0") in ("1", "true")

    if not video or not Path(video).is_file():
        await ws.send_json({"error": f"video not found: {video}"})
        await ws.close()
        return

    engine = PrevailEngine(_settings(scene, audio))
    try:
        for out in engine.run(video):
            payload = FrameOut(
                frame_index=out.frame_index,
                timestamp=round(out.timestamp, 2),
                persons=[PersonOut(track_id=p.track_id, bbox=[round(float(x), 1) for x in p.bbox],
                                   conf=round(p.conf, 2)) for p in out.persons],
                features={k: round(v, 3) for k, v in out.features.items()},
                risk=RiskOut(
                    score=round(out.risk.score, 1), band=out.risk.band,
                    reasons=reasons_text(out.risk.contributions),
                    contributions={k: round(v, 1) for k, v in out.risk.contributions.items()},
                ),
                proc_fps=round(out.proc_fps, 1),
            )
            await ws.send_json(payload.model_dump())
            await asyncio.sleep(0)
    except WebSocketDisconnect:
        return
    finally:
        try:
            await ws.close()
        except Exception:
            pass


def main() -> None:
    import uvicorn
    uvicorn.run("prevail.api.app:app", host="0.0.0.0", port=8000, reload=False)


if __name__ == "__main__":
    main()