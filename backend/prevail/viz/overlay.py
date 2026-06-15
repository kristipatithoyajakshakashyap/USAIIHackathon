"""Draws boxes, track ids, skeletons, and a live risk panel on a frame.

All overlay geometry scales with frame size, so the risk panel stays pinned to
the top-right corner and occupies a fixed *fraction* of the frame (it never
covers the video) on both tiny CCTV clips (e.g. 424x320) and full-HD streams.
Very small frames are upscaled to a readable minimum width first, and person
boxes/keypoints are scaled by the same factor so they stay aligned.
"""

from __future__ import annotations

import cv2
import numpy as np

from ..pipeline.engine import EngineOutput
from ..pipeline.tracker import TrackedPerson

# COCO-17 skeleton edges.
_SKELETON = [
    (5, 6), (5, 7), (7, 9), (6, 8), (8, 10), (5, 11), (6, 12), (11, 12),
    (11, 13), (13, 15), (12, 14), (14, 16), (0, 5), (0, 6),
]

_BAND_COLOR = {
    "SAFE": (90, 200, 90),
    "LOW": (90, 220, 220),
    "MODERATE": (60, 170, 250),
    "HIGH": (60, 90, 250),
    "CRITICAL": (60, 60, 255),
}
_KP_MIN_CONF = 0.3

# Small frames are upscaled to at least this width so overlay text is legible.
_MIN_RENDER_WIDTH = 860
# Risk panel occupies this fraction of frame width, pinned top-right.
_PANEL_W_FRAC = 0.30


def render(out: EngineOutput) -> np.ndarray:
    orig_w = out.frame.shape[1]
    frame = _ensure_min_width(out.frame)
    coord_scale = frame.shape[1] / max(orig_w, 1)   # upscale factor for detections
    band_color = _BAND_COLOR.get(out.risk.band, (200, 200, 200))
    k = frame.shape[1] / 1280.0                      # font/thickness scale

    for p in out.persons:
        _draw_person(frame, p, band_color, k, coord_scale)

    _draw_risk_panel(frame, out, band_color, k)
    _draw_footer(frame, out, k)
    return frame


def _ensure_min_width(frame: np.ndarray) -> np.ndarray:
    h, w = frame.shape[:2]
    if w >= _MIN_RENDER_WIDTH:
        return frame.copy()
    scale = _MIN_RENDER_WIDTH / w
    return cv2.resize(frame, (_MIN_RENDER_WIDTH, int(round(h * scale))),
                      interpolation=cv2.INTER_LINEAR)


def _draw_person(frame, p: TrackedPerson, color, k: float, s: float) -> None:
    x1, y1, x2, y2 = (p.bbox * s).astype(int)
    th = max(1, int(round(2 * k)))
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, th)
    cv2.putText(frame, f"ID {p.track_id}", (x1, max(y1 - 6, 12)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5 * k, color, max(1, int(k + 0.5)), cv2.LINE_AA)
    _draw_skeleton(frame, p, k, s)


def _draw_skeleton(frame, p: TrackedPerson, k: float, s: float) -> None:
    kp, kc = p.keypoints * s, p.kp_conf
    line_th = max(1, int(round(2 * k)))
    rad = max(2, int(round(3 * k)))
    for a, b in _SKELETON:
        if kc[a] >= _KP_MIN_CONF and kc[b] >= _KP_MIN_CONF:
            cv2.line(frame, tuple(kp[a].astype(int)), tuple(kp[b].astype(int)),
                     (230, 230, 230), line_th, cv2.LINE_AA)
    for i in range(len(kp)):
        if kc[i] >= _KP_MIN_CONF:
            cv2.circle(frame, tuple(kp[i].astype(int)), rad, (0, 255, 255), -1)


def _draw_risk_panel(frame, out: EngineOutput, color, k: float) -> None:
    h, w = frame.shape[:2]
    pw = int(w * _PANEL_W_FRAC)
    ph = int(pw * 0.62)
    margin = int(w * 0.015)
    x0, y0 = w - pw - margin, margin
    _alpha_box(frame, x0, y0, pw, ph, (25, 25, 25), 0.55)

    pad = int(pw * 0.05)
    score = out.risk.score
    title_fs, score_fs, band_fs, reason_fs = 0.5 * k, 1.3 * k, 0.75 * k, 0.42 * k

    cv2.putText(frame, "AGGRESSION RISK", (x0 + pad, y0 + int(ph * 0.13)),
                cv2.FONT_HERSHEY_SIMPLEX, title_fs, (235, 235, 235), max(1, int(k + 0.5)), cv2.LINE_AA)
    cv2.putText(frame, f"{score:4.0f}", (x0 + pad, y0 + int(ph * 0.42)),
                cv2.FONT_HERSHEY_SIMPLEX, score_fs, color, max(2, int(round(3 * k))), cv2.LINE_AA)
    cv2.putText(frame, out.risk.band, (x0 + int(pw * 0.45), y0 + int(ph * 0.38)),
                cv2.FONT_HERSHEY_SIMPLEX, band_fs, color, max(1, int(round(2 * k))), cv2.LINE_AA)

    # Risk bar
    bx, by = x0 + pad, y0 + int(ph * 0.5)
    bw, bh = pw - 2 * pad, max(6, int(ph * 0.06))
    cv2.rectangle(frame, (bx, by), (bx + bw, by + bh), (80, 80, 80), -1)
    cv2.rectangle(frame, (bx, by), (bx + int(bw * score / 100.0), by + bh), color, -1)

    # Top reasons
    ry = y0 + int(ph * 0.66)
    cv2.putText(frame, "Top factors:", (x0 + pad, ry),
                cv2.FONT_HERSHEY_SIMPLEX, reason_fs, (210, 210, 210), 1, cv2.LINE_AA)
    line_h = int(ph * 0.11)
    if out.reasons:
        for i, (label, pts) in enumerate(out.reasons):
            cv2.putText(frame, f"- {label} (+{pts:.0f})", (x0 + pad, ry + (i + 1) * line_h),
                        cv2.FONT_HERSHEY_SIMPLEX, reason_fs, (200, 200, 200), 1, cv2.LINE_AA)
    else:
        cv2.putText(frame, "- nominal activity", (x0 + pad, ry + line_h),
                    cv2.FONT_HERSHEY_SIMPLEX, reason_fs, (170, 170, 170), 1, cv2.LINE_AA)


def _draw_footer(frame, out: EngineOutput, k: float) -> None:
    h, w = frame.shape[:2]
    txt = (f"persons:{len(out.persons)}  proc:{out.proc_fps:4.1f}fps  "
           f"dev:{out.device}  head:{out.model_name}  t:{out.timestamp:4.1f}s")
    fs = 0.45 * k
    box_w = min(int(w * 0.62), w - 8)
    bh = int(26 * k)
    _alpha_box(frame, 8, h - bh - 6, box_w, bh, (25, 25, 25), 0.55)
    cv2.putText(frame, txt, (14, h - int(bh * 0.35)),
                cv2.FONT_HERSHEY_SIMPLEX, fs, (230, 230, 230), max(1, int(k + 0.5)), cv2.LINE_AA)


def _alpha_box(frame, x, y, w, h, color, alpha) -> None:
    x, y = max(x, 0), max(y, 0)
    x2, y2 = min(x + w, frame.shape[1]), min(y + h, frame.shape[0])
    sub = frame[y:y2, x:x2]
    if sub.size == 0:
        return
    overlay = np.full_like(sub, color, dtype=np.uint8)
    frame[y:y2, x:x2] = cv2.addWeighted(overlay, alpha, sub, 1 - alpha, 0)
