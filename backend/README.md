# PREVAIL Backend — AI Pipeline + FastAPI

Local, mostly-pretrained multimodal pipeline that turns CCTV video (and optional
audio) into an **explainable aggression-risk score**. Every heavy model is a frozen
feature extractor; only the small MLP risk head is trainable. Tuned for a single
16 GB GPU (RTX 4090-class), FP16, 640px, ~12 analysis FPS.

## What you get

- `run_live.py` — **pass a video path, watch real-time detection.** Boxes, track
  IDs, pose skeletons, and a live risk panel with the top contributing factors.
  This is the "is my model stack working?" tool.
- `prevail/` — the pipeline as importable modules (detection+tracking+pose, motion,
  crowd, pose-aggression, optional scene + audio, feature engineering, risk, explain).
- `prevail/api/app.py` — FastAPI service: `POST /predict`, `POST /upload`,
  WebSocket `/live-risk` for the dashboard.
- `train_risk_head.py` — train the only fine-tuned component (the 2-layer MLP).

## Pipeline

```
video ─▶ YOLO11-pose + ByteTrack ─▶ persons {bbox, track_id, 17 keypoints}
                                      │
        ┌─────────────────────────────┼───────────────────────────┐
   motion.py                      crowd.py                    pose_features.py
 (speed/accel/dir)        (density/proximity/converge)   (raised arms/lean/limb)
        └─────────────────────────────┼───────────────────────────┘
              optional: scene.py (CLIP) + audio_emotion.py (wav2vec2)
                                      ▼
                       features.py  → 15-dim normalised vector
                                      ▼
                  risk.py  (heuristic by default | trained MLP)
                                      ▼
                   explain.py → top factors  →  overlay / API
```

## Install

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate          # Windows
pip install -r requirements.txt

# Install the CUDA build of torch for your system (example: CUDA 12.1):
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

`ffmpeg` must be on PATH for `--audio` (audio extraction). Model weights
(`yolo11s-pose.pt`, CLIP, wav2vec2) auto-download on first run.

## Run the live demo

```bash
# Minimal: detection + tracking + pose + heuristic risk (light, fast)
python run_live.py --video path/to/clip.mp4

# Full multimodal
python run_live.py --video clip.mp4 --scene --audio

# Headless export (no window), write annotated mp4
python run_live.py --video clip.mp4 --save annotated.mp4 --no-show

# No GPU
python run_live.py --video clip.mp4 --device cpu --fps 6
```

Window controls: `q` quit, `space` pause/resume.

### Flags

| Flag | Default | Meaning |
|------|---------|---------|
| `--video` | (required) | input video file |
| `--device` | `cuda` | `cuda` or `cpu` (auto-falls back to cpu) |
| `--weights` | `yolo11s-pose.pt` | YOLO11 pose weights; try `yolo11m-pose.pt` for accuracy |
| `--fps` | `12` | analysis FPS (source is subsampled) |
| `--imgsz` | `640` | inference resolution |
| `--conf` | `0.35` | person confidence threshold |
| `--scene` | off | enable CLIP scene-sensitivity feature |
| `--audio` | off | enable wav2vec2 audio emotion (needs ffmpeg) |
| `--risk-weights` | (none) | trained MLP head `.pt`; omit to use the heuristic |
| `--save` / `--no-show` | — | export annotated video / run headless |

## Risk model: heuristic now, MLP later

Out of the box the risk score is a **transparent weighted sum** over the feature
vector (`prevail/pipeline/risk.py`), so the demo is meaningful and debuggable with
zero training. The per-feature weights double as the "Top factors" explanation.

When you have labelled clips, dump `out.features` per frame to a CSV (schema in
`train_risk_head.py`), train the MLP, and point the pipeline at it:

```bash
python train_risk_head.py --csv data/labels.csv --out models/risk_head.pt
python run_live.py --video clip.mp4 --risk-weights models/risk_head.pt
```

## Run the API

```bash
uvicorn prevail.api.app:app --port 8000
# GET  http://localhost:8000/health
# POST http://localhost:8000/predict?video_path=clip.mp4
# WS   ws://localhost:8000/live-risk?video=clip.mp4
```

## Feature vector (15-dim, all ~0..1)

`person_count, crowd_density, proximity, convergence, avg_speed, max_acceleration,
max_direction_change, pose_raised_arms, pose_forward_lean, pose_limb_motion,
audio_anger, audio_fear, audio_intensity, scene_sensitivity, risk_trend`

## Risk bands

| Score | Band |
|-------|------|
| 0–25 | SAFE |
| 26–50 | LOW |
| 51–75 | MODERATE |
| 76–90 | HIGH |
| 91–100 | CRITICAL |

## VRAM budget (16 GB)

YOLO11s-pose (~1 GB FP16) + optional CLIP ViT-B/32 (~1.5 GB) + optional wav2vec2-base
(~1 GB) at batch 1 / 640px stays well under 16 GB. Use `yolo11m-pose.pt` for accuracy
if you have headroom.

## Note on scope

This is **decision support, not enforcement** — it surfaces risk and reasons to a
human operator. No identification, no automated action.
~