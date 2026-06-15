"""Train the 2-layer MLP risk head (the only fine-tuned component).

This is intentionally minimal and decoupled: you produce a CSV of feature vectors
+ labels (one row per analysed frame/clip), and this script trains the MLP whose
architecture matches ``prevail.pipeline.risk.MLPRiskModel`` and saves a state_dict
that ``run_live.py --risk-weights`` / the API can load.

CSV format (header required):
    person_count,crowd_density,proximity,convergence,avg_speed,max_acceleration,
    max_direction_change,pose_raised_arms,pose_forward_lean,pose_limb_motion,
    audio_anger,audio_fear,audio_intensity,scene_sensitivity,risk_trend,label

`label` is the target risk in [0,1] (or {0,1} for violent/not). Features should be
the same normalised 0..1 values the pipeline emits — you can dump them by logging
``out.features`` from the engine while running labelled clips.

Usage:
    python train_risk_head.py --csv data/labels.csv --out models/risk_head.pt
"""

from __future__ import annotations

import argparse

import numpy as np

from prevail.pipeline.features import FEATURE_NAMES, N_FEATURES


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--out", default="models/risk_head.pt")
    ap.add_argument("--epochs", type=int, default=300)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--val-frac", type=float, default=0.2)
    ap.add_argument("--batch-size", type=int, default=256)
    ap.add_argument("--device", default="cuda")
    args = ap.parse_args()

    import torch
    import torch.nn as nn

    dev = args.device if (args.device == "cuda" and torch.cuda.is_available()) else "cpu"
    X, y = _load_csv(args.csv)
    n_val = max(1, int(len(X) * args.val_frac))
    perm = np.random.permutation(len(X))
    val_idx, tr_idx = perm[:n_val], perm[n_val:]

    Xt = torch.tensor(X[tr_idx], device=dev); yt = torch.tensor(y[tr_idx], device=dev).unsqueeze(1)
    Xv = torch.tensor(X[val_idx], device=dev); yv = torch.tensor(y[val_idx], device=dev).unsqueeze(1)

    # Architecture MUST match prevail.pipeline.risk.MLPRiskModel.
    net = nn.Sequential(
        nn.Linear(N_FEATURES, 64), nn.ReLU(),
        nn.Linear(64, 1), nn.Sigmoid(),
    ).to(dev)
    opt = torch.optim.Adam(net.parameters(), lr=args.lr, weight_decay=1e-5)
    # Class weighting in case labels drift from 50/50.
    pos = float((y[tr_idx] > 0.5).sum()); neg = len(tr_idx) - pos
    pos_w = neg / max(pos, 1.0)
    loss_fn = nn.BCELoss(reduction="none")

    n = len(tr_idx)
    best_auc, best_state = -1.0, None
    print(f"device={dev}  train={n}  val={len(val_idx)}  pos_weight={pos_w:.2f}")
    for ep in range(args.epochs):
        net.train()
        order = torch.randperm(n, device=dev)
        for i in range(0, n, args.batch_size):
            idx = order[i:i + args.batch_size]
            xb, yb = Xt[idx], yt[idx]
            opt.zero_grad()
            p = net(xb).clamp(1e-6, 1 - 1e-6)
            w = torch.where(yb > 0.5, pos_w, 1.0)
            loss = (loss_fn(p, yb) * w).mean()
            loss.backward(); opt.step()
        if (ep + 1) % 20 == 0 or ep == args.epochs - 1:
            net.eval()
            with torch.no_grad():
                pv = net(Xv).cpu().numpy().ravel()
            a = _auc(y[val_idx], pv)
            print(f"epoch {ep+1:4d}  val_AUC {a:.4f}  (best {max(a,best_auc):.4f})")
            if a > best_auc:
                best_auc = a
                best_state = {k: v.detach().cpu().clone() for k, v in net.state_dict().items()}

    torch.save(best_state if best_state is not None else net.state_dict(), args.out)
    print(f"saved risk head -> {args.out}   best frame-level val AUC = {best_auc:.4f}")
    print("run:  python run_live.py --video clip.mp4 --risk-weights", args.out)
    return 0


def _auc(y, s):
    """Rank-based ROC AUC (no sklearn dependency)."""
    y = np.asarray(y); s = np.asarray(s)
    n_pos = int((y == 1).sum()); n_neg = int((y == 0).sum())
    if n_pos == 0 or n_neg == 0:
        return float("nan")
    order = np.argsort(s)
    ranks = np.empty(len(s)); ranks[order] = np.arange(1, len(s) + 1)
    return float((ranks[y == 1].sum() - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg))


def _load_csv(path: str):
    import csv

    feats, labels = [], []
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        missing = [c for c in FEATURE_NAMES + ["label"] if c not in reader.fieldnames]
        if missing:
            raise SystemExit(f"CSV missing columns: {missing}")
        for row in reader:
            feats.append([float(row[c]) for c in FEATURE_NAMES])
            labels.append(float(row["label"]))
    return (np.array(feats, dtype=np.float32), np.array(labels, dtype=np.float32))


if __name__ == "__main__":
    raise SystemExit(main())
