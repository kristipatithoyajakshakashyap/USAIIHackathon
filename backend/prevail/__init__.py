"""PREVAIL — Predictive Violence & Aggression Escalation Intelligence Layer.

A modular, mostly-pretrained multimodal pipeline that turns CCTV video (and
optionally audio) into an explainable aggression-risk score. Every heavy model
is used as a frozen feature extractor; only the small risk head is trainable.

Public surface:
    from prevail.pipeline.engine import PrevailEngine
    from prevail.config import Settings
"""

__version__ = "0.1.0"
