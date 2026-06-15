
"""Download a violence-detection dataset for training the PREVAIL risk head.

GitHub and Google Drive are blocked in some environments; Kaggle needs a token.
This script prefers **HuggingFace Hub** (credential-free, reachable) and falls
back to Kaggle if a token is present.

It lays clips out as:
    data/clips/violence/*.mp4
    data/clips/nonviolence/*.mp4
which is exactly what extract_features.py expects.

Usage:
    python download_dataset.py --source hf --repo <hf_dataset_repo> [--limit 400]
    python download_dataset.py --source kaggle --kaggle <owner/dataset>
    python download_dataset.py --list                 # search HF for candidates
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data"
CLIPS = DATA / "clips"
VIDEO_EXT = {".mp4", ".avi", ".mov", ".mkv", ".webm"}

# Label inference from path/filename for common violence datasets.
# NOTE: nonviolence hints are checked FIRST, so "nonfight" wins over "fight"
# (RWF-2000 uses Fight/ and NonFight/ folders).
VIOLENCE_HINTS = ("violence", "violent", "/fight", "fight/", "_fight", "fi_",
                  "/fi/", "assault", "abuse")
NONVIOLENCE_HINTS = ("nonviolence", "non-violence", "nonviolent", "normal",
                     "nonfight", "non_fight", "no_fight", "nofight",
                     "nv_", "/nv/", "noviolence")


def classify(path_str: str) -> str | None:
    p = path_str.lower().replace("\\", "/")
    if any(h in p for h in NONVIOLENCE_HINTS):
        return "nonviolence"
    if any(h in p for h in VIOLENCE_HINTS):
        return "violence"
    return None


def list_candidates() -> None:
    from huggingface_hub import list_datasets
    print("Searching HuggingFace for violence / fight datasets...\n")
    for term in ("violence detection", "fight detection", "RWF-2000",
                 "real life violence"):
        print(f"== query: {term} ==")
        try:
            for d in list(list_datasets(search=term, limit=8)):
                print(f"   {d.id}")
        except Exception as exc:
            print("   (search failed:", exc, ")")
        print()
    print("Pick one and run:  python download_dataset.py --source hf --repo <id> --limit 400")


def download_hf(repo: str, limit: int) -> None:
    from huggingface_hub import snapshot_download
    print(f"[hf] downloading {repo} (this can be several GB)...")
    local = snapshot_download(repo_id=repo, repo_type="dataset",
                              local_dir=str(DATA / "_hf" / repo.replace("/", "__")))
    _extract_archives(Path(local))
    _ingest(Path(local), limit)


def _extract_archives(root: Path) -> None:
    """Extract any .tar.gz / .tar / .zip packed datasets (e.g. RWF-2000.tar.gz)."""
    import tarfile
    import zipfile
    for arc in list(root.rglob("*")):
        name = arc.name.lower()
        target = arc.parent / (arc.stem.replace(".tar", "") + "_extracted")
        if target.exists():
            continue
        try:
            if name.endswith((".tar.gz", ".tgz", ".tar")):
                print(f"[extract] {arc.name} -> {target.name}")
                with tarfile.open(arc) as t:
                    t.extractall(target)
            elif name.endswith(".zip"):
                print(f"[extract] {arc.name} -> {target.name}")
                with zipfile.ZipFile(arc) as z:
                    z.extractall(target)
        except Exception as exc:  # noqa: BLE001
            print(f"[extract] failed {arc.name}: {exc}")


def download_kaggle(dataset: str, limit: int) -> None:
    import os
    if not (Path.home() / ".kaggle" / "kaggle.json").exists() and not os.getenv("KAGGLE_USERNAME"):
        raise SystemExit("Kaggle needs ~/.kaggle/kaggle.json or KAGGLE_USERNAME/KAGGLE_KEY env vars.")
    from kaggle.api.kaggle_api_extended import KaggleApi
    api = KaggleApi(); api.authenticate()
    dest = DATA / "_kaggle"
    dest.mkdir(parents=True, exist_ok=True)
    print(f"[kaggle] downloading {dataset}...")
    api.dataset_download_files(dataset, path=str(dest), unzip=True)
    _ingest(dest, limit)


def _ingest(root: Path, limit: int) -> None:
    """Copy/organise all videos under root into clips/<label>/, inferring labels."""
    (CLIPS / "violence").mkdir(parents=True, exist_ok=True)
    (CLIPS / "nonviolence").mkdir(parents=True, exist_ok=True)
    counts = {"violence": 0, "nonviolence": 0, "unlabelled": 0}
    for vid in root.rglob("*"):
        if vid.suffix.lower() not in VIDEO_EXT:
            continue
        label = classify(str(vid))
        if label is None:
            counts["unlabelled"] += 1
            continue
        if limit and counts[label] >= limit:
            continue
        out = CLIPS / label / f"{label}_{counts[label]:05d}{vid.suffix.lower()}"
        try:
            shutil.copy2(vid, out)
            counts[label] += 1
        except Exception as exc:
            print("  skip", vid.name, exc)
    print(f"[ingest] {counts}")
    print(f"[ingest] organised clips under {CLIPS}")
    if counts["violence"] == 0 and counts["nonviolence"] == 0:
        print("WARNING: no labels inferred. Inspect the dataset layout and adjust "
              "VIOLENCE_HINTS / NONVIOLENCE_HINTS, or sort the clips manually.")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true", help="search HF for candidate datasets")
    ap.add_argument("--source", choices=["hf", "kaggle"], default="hf")
    ap.add_argument("--repo", default="", help="HF dataset repo id")
    ap.add_argument("--kaggle", default="", help="kaggle owner/dataset slug")
    ap.add_argument("--limit", type=int, default=400, help="max clips per class")
    args = ap.parse_args()

    DATA.mkdir(exist_ok=True)
    if args.list:
        list_candidates(); return 0
    if args.source == "hf":
        if not args.repo:
            raise SystemExit("--repo required for --source hf (or use --list)")
        download_hf(args.repo, args.limit)
    else:
        if not args.kaggle:
            raise SystemExit("--kaggle required for --source kaggle")
        download_kaggle(args.kaggle, args.limit)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
