# PREVAIL

## Predictive Violence & Aggression Escalation Intelligence Layer

AI-powered multimodal decision-support system for predicting aggression escalation using behavioral, spatial, audio, and temporal cues.

## Vision

PREVAIL estimates aggression risk before physical confrontation by combining computer vision, audio analysis, crowd behavior, temporal reasoning, and explainable AI.

**Focus:** Human-in-the-loop decision support, not autonomous enforcement.

---

## Hardware Target

This version is optimized for:

- NVIDIA RTX 4090 class GPU
- 16 GB VRAM
- 32 GB system RAM
- Local development and hackathon demo setup

The project avoids training large end-to-end multimodal models. Most models stay pretrained. Only the small risk prediction head is fine-tuned.

---

## Core AI Features

- Person detection
- Multi-object tracking
- Pose estimation
- Movement and trajectory analysis
- Crowd density estimation
- Crowd interaction detection
- Audio emotion analysis
- Scene understanding
- Temporal behavior analysis
- Aggression risk prediction
- Explainable AI
- AI-generated incident summary

---

## Updated AI Pipeline

```text
Video Stream
   ↓
YOLO11s / YOLO11m Person Detection
   ↓
ByteTrack Multi-Object Tracking
   ↓
YOLO11-Pose-s or MediaPipe Pose
   ↓
Trajectory + Crowd Feature Extraction
   ↓
wav2vec2-base Audio Emotion Features
   ↓
SigLIP-base or CLIP ViT-B/32 Scene Embeddings
   ↓
Small Transformer Encoder Fusion
   ↓
2-Layer MLP Risk Prediction Head
   ↓
SHAP Explainability
   ↓
Gemini 2.5 Flash Incident Summary
   ↓
Live Dashboard
```

---

## Updated Model Stack

| Task | Recommended Model | Reason |
|---|---|---|
| Person Detection | YOLO11s or YOLO11m | Good balance of speed and accuracy for real-time CCTV processing |
| Object Tracking | ByteTrack | Lightweight and strong for tracking multiple people across frames |
| Pose Estimation | YOLO11-Pose-s or MediaPipe Pose | Use MediaPipe for a simple demo. Use YOLO11-Pose-s for cleaner integration |
| Movement Analysis | Custom Python features | Extract speed, direction, acceleration, distance, and trajectory changes |
| Crowd Density | YOLO detection count + spatial clustering | Easy to implement and efficient on one GPU |
| Crowd Interaction | Distance-based and motion-based rules | Detect people moving toward each other or gathering in one area |
| Audio Emotion | wav2vec2-base emotion model | Detects anger, fear, high-intensity voice, and emotional tone |
| Scene Understanding | SigLIP-base or CLIP ViT-B/32 | Creates scene/context embeddings from frames |
| Temporal Reasoning | Small Transformer Encoder | Learns escalation patterns over time |
| Risk Prediction | 2-layer MLP Head | Small, fast, and practical to fine-tune |
| Explainability | SHAP | Shows which factors increased the risk score |
| Incident Report | Gemini 2.5 Flash API | Generates readable incident summaries without using local GPU memory |

---

## Recommended MVP Model Stack

For a hackathon or first working version, use this stack:

```text
YOLO11s
ByteTrack
MediaPipe Pose
wav2vec2-base emotion model
SigLIP-base or CLIP ViT-B/32
Small Transformer Encoder
2-Layer MLP Risk Head
SHAP
Gemini 2.5 Flash API
```

This stack is realistic for your hardware and easier to build than full end-to-end multimodal training.

---

## What Should Be Fine-Tuned

Only fine-tune:

```text
Risk Prediction MLP Head
```

Optional later fine-tuning:

```text
Small Transformer Encoder
```

Keep these pretrained:

```text
YOLO11s / YOLO11m
ByteTrack
MediaPipe Pose or YOLO11-Pose-s
wav2vec2-base
SigLIP-base / CLIP ViT-B/32
Gemini API
```

---

## Why This Model Setup Works

### 1. It fits your GPU

YOLO11s, MediaPipe, wav2vec2-base, and SigLIP-base are practical for one RTX 4090 class GPU. You avoid large video foundation models that need more memory and longer training time.

### 2. It supports real-time demo

The detection, tracking, and pose steps run frame by frame. The risk model uses extracted features instead of processing huge raw video tensors.

### 3. It is easier to explain

The model predicts risk using clear features:

- Movement speed
- Direction change
- Crowd density
- Distance between people
- Pose aggression indicators
- Audio intensity
- Scene sensitivity
- Temporal escalation

### 4. It is safer and more responsible

The system supports human decision-making. It does not automatically punish, identify, or enforce action.

---

## Suggested Input Features for the Risk Model

The MLP risk model should receive structured features such as:

| Feature Group | Example Features |
|---|---|
| Pose | Raised arms, forward lean, sudden limb movement |
| Movement | Speed, acceleration, direction change, running pattern |
| Tracking | Person distance, approach speed, group movement |
| Crowd | Density, convergence, clustering, crowd flow |
| Audio | Anger probability, fear probability, volume intensity |
| Scene | Indoor/outdoor, public area, sensitive location embedding |
| Temporal | Risk trend over last 5 to 30 seconds |

---

## Risk Levels

