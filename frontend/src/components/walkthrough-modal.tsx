"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Play, ArrowRight, X, ChevronRight, ChevronLeft, HelpCircle } from "lucide-react";

interface WalkthroughModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  forceOpen?: boolean;
}

export function WalkthroughModal({ isOpen = false, onClose, forceOpen = false }: WalkthroughModalProps) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (forceOpen) {
      setShow(true);
      setStep(0);
      return;
    }
    const hasSeen = localStorage.getItem("prevail-walkthrough-seen");
    if (!hasSeen || isOpen) {
      setShow(true);
      setStep(0);
    }
  }, [isOpen, forceOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleClose = () => {
    localStorage.setItem("prevail-walkthrough-seen", "true");
    setShow(false);
    if (onClose) onClose();
  };

  const steps = [
    {
      title: "Welcome to PREVAIL",
      description: "PREVAIL (Predictive Violence & Aggression Escalation Intelligence Layer) is a state-of-the-art decision support dashboard designed to anticipate, detect, and explain physical violence triggers before they escalate.",
      tagline: true,
      icon: ShieldCheck,
      details: [
        "Human-in-the-loop support, not autonomous enforcement",
        "Multimodal fusion: Computer vision (poses, trajectories) + Audio tone metrics",
        "Explainable AI: Trace predictions directly to SHAP feature inputs"
      ]
    },
    {
      title: "Step 1: Real-Time Surveillance & HUD",
      description: "The Main Dashboard displays CCTV feeds combined with YOLO11-based detection overlays. ByteTrack keeps track of coordinates while MediaPipe estimates skeletal coordinates in real-time.",
      icon: Play,
      details: [
        "Circular gradient gauge aggregates risk values dynamically",
        "Camera thumbnails draw bounding boxes and skeleton vectors",
        "Quick action logs report anomalous behavior events instantly"
      ]
    },
    {
      title: "Step 2: AI Explanations & SHAP Values",
      description: "Every elevated risk score is fully decodable. We do not use black-box scoring.",
      icon: HelpCircle,
      details: [
        "Alert details modal breaks down threat factors via SHAP bar graphs",
        "See exactly how raised arms, speed spikes, or loud anger tones contribute to scores",
        "Gemini 2.5 Flash compiles clear natural language reports from telemetry"
      ]
    }
  ];

  if (!show) return null;

  const ActiveIcon = steps[step].icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070c14] shadow-2xl p-6"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Stepper Indicators */}
          <div className="flex items-center gap-1.5 mb-6">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === step ? "w-8 bg-cyan-500" : "w-2 bg-slate-200 dark:bg-slate-800"
                }`}
              />
            ))}
          </div>

          {/* Step Contents */}
          <div className="min-h-[280px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 rounded-xl">
                  <ActiveIcon className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  {steps[step].title}
                </h3>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                {steps[step].description}
              </p>

              {steps[step].tagline && (
                <div className="p-3.5 mb-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-cyan-950/30 text-xs italic font-semibold text-cyan-600 dark:text-cyan-400 font-sans leading-relaxed">
                  &ldquo;PREVAIL transforms surveillance into proactive, explainable, multimodal violence escalation intelligence by combining computer vision, behavioral analysis, and GenAI-assisted decision support.&rdquo;
                </div>
              )}

              <ul className="space-y-2.5">
                {steps[step].details.map((detail, dIdx) => (
                  <li key={dIdx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stepper Controls */}
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-100 dark:border-slate-900">
              <button
                disabled={step === 0}
                onClick={() => setStep(prev => prev - 1)}
                className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-35 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              {step < steps.length - 1 ? (
                <button
                  onClick={() => setStep(prev => prev + 1)}
                  className="inline-flex items-center gap-1 text-xs font-bold px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white shadow-sm transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleClose}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-md transition-colors cursor-pointer"
                >
                  <span>Launch Console</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
