"use client";

import React, { useState } from "react";
import { Header } from "@/components/header";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter,
  Eye,
  Clock,
  Cpu,
  BrainCircuit,
  X,
  Sparkles,
  Download
} from "lucide-react";

interface Alert {
  id: string;
  camera: string;
  zone: string;
  time: string;
  date: string;
  score: number;
  severity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  description: string;
  shap: Record<string, number>;
  geminiSummary: string;
}

export default function AlertsPage() {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "SEVERITY">("ALL");

  const alerts: Alert[] = [
    {
      id: "ALT-8891",
      camera: "CAM-01",
      zone: "Main Lobby Entrance",
      time: "18:40:11",
      date: "2026-06-18",
      score: 92,
      severity: "CRITICAL",
      status: "ACTIVE",
      description: "Aggressive posture combined with elevated vocal intensity and rapid physical convergence.",
      shap: {
        "Vocal Intensity": 34,
        "Posture Aggression": 28,
        "Proximity/Clustering": 18,
        "Movement Speed": 12
      },
      geminiSummary: "MULTIMODAL THREAT SUMMARY:\nAt 18:40:11, CAM-01 recorded two targets engaging in high-velocity physical movement. Concurrently, audio sensors registered vocal intensities exceeding 85dB with high acoustic frequencies mapping to anger. The fusion head evaluates a 92% escalation index. Proactive intervention recommended before physical contact occurs."
    },
    {
      id: "ALT-8890",
      camera: "CAM-02",
      zone: "South Gate Exit",
      time: "18:32:04",
      date: "2026-06-18",
      score: 78,
      severity: "HIGH",
      status: "ACTIVE",
      description: "Sudden acceleration and hand gestures observed near vehicle security checkpoint.",
      shap: {
        "Movement Speed": 30,
        "Posture Aggression": 22,
        "Vocal Intensity": 15,
        "Proximity/Clustering": 11
      },
      geminiSummary: "MULTIMODAL THREAT SUMMARY:\nRapid motion trajectory detected in Zone B (South Gate Exit). A single target executed high-acceleration forward lunges toward the gate officer. Vocal anger probability was estimated at 65%. Dynamic threat scoring triggered High alert."
    },
    {
      id: "ALT-8889",
      camera: "CAM-04",
      zone: "Corridor B East",
      time: "18:15:30",
      date: "2026-06-18",
      score: 58,
      severity: "MODERATE",
      status: "ACKNOWLEDGED",
      description: "High crowd clustering density threshold surpassed during employee transition phase.",
      shap: {
        "Proximity/Clustering": 32,
        "Movement Speed": 14,
        "Posture Aggression": 8,
        "Vocal Intensity": 4
      },
      geminiSummary: "MULTIMODAL THREAT SUMMARY:\nCrowd convergence anomaly detected in Corridor B. Approximately 12 individuals clustered within a 4x4m region, representing a density index of 0.75. Motion speed remains low and audio signals are nominal. Flagged as moderate crowd crowding hazard."
    },
    {
      id: "ALT-8888",
      camera: "CAM-01",
      zone: "Lobby A Left Corridor",
      time: "17:44:12",
      date: "2026-06-18",
      score: 82,
      severity: "HIGH",
      status: "RESOLVED",
      description: "Aggressive posture indicators (raised arms) flagged. Resolved following dispatch.",
      shap: {
        "Posture Aggression": 38,
        "Movement Speed": 20,
        "Vocal Intensity": 14,
        "Proximity/Clustering": 10
      },
      geminiSummary: "MULTIMODAL THREAT SUMMARY:\nHigh-confidence gesture tracking observed a target with raised limbs and wide posture stance. Audio sensors captured voice spikes. Dispatched officers verified a physical dispute, successfully resolved on scene."
    }
  ];

  const getSeverityStyles = (sev: Alert["severity"]) => {
    switch (sev) {
      case "CRITICAL":
        return "bg-red-500/10 text-red-500 border-red-500/30";
      case "HIGH":
        return "bg-orange-500/10 text-orange-500 border-orange-500/30";
      case "MODERATE":
        return "bg-amber-500/10 text-amber-500 border-amber-500/30";
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    }
  };

  const getStatusStyles = (status: Alert["status"]) => {
    switch (status) {
      case "ACTIVE":
        return "text-red-500 bg-red-500/5";
      case "ACKNOWLEDGED":
        return "text-amber-500 bg-amber-500/5";
      default:
        return "text-slate-400 bg-slate-500/5";
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === "ACTIVE") return alert.status === "ACTIVE";
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Alert Notification Center" />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Top filter toolbar */}
        <div className="glass-panel border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider font-mono">Filter Logs</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-4 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                filter === "ALL"
                  ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-500"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60"
              }`}
            >
              All Alerts
            </button>
            <button
              onClick={() => setFilter("ACTIVE")}
              className={`px-4 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                filter === "ACTIVE"
                  ? "bg-red-500/15 border-red-500/30 text-red-500"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60"
              }`}
            >
              Active Only
            </button>
          </div>
        </div>

        {/* Alerts Table Card */}
        <div className="glass-panel border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-900 text-slate-400 text-xs font-mono bg-slate-50/50 dark:bg-slate-900/10">
                <th className="py-3 px-4">SEVERITY</th>
                <th className="py-3 px-4">ALERT ID</th>
                <th className="py-3 px-4">CAMERA NODE</th>
                <th className="py-3 px-4">PHYSICAL ZONE</th>
                <th className="py-3 px-4">TIMESTAMP</th>
                <th className="py-3 px-4">RISK INDEX</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert) => (
                <tr
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className="border-b border-slate-100 dark:border-slate-900 text-xs hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer group"
                >
                  <td className="py-4 px-4">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getSeverityStyles(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-slate-400 group-hover:text-cyan-400 transition-colors">
                    {alert.id}
                  </td>
                  <td className="py-4 px-4 font-semibold">{alert.camera}</td>
                  <td className="py-4 px-4 text-slate-600 dark:text-slate-400">{alert.zone}</td>
                  <td className="py-4 px-4 font-mono text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{alert.time}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-mono font-black text-sm">{alert.score}%</td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider font-mono ${getStatusStyles(alert.status)}`}>
                      {alert.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 group-hover:text-cyan-500 group-hover:border-cyan-500/50 transition-all">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Interactive Detail Report Modal */}
      <AnimatePresence>
        {selectedAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            {/* Click backdrop to close */}
            <div className="absolute inset-0" onClick={() => setSelectedAlert(null)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#070c14] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getSeverityStyles(selectedAlert.severity)}`}>
                    {selectedAlert.severity}
                  </span>
                  <h3 className="text-sm font-mono font-bold text-slate-400">
                    EXECUTIVE AUDIT: {selectedAlert.id}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                {/* Details layout grid */}
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-900">
                    <span className="text-slate-400 block mb-1">CAMERA SOURCE</span>
                    <span className="font-bold text-sm text-cyan-400">{selectedAlert.camera} - {selectedAlert.zone}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-900">
                    <span className="text-slate-400 block mb-1">DATE & TIMESTAMP</span>
                    <span className="font-bold text-sm">{selectedAlert.date} | {selectedAlert.time}</span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                    Event Details
                  </span>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {selectedAlert.description}
                  </p>
                </div>

                {/* SHAP Explanation */}
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/20">
                  <div className="flex items-center gap-1.5 mb-4">
                    <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Model Explainability Breakdown (SHAP Values)
                    </span>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(selectedAlert.shap).map(([feature, weight]) => (
                      <div key={feature} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{feature}</span>
                          <span className="font-mono font-bold text-cyan-400">+{weight} SHAP</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800/80 h-2 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(weight / 40) * 100}%` }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gemini AI summary */}
                <div className="p-5 rounded-xl border border-cyan-500/10 bg-cyan-500/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-cyan-500">
                      <BrainCircuit className="w-4 h-4" />
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold">
                        Gemini 2.5 Flash Incident Assessment
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-cyan-500/80 font-mono font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>GENAI SUMMARY</span>
                    </div>
                  </div>

                  <p className="text-xs font-mono leading-relaxed text-slate-600 dark:text-cyan-200/90 whitespace-pre-line border-l border-cyan-500/30 pl-3.5">
                    {selectedAlert.geminiSummary}
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer"
                >
                  Close Audit
                </button>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white shadow-md text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
                    <Download className="w-4 h-4" />
                    <span>Download Audit PDF</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
