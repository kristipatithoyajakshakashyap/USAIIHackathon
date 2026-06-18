"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useLiveRisk, InputSource } from "@/hooks/useLiveRisk";
import { Header } from "@/components/header";
import { motion } from "framer-motion";
import {
  Activity,
  Layers,
  Sparkles,
  Volume2,
  Accessibility,
  Footprints,
  Compass,
  Layout,
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

export default function LivePage() {
  const {
    data: liveData,
    isUploading,
    uploadError,
    videoObjectUrl,
    uploadVideo,
    isSimulated,
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
  const [showBboxes, setShowBboxes] = useState(true);
  const [showPoses, setShowPoses] = useState(true);
  const [showTrajectories, setShowTrajectories] = useState(true);
  const [activeCamera, setActiveCamera] = useState("CAM-01");

  // Attach the MediaStream to the webcam <video> element whenever it changes
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

  const score = liveData?.risk.score ?? 20;
  const band = liveData?.risk.band ?? "SAFE";

  const toggleOptions = [
    { label: "Skeletal Poses", active: showPoses, toggle: () => setShowPoses(!showPoses), icon: Accessibility, color: "text-green-400" },
    { label: "Bounding Boxes", active: showBboxes, toggle: () => setShowBboxes(!showBboxes), icon: Layout, color: "text-cyan-400" },
    { label: "Trajectory Trails", active: showTrajectories, toggle: () => setShowTrajectories(!showTrajectories), icon: Footprints, color: "text-amber-400" },
  ];

  // Helper colors
  const getThemeColor = () => {
    if (score > 90) return "text-red-500 bg-red-500/10 border-red-500/30";
    if (score > 75) return "text-orange-500 bg-orange-500/10 border-orange-500/30";
    if (score > 50) return "text-amber-500 bg-amber-500/10 border-amber-500/30";
    if (score > 25) return "text-blue-400 bg-blue-500/10 border-blue-500/30";
    return "text-cyan-400 bg-cyan-500/10 border-cyan-500/30";
  };

  const getMeterColor = () => {
    if (score > 90) return "bg-red-500";
    if (score > 75) return "bg-orange-500";
    if (score > 50) return "bg-amber-500";
    if (score > 25) return "bg-blue-500";
    return "bg-cyan-500";
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Live Surveillance Analytics" />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Controls & Options Sidebar */}
          <div className="lg:col-span-1 space-y-6 flex flex-col">
            {/* Camera Switcher */}
            <div className="glass-panel border rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-sm tracking-wide pb-2 border-b border-slate-100 dark:border-slate-900 mb-4">
                Surveillance Nodes
              </h3>
              <div className="space-y-2.5">
                {["CAM-01 (Lobby A)", "CAM-02 (South Gate)", "CAM-03 (Parking C)", "CAM-04 (Corridor B)"].map((cam, idx) => {
                  const id = `CAM-0${idx + 1}`;
                  const isActive = activeCamera === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveCamera(id)}
                      className={`w-full p-3 text-left rounded-xl border transition-all text-xs font-semibold flex items-center justify-between cursor-pointer ${
                        isActive
                          ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-500"
                          : "border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/10 hover:bg-slate-50 dark:hover:bg-slate-900/30 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span>{cam}</span>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Viewport Layers Toggle */}
            <div className="glass-panel border rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-sm tracking-wide pb-2 border-b border-slate-100 dark:border-slate-900 mb-4 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>HUD Overlay Filters</span>
              </h3>
              <div className="space-y-3">
                {toggleOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <label
                      key={opt.label}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-xs font-semibold cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${opt.color}`} />
                        <span>{opt.label}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={opt.active}
                        onChange={opt.toggle}
                        className="w-4 h-4 accent-cyan-500 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Vocal Decibel meter mock */}
            <div className="glass-panel border rounded-2xl p-5 shadow-sm flex-1">
              <h3 className="font-bold text-sm tracking-wide pb-2 border-b border-slate-100 dark:border-slate-900 mb-4 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span>Audio Waveform Peak</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Audio Anger probability:</span>
                  <span className="font-mono font-bold">
                    {liveData ? `${(liveData.features.audio_anger * 100).toFixed(0)}%` : "5%"}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-cyan-400"
                    animate={{ width: liveData ? `${liveData.features.audio_anger * 100}%` : "5%" }}
                    transition={{ duration: 0.2 }}
                  />
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Vocal Intensity:</span>
                  <span className="font-mono font-bold">
                    {liveData ? `${(liveData.features.audio_intensity * 100).toFixed(0)}%` : "22%"}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-indigo-500"
                    animate={{ width: liveData ? `${liveData.features.audio_intensity * 100}%` : "22%" }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive video feed with HUD overlays */}
          <div className="lg:col-span-3 flex flex-col space-y-6">
            <div className="glass-panel border rounded-2xl p-4 shadow-sm relative overflow-hidden">
              {/* ── Card header ── */}
              <div className="pb-3 border-b border-slate-100 dark:border-slate-900 mb-3 space-y-3">

                {/* Title + badge row */}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs tracking-wider uppercase">SURVEILLANCE NODE: {activeCamera}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
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
                      ? "LIVE INFERENCE" : "SIMULATION ENGINE"} | {liveData?.proc_fps.toFixed(1) ?? "12.4"} FPS
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
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold font-mono text-slate-300 dark:text-slate-600 cursor-not-allowed"
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
                    <div className="flex items-center gap-1.5">
                      <CircleDot className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                      <span className="text-[9px] font-mono text-amber-500/80">
                        PREVIEW MODE &nbsp;&middot;&nbsp; Simulation Risk Engine Active &nbsp;&middot;&nbsp; No real-time camera inference
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Viewport */}
              <div className="relative aspect-video w-full bg-slate-950 rounded-xl overflow-hidden scanlines border border-slate-900">

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
                        <MonitorPlay className="w-10 h-10 opacity-15" />
                        <span className="text-[10px] font-mono tracking-widest opacity-20">UPLOAD A VIDEO TO BEGIN ANALYSIS</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-10 h-10 opacity-15" />
                        <span className="text-[10px] font-mono tracking-widest opacity-20">PRESS START LIVE MONITORING</span>
                      </>
                    )}
                  </div>
                ) : null}

                {/* Upload in-progress overlay */}
                {isUploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
                    <span className="text-[11px] font-mono text-cyan-400 tracking-widest">UPLOADING FEED…</span>
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
                
                {/* HUD Grid markings */}
                <div className="absolute top-4 left-4 text-white/40 text-[9px] font-mono select-none">
                  [LOBBY_A_GRID]
                </div>
                <div className="absolute bottom-4 right-4 text-white/40 text-[9px] font-mono select-none">
                  PREVAIL HUD V1.0
                </div>

                {/* Draw simulated items */}
                {liveData?.persons.map((person) => {
                  const [bx, by, bw, bh] = person.bbox;
                  const left = `${(bx / 640) * 100}%`;
                  const top = `${(by / 480) * 100}%`;
                  const width = `${(bw / 640) * 100}%`;
                  const height = `${(bh / 480) * 100}%`;
                  const isAggressive = score > 60 && (person.track_id === 1 || person.track_id === 2);

                  return (
                    <div key={person.track_id}>
                      {/* Bounding Box overlay */}
                      {showBboxes && (
                        <div
                          className="absolute border-2 transition-all duration-200"
                          style={{
                            left,
                            top,
                            width,
                            height,
                            borderColor: isAggressive ? "#dc2626" : "#00f0ff",
                            boxShadow: isAggressive ? "0 0 10px rgba(220,38,38,0.4)" : "0 0 10px rgba(0,240,255,0.2)"
                          }}
                        >
                          <div className={`absolute -top-5 left-0 px-1 py-0.5 text-[8px] font-mono font-bold text-white rounded-t-sm ${
                            isAggressive ? "bg-red-600" : "bg-cyan-600"
                          }`}>
                            ID:00{person.track_id} | CON:{person.conf.toFixed(2)}
                          </div>
                        </div>
                      )}

                      {/* Skeletal Pose vectors */}
                      {showPoses && person.pose?.map((pt, ptIdx) => {
                        const px = `${(pt[0] / 640) * 100}%`;
                        const py = `${(pt[1] / 480) * 100}%`;
                        return (
                          <div
                            key={ptIdx}
                            className={`absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 ${
                              isAggressive ? "bg-red-500 shadow-glow-red" : "bg-cyan-400"
                            }`}
                            style={{ left: px, top: py }}
                          />
                        );
                      })}

                      {/* Trajectory motion lines */}
                      {showTrajectories && (
                        <div
                          className="absolute w-2 h-2 rounded-full bg-amber-400 opacity-60 pointer-events-none"
                          style={{
                            left: `${((bx + bw / 2) / 640) * 100}%`,
                            top: `${((by + bh) / 480) * 100}%`
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Realtime threat meter & explainable factor contributions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Score meter */}
              <div className="glass-panel border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Threat Risk Index
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-black">{score}</span>
                  <span className="text-xs font-bold text-slate-400">/ 100</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden mt-4">
                  <motion.div
                    className={`h-full ${getMeterColor()}`}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className={`mt-4 text-center py-1.5 rounded-lg border text-xs font-bold font-mono tracking-wider ${getThemeColor()}`}>
                  {band} THREAT
                </div>
              </div>

              {/* Explainable factors */}
              <div className="md:col-span-2 glass-panel border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-3">
                  Explainable Risk Contribution Factors
                </span>

                <div className="space-y-3">
                  {/* Factor 1: Posture */}
                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold mb-1">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Aggressive Posture Score</span>
                      </span>
                      <span className="font-mono">
                        {liveData ? `${(liveData.features.pose_aggression * 100).toFixed(0)}%` : "12%"}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-cyan-400"
                        animate={{ width: liveData ? `${liveData.features.pose_aggression * 100}%` : "12%" }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  </div>

                  {/* Factor 2: Motion Speed */}
                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold mb-1">
                      <span className="flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5 text-amber-400" />
                        <span>Movement Speed Rate</span>
                      </span>
                      <span className="font-mono">
                        {liveData ? `${(liveData.features.speed * 10).toFixed(0)}%` : "15%"}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-amber-400"
                        animate={{ width: liveData ? `${liveData.features.speed * 10}%` : "15%" }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  </div>

                  {/* Factor 3: Proximity */}
                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold mb-1">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>Target Spatial Convergence</span>
                      </span>
                      <span className="font-mono">
                        {liveData ? `${(liveData.features.proximity * 100).toFixed(0)}%` : "25%"}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-purple-400"
                        animate={{ width: liveData ? `${liveData.features.proximity * 100}%` : "25%" }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
