# PREVAIL — Complete Documentation

**Predictive Violence & Aggression Escalation Intelligence Layer**

An explainable, mostly-pretrained multimodal pipeline that turns CCTV video (and
optional audio) into a live aggression-risk score. This document covers system
requirements, how the backend is built, how to run it, the full HTTP + WebSocket
API, and how to build a frontend that matches the API for live detection.

> Scope reminder: PREVAIL is **decision support, not enforcement**. It surfaces
> risk + reasons to a human operator; it never identifies, punishes, or acts.

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [How the Backend Is Built (Architecture)](#2-how-the-backend-is-built-architecture)
3. [Build & Run — Step by Step](#3-build--run--step-by-step)
4. [Running the Live Detection (CLI)](#4-running-the-live-detection-cli)
5. [Running the API Server](#5-running-the-api-server)
6. [HTTP API Reference](#6-http-api-reference)
7. [WebSocket API — Live Detection](#7-websocket-api--live-detection)
8. [Frontend Architecture (matching the API)](#8-frontend-architecture-matching-the-api)
9. [Training Pipeline (reproduce the model)](#9-training-pipeline-reproduce-the-model)
10. [Model Performance](#10-model-performance)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. System Requirements

### 1a. Runtime requirements — to **run** the backend so the website works

| Resource | Minimum | Recommended | Notes |
|---|---|---|---|
| **GPU** | none (CPU works) | NVIDIA RTX, **8 GB+ VRAM** | Project target: RTX 4090 (16 GB). CPU runs but ~5–10× slower. |
| **CUDA driver** | — | 525+ (we used 610) | Only the *driver* is needed; the CUDA runtime ships inside the torch wheel. |
| **System RAM** | 8 GB | **16–32 GB** | 32 GB matches the project target. |
| **Disk** | ~6 GB | 10 GB+ | venv (~5 GB) + model weights (~65 MB). Add **~35 GB** only if training on RWF-2000. |
| **OS** | Windows 10/11 or Linux | — | Tested on Windows 11. |
| **Python** | 3.10 | **3.11** | 3.10–3.12 supported. |
| **ffmpeg** | required only for `--audio` | on `PATH` | Used to extract the audio track. |

**VRAM budget at runtime (16 GB GPU):** YOLO11s-pose (~1 GB FP16) + optional CLIP
ViT-B/32 (~1.5 GB) + optional wav2vec2-base (~1 GB) ≈ **under 4 GB** at batch 1 /
640 px. Measured ~2.2 GB during live runs — huge headroom.

### 1b. Build/dev requirements — to **set up** the backend (and frontend)

| Tool | Version | Why |
|---|---|---|
| Python + `venv` + `pip` | 3.11 | backend runtime |
| Internet access | — | downloads torch (~2.4 GB), models from HuggingFace, dataset |
| **Node.js + npm** | Node **18+** | only if you build the Next.js frontend |
| ffmpeg | any recent | audio feature (optional) |
| ~6 GB free disk | — | venv + weights (more for dataset) |

> You do **not** need the CUDA Toolkit / `nvcc`. The CUDA-enabled torch wheel
> bundles everything; you only need an NVIDIA driver.

---

## 2. How the Backend Is Built (Architecture)

Every heavy model is a **frozen feature extractor**; only the small MLP risk head
is trained. This is what keeps PREVAIL GPU-feasible, real-time, and explainable.

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

### Module map (`backend/prevail/`)

| File | Responsibility |
|---|---|
| `config.py` | All tunables (device, FP16, 640 px, FPS, risk bands) + paths |
| `pipeline/tracker.py` | YOLO11-pose + ByteTrack in one pass → boxes, IDs, keypoints |
| `pipeline/motion.py` | Per-track speed / acceleration / direction change |
| `pipeline/crowd.py` | Person count, density, proximity, convergence |
| `pipeline/pose_features.py` | Raised arms, forward lean, sudden limb motion |
| `pipeline/scene.py` | CLIP scene-sensitivity (optional) |
| `pipeline/audio_emotion.py` | wav2vec2 anger/fear/intensity (optional) |
| `pipeline/features.py` | Canonical 15-dim feature schema + assembly |
| `pipeline/risk.py` | Heuristic scorer **and** trainable MLP head |
| `pipeline/explain.py` | Ranks feature contributions → human reasons |
| `pipeline/engine.py` | Orchestrates the pipeline as a generator |
| `viz/overlay.py` | Boxes, skeletons, top-right risk panel |
| `api/app.py` | FastAPI: REST + WebSocket |
| `api/schemas.py` | Pydantic response models |

### How it was built (the order it came together)

1. **Perception** — wrapped YOLO11-pose with ByteTrack tracking (one model = detection + tracking + pose) to fit a 16 GB GPU.
2. **Feature engineering** — derived motion, crowd, and pose signals into a stable 15-dim normalised vector (`features.py:FEATURE_NAMES`).
3. **Risk head** — a transparent weighted-sum **heuristic** (works with zero training) plus a 2-layer **MLP** for the trained model.
4. **Explainability** — per-feature contributions → ranked "Top factors".
5. **Engine** — streams per-frame results; reused across clips for batch feature extraction.
6. **Training** — `download_dataset.py` → `extract_features.py` → `train_risk_head.py` produced `models/risk_head.pt`.
7. **API + overlay** — FastAPI REST/WS and the OpenCV overlay both consume the same engine.

---

## 3. Build & Run — Step by Step

```bash
# 1) Enter the backend
cd backend

# 2) Create + activate a virtual environment
python -m venv .venv
.venv\Scripts\activate            # Windows
# source .venv/bin/activate       # Linux/macOS

# 3) Install the CUDA build of PyTorch (match your CUDA; cu121 shown)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# 4) Install the rest of the dependencies
pip install -r requirements.txt

# 5) (verify GPU)
python -c "import torch; print('cuda:', torch.cuda.is_available())"
```

**Model weights:** `yolo11s-pose.pt` auto-downloads on first run. If GitHub is
blocked in your network, fetch from HuggingFace instead and drop into `models/`:

```bash
python -c "from huggingface_hub import hf_hub_download; import shutil; \
shutil.copy(hf_hub_download('Ultralytics/YOLO11','yolo11s-pose.pt'),'models/yolo11s-pose.pt')"
```

The tracker resolves weights from `models/` automatically.

---

## 4. Running the Live Detection (CLI)

The fastest way to confirm the stack works: pass a video and watch it.

```bash
# Minimal — detection + tracking + pose + risk (heuristic if no trained head)
python run_live.py --video path/to/clip.mp4

# With the trained model
python run_live.py --video clip.mp4 --risk-weights models/risk_head.pt --device cuda

# Full multimodal
python run_live.py --video clip.mp4 --scene --audio --risk-weights models/risk_head.pt

# Headless export (no window) → annotated mp4
python run_live.py --video clip.mp4 --risk-weights models/risk_head.pt --save out.mp4 --no-show
```

Window controls: **`q`** quit, **`space`** pause/resume. The risk panel is pinned
to the **top-right corner** and scales with the frame (small clips are upscaled
for legibility).

| Flag | Default | Meaning |
|---|---|---|
| `--video` | (required) | input video file |
| `--device` | `cuda` | `cuda` or `cpu` |
| `--weights` | `yolo11s-pose.pt` | YOLO11 pose weights (`yolo11m-pose.pt` = more accurate) |
| `--risk-weights` | (none → heuristic) | trained MLP head `.pt` |
| `--fps` | `12` | analysis FPS |
| `--scene` / `--audio` | off | enable CLIP / wav2vec2 features |
| `--save` / `--no-show` | — | export annotated video / run headless |

### The three usage modes

PREVAIL can run **video-only**, **audio-only**, or **multimodal** (video + audio).

**1) Video-only** (default) — visual risk from detection + tracking + pose + motion + crowd:
```bash
python run_live.py --video clip.mp4 --risk-weights models/risk_head.pt
```

**2) Audio-only** — classify the emotion of an audio/video file (angry / calm / fearful…).
There is no visual processing here; it returns the emotion + anger/fear/intensity:
```bash
python - <<'PY'
from prevail.config import Settings
from prevail.pipeline.audio_emotion import AudioEmotionTrack
t = AudioEmotionTrack(Settings()).build_from_wav("data/audio_test/angry.wav")
w = t.windows[0]
print("emotion:", w.label, "| anger:", round(w.anger,3), "| intensity:", round(w.intensity,3))
PY
# (or via the API: POST /analyze-audio — see §6)
```

**3) Multimodal** (video + audio, and optionally scene) — audio anger/fear feed into the
same 15-dim risk vector, so aggressive shouting raises the risk score. Requires a video
**with an audio track**:
```bash
python run_live.py --video clip.mp4 --audio --risk-weights models/risk_head.pt
python run_live.py --video clip.mp4 --audio --scene --risk-weights models/risk_head.pt
```

| Mode | Flags | What drives the score |
|---|---|---|
| Video-only | (none) | pose, motion, crowd, tracking |
| Audio-only | — (use the audio module / `/analyze-audio`) | wav2vec2 emotion |
| Multimodal | `--audio` (`--scene`) | visual **+** audio (**+** scene) features |

---

## 5. Running the API Server

```bash
cd backend
uvicorn prevail.api.app:app --host 0.0.0.0 --port 8000
# interactive docs (Swagger): http://localhost:8000/docs
```

CORS is open (`*`) for local dev, so a frontend on `localhost:3000` can call it.

---

## 6. HTTP API Reference

Base URL: `http://localhost:8000`

### `GET /health`
Liveness + device info.
```json
{ "success": true, "status": "ok", "device": "cuda", "risk_head": "mlp" }
```

### `POST /analyze` ⭐ (frontend one-call: upload a video → get the result)
`multipart/form-data` with a `file` field. Optional query: `scene`, `audio` (bool).
Saves the file server-side, runs the whole pipeline, returns the result.
```bash
curl -X POST "http://localhost:8000/analyze" -F "file=@clip.mp4"
```
**Response (`PredictResponse`):**
```json
{
  "success": true,
  "video": "C:/…/prevail_uploads/clip.mp4",
  "frames_analysed": 52,
  "duration_s": 5.2,
  "peak_risk": 91.5,
  "peak_band": "CRITICAL",
  "mean_risk": 77.3,
  "timeline": [[0.0, 41.2], [0.1, 45.9], ...],
  "error": null
}
```

### `POST /analyze-audio` 🔊 (audio-only emotion)
`multipart/form-data` with a `file` field (audio **or** video). Returns the dominant
emotion plus per-window anger/fear/intensity. `.wav/.flac/.ogg` read directly; other
formats decoded via the bundled ffmpeg.
```bash
curl -X POST "http://localhost:8000/analyze-audio" -F "file=@angry.wav"
```
**Response (`AudioEmotionResponse`):**
```json
{
  "success": true,
  "file": "C:/…/angry.wav",
  "windows": 1,
  "top_emotion": "angry",
  "mean_anger": 0.992,
  "mean_fear": 0.001,
  "mean_intensity": 0.159,
  "timeline": [
    { "start": 0.0, "end": 3.0, "label": "angry",
      "anger": 0.992, "fear": 0.001, "intensity": 0.159 }
  ],
  "error": null
}
```

### `POST /upload`
Upload a file, get its server path back (use with `/predict`).
```json
{ "success": true, "path": "C:/…/prevail_uploads/clip.mp4" }
```

### `POST /predict`
Run on a file **already on the server**. Query: `video_path` (required), `scene`,
`audio`. Returns the same `PredictResponse` as `/analyze`.
```bash
curl -X POST "http://localhost:8000/predict?video_path=C:/…/clip.mp4"
```

> Frontend tip: use **`/analyze`** for the "user picks a file → show result" flow
> (one request). Use `/upload` + `/predict` only if you need the server path for
> something else (e.g. then opening a `/live-risk` WebSocket on that path).

### Risk bands
| Score | Band |
|---|---|
| 0–25 | SAFE |
| 26–50 | LOW |
| 51–75 | MODERATE |
| 76–90 | HIGH |
| 91–100 | CRITICAL |

### JS `fetch` cookbook — URL, headers, body for every call

> **Important:** for file uploads send a `FormData` body and **do NOT set the
> `Content-Type` header** — the browser sets `multipart/form-data` with the correct
> boundary automatically. Setting it manually breaks the upload.

```javascript
const BASE = "http://localhost:8000";

// 1) HEALTH ────────────────────────────────────────────────
// URL: GET /health   headers: none   body: none
const health = await fetch(`${BASE}/health`).then(r => r.json());
// → { success:true, status:"ok", device:"cuda", risk_head:"mlp" }


// 2) VIDEO-ONLY  (upload a video, get the risk result) ──────
// URL: POST /analyze        headers: none (browser sets multipart)
// body: FormData with field "file"
async function analyzeVideo(file) {
  const body = new FormData();
  body.append("file", file);                       // <input type="file">.files[0]
  const res = await fetch(`${BASE}/analyze`, { method: "POST", body });
  return res.json();   // → { peak_risk, peak_band, mean_risk, timeline, ... }
}


// 3) MULTIMODAL  (video + audio + scene) ───────────────────
// Same endpoint, add query params scene/audio = 1
async function analyzeMultimodal(file) {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`${BASE}/analyze?audio=1&scene=1`, { method: "POST", body });
  return res.json();
}


// 4) AUDIO-ONLY  (emotion: angry / calm / fearful …) ───────
// URL: POST /analyze-audio   body: FormData "file" (audio or video)
async function analyzeAudio(file) {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`${BASE}/analyze-audio`, { method: "POST", body });
  return res.json();   // → { top_emotion:"angry", mean_anger:0.99, timeline:[...] }
}


// 5) PREDICT on a server-side path (no upload) ─────────────
// URL: POST /predict?video_path=...   headers: none   body: none
async function predictPath(serverPath) {
  const url = `${BASE}/predict?video_path=${encodeURIComponent(serverPath)}`;
  return fetch(url, { method: "POST" }).then(r => r.json());
}


// 6) JSON body example (if you POST JSON instead of a file) ─
//    headers: { "Content-Type": "application/json" }
//    (PREVAIL's upload endpoints use FormData, but this is the pattern
//     for any future JSON endpoint you add.)
await fetch(`${BASE}/some-json-endpoint`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ key: "value" }),
});
```

**Summary table**

| Goal | Method + URL | Headers | Body |
|---|---|---|---|
| Health | `GET /health` | none | none |
| Video-only | `POST /analyze` | none* | `FormData{ file }` |
| Multimodal | `POST /analyze?audio=1&scene=1` | none* | `FormData{ file }` |
| Audio-only | `POST /analyze-audio` | none* | `FormData{ file }` |
| Upload | `POST /upload` | none* | `FormData{ file }` |
| Predict (path) | `POST /predict?video_path=…` | none | none |
| Live stream | `WS /live-risk?video=…` | n/a | n/a (see §7) |

\* *Do not set `Content-Type` for FormData uploads — the browser sets it.*

---

## 7. WebSocket API — Live Detection

For **streaming, per-frame** results (the live dashboard), connect a WebSocket.

### Endpoint
```
ws://localhost:8000/live-risk?video=<server_path>&scene=0&audio=0
```
`video` must be a path the server can read — typically the `path` returned by
`/upload`. The server runs the engine and pushes one JSON message **per analysed
frame** until the clip ends.

### Per-frame message (`FrameOut`)
```json
{
  "frame_index": 12,
  "timestamp": 1.2,
  "persons": [
    { "track_id": 3, "bbox": [120.4, 88.1, 210.7, 360.2], "conf": 0.91 }
  ],
  "features": { "convergence": 0.31, "avg_speed": 0.12, "...": 0.0 },
  "risk": {
    "score": 84.1,
    "band": "HIGH",
    "reasons": ["Sudden acceleration", "People converging / approaching"],
    "contributions": { "max_acceleration": 12.3, "convergence": 9.8 }
  },
  "proc_fps": 22.5
}
```

### Recommended flow for a file the user uploads

```
1. POST /upload  (file)            → { path }
2. open WS /live-risk?video=path   → stream FrameOut per frame
3. on each message: move risk gauge, redraw boxes, append to chart
4. socket closes when the clip ends
```

### Minimal browser client

```javascript
// 1) upload, 2) stream live risk
async function runLive(file) {
  const fd = new FormData();
  fd.append("file", file);
  const { path } = await fetch("http://localhost:8000/upload", {
    method: "POST", body: fd,
  }).then(r => r.json());

  const ws = new WebSocket(
    `ws://localhost:8000/live-risk?video=${encodeURIComponent(path)}`
  );
  ws.onmessage = (ev) => {
    const f = JSON.parse(ev.data);
    if (f.error) return console.error(f.error);
    updateGauge(f.risk.score, f.risk.band);   // your UI fns
    updateReasons(f.risk.reasons);
    drawBoxes(f.persons);
    appendToChart(f.timestamp, f.risk.score);
  };
  ws.onclose = () => console.log("stream finished");
}
```

> Note: `/live-risk` streams the **structured data** (scores, boxes, reasons), not
> pixels. The frontend draws boxes from `persons[].bbox` over its own `<video>`
> element (or a still). For pixel-perfect annotated playback, use the CLI
> `--save` export or have the backend serve the annotated mp4.

---

## 8. Frontend Architecture (matching the API)

Recommended stack (per the project spec): **Next.js + React + TypeScript +
TailwindCSS + shadcn/ui + Recharts + Framer Motion**.

### Page / component map → API

| UI surface | Data source |
|---|---|
| **Upload + Analyze** card | `POST /analyze` (one-call) |
| **Live monitor** (video + boxes + gauge) | `POST /upload` → `WS /live-risk` |
| **Risk score card** | `risk.score` / `risk.band` |
| **Explainability panel** ("Top factors") | `risk.reasons` / `risk.contributions` |
| **Risk timeline chart** | `timeline` (from `/analyze`) or streamed `timestamp,score` |
| **Alert center** | client-side: raise alert when `band ∈ {HIGH, CRITICAL}` |
| **Health badge** | `GET /health` |

### Suggested structure

```
frontend/
├── app/
│   ├── page.tsx              # dashboard shell
│   ├── live/page.tsx         # live monitor (WebSocket)
│   └── analyze/page.tsx      # upload-and-analyze
├── components/
│   ├── RiskGauge.tsx         # score + band, colour-coded
│   ├── ReasonsPanel.tsx      # top factors list
│   ├── RiskChart.tsx         # Recharts line of score vs time
│   ├── BoxOverlay.tsx        # <canvas> drawing persons[].bbox
│   └── UploadCard.tsx        # file picker -> /analyze
└── lib/
    └── prevail.ts            # API client (fetch + WebSocket)
```

### API client (`lib/prevail.ts`)

```typescript
const API = process.env.NEXT_PUBLIC_API ?? "http://localhost:8000";

export interface PredictResponse {
  success: boolean; video: string; frames_analysed: number;
  duration_s: number; peak_risk: number; peak_band: string;
  mean_risk: number; timeline: [number, number][]; error: string | null;
}

// One-call: pick a file, get the full result.
export async function analyze(file: File): Promise<PredictResponse> {
  const fd = new FormData(); fd.append("file", file);
  const res = await fetch(`${API}/analyze`, { method: "POST", body: fd });
  return res.json();
}

// Live stream of per-frame risk.
export function openLiveRisk(serverPath: string, onFrame: (f: any) => void) {
  const ws = new WebSocket(
    `${API.replace(/^http/, "ws")}/live-risk?video=${encodeURIComponent(serverPath)}`
  );
  ws.onmessage = (e) => onFrame(JSON.parse(e.data));
  return ws;
}

export async function upload(file: File): Promise<{ path: string }> {
  const fd = new FormData(); fd.append("file", file);
  return fetch(`${API}/upload`, { method: "POST", body: fd }).then(r => r.json());
}
```

### Upload-and-analyze component (`UploadCard.tsx`)

```tsx
import { analyze } from "@/lib/prevail";
import { useState } from "react";

export function UploadCard() {
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="p-4 rounded-2xl border">
      <input type="file" accept="video/*" disabled={busy}
        onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return;
          setBusy(true); setRes(await analyze(f)); setBusy(false);
        }} />
      {busy && <p>Analysing…</p>}
      {res && (
        <div className="mt-3">
          <p className="text-3xl font-bold">{res.peak_risk} <span>{res.peak_band}</span></p>
          <p>mean {res.mean_risk} · {res.frames_analysed} frames · {res.duration_s}s</p>
        </div>
      )}
    </div>
  );
}
```

### Live monitor component (WebSocket)

```tsx
import { upload, openLiveRisk } from "@/lib/prevail";
import { useRef, useState } from "react";

export function LiveMonitor() {
  const [score, setScore] = useState(0);
  const [band, setBand] = useState("SAFE");
  const [reasons, setReasons] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  async function start(file: File) {
    const { path } = await upload(file);
    wsRef.current = openLiveRisk(path, (f) => {
      if (f.error) return;
      setScore(f.risk.score); setBand(f.risk.band); setReasons(f.risk.reasons);
      // drawBoxes(f.persons) on a <canvas> over your <video>
    });
  }
  return (/* RiskGauge(score,band) + ReasonsPanel(reasons) + file input -> start */ null);
}
```

> Run the backend (`uvicorn …`) and the frontend (`npm run dev`) together. Set
> `NEXT_PUBLIC_API=http://localhost:8000` in `frontend/.env.local`.

---

## 9. Training Pipeline (reproduce the model)

```bash
# 1) Download a dataset (RWF-2000 — CCTV fight detection — from HuggingFace)
python download_dataset.py --source hf --repo DanJoshua/RWF-2000 --limit 1000
#   → data/clips/violence/*.avi  +  data/clips/nonviolence/*.avi

# 2) Extract the 15-dim features per frame (GPU). Holds out clips >limit for testing.
python extract_features.py --clips data/clips --out data/features.csv \
    --limit-per-class 850 --stride-frames 2 --fps 10 --device cuda

# 3) Train the MLP risk head (BCE, minibatches, best-val-AUC checkpoint)
python train_risk_head.py --csv data/features.csv --out models/risk_head.pt \
    --epochs 300 --lr 0.002 --batch-size 256 --device cuda

# 4) Use it
python run_live.py --video clip.mp4 --risk-weights models/risk_head.pt
```

**Time:** feature extraction dominates (~1.7 s/clip on an RTX 4090 → ~45–50 min
for 1,700 clips). The MLP fit itself is ~15 s.

---

## 10. Model Performance

Trained on RWF-2000 (1,700 clips → 42,500 balanced frame-rows), evaluated on
**150 clips the model never saw**:

| Metric | Value |
|---|---|
| **Clip-level AUC** | **0.879** |
| **Balanced accuracy** | **0.813** (@thr 72.2) |
| Frame-level AUC | 0.739 |
| Mean risk — violence | 81.1 (HIGH) |
| Mean risk — non-violence | 59.9 (MODERATE) |

The features that drive it (`max_acceleration`, `pose_limb_motion`, `avg_speed`,
`convergence`) are exactly the aggression cues the spec calls for.

---

## 11. Troubleshooting

| Symptom | Fix |
|---|---|
| `cuda: False` | Installed CPU torch. Reinstall from the `cu121` index (step 3). |
| YOLO weights won't download | GitHub blocked → fetch from HuggingFace into `models/` (see §3). |
| `--audio` does nothing | Install `ffmpeg` and put it on `PATH`. |
| Overlay text covers small video | Fixed — overlay upscales tiny frames + pins the panel to 30% top-right. |
| WebSocket closes immediately | `video` path not readable by the server — upload first, pass the returned path. |
| Out of VRAM | Lower `--imgsz`, drop `--scene/--audio`, or use `yolo11s-pose` (not `m`/`x`). |
| Slow on CPU | Lower `--fps` (e.g. `--fps 6`) and `--imgsz 480`. |
