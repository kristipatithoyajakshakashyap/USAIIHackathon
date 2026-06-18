"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLiveRisk, InputSource } from "@/hooks/useLiveRisk";
import { Header } from "@/components/header";
import { RiskGauge } from "@/components/risk-gauge";
import { WalkthroughModal } from "@/components/walkthrough-modal";
import { motion } from "framer-motion";
import {
  Video,
  AlertOctagon,
  Users,
  TrendingUp,
  FileSpreadsheet,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Upload,
  Loader2,
  AlertCircle,
  Camera,
  MonitorPlay,
  MonitorOff,
  WifiOff,
  Radio,
  Siren,
  CircleDot,
  Network,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import Link from "next/link";
import { useTheme } from "next-themes";

// ── Stagger container ──────────────────────────────────────────────
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
} as const;
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

interface TooltipProps {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}
const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload?.length) {
    const val = payload[0]?.value ?? 0;
    const color =
      val >= 80 ? "#ef4444" : val >= 60 ? "#f97316" : val >= 40 ? "#f59e0b" : "#00f0ff";
    return (
      <div className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/95 backdrop-blur-md shadow-xl">
        <p className="text-[10px] text-slate-400 font-mono mb-1">{label}</p>
        <p className="text-sm font-extrabold font-mono" style={{ color }}>
          {val} <span className="text-[10px] text-slate-500 font-normal">/ 100</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const router = useRouter();
  const {
    data: liveData,
    history,
    isSimulated,
    isUploading,
    uploadError,
    videoObjectUrl,
    uploadVideo,
    inputSource,
    setInputSource,
    webcamStream,
    webcamError,
    isStartingWebcam,
    startLiveCamera,
    stopLiveCamera,
  } = useLiveRisk("CAM-01");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);

  // Attach the MediaStream to the <video> element whenever it changes
  useEffect(() => {
    if (webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = webcamStream ?? null;
    }
  }, [webcamStream]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      uploadVideo(file);
      e.target.value = "";
    },
    [uploadVideo]
  );
  const { theme } = useTheme();
  const gridStroke = theme === "dark" ? "#0f1d35" : "#e2e8f0";
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [successReport, setSuccessReport] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // First-visit: redirect to intro splash
  useEffect(() => {
    const seen = sessionStorage.getItem("prevail_intro_seen");
    if (!seen) {
      router.replace("/intro");
    }
  }, [router]);

  const score = liveData?.risk.score ?? 20;
  const band = liveData?.risk.band ?? "SAFE";

  const metrics = [
    {
      title: "Surveillance Nodes",
      value: "4 / 4",
      sub: "All feeds operational",
      icon: Video,
      color: "text-cyan-500",
      bg: "bg-cyan-500/8 border-cyan-500/15",
      trend: "+0%",
      trendUp: true,
    },
    {
      title: "Incident Alerts",
      value: band === "CRITICAL" || band === "HIGH" ? "3 Active" : "2 Active",
      sub: "1 unresolved escalation",
      icon: AlertOctagon,
      color: "text-red-500",
      bg: "bg-red-500/8 border-red-500/15",
      trend: "+1",
      trendUp: false,
    },
    {
      title: "Avg Risk Score",
      value: "32.4",
      sub: "Within safe threshold",
      icon: TrendingUp,
      color: "text-blue-500",
      bg: "bg-blue-500/8 border-blue-500/15",
      trend: "-4.2%",
      trendUp: true,
    },
    {
      title: "Persons Tracked",
      value: liveData ? `${liveData.persons.length}` : "4",
      sub: "Across monitored zones",
      icon: Users,
      color: "text-amber-500",
      bg: "bg-amber-500/8 border-amber-500/15",
      trend: "+2",
      trendUp: false,
    },
  ];

  const staticCameras = [
    { id: "CAM-02", name: "South Gate", score: 14, band: "SAFE" as const },
    { id: "CAM-03", name: "Parking Lot C", score: 28, band: "LOW" as const },
    { id: "CAM-04", name: "Hallway B", score: 48, band: "MODERATE" as const },
  ];

  const recentIncidents = [
    { id: "INC-9482", title: "Aggressive crowd convergence near Gate A", cam: "CAM-02", time: "18:32:04", risk: "HIGH", status: "Closed" },
    { id: "INC-9481", title: "Rapid movement cluster in Corridor 3", cam: "CAM-04", time: "18:15:30", risk: "MODERATE", status: "Closed" },
    { id: "INC-9480", title: "Escalated posture — early warning issued", cam: "CAM-01", time: "17:44:12", risk: "HIGH", status: "Logged" },
  ];

  const handleGenerateReport = () => {
    setReportGenerating(true);
    setTimeout(() => {
      setReportGenerating(false);
      setSuccessReport(true);
      setTimeout(() => setSuccessReport(false), 3000);
    }, 1500);
  };

  const riskBandColor = (b: string) =>
    b === "CRITICAL" ? "#ef4444" : b === "HIGH" ? "#f97316" : b === "MODERATE" ? "#f59e0b" : b === "LOW" ? "#60a5fa" : "#00f0ff";

  const camBandClass = (b: string) =>
    b === "MODERATE"
      ? "border-amber-500/25 bg-amber-500/5 dark:bg-amber-500/5"
      : b === "LOW"
      ? "border-blue-500/25 bg-blue-500/5 dark:bg-blue-500/5"
      : "border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/10";

  return (
    <>
      <WalkthroughModal isOpen={showWalkthrough} onClose={() => setShowWalkthrough(false)} forceOpen={showWalkthrough} />
      <div className="flex-1 flex flex-col min-h-screen hud-grid page-enter">
        <Header title="Tactical Security Console" onOpenWalkthrough={() => setShowWalkthrough(true)} />

      <main className="flex-1 p-5 space-y-5 max-w-[1440px] mx-auto w-full">

        {/* Platform Mission Banner */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-4 rounded-2xl border border-cyan-500/12 bg-gradient-to-r from-cyan-500/5 via-blue-500/4 to-indigo-500/5"
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-500 flex-shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-extrabold text-cyan-600 dark:text-cyan-400 tracking-wide">
                  PREVAIL &mdash; AI Decision Support Platform for Human Safety
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                  Continuously monitors surveillance feeds &middot; Estimates aggression escalation risk &middot; Explains contributing factors &middot; Generates proactive early warnings for security operators.
                </p>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 pt-0.5">
                  Decision Support Only &nbsp;&middot;&nbsp; No Automated Enforcement &nbsp;&middot;&nbsp; Human Remains in Control
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowWalkthrough(true)}
              className="flex-shrink-0 text-[11px] font-bold text-cyan-500 hover:text-cyan-400 underline decoration-dotted underline-offset-4 cursor-pointer whitespace-nowrap self-start"
            >
              How It Works &rarr;
            </button>
          </div>
        </motion.div>

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Risk Gauge Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="lg:col-span-1 glass-panel rounded-2xl p-6 flex flex-col items-center border shadow-sm relative overflow-hidden"
          >
            <div className="w-full flex items-center justify-between mb-4">
              <div>
                <p className="font-mono text-[9px] text-slate-400 uppercase tracking-widest">Escalation Risk Score</p>
                <p className="font-bold text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">CAM-01 &middot; Lobby A</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 live-dot" />
                <span className="font-mono text-[9px] text-red-400">MONITORING</span>
              </div>
            </div>

            <RiskGauge score={score} band={band} />

            {/* Recommended Action — the key decision support element */}
            <div className={`w-full mt-4 rounded-xl border p-3 ${
              band === "CRITICAL" ? "border-red-500/30 bg-red-500/8"
              : band === "HIGH" ? "border-orange-500/30 bg-orange-500/8"
              : band === "MODERATE" ? "border-amber-500/30 bg-amber-500/8"
              : "border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/20"
            }`}>
              <p className="text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">Recommended Action</p>
              <p className={`text-[11px] font-bold leading-snug ${
                band === "CRITICAL" ? "text-red-500"
                : band === "HIGH" ? "text-orange-500"
                : band === "MODERATE" ? "text-amber-500"
                : "text-emerald-500"
              }`}>
                {band === "CRITICAL" && "🚨 Immediate intervention required"}
                {band === "HIGH" && "⚠ Dispatch nearest security personnel"}
                {band === "MODERATE" && "👁 Increase surveillance attention"}
                {band === "LOW" && "✓ Monitor — minor anomaly detected"}
                {band === "SAFE" && "✓ Continue standard monitoring"}
              </p>
              {liveData && (
                <p className="text-[9px] text-slate-400 font-mono mt-1">
                  Confidence: {Math.round(85 + score * 0.1)}% &middot; {liveData.persons.length} persons tracked
                </p>
              )}
            </div>
          </motion.div>

          {/* Live Camera Feed */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="lg:col-span-2 glass-panel rounded-2xl p-5 border shadow-sm flex flex-col"
          >
            {/* ── Card header ── */}
            <div className="pb-3 border-b border-slate-100 dark:border-slate-900/80 mb-4 space-y-3">

              {/* Title row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex">
                    <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-500 opacity-60" />
                    <span className="relative w-2.5 h-2.5 rounded-full bg-red-500" />
                  </span>
                  <span className="font-bold text-sm tracking-wide">SURVEILLANCE NODE &mdash; CAM-01 &middot; LOBBY A</span>
                </div>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded-md border ${
                  inputSource === InputSource.LIVE_CAMERA && webcamStream
                    ? "text-cyan-500 bg-cyan-500/10 border-cyan-500/20"
                    : inputSource === InputSource.DEMO_VIDEO && !isSimulated
                    ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                    : inputSource === InputSource.LIVE_CAMERA
                    ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
                    : "text-slate-400 bg-slate-100 dark:bg-slate-900 border-transparent"
                }`}>
                  {inputSource === InputSource.LIVE_CAMERA && webcamStream
                    ? "PREVIEW MODE"
                    : inputSource === InputSource.DEMO_VIDEO && !isSimulated
                    ? "LIVE INFERENCE"
                    : inputSource === InputSource.LIVE_CAMERA
                    ? "SIMULATION ENGINE"
                    : "SIMULATION ENGINE"}
                </span>
              </div>

              {/* Input Source selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-lg w-fit">
                <button
                  onClick={() => setInputSource(InputSource.DEMO_VIDEO)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                    inputSource === InputSource.DEMO_VIDEO
                      ? "bg-white dark:bg-slate-800 text-cyan-500 shadow-sm"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
                >
                  <MonitorPlay className="w-3 h-3" />
                  Demo Analysis
                </button>
                <button
                  onClick={() => setInputSource(InputSource.LIVE_CAMERA)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                    inputSource === InputSource.LIVE_CAMERA
                      ? "bg-white dark:bg-slate-800 text-cyan-500 shadow-sm"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
                >
                  <Camera className="w-3 h-3" />
                  Live Surveillance
                </button>
                <button
                  disabled
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold font-mono text-slate-300 dark:text-slate-600 cursor-not-allowed relative"
                  title="RTSP CCTV Integration — Architecture Ready"
                >
                  <Network className="w-3 h-3" />
                  CCTV Network
                  <span className="ml-1 text-[8px] font-mono text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 px-1 rounded">SOON</span>
                </button>
              </div>

              {/* Demo Analysis action area */}
              {inputSource === InputSource.DEMO_VIDEO && (
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[10px] font-bold font-mono cursor-pointer"
                  >
                    {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    {isUploading ? "Loading Feed…" : "Run Demo Analysis"}
                  </button>
                  <span className="text-[10px] text-slate-400 font-mono">Upload a recorded video to run AI inference</span>
                </div>
              )}

              {/* Live Surveillance Preview action area */}
              {inputSource === InputSource.LIVE_CAMERA && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    {webcamStream ? (
                      <button
                        onClick={stopLiveCamera}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-[10px] font-bold font-mono cursor-pointer"
                      >
                        <MonitorOff className="w-3 h-3" />
                        Stop Monitoring Preview
                      </button>
                    ) : (
                      <button
                        onClick={startLiveCamera}
                        disabled={isStartingWebcam}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[10px] font-bold font-mono cursor-pointer"
                      >
                        {isStartingWebcam ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                        {isStartingWebcam ? "Connecting…" : "Start Monitoring Preview"}
                      </button>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono">
                      {webcamStream ? "Camera active" : "Activates device camera for SOC preview"}
                    </span>
                  </div>
                  {/* Ethical clarity disclaimer — required when webcam is active */}
                  <div className="flex items-center gap-1.5">
                    <CircleDot className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                    <span className="text-[9px] font-mono text-amber-500/80">
                      PREVIEW MODE &nbsp;&middot;&nbsp; Simulation Risk Engine Active &nbsp;&middot;&nbsp; No real-time camera inference
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Camera canvas */}
            <div className="relative aspect-video w-full bg-slate-950 rounded-xl overflow-hidden scanlines border border-slate-900 hud-corners">
              <div className="hud-corners-inner absolute inset-0 pointer-events-none">
                {/* HUD corner decorations rendered via CSS */}
              </div>

              {/* ── Video layer: Demo mode ── */}
              {inputSource === InputSource.DEMO_VIDEO && videoObjectUrl && (
                <video
                  key={videoObjectUrl}
                  src={videoObjectUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* ── Video layer: Webcam mode ── */}
              {inputSource === InputSource.LIVE_CAMERA && (
                <video
                  ref={webcamVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                    webcamStream ? "opacity-100" : "opacity-0"
                  }`}
                />
              )}

              {/* ── Idle placeholder ── */}
              {(inputSource === InputSource.DEMO_VIDEO && !videoObjectUrl && !isUploading) ||
               (inputSource === InputSource.LIVE_CAMERA && !webcamStream && !isStartingWebcam && !webcamError) ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 pointer-events-none select-none gap-2">
                  {inputSource === InputSource.DEMO_VIDEO ? (
                    <>
                      <MonitorPlay className="w-8 h-8 opacity-20" />
                      <span className="text-[10px] font-mono tracking-widest opacity-20">LOAD A DEMO VIDEO TO BEGIN AI ANALYSIS</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-8 h-8 opacity-20" />
                      <span className="text-[10px] font-mono tracking-widest opacity-20">START MONITORING PREVIEW</span>
                    </>
                  )}
                </div>
              ) : null}

              {/* Loading Demo Feed overlay */}
              {isUploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
                  <span className="text-[11px] font-mono text-cyan-400 tracking-widest">LOADING DEMO FEED…</span>
                  <span className="text-[9px] font-mono text-slate-500 mt-1">Preparing AI inference pipeline</span>
                </div>
              )}

              {/* Webcam starting overlay */}
              {isStartingWebcam && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
                  <span className="text-[11px] font-mono text-cyan-400 tracking-widest">CONNECTING CAMERA…</span>
                </div>
              )}

              {/* Upload error */}
              {uploadError && !isUploading && (
                <div className="absolute bottom-10 left-3 right-3 flex items-start gap-2 bg-red-950/90 border border-red-500/40 rounded-lg px-3 py-2 z-10">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-[10px] font-mono text-red-300 leading-snug">{uploadError}</span>
                </div>
              )}

              {/* Webcam error */}
              {webcamError && !isStartingWebcam && (
                <div className="absolute bottom-10 left-3 right-3 flex items-start gap-2 bg-red-950/90 border border-red-500/40 rounded-lg px-3 py-2 z-10">
                  <WifiOff className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-[10px] font-mono text-red-300 leading-snug">{webcamError}</span>
                </div>
              )}

              {/* Person bounding boxes */}
              {liveData?.persons.map((person) => {
                const [bx, by, bw, bh] = person.bbox;
                const left = `${(bx / 640) * 100}%`;
                const top = `${(by / 480) * 100}%`;
                const width = `${(bw / 640) * 100}%`;
                const height = `${(bh / 480) * 100}%`;
                const isAggressive = score > 60 && (person.track_id === 1 || person.track_id === 2);
                const boxColor = isAggressive ? "#dc2626" : "#00f0ff";

                return (
                  <div
                    key={person.track_id}
                    className="absolute border-2 transition-all duration-200"
                    style={{ left, top, width, height, borderColor: boxColor, boxShadow: `0 0 10px ${boxColor}40` }}
                  >
                    <div className={`absolute -top-5 left-0 px-1.5 py-0.5 text-[8px] font-mono font-bold text-white rounded-t-sm flex items-center gap-1 ${isAggressive ? "bg-red-600" : "bg-cyan-600"}`}>
                      <span>ID:{person.track_id}</span>
                      <span>{(person.conf * 100).toFixed(0)}%</span>
                    </div>
                    {person.pose?.map((pt, ptIdx) => {
                      const px = `${((pt[0] - bx) / bw) * 100}%`;
                      const py = `${((pt[1] - by) / bh) * 100}%`;
                      return (
                        <div
                          key={ptIdx}
                          className={`absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 ${isAggressive ? "bg-red-400" : "bg-cyan-400"}`}
                          style={{ left: px, top: py }}
                        />
                      );
                    })}
                  </div>
                );
              })}

              {/* HUD overlay — top right */}
              <div className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono text-cyan-400 flex items-center gap-2.5">
                <span>FPS: {liveData?.proc_fps.toFixed(1) ?? "12.4"}</span>
                <span className="text-slate-600">|</span>
                <span className={score >= 60 ? "text-orange-400" : "text-cyan-400"}>
                  RISK: {score}
                </span>
              </div>

              {/* Bottom left timestamp */}
              <div className="absolute bottom-3 left-3 bg-slate-900/70 px-2 py-1 rounded-md border border-slate-800 text-[9px] font-mono text-slate-400">
                {mounted ? new Date().toLocaleTimeString("en-US", { hour12: false }) : "--:--:--"} UTC
              </div>

              {/* Critical flash overlay */}
              {(band === "CRITICAL" || band === "HIGH") && (
                <div className="absolute inset-0 border-2 border-red-500/30 hud-critical-flash rounded-xl pointer-events-none" />
              )}
            </div>

            {/* ── Structured Alert Card — shown on HIGH / CRITICAL ── */}
            {(band === "CRITICAL" || band === "HIGH") && liveData && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-3 rounded-xl border p-4 ${
                  band === "CRITICAL"
                    ? "border-red-500/40 bg-red-500/8"
                    : "border-orange-500/40 bg-orange-500/8"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Siren className={`w-4 h-4 flex-shrink-0 ${band === "CRITICAL" ? "text-red-500" : "text-orange-500"}`} />
                    <div>
                      <span className={`text-xs font-extrabold tracking-wide ${
                        band === "CRITICAL" ? "text-red-500" : "text-orange-500"
                      }`}>
                        ⚠ ACTIVE SECURITY ALERT
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        CAM-01 &middot; Lobby A &nbsp;&middot;&nbsp; Risk Score: {liveData.risk.score} &nbsp;&middot;&nbsp; Confidence: {Math.round(85 + liveData.risk.score * 0.1)}%
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold font-mono px-2 py-0.5 rounded border flex-shrink-0 ${
                    band === "CRITICAL"
                      ? "text-red-500 border-red-500/30 bg-red-500/10"
                      : "text-orange-500 border-orange-500/30 bg-orange-500/10"
                  }`}>{band}</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">Top Contributing Factors</p>
                    <ul className="space-y-1">
                      {liveData.risk.reasons.slice(0, 3).map((r, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[10px] text-slate-300">
                          <Radio className="w-2.5 h-2.5 text-orange-400 flex-shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">Recommended Action</p>
                    <p className={`text-[11px] font-bold leading-snug ${
                      band === "CRITICAL" ? "text-red-400" : "text-orange-400"
                    }`}>
                      {band === "CRITICAL"
                        ? "🚨 Immediate intervention — escalate to command"
                        : "⚠ Dispatch nearest security personnel immediately"}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex justify-between items-center mt-3">
              <p className="text-[11px] font-mono text-slate-400">
                {liveData?.persons.length ?? 0} persons under observation &middot; YOLO11s + ByteTrack &middot; {liveData?.proc_fps.toFixed(1) ?? "12.4"} FPS
              </p>
              <Link href="/live" className="text-xs font-bold text-cyan-500 hover:text-cyan-400 flex items-center gap-1 cursor-pointer transition-colors">
                <span>SOC Full Viewport</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Metrics Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <motion.div
                variants={fadeUp}
                whileHover={{ y: -5, scale: 1.01 }}
                key={m.title}
                className={`glass-panel border rounded-2xl p-5 flex flex-col gap-3 cursor-default ${m.bg} transition-all duration-200`}
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm ${m.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${m.trendUp ? "text-emerald-500 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}>
                    {m.trend}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    {m.title}
                  </span>
                  <span className="text-2xl font-black tracking-tight mt-0.5 block">
                    {m.value}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{m.sub}</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Chart + Camera List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Trend Chart */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="lg:col-span-2 glass-panel rounded-2xl p-5 border shadow-sm"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900/80 mb-4">
              <span className="font-bold text-sm tracking-wide">ESCALATION RISK &mdash; TIMELINE</span>
              <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-500">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 live-dot" />
                CONTINUOUS MONITORING
              </div>
            </div>

            <div className="h-60 w-full">
              {history.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-xs">
                  Awaiting telemetry from surveillance nodes…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} opacity={0.5} />
                    <XAxis dataKey="time" stroke="#475569" fontSize={9} className="font-mono" tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#475569" fontSize={9} className="font-mono" tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#00f0ff"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#riskGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Camera Feed List */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="lg:col-span-1 glass-panel rounded-2xl p-5 border shadow-sm"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900/80 mb-4">
              <span className="font-bold text-sm tracking-wide">CCTV FEEDS</span>
              <span className="text-[10px] font-mono font-bold text-emerald-500 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot" />
                ONLINE
              </span>
            </div>

            <div className="space-y-2.5">
              {/* CAM-01 — live driven */}
              <div className="p-3 rounded-xl border border-cyan-500/25 bg-cyan-500/6 flex items-center justify-between group hover:border-cyan-500/40 transition-colors">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">CAM-01 · Lobby A</span>
                  <span className="text-[9px] text-cyan-500 font-mono flex items-center gap-1 mt-0.5">
                    <div className="w-1 h-1 rounded-full bg-red-500 live-dot" />
                    LIVE
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold" style={{ color: riskBandColor(band) }}>{score}</span>
                  <span className="block text-[9px] text-slate-400 uppercase font-mono">{band}</span>
                </div>
              </div>

              {staticCameras.map((cam) => (
                <div
                  key={cam.id}
                  className={`p-3 rounded-xl border flex items-center justify-between hover:border-opacity-60 transition-colors ${camBandClass(cam.band)}`}
                >
                  <div>
                    <span className="text-xs font-semibold block">{cam.id} · {cam.name}</span>
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5">FEED RUNNING</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold" style={{ color: riskBandColor(cam.band) }}>{cam.score}</span>
                    <span className="block text-[9px] text-slate-400 uppercase font-mono">{cam.band}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Incidents Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="glass-panel rounded-2xl border shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-900/80">
            <span className="font-bold text-sm tracking-wide">INCIDENT LOG</span>
            <Link href="/explorer" className="text-xs font-bold text-cyan-500 hover:text-cyan-400 flex items-center gap-1 transition-colors">
              <span>Incident Center</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-900 text-slate-400 text-[10px] font-mono uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/20">
                  <th className="py-3 px-5">ID</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Camera</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Peak Risk</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentIncidents.map((inc, i) => (
                  <motion.tr
                    key={inc.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.06 }}
                    className="border-b border-slate-100 dark:border-slate-900/60 text-xs hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group"
                  >
                    <td className="py-3.5 px-5 font-mono font-bold text-slate-400">{inc.id}</td>
                    <td className="py-3.5 px-4 font-semibold">{inc.title}</td>
                    <td className="py-3.5 px-4 font-mono text-cyan-500">{inc.cam}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{inc.time}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        inc.risk === "HIGH"
                          ? "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                          : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      }`}>
                        {inc.risk}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                        inc.status === "Logged" ? "text-cyan-400" : "text-slate-400"
                      }`}>
                        {inc.status === "Closed" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                        {inc.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>

      {/* Floating AI Report Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          onClick={handleGenerateReport}
          disabled={reportGenerating}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="relative group flex items-center gap-2.5 pl-4 pr-5 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer transition-shadow"
        >
          {reportGenerating ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : successReport ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <FileSpreadsheet className="w-4 h-4" />
          )}
          <span className="text-xs font-extrabold tracking-wide">
            {successReport ? "Generated!" : reportGenerating ? "Compiling…" : "Quick AI Report"}
          </span>
        </motion.button>
      </div>
      </div>
    </>
  );
}
