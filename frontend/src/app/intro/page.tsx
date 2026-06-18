"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Shield, ChevronRight, Eye, Cpu, Activity } from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────
interface Figure { id: number; x: number; y: number; scale: number; aggressive: boolean; }

const FIGURES: Figure[] = [
  { id: 1, x: 18, y: 58, scale: 1.0,  aggressive: false },
  { id: 2, x: 38, y: 55, scale: 1.1,  aggressive: true  },
  { id: 3, x: 58, y: 60, scale: 0.9,  aggressive: false },
  { id: 4, x: 76, y: 57, scale: 1.0,  aggressive: true  },
  { id: 5, x: 28, y: 72, scale: 0.8,  aggressive: false },
  { id: 6, x: 68, y: 70, scale: 0.85, aggressive: false },
];

const STATS = [
  { label: "AUC Score",     value: "0.879", suffix: "",   color: "#00f0ff" },
  { label: "Balanced Acc.", value: "81.3",  suffix: "%",  color: "#a78bfa" },
  { label: "Risk Bands",    value: "5",     suffix: "",   color: "#f97316" },
  { label: "Avg. Latency",  value: "47",    suffix: "ms", color: "#34d399" },
];

// ─── Glitch typewriter ────────────────────────────────────────────────────────
const GLITCH = "!@#$%^&*<>?/\\|[]{}";
function useGlitchText(final: string, delayS = 0) {
  const [text, setText] = useState("");
  useEffect(() => {
    let frame = 0;
    let t: ReturnType<typeof setTimeout>;
    const totalFrames = final.length * 6;
    const tick = () => {
      if (frame < delayS * 60) { frame++; t = setTimeout(tick, 16); return; }
      const elapsed = frame - delayS * 60;
      const revealed = Math.floor(elapsed / 6);
      const glitch = elapsed < totalFrames
        ? Array.from({ length: Math.min(3, final.length - revealed) })
            .map(() => GLITCH[Math.floor(Math.random() * GLITCH.length)]).join("")
        : "";
      setText(final.slice(0, revealed) + glitch);
      frame++;
      if (revealed < final.length) t = setTimeout(tick, 16);
      else setText(final);
    };
    t = setTimeout(tick, 16);
    return () => clearTimeout(t);
  }, [final, delayS]);
  return text;
}