| Score | Level | Meaning |
|---|---|---|
| 0-25 | Safe | Normal activity |
| 26-50 | Low | Mild unusual behavior |
| 51-75 | Moderate | Possible escalation |
| 76-90 | High | Strong escalation signals |
| 91-100 | Critical | Immediate attention needed |

---

## Risk Factors

The system increases the risk score when it detects:

- Aggressive posture
- Rapid movement
- Sudden acceleration
- People moving toward each other quickly
- Crowd convergence
- High voice intensity
- Angry or fearful audio emotion
- Sensitive scene context
- Risk increasing over time

---

## Datasets

| Purpose | Dataset |
|---|---|
| Violence detection | RWF-2000 |
| Crime or anomaly recognition | UCF Crime |
| Human action recognition | HMDB51 |
| Pose estimation reference | COCO Keypoints |
| Audio emotion recognition | RAVDESS |
| Scene understanding | Places365 |
| Crowd behavior | ShanghaiTech |

---

## Training Strategy

### Stage 1: Feature Extraction

Use pretrained models to extract features from video and audio.

```text
YOLO11 → person boxes
ByteTrack → person IDs
Pose model → body keypoints
wav2vec2 → audio emotion features
SigLIP / CLIP → scene embeddings
```

### Stage 2: Feature Engineering

Create simple numerical features.

Examples:

```text
person_count
average_speed
max_acceleration
crowd_density
distance_between_people
audio_anger_score
audio_intensity
scene_sensitivity_score
risk_trend
```

### Stage 3: Risk Model Training

Train a small MLP classifier or regressor.

Output options:

```text
Risk class: Safe, Low, Moderate, High, Critical
Risk score: 0 to 100
```

### Stage 4: Explanation

Use SHAP to show which features affected the prediction.

Example:

```text
Risk Score: 84
Main Reasons:
- Crowd convergence
- Rapid movement
- Angry audio tone
- Aggressive posture
```

---

## Recommended Runtime Settings

| Setting | Recommended Value |
|---|---|
| Video resolution | 640x640 |
| Video FPS for analysis | 10 to 15 FPS |
| Clip length | 16 to 32 frames |
| Batch size | 1 or 2 |
| Precision | FP16 |
| Detection model | YOLO11s for speed, YOLO11m for better accuracy |
| Pose model | MediaPipe for simple demo, YOLO11-Pose-s for stronger pipeline |
| Audio window | 2 to 5 seconds |
| Risk update interval | Every 1 to 3 seconds |

---

## Models to Avoid for the First Version

Avoid these in the MVP:

- YOLO11x
- Large video transformers
- Full end-to-end multimodal training
- 3D CNNs trained from scratch
- Large local LLMs for report generation
- Real-time processing at full 4K resolution

These will make the project slower and harder to finish.

---

## Dashboard

The dashboard should include:

- Live monitoring
- Camera feed
- Risk score card
- Alert center
- Incident explorer
- Analytics page
- Heatmap
- Explainability panel
- Camera management
- AI incident reports
- Settings page

---

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- TailwindCSS
- shadcn/ui
- Framer Motion
- Recharts

### Backend

- FastAPI
- Python
- WebSockets
- REST API

### AI

- PyTorch
- OpenCV
- Ultralytics
- MediaPipe
- Transformers
- SHAP

### Database

- PostgreSQL
- Redis

### Deployment

- Docker
- Firebase Hosting
- Google Cloud Run

---

## APIs

### REST APIs

```http
POST /predict
POST /upload
GET /alerts
GET /incidents
GET /analytics
GET /cameras
```

### WebSocket APIs

```text
/live-risk
/live-alerts
/live-camera
```

---

## Database Tables

```text
Users
Cameras
Alerts
Incidents
RiskScores
Analytics
Logs
```

---

## Security

- JWT authentication
- Role-based access control
- HTTPS
- Audit logs
- Rate limiting
- Server-side AI inference

---

## Team Allocation

### AI and Vision

- YOLO11s / YOLO11m detection
- ByteTrack tracking
- Pose extraction
- Movement features

### AI and Multimodal

- wav2vec2 audio emotion
- SigLIP / CLIP scene embeddings
- Transformer fusion
- Risk model
- SHAP explanations
- Gemini incident summaries

### Frontend

- Dashboard
- Live camera view
- Alert center
- Analytics
- UI/UX

### Backend

- FastAPI
- WebSockets
- PostgreSQL
- Redis
- Authentication

### Integration

- Docker
- Deployment
- Testing
- Demo video
- Final presentation

---

## Demo Flow

1. Upload or stream CCTV video.
2. Detect people using YOLO11s or YOLO11m.
3. Track people using ByteTrack.
4. Display pose skeletons.
5. Analyze movement and crowd behavior.
6. Analyze audio emotion.
7. Generate scene embeddings.
8. Combine features using the small Transformer Encoder.
9. Predict aggression risk using the MLP head.
10. Explain the result using SHAP.
11. Display live dashboard alert.
12. Generate AI incident summary using Gemini.
13. Export the incident report.

---

## Future Scope

- Cross-camera tracking
- Graph-based crowd reasoning
- Edge AI deployment
- Drone integration
- Multi-agent AI assistant
- Smart city integration
- Fine-tuned multimodal transformer
- Larger video-language model support

---

## Tagline

**PREVAIL transforms surveillance into proactive, explainable, multimodal violence escalation intelligence by combining computer vision, behavioral analysis, and GenAI-assisted decision support.**
