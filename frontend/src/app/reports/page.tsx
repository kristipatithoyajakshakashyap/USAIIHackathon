"use client";

import React, { useState } from "react";
import { Header } from "@/components/header";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Download, Brain, Search, Sparkles,
  Clock, HardDrive, AlertTriangle, CheckCircle2,
  Loader2, X, ChevronRight, BarChart2, Mic, Camera
} from "lucide-react";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
} as const;
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

type ReportStatus = "compiled" | "processing" | "queued";

interface Report {
  id: string;
  title: string;
  date: string;
  type: string;
  size: string;
  tags: string[];
  status: ReportStatus;
  confidence: number;
  modalities: ("vision" | "audio" | "crowd")[];
  downloadProgress?: number;
}

const modalityIcon = {
  vision: Camera,
  audio: Mic,
  crowd: BarChart2,
};

const modalityLabel = {
  vision: "Vision",
  audio: "Audio",
  crowd: "Crowd",
};

export default function ReportsPage() {
  const [query, setQuery] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [generatedTitle, setGeneratedTitle] = useState("");

  const reports: Report[] = [
    {
      id: "REP-9902",
      title: "Incident Log — Lobby Dispute (18 Jun)",
      date: "2026-06-18",
      type: "Executive Summary",
      size: "148 KB",
      tags: ["Aggression", "Lobby", "CAM-01"],
      status: "compiled",
      confidence: 94,
      modalities: ["vision", "audio"],
    },
    {
      id: "REP-9901",
      title: "Crowd Convergence Incident — Corridor C",
      date: "2026-06-18",
      type: "Full Analytical Draft",
      size: "320 KB",
      tags: ["Crowd", "Corridor", "CAM-04"],
      status: "compiled",
      confidence: 88,
      modalities: ["vision", "crowd"],
    },
    {
      id: "REP-9900",
      title: "South Gate Exit Anomaly — Pushing Pattern",
      date: "2026-06-17",
      type: "Security Dispatch Log",
      size: "115 KB",
      tags: ["Pushing", "Gate", "CAM-02"],
      status: "processing",
      confidence: 76,
      modalities: ["vision", "audio", "crowd"],
    },
    {
      id: "REP-9899",
      title: "Overnight Perimeter — Low Activity Summary",
      date: "2026-06-16",
      type: "Routine Surveillance Log",
      size: "84 KB",
      tags: ["Routine", "Perimeter"],
      status: "compiled",
      confidence: 99,
      modalities: ["vision"],
    },
  ];

  const filtered = reports.filter(
    (r) =>
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  const stats = [
    { label: "Total Reports", value: reports.length, icon: FileText, color: "text-cyan-500" },
    { label: "AI-Compiled Today", value: 2, icon: Sparkles, color: "text-indigo-500" },
    { label: "Processing", value: reports.filter((r) => r.status === "processing").length, icon: Loader2, color: "text-amber-500" },
    { label: "Avg Confidence", value: `${Math.round(reports.reduce((a, r) => a + r.confidence, 0) / reports.length)}%`, icon: BarChart2, color: "text-emerald-500" },
  ];

  const statusConfig: Record<ReportStatus, { label: string; color: string; bg: string }> = {
    compiled: { label: "Compiled", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
    processing: { label: "Processing", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
    queued: { label: "Queued", color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" },
  };

  const handleGenerateClick = () => {
    setShowModal(true);
  };

  const handleModalConfirm = () => {
    setShowModal(false);
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGeneratedTitle("Live Session Report — 18 Jun 19:11");
    }, 2500);
  };

  const handleDownload = (id: string) => {
    if (downloadingId) return;
    setDownloadingId(id);
    setDownloadProgress(0);
    const interval = setInterval(() => {
      setDownloadProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setDownloadingId(null);
            setDownloadProgress(0);
          }, 600);
          return 100;
        }
        return p + Math.random() * 22;
      });
    }, 180);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen hud-grid page-enter">
      <Header title="AI Report Generation Console" />

      <main className="flex-1 p-5 space-y-5 max-w-[1440px] mx-auto w-full">

        {/* Stats Row */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <motion.div
                variants={fadeUp}
                key={s.label}
                className="glass-panel border rounded-2xl p-4 flex items-center gap-3"
              >
                <div className={`p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">{s.label}</span>
                  <span className="text-xl font-black tracking-tight">{s.value}</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title or tag…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
            />
          </div>

          <button
            onClick={handleGenerateClick}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-60"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            <span>{generating ? "Compiling Report…" : "Compile New AI Report"}</span>
          </button>
        </motion.div>

        {/* Generated banner */}
        <AnimatePresence>
          {generatedTitle && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Report Generated Successfully</p>
                <p className="text-xs text-slate-500 font-mono">{generatedTitle}</p>
              </div>
              <button onClick={() => setGeneratedTitle("")} className="ml-auto text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {filtered.map((r) => {
            const sc = statusConfig[r.status];
            const isDownloading = downloadingId === r.id;

            return (
              <motion.div
                variants={fadeUp}
                key={r.id}
                whileHover={{ y: -2 }}
                className="glass-panel border rounded-2xl p-5 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Icon */}
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 rounded-xl flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">{r.title}</h4>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border font-mono ${sc.bg} ${sc.color}`}>
                        {r.status === "processing" && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1 align-middle" />
                        )}
                        {sc.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-mono flex-wrap">
                      <span>{r.id}</span>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <span>{r.type}</span>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.date}</span>
                      <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{r.size}</span>
                    </div>

                    {/* Tags + Modalities + Confidence */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <div className="flex gap-1.5">
                        {r.tags.map((t) => (
                          <span key={t} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[8px] font-mono text-slate-500">
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 ml-auto">
                        {r.modalities.map((m) => {
                          const MIcon = modalityIcon[m];
                          return (
                            <div key={m} title={modalityLabel[m]} className="p-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500">
                              <MIcon className="w-3 h-3" />
                            </div>
                          );
                        })}
                        <div className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/8 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                          {r.confidence}% conf
                        </div>
                      </div>
                    </div>

                    {/* Download progress bar */}
                    <AnimatePresence>
                      {isDownloading && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3"
                        >
                          <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                              animate={{ width: `${Math.min(downloadProgress, 100)}%` }}
                              transition={{ duration: 0.2 }}
                            />
                          </div>
                          <p className="text-[9px] font-mono text-cyan-500 mt-1">
                            Downloading… {Math.round(Math.min(downloadProgress, 100))}%
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => handleDownload(r.id)}
                    disabled={r.status !== "compiled" || !!downloadingId}
                    className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold font-mono transition-all cursor-pointer ${
                      r.status === "compiled" && !downloadingId
                        ? "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                        : "border-slate-100 dark:border-slate-900 text-slate-300 dark:text-slate-700 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {isDownloading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : downloadProgress === 100 && downloadingId === r.id ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>DOWNLOAD</span>
                    <ChevronRight className="w-3 h-3 opacity-50" />
                  </button>
                </div>
              </motion.div>
            );
          })}

          {filtered.length === 0 && (
            <div className="glass-panel border rounded-2xl p-10 text-center">
              <AlertTriangle className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-mono">No reports match your search.</p>
            </div>
          )}
        </motion.div>
      </main>

      {/* Compile Report Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="glass-panel border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-sm">Compile AI Audit Report</h3>
                  </div>
                  <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                  The AI will compile a full multimodal incident report from the current session&apos;s
                  vision, audio, and crowd behavioral data streams.
                </p>

                <div className="space-y-2 mb-5">
                  {["Vision: YOLO11s + ByteTrack poses", "Audio: Emotion classifier (anger, fear)", "Crowd: Density + velocity vectors"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-[11px] text-slate-500">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="font-mono">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleModalConfirm}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-xs font-extrabold hover:from-cyan-400 hover:to-indigo-400 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
                  >
                    Compile Now →
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
