"""Extract PREVAIL feature vectors from labelled clips into a training CSV.

Runs each clip through the real perception pipeline (YOLO11-pose + motion +
crowd + pose) and writes one row per analysed frame: the 15-dim feature vector
plus the clip-level label (weak supervision — every frame of a violent clip is
labelled 1). This keeps the trained head per-frame compatible with run_live.py.

Input layout (produced by download_dataset.py):
    data/clips/violence/*.mp4        -> label 1
    data/clips/nonviolence/*.mp4     -> label 0

Usage:
    python extract_features.py --clips data/clips --out data/features.csv \
        --limit-per-class 300 --stride-frames 3
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

from prevail.config import Settings
from prevail.pipeline.engine import PrevailEngine
from prevail.pipeline.features import FEATURE_NAMES

VIDEO_EXT = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
LABEL_DIRS = {"violence": 1, "nonviolence": 0}


def iter_clips(clips_dir: Path, limit: int):
    for sub, label in LABEL_DIRS.items():
        folder = clips_dir / sub
        if not folder.is_dir():
            print(f"[warn] missing folder: {folder}")
            continue
        vids = sorted(v for v in folder.iterdir() if v.suffix.lower() in VIDEO_EXT)
        if limit:
            vids = vids[:limit]
        print(f"[clips] {sub}: {len(vids)} clips")
        for v in vids:
            yield v, label


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--clips", default="data/clips")
    ap.add_argument("--out", default="data/features.csv")
    ap.add_argument("--limit-per-class", type=int, default=300)
    ap.add_argument("--stride-frames", type=int, default=3,
                    help="keep every Nth analysed frame to shrink the CSV")
    ap.add_argument("--fps", type=float, default=10.0, help="analysis FPS during extraction")
    ap.add_argument("--device", default="cuda")
    args = ap.parse_args()

    clips_dir = Path(args.clips)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    settings = Settings(device=args.device, target_fps=args.fps)
    engine = PrevailEngine(settings)   # load model ONCE; run() resets state per clip
    rows_written = 0
    clips_done = 0

    with open(out_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(FEATURE_NAMES + ["label"])

        for clip, label in iter_clips(clips_dir, args.limit_per_class):
            try:
                kept = 0
                for i, out in enumerate(engine.run(str(clip))):
                    if i % max(args.stride_frames, 1) != 0:
                        continue
                    row = [round(out.features[c], 5) for c in FEATURE_NAMES] + [label]
                    writer.writerow(row)
                    kept += 1
                rows_written += kept
                clips_done += 1
                if clips_done % 10 == 0:
                    print(f"  processed {clips_done} clips, {rows_written} rows")
            except Exception as exc:  # noqa: BLE001
                print(f"  [skip] {clip.name}: {exc}")

    print(f"\n[done] {clips_done} clips -> {rows_written} rows -> {out_path}")
    print("next:  python train_risk_head.py --csv", out_path, "--out models/risk_head.pt")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
