"""PREVAIL local live-detection runner.

Pass a video file path and watch real-time detection, tracking, pose, and a live
aggression-risk score. This is the "is my model stack working?" validation tool.

Examples:
    python run_live.py --video path/to/clip.mp4
    python run_live.py --video clip.mp4 --scene --audio          # full multimodal
    python run_live.py --video clip.mp4 --save out.mp4 --no-show # headless export
    python run_live.py --video clip.mp4 --device cpu             # no-GPU fallback

Controls (in the window):  q = quit,  space = pause/resume.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from prevail.config import Settings
from prevail.pipeline.engine import PrevailEngine
from prevail.viz.overlay import render


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="PREVAIL live aggression-risk detection")
    ap.add_argument("--video", required=True, help="path to a video file")
    ap.add_argument("--device", default="cuda", choices=["cuda", "cpu"])
    ap.add_argument("--weights", default="yolo11s-pose.pt",
                    help="YOLO11 pose weights (auto-downloads)")
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--conf", type=float, default=0.35)
    ap.add_argument("--fps", type=float, default=12.0, help="analysis FPS")
    ap.add_argument("--scene", action="store_true", help="enable CLIP scene scoring")
    ap.add_argument("--audio", action="store_true", help="enable wav2vec2 audio emotion")
    ap.add_argument("--risk-weights", default="", help="trained MLP head .pt (optional)")
    ap.add_argument("--save", default="", help="write annotated video to this path")
    ap.add_argument("--no-show", action="store_true", help="do not open a window")
    ap.add_argument("--max-width", type=int, default=1280, help="display downscale cap")
    return ap.parse_args()


def build_settings(args: argparse.Namespace) -> Settings:
    return Settings(
        device=args.device,
        pose_weights=args.weights,
        imgsz=args.imgsz,
        conf=args.conf,
        target_fps=args.fps,
        use_scene=args.scene,
        use_audio=args.audio,
        risk_weights=args.risk_weights,
    )


def main() -> int:
    import cv2

    args = parse_args()
    if not Path(args.video).is_file():
        print(f"error: video not found: {args.video}", file=sys.stderr)
        return 2

    settings = build_settings(args)
    engine = PrevailEngine(settings)
    print(f"[prevail] device={engine.tracker.device}  head={engine.risk_model.name}  "
          f"scene={args.scene}  audio={args.audio}")
    print("[prevail] starting... (q=quit, space=pause)")

    writer = None
    paused = False
    show = not args.no_show

    try:
        gen = engine.run(args.video)
        out = None
        while True:
            if not paused:
                out = next(gen, None)
                if out is None:
                    break
                frame = render(out)
            else:
                frame = render(out) if out is not None else None

            if frame is None:
                break

            disp = _maybe_resize(frame, args.max_width)

            if args.save:
                if writer is None:
                    writer = _make_writer(args.save, disp.shape, settings.target_fps)
                writer.write(disp)

            if show:
                cv2.imshow("PREVAIL - live aggression risk", disp)
                key = cv2.waitKey(1) & 0xFF
                if key == ord("q"):
                    break
                if key == ord(" "):
                    paused = not paused
    except KeyboardInterrupt:
        print("\n[prevail] interrupted")
    finally:
        if writer is not None:
            writer.release()
        if show:
            import cv2 as _cv2
            _cv2.destroyAllWindows()

    if args.save:
        print(f"[prevail] saved annotated video to {args.save}")
    return 0


def _maybe_resize(frame, max_width: int):
    import cv2

    h, w = frame.shape[:2]
    if w <= max_width:
        return frame
    scale = max_width / w
    return cv2.resize(frame, (max_width, int(h * scale)))


def _make_writer(path: str, shape, fps: float):
    import cv2

    h, w = shape[:2]
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    return cv2.VideoWriter(path, fourcc, fps, (w, h))


if __name__ == "__main__":
    raise SystemExit(main())