// ─── Radar Canvas ─────────────────────────────────────────────────────────────
function RadarCanvas({ onDetect }: { onDetect: (id: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angle     = useRef(0);
  const detected  = useRef<Set<number>>(new Set());
  const raf       = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const S = canvas.width;
    const CX = S / 2, CY = S / 2, R = S * 0.46;

    const draw = () => {
      ctx.clearRect(0, 0, S, S);

      // rings
      [0.25, 0.5, 0.75, 1].forEach(f => {
        ctx.beginPath(); ctx.arc(CX, CY, R * f, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,240,255,0.10)"; ctx.lineWidth = 1; ctx.stroke();
      });

      // crosshairs
      ctx.strokeStyle = "rgba(0,240,255,0.08)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(CX - R, CY); ctx.lineTo(CX + R, CY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CX, CY - R); ctx.lineTo(CX, CY + R); ctx.stroke();

      // sweep wedge
      const SW = Math.PI * 0.55;
      ctx.save();
      ctx.translate(CX, CY); ctx.rotate(angle.current);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, -SW, 0); ctx.closePath();
      ctx.fillStyle = "rgba(0,240,255,0.06)"; ctx.fill();
      // leading edge
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R, 0);
      ctx.strokeStyle = "rgba(0,240,255,0.85)"; ctx.lineWidth = 1.5;
      ctx.shadowColor = "#00f0ff"; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
      ctx.restore();

      // blips
      FIGURES.forEach(fig => {
        if (!detected.current.has(fig.id)) return;
        const bx = (fig.x / 100) * S, by = (fig.y / 100) * S;
        if (Math.hypot(bx - CX, by - CY) > R) return;
        const c = fig.aggressive ? "#ef4444" : "#00f0ff";
        ctx.beginPath(); ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
        const p = (Date.now() % 1500) / 1500;
        ctx.beginPath(); ctx.arc(bx, by, 3.5 + p * 10, 0, Math.PI * 2);
        ctx.strokeStyle = fig.aggressive
          ? `rgba(239,68,68,${(1 - p) * 0.6})`
          : `rgba(0,240,255,${(1 - p) * 0.6})`;
        ctx.lineWidth = 1; ctx.stroke();
      });

      // advance & detect
      angle.current += 0.022;
      const norm = ((angle.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      FIGURES.forEach(fig => {
        if (detected.current.has(fig.id)) return;
        const fx = (fig.x / 100) * S - CX, fy = (fig.y / 100) * S - CY;
        const fa = ((Math.atan2(fy, fx) + Math.PI * 2) % (Math.PI * 2));
        if (((norm - fa + Math.PI * 2) % (Math.PI * 2)) < 0.07) {
          detected.current.add(fig.id);
          onDetect(fig.id);
        }
      });

      raf.current = requestAnimationFrame(draw);
    };

    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, [onDetect]);

  return <canvas ref={canvasRef} width={480} height={480} className="absolute inset-0 w-full h-full" />;
}

// ─── SVG Skeleton ─────────────────────────────────────────────────────────────
function Skeleton({ aggressive }: { aggressive: boolean }) {
  const c = aggressive ? "#ef4444" : "#00f0ff";
  const f = aggressive ? "drop-shadow(0 0 4px #ef4444)" : "drop-shadow(0 0 4px #00f0ff)";
  return (
    <svg viewBox="0 0 40 80" width="40" height="80" style={{ filter: f }} className="select-none pointer-events-none">
      <circle cx="20" cy="8" r="6" fill="none" stroke={c} strokeWidth="1.8" />
      <line x1="20" y1="14" x2="20" y2="38" stroke={c} strokeWidth="1.8" />
      <line x1="6" y1="22" x2="34" y2="22" stroke={c} strokeWidth="1.8" />
      {aggressive ? (
        <>
          <line x1="6"  y1="22" x2="2"  y2="10" stroke={c} strokeWidth="1.5" />
          <line x1="2"  y1="10" x2="0"  y2="2"  stroke={c} strokeWidth="1.5" />
          <line x1="34" y1="22" x2="38" y2="10" stroke={c} strokeWidth="1.5" />
          <line x1="38" y1="10" x2="40" y2="2"  stroke={c} strokeWidth="1.5" />
        </>
      ) : (
        <>
          <line x1="6"  y1="22" x2="2"  y2="36" stroke={c} strokeWidth="1.5" />
          <line x1="34" y1="22" x2="38" y2="36" stroke={c} strokeWidth="1.5" />
        </>
      )}
      <line x1="12" y1="38" x2="28" y2="38" stroke={c} strokeWidth="1.8" />
      <line x1="12" y1="38" x2="8"  y2="58" stroke={c} strokeWidth="1.5" />
      <line x1="8"  y1="58" x2="6"  y2="76" stroke={c} strokeWidth="1.5" />
      <line x1="28" y1="38" x2="32" y2="58" stroke={c} strokeWidth="1.5" />
      <line x1="32" y1="58" x2="34" y2="76" stroke={c} strokeWidth="1.5" />
      {[[20,8],[20,22],[6,22],[34,22],[12,38],[28,38],
        ...(aggressive ? [[2,10],[38,10]] : [[2,36],[38,36]])
      ].map(([px, py], i) => <circle key={i} cx={px} cy={py} r="2" fill={c} />)}
    </svg>
  );
}

// ─── CCTV Feed ────────────────────────────────────────────────────────────────
function CCTVFeed({ id, active }: { id: number; active: boolean }) {
  return (
    <div className={`relative aspect-video rounded-lg overflow-hidden border bg-slate-950 transition-all duration-500 ${
      active ? "border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.15)]" : "border-slate-800/60"
    }`}>
      <div className="absolute inset-0 scanlines opacity-60 pointer-events-none z-10" />
      <div className="hud-corners absolute inset-2 z-20 pointer-events-none" />
      <div className="hud-corners-inner absolute inset-2 z-20 pointer-events-none" />
      <div className="absolute top-2 left-3 z-20 flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${active ? "bg-red-500 live-dot" : "bg-slate-600"}`} />
        <span className="font-mono text-[9px] text-slate-400">CAM-{String(id).padStart(2, "0")}</span>
      </div>
      <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 60">
        <line x1="33" y1="0" x2="33" y2="60" stroke="#00f0ff" strokeWidth="0.3" />
        <line x1="66" y1="0" x2="66" y2="60" stroke="#00f0ff" strokeWidth="0.3" />
        <line x1="0" y1="20" x2="100" y2="20" stroke="#00f0ff" strokeWidth="0.3" />
        <line x1="0" y1="40" x2="100" y2="40" stroke="#00f0ff" strokeWidth="0.3" />
      </svg>
      {active && (
        <div className="absolute bottom-2 right-2 z-20 font-mono text-[8px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
          LIVE
        </div>
      )}
    </div>
  );
}

// ─── Risk Meter ───────────────────────────────────────────────────────────────
function RiskMeter({ score }: { score: number }) {
  const color = score >= 76 ? "#ef4444" : score >= 51 ? "#f97316" : score >= 26 ? "#f59e0b" : "#00f0ff";
  const bands = [
    { label: "CRITICAL", min: 91, color: "#ef4444" },
    { label: "HIGH",     min: 76, color: "#f97316" },
    { label: "MOD",      min: 51, color: "#f59e0b" },
    { label: "LOW",      min: 26, color: "#60a5fa" },
    { label: "SAFE",     min: 0,  color: "#00f0ff" },
  ];
  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">Risk Level</span>
      <div className="relative w-8 h-48 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
        <motion.div
          className="absolute bottom-0 left-0 right-0"
          initial={{ height: "0%" }}
          animate={{ height: `${score}%` }}
          transition={{ duration: 2.5, ease: "easeOut", delay: 1 }}
          style={{ background: `linear-gradient(to top, ${color}, ${color}88)`, boxShadow: `0 0 12px ${color}60` }}
        />
        {[25, 50, 75].map(t => (
          <div key={t} className="absolute left-0 right-0 h-px bg-slate-700" style={{ bottom: `${t}%` }} />
        ))}
      </div>
      <motion.span
        className="font-mono font-black text-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        style={{ color }}
      >
        {score}
      </motion.span>
      <div className="flex flex-col gap-1 mt-1">
        {bands.map(b => (
          <div key={b.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ background: b.color, opacity: score >= b.min ? 1 : 0.2 }} />
            <span className="font-mono text-[8px]" style={{ color: score >= b.min ? b.color : "#334155" }}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function IntroPage() {
  const router = useRouter();
  const [detected, setDetected] = useState<Set<number>>(new Set());
  const [riskScore, setRiskScore] = useState(0);

  const title    = useGlitchText("PREVAIL", 0.4);
  const subtitle = useGlitchText("Predictive Violence & Aggression Escalation Intelligence Layer", 1.2);

  const handleEnter = () => {
    sessionStorage.setItem("prevail_intro_seen", "1");
    router.push("/");
  };

  useEffect(() => {
    const aggressive = FIGURES.filter(f => f.aggressive && detected.has(f.id)).length;
    const target = Math.min(aggressive * 38 + detected.size * 4, 84);
    const t = setTimeout(() => setRiskScore(target), 200);
    return () => clearTimeout(t);
  }, [detected]);

  const onDetect = useCallback((id: number) => {
    setDetected(prev => new Set([...prev, id]));
  }, []);

  const PIPELINE = [
    { label: "YOLO11s Detection",   color: "#00f0ff", done: detected.size >= 1 },
    { label: "ByteTrack Tracking",  color: "#00f0ff", done: detected.size >= 2 },
    { label: "Pose Estimation",     color: "#a78bfa", done: detected.size >= 3 },
    { label: "Audio Emotion",       color: "#f59e0b", done: detected.size >= 4 },
    { label: "MLP Risk Head",       color: "#f97316", done: detected.size >= 5 },
    { label: "SHAP Explainability", color: "#ef4444", done: detected.size >= 6 },
  ];

  const FACTORS = [
    { label: "Aggressive Posture", active: riskScore > 30, color: "#f97316" },
    { label: "Crowd Convergence",  active: riskScore > 20, color: "#f59e0b" },
    { label: "Rapid Movement",     active: riskScore > 40, color: "#ef4444" },
    { label: "Audio Intensity",    active: riskScore > 50, color: "#ef4444" },
    { label: "Scene Context",      active: riskScore > 10, color: "#a78bfa" },
    { label: "Temporal Trend ↑",   active: riskScore > 60, color: "#ef4444" },
  ];

  return (
    <div className="fixed inset-0 bg-[#030712] overflow-hidden flex flex-col">

      {/* Background */}
      <div className="absolute inset-0 hud-grid opacity-60 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-red-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/[0.03] blur-[160px] pointer-events-none" />

      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="flex items-center justify-between px-8 py-2.5 border-b border-slate-900/80 z-10 flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-500" />
          <span className="font-mono text-[11px] text-cyan-500 tracking-widest uppercase">
            PREVAIL SYSTEMS · v2.1.0
          </span>
        </div>
        <div className="flex items-center gap-5">
          {[
            { icon: Eye,      label: "4 Cameras Active" },
            { icon: Cpu,      label: "GPU: RTX 4090"    },
            { icon: Activity, label: "Models Loaded"    },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="hidden md:flex items-center gap-1.5 text-slate-500">
              <Icon className="w-3 h-3" />
              <span className="font-mono text-[10px]">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot" />
            <span className="font-mono text-[10px] text-emerald-500">SYSTEM ONLINE</span>
          </div>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-3 relative z-10 overflow-hidden">
        <div className="w-full max-w-7xl grid grid-cols-1 xl:grid-cols-[1fr_480px_1fr] gap-8 items-center">

          {/* ── LEFT ── */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col gap-4"
          >
            {/* CCTV grid */}
            <div>
              <p className="font-mono text-[9px] text-slate-600 uppercase tracking-widest mb-2">
                Live CCTV Feeds
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map(id => (
                  <CCTVFeed key={id} id={id} active={id === 1 || id === 3} />
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {STATS.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 + i * 0.12, duration: 0.4 }}
                  className="rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-3 backdrop-blur-sm"
                >
                  <p className="font-mono text-[9px] text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
                  <p className="font-black text-xl font-mono" style={{ color: s.color }}>
                    {s.value}<span className="text-sm font-bold">{s.suffix}</span>
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── CENTER ── */}
          <div className="flex flex-col items-center gap-3">
            {/* Title */}
            <div className="text-center">
              <motion.h1
                className="font-mono font-black text-5xl md:text-6xl tracking-[0.15em] text-white"
                style={{ textShadow: "0 0 20px rgba(0,240,255,0.4), 0 0 60px rgba(0,240,255,0.1)" }}
              >
                {title}
              </motion.h1>
              <motion.p
                animate={{ opacity: detected.size > 0 ? 1 : 0 }}
                transition={{ duration: 0.4 }}
                className="font-mono text-[10px] text-cyan-500/70 tracking-wider mt-2 max-w-xs mx-auto leading-relaxed"
              >
                {subtitle.slice(0, 50)}{subtitle.length > 50 ? "..." : ""}
              </motion.p>
            </div>

            {/* Radar + Skeletons */}
            <div className="relative w-[260px] h-[260px] md:w-[310px] md:h-[310px]">
              <RadarCanvas onDetect={onDetect} />

              {/* Detected badge */}
              <div className="absolute top-3 right-3 z-10 bg-slate-900/80 border border-slate-700 rounded-lg px-2.5 py-1.5 backdrop-blur-sm">
                <p className="font-mono text-[9px] text-slate-500">DETECTED</p>
                <p className="font-mono font-black text-lg text-cyan-400">
                  {detected.size}<span className="text-slate-600 text-xs"> / {FIGURES.length}</span>
                </p>
              </div>

              {/* Skeleton figures */}
              {FIGURES.map(fig => (
                <AnimatePresence key={fig.id}>
                  {detected.has(fig.id) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: fig.scale }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 18 }}
                      className="absolute"
                      style={{ left: `${fig.x}%`, top: `${fig.y}%`, transform: `translate(-50%,-50%)` }}
                    >
                      <div
                        className="absolute border rounded-sm"
                        style={{
                          inset: "-6px -4px",
                          borderColor: fig.aggressive ? "rgba(239,68,68,0.6)" : "rgba(0,240,255,0.5)",
                          boxShadow: fig.aggressive ? "0 0 8px rgba(239,68,68,0.25)" : "0 0 8px rgba(0,240,255,0.15)",
                        }}
                      />
                      <div
                        className="absolute -top-5 left-0 px-1 py-0.5 text-[7px] font-mono font-bold text-white rounded-t-sm"
                        style={{ background: fig.aggressive ? "#dc2626" : "#0891b2" }}
                      >
                        ID:{fig.id} {fig.aggressive && "⚠"}
                      </div>
                      <Skeleton aggressive={fig.aggressive} />
                    </motion.div>
                  )}
                </AnimatePresence>
              ))}
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.5 }}
            >
              <motion.button
                onClick={handleEnter}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="group relative flex items-center gap-3 px-8 py-3.5 rounded-full font-bold text-sm tracking-wide overflow-hidden cursor-pointer"
                style={{
                  background: "linear-gradient(135deg,rgba(0,240,255,0.15),rgba(99,102,241,0.15))",
                  border: "1px solid rgba(0,240,255,0.4)",
                  color: "#00f0ff",
                  boxShadow: "0 0 24px rgba(0,240,255,0.12),inset 0 1px 0 rgba(0,240,255,0.1)",
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: "linear-gradient(135deg,rgba(0,240,255,0.08),rgba(99,102,241,0.08))" }}
                />
                <Shield className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Enter Dashboard</span>
                <ChevronRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </motion.div>
          </div>

          {/* ── RIGHT ── */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col gap-4 items-center xl:items-start"
          >
            {/* Risk meter + factors */}
            <div className="flex gap-4 items-start">
              <RiskMeter score={riskScore} />
              <div className="flex flex-col gap-2 pt-6">
                <p className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mb-1">Risk Factors</p>
                {FACTORS.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: f.active ? 1 : 0.25, x: 0 }}
                    transition={{ delay: 1.2 + i * 0.1, duration: 0.3 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: f.active ? f.color : "#334155" }} />
                    <span className="font-mono text-[10px]" style={{ color: f.active ? f.color : "#475569" }}>{f.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* AI Pipeline */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 w-full backdrop-blur-sm">
              <p className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mb-3">AI Pipeline</p>
              {PIPELINE.map(step => (
                <div key={step.label} className="flex items-center gap-2 py-1.5 border-b border-slate-800/40 last:border-0">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-500 ${step.done ? "live-dot" : "opacity-20"}`}
                    style={{ background: step.done ? step.color : "#475569", boxShadow: step.done ? `0 0 6px ${step.color}` : "none" }}
                  />
                  <span className="font-mono text-[10px]" style={{ color: step.done ? step.color : "#475569" }}>
                    {step.label}
                  </span>
                  {step.done && <span className="ml-auto font-mono text-[8px] text-slate-600">ACTIVE</span>}
                </div>
              ))}
            </div>

            {/* Tagline */}
            <motion.p
              animate={{ opacity: detected.size >= 4 ? 1 : 0 }}
              transition={{ duration: 0.8 }}
              className="font-mono text-[10px] text-slate-500 leading-relaxed italic max-w-xs"
            >
              &quot;See it before it happens.&quot;
            </motion.p>
          </motion.div>

        </div>
      </div>

      {/* Bottom bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="flex items-center justify-between px-8 py-2 border-t border-slate-900/80 z-10 flex-shrink-0"
      >
        <span className="font-mono text-[9px] text-slate-700">
          Decision support only · Human-in-the-loop · Not autonomous enforcement
        </span>
        <div className="flex items-center gap-4">
          {["YOLO11", "ByteTrack", "wav2vec2", "SHAP", "Gemini"].map(t => (
            <span key={t} className="font-mono text-[9px] text-slate-700">{t}</span>
          ))}
        </div>
      </motion.div>

    </div>
  );
}
