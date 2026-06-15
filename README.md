# PREVAIL

**Predictive Violence & Aggression Escalation Intelligence Layer**

An explainable, GPU-efficient **multimodal** system that estimates aggression risk
from CCTV video (and optionally audio) **before** physical confrontation. It combines
person detection, tracking, pose, motion/crowd analysis, and speech-emotion into a
single live risk score with human-readable explanations.

> **Decision support, not enforcement.** PREVAIL surfaces risk + reasons to a human
> operator. It never identifies, punishes, or takes automated action.

---

## ✨ Highlights

- **Mostly pretrained, GPU-frugal** — every heavy model is a frozen feature extractor;
  only a small MLP risk head is trained. Runs comfortably on a 16 GB GPU (~2.2 GB used).
- **Multimodal** — video (YOLO11-pose + ByteTrack), motion/crowd/pose features,
  optional **scene** (CLIP) and **audio emotion** (wav2vec2: angry/calm/fearful).
- **Explainable** — every score comes with ranked "Top factors".
- **Trained & validated** on **RWF-2000** (CCTV fight detection): **clip-level AUC 0.879**,
  balanced accuracy **0.813** on 150 held-out clips.
- **Two ways to run** — a local live-detection CLI and a FastAPI service (REST + WebSocket).

---

## 🧠 Pipeline

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

---

## 🚀 Quick start

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate          # Windows
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt

# Live detection — pass a video, watch boxes + pose + a live risk panel
python run_live.py --video path/to/clip.mp4 --risk-weights models/risk_head.pt

# API server (REST + WebSocket)
uvicorn prevail.api.app:app --port 8000   # docs at http://localhost:8000/docs
```

### Three modes
```bash
# video-only (default)
python run_live.py --video clip.mp4 --risk-weights models/risk_head.pt
# multimodal (video + audio + scene)
python run_live.py --video clip.mp4 --audio --scene --risk-weights models/risk_head.pt
```
Audio-only emotion is available via the API (`POST /analyze-audio`) or the audio module.

---

## 🌐 API at a glance

| Endpoint | Purpose |
|---|---|
| `GET /health` | liveness + device/head info |
| `POST /analyze` | upload a video → full risk result (one call) |
| `POST /analyze-audio` | upload audio/video → emotion (angry/calm/fearful) |
| `POST /predict` | run on a server-side video path |
| `POST /upload` | upload a file, get its server path |
| `WS /live-risk` | stream per-frame risk for a live dashboard |

```javascript
// video-only, one call (do NOT set Content-Type for FormData)
const body = new FormData(); body.append("file", file);
const res = await fetch("http://localhost:8000/analyze", { method: "POST", body });
const { peak_risk, peak_band, timeline } = await res.json();
```

Full reference (build steps, system requirements, WebSocket guide, JS `fetch`
cookbook, frontend architecture) is in **[DOCUMENTATION.md](DOCUMENTATION.md)**.

---

## 📊 Model performance (held-out RWF-2000 clips)

| Metric | Value |
|---|---|
| Clip-level AUC | **0.879** |
| Balanced accuracy | **0.813** |
| Frame-level AUC | 0.739 |
| Mean risk — violence | 81.1 (HIGH) |
| Mean risk — non-violence | 59.9 (MODERATE) |
| Audio emotion (angry vs calm) | 0.99 vs 0.02 anger |

---

## 🗂️ Repository layout

```
backend/
├── run_live.py            # live detection CLI
├── train_risk_head.py     # train the MLP risk head
├── download_dataset.py    # fetch RWF-2000 (HuggingFace)
├── extract_features.py    # clips -> feature CSV
├── models/risk_head.pt    # trained risk head (committed)
└── prevail/
    ├── pipeline/          # tracker, motion, crowd, pose, scene, audio, risk, explain, engine
    ├── viz/overlay.py     # boxes, skeletons, risk panel
    └── api/               # FastAPI app + schemas
DOCUMENTATION.md           # full docs (run / API / WebSocket / frontend / requirements)
project.md                 # original project specification
```

---

## ⚙️ System requirements

- **GPU:** NVIDIA, 8 GB+ VRAM (project target: RTX 4090 16 GB). CPU works but slower.
- **RAM:** 16–32 GB · **Disk:** ~6 GB (+~35 GB only if training on RWF-2000)
- **Python 3.10–3.12**, NVIDIA driver 525+ · `ffmpeg` optional (bundled via `imageio-ffmpeg`)
- **Node 18+** only if building the frontend

See [DOCUMENTATION.md](DOCUMENTATION.md) for the full build/runtime breakdown.

---

## 🔭 Tech stack

PyTorch · Ultralytics YOLO11 · ByteTrack · Transformers (CLIP, wav2vec2) · OpenCV ·
FastAPI · WebSockets · NumPy. 

frontend: Next.js + React + TypeScript +
Tailwind + shadcn/ui + Recharts.
