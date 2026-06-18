"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";

interface RiskGaugeProps {
  score: number;
  band: "SAFE" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  className?: string;
}

// Pre-compute tick geometry outside the component so values are
// identical on server and client (avoids floating-point hydration mismatch).
const R4 = (n: number) => Math.round(n * 1e4) / 1e4;
const TICKS = Array.from({ length: 36 }, (_, i) => {
  const angle = (i * 10 * Math.PI) / 180;
  const outerR = 100;
  const innerR = i % 3 === 0 ? 92 : 96;
  return {
    i,
    x1: R4(104 + Math.cos(angle) * outerR),
    y1: R4(104 + Math.sin(angle) * outerR),
    x2: R4(104 + Math.cos(angle) * innerR),
    y2: R4(104 + Math.sin(angle) * innerR),
    major: i % 3 === 0,
  };
});

export function RiskGauge({ score, band, className = "" }: RiskGaugeProps) {
  const radius = 76;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const [trend, setTrend] = React.useState<"up" | "down" | "flat">("flat");
  const [prevScore, setPrevScore] = React.useState(score);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (score > prevScore) setTrend("up");
    else if (score < prevScore) setTrend("down");
    else setTrend("flat");
    setPrevScore(score);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const getTheme = () => {
    switch (band) {
      case "CRITICAL":
        return {
          text: "text-red-500",
          glow: "drop-shadow-[0_0_14px_rgba(239,68,68,0.55)]",
          stroke: "#ef4444",
          strokeBg: "#1f0a0a",
          ring: "border-red-500/25",
          bgGradient: "from-red-500/15 to-red-600/5",
          accentText: "CRITICAL ALERT",
          pulseColor: "rgba(239,68,68,0.15)",
          trendColor: "text-red-500",
        };
      case "HIGH":
        return {
          text: "text-orange-500",
          glow: "drop-shadow-[0_0_14px_rgba(249,115,22,0.5)]",
          stroke: "#f97316",
          strokeBg: "#1f100a",
          ring: "border-orange-500/25",
          bgGradient: "from-orange-500/15 to-orange-600/5",
          accentText: "HIGH RISK",
          pulseColor: "rgba(249,115,22,0.15)",
          trendColor: "text-orange-500",
        };
      case "MODERATE":
        return {
          text: "text-amber-500",
          glow: "drop-shadow-[0_0_14px_rgba(245,158,11,0.4)]",
          stroke: "#f59e0b",
          strokeBg: "#1c160a",
          ring: "border-amber-500/25",
          bgGradient: "from-amber-500/15 to-amber-600/5",
          accentText: "ELEVATED RISK",
          pulseColor: "rgba(245,158,11,0.15)",
          trendColor: "text-amber-500",
        };
      case "LOW":
        return {
          text: "text-blue-400",
          glow: "drop-shadow-[0_0_14px_rgba(59,130,246,0.4)]",
          stroke: "#60a5fa",
          strokeBg: "#0a0f1c",
          ring: "border-blue-400/25",
          bgGradient: "from-blue-500/15 to-blue-600/5",
          accentText: "LOW RISK",
          pulseColor: "rgba(59,130,246,0.15)",
          trendColor: "text-blue-400",
        };
      default:
        return {
          text: "text-cyan-400",
          glow: "drop-shadow-[0_0_14px_rgba(0,240,255,0.4)]",
          stroke: "#00f0ff",
          strokeBg: "#040f12",
          ring: "border-cyan-400/25",
          bgGradient: "from-cyan-500/15 to-cyan-600/5",
          accentText: "SAFE ZONE",
          pulseColor: "rgba(0,240,255,0.15)",
          trendColor: "text-cyan-400",
        };
    }
  };

  const theme = getTheme();
  const TrendArrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* Pulse ring */}
      <div className="absolute">
        <div
          className={`w-52 h-52 rounded-full border-2 ${theme.ring} gauge-pulse-ring`}
        />
      </div>

      {/* HUD Circle Container */}
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Outer dashed spinning compass ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border border-dashed border-slate-200/60 dark:border-slate-800/30 rounded-full"
        />

        {/* Tick marks SVG — coordinates pre-computed to avoid SSR/client float mismatch */}
        <svg className="absolute w-52 h-52" viewBox="0 0 208 208" suppressHydrationWarning>
          {TICKS.map(({ i, x1, y1, x2, y2, major }) => (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={major ? theme.stroke : "#334155"}
              strokeWidth={major ? 1.5 : 0.8}
              opacity={major ? 0.5 : 0.2}
            />
          ))}
        </svg>

        {/* Circular Progress Gauge */}
        <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 200 200">
          {/* Background track */}
          <circle
            cx="100" cy="100" r={radius}
            stroke={theme.strokeBg}
            strokeWidth={strokeWidth}
            fill="transparent"
            opacity={0.4}
          />
          {/* Main progress arc */}
          <motion.circle
            cx="100" cy="100" r={radius}
            stroke={theme.stroke}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${theme.stroke}88)` }}
          />
          {/* Glow accent arc (slightly wider, more transparent) */}
          <motion.circle
            cx="100" cy="100" r={radius}
            stroke={theme.stroke}
            strokeWidth={strokeWidth + 8}
            fill="transparent"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            strokeLinecap="round"
            opacity={0.06}
          />
        </svg>

        {/* Orbiting dot at arc tip */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="absolute w-2.5 h-2.5"
            style={{
              transform: `rotate(${(score / 100) * 360 - 90}deg) translateX(46px)`,
              transition: "transform 0.9s ease-out",
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900"
              style={{
                backgroundColor: theme.stroke,
                boxShadow: `0 0 8px ${theme.stroke}`,
              }}
            />
          </div>
        </div>

        {/* Inside score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center font-mono gap-0.5">
          <span className="text-[9px] tracking-widest text-slate-400 dark:text-slate-500 uppercase">
            Escalation
          </span>
          <motion.span
            key={score}
            initial={{ scale: 0.88, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className={`text-5xl font-black ${theme.text} tracking-tighter leading-none`}
            style={{ textShadow: `0 0 20px ${theme.stroke}60` }}
          >
            {score}
          </motion.span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[8px] tracking-widest text-slate-400">/ 100</span>
            <span className={`text-xs font-bold ${theme.trendColor}`}>{TrendArrow}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <div className="w-1 h-1 rounded-full bg-red-500 live-dot" />
            <span className="text-[8px] text-red-400 font-mono tracking-widest">LIVE</span>
          </div>
        </div>
      </div>

      {/* Label Box */}
      <div className={`mt-4 px-5 py-1.5 rounded-full border bg-gradient-to-b ${theme.bgGradient} border-slate-200 dark:border-slate-800 text-center min-w-[140px]`}
        style={{ boxShadow: `0 0 20px ${theme.pulseColor}` }}>
        <span className={`text-[11px] font-extrabold tracking-widest ${theme.text} block font-mono uppercase`}>
          {theme.accentText}
        </span>
      </div>
    </div>
  );
}
