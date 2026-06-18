"use client";

import React, { useState } from "react";
import { Header } from "@/components/header";
import {
  Search,
  Calendar,
  Shield,
  FileSpreadsheet,
  Download,
  Terminal,
  Sparkles
} from "lucide-react";

interface Incident {
  id: string;
  title: string;
  camera: string;
  zone: string;
  date: string;
  time: string;
  duration: string;
  severity: "CRITICAL" | "HIGH" | "MODERATE";
  description: string;
  geminiReport: {
    executiveSummary: string;
    chronologicalSequence: string[];
    technicalMetrics: {
      peakRisk: number;
      audioSpikes: number;
      averageFps: number;
      trackedEntities: number;
    };
  };
}

export default function ExplorerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const incidents: Incident[] = [
    {
      id: "INC-9482",
      title: "Elevated verbal altercation at Front Desk",
      camera: "CAM-01",
      zone: "Main Lobby Entrance",
      date: "2026-06-18",
      time: "18:40:11",
      duration: "42 seconds",
      severity: "CRITICAL",
      description: "Severe escalation involving rapid movement and loud shouting triggers high MLP head risk scoring.",
      geminiReport: {
        executiveSummary: "MULTIMODAL INTELLIGENCE BRIEF:\nAt 18:40:11, local sensors detected physical proximity convergence between Target-01 and Target-02 in Lobby Zone A. Concurrent vocal analysis flagged anger emotional weights at 94% confidence, correlating with decibel spikes at 88dB. Structural pose skeletons recorded arm elevations and torso leans indicating physical threat posturing. MLP classification index locked at 92% (Critical). Proactive intervention succeeded prior to battery.",
        chronologicalSequence: [
          "18:40:02 - Targets 01 & 02 enter Lobby Zone A; spatial distance: 4.2m.",
          "18:40:08 - Sudden speed acceleration (3.4m/s); targets approach within 0.8m.",
          "18:40:11 - Decibel levels exceed 85dB; audio anger registers at 0.94 probability.",
          "18:40:14 - Arm gestures indicate high acceleration swing; threat head triggers CRITICAL risk.",
          "18:40:22 - Guard dispatch confirmation; threat levels decrease as security arrives."
        ],
        technicalMetrics: {
          peakRisk: 92,
          audioSpikes: 88,
          averageFps: 12.4,
          trackedEntities: 2
        }
      }
    },
    {
      id: "INC-9481",
      title: "Crowd gathering convergence in central square",
      camera: "CAM-04",
      zone: "Central Plaza Zone B",
      date: "2026-06-18",
      time: "18:15:30",
      duration: "3 minutes",
      severity: "MODERATE",
      description: "Passive crowd density spike. Motion trajectories show converging patterns towards a single vector.",
      geminiReport: {
        executiveSummary: "MULTIMODAL INTELLIGENCE BRIEF:\nSurveillance node CAM-04 recorded a moderate risk event due to rapid spatial clustering of 12 individuals. Average speed velocities remained nominal (<1m/s), and vocal decibel readings did not surpass baseline security parameters. Model output indicates a crowd convergence anomaly. Suggested protocol: remote dispatcher sweep to confirm normal operation.",
        chronologicalSequence: [
          "18:15:00 - Normal foot traffic; 4 targets tracking.",
          "18:15:15 - Target group density increases as 8 additional entities enter cluster.",
          "18:15:30 - Convergence peaks; spatial clustering radius reaches 12 entities in 4x4m region.",
          "18:15:45 - Cluster dispersal initiates; risk vectors decrease."
        ],
        technicalMetrics: {
          peakRisk: 58,
          audioSpikes: 56,
          averageFps: 11.8,
          trackedEntities: 12
        }
      }
    },
    {
      id: "INC-9480",
      title: "Physical pushing and running corridor alert",
      camera: "CAM-02",
      zone: "South Gate Exit Way",
      date: "2026-06-18",
      time: "17:44:12",
      duration: "18 seconds",
      severity: "HIGH",
      description: "High acceleration motion combined with pose swings triggers security alarm.",
      geminiReport: {
        executiveSummary: "MULTIMODAL INTELLIGENCE BRIEF:\nCAM-02 registered High risk threat telemetry due to rapid motion vectors. Target-04 acceleration exceeded 4.8m/s, followed by sudden collision impact with Target-05. Voice audio captured intensity peaks. Escalation index reached 82%. On-site dispatch confirmed dispute resolved.",
        chronologicalSequence: [
          "17:44:02 - Target-04 initiates running sequence down South Gate Hallway.",
          "17:44:08 - Collision event with Target-05; bounding boxes overlap.",
          "17:44:12 - MLP risk head evaluates HIGH risk due to pose posture alignment.",
          "17:44:20 - Physical parting; targets exit camera field."
        ],
        technicalMetrics: {
          peakRisk: 82,
          audioSpikes: 74,
          averageFps: 12.1,
          trackedEntities: 2
        }
      }
    }
  ];

  const filteredIncidents = incidents.filter((inc) =>
    inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inc.zone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeIncident = selectedIncident || incidents[0];

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Incident Explorer & AI Reports" />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Timeline & List (Left 5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            <div className="glass-panel border rounded-2xl p-4 shadow-sm flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search incident ID, zone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-800 dark:text-white border-none focus:outline-none placeholder-slate-400"
              />
            </div>

            <div className="glass-panel border rounded-2xl p-5 shadow-sm flex-1 space-y-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                Logged Incidents Timeline
              </span>
              
              <div className="space-y-4">
                {filteredIncidents.map((inc) => {
                  const isActive = activeIncident.id === inc.id;
                  const sevColors = inc.severity === "CRITICAL"
                    ? "bg-red-500/10 text-red-500 border-red-500/30"
                    : inc.severity === "HIGH"
                    ? "bg-orange-500/10 text-orange-500 border-orange-500/30"
                    : "bg-amber-500/10 text-amber-500 border-amber-500/30";

                  return (
                    <div
                      key={inc.id}
                      onClick={() => setSelectedIncident(inc)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                        isActive
                          ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-500"
                          : "border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/10 hover:bg-slate-50 dark:hover:bg-slate-900/35"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-xs font-bold text-slate-400 group-hover:text-cyan-400">
                          {inc.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${sevColors}`}>
                          {inc.severity}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white mt-2 leading-snug">
                        {inc.title}
                      </h4>
                      <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-400 font-mono">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{inc.time}</span>
                        </div>
                        <span>{inc.zone}</span>
                      </div>

                      {isActive && (
                        <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-cyan-500 rounded-r-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AI Generated PDF/Report Preview Card (Right 7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            <div className="glass-panel border rounded-2xl p-6 shadow-sm space-y-6 flex-1 flex flex-col justify-between">
              
              {/* Report Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 rounded-xl">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                      EXECUTIVE SECURITY BRIEFING
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest mt-0.5">
                      GENAI-ASSISTED DOCUMENT: {activeIncident.id}
                    </span>
                  </div>
                </div>
                
                <button className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-bold font-mono text-slate-400 hover:text-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer">
                  <Download className="w-3.5 h-3.5" />
                  <span>EXPORT PDF</span>
                </button>
              </div>

              {/* Gemini style AI report block */}
              <div className="p-5 rounded-xl border border-indigo-500/10 bg-indigo-500/5 relative overflow-hidden flex-1">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 blur-3xl pointer-events-none" />
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
                    <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold">
                      Gemini 2.5 Flash Summary Report
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md font-bold">
                    PREVAIL MULTIMODAL FUSION
                  </span>
                </div>

                <p className="text-xs font-mono leading-relaxed text-slate-600 dark:text-indigo-200/90 whitespace-pre-line border-l border-indigo-500/30 pl-4 mb-6">
                  {activeIncident.geminiReport.executiveSummary}
                </p>

                {/* Technical stats breakdown */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-900 text-center font-mono">
                    <span className="text-[9px] text-slate-500 block mb-1">PEAK RISK</span>
                    <span className="text-base font-black text-red-400">
                      {activeIncident.geminiReport.technicalMetrics.peakRisk}%
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-900 text-center font-mono">
                    <span className="text-[9px] text-slate-500 block mb-1">AUDIO SPIKE</span>
                    <span className="text-base font-black text-amber-400">
                      {activeIncident.geminiReport.technicalMetrics.audioSpikes}dB
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-900 text-center font-mono">
                    <span className="text-[9px] text-slate-500 block mb-1">PROC FPS</span>
                    <span className="text-base font-black text-cyan-400">
                      {activeIncident.geminiReport.technicalMetrics.averageFps}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-900 text-center font-mono">
                    <span className="text-[9px] text-slate-500 block mb-1">ENTITIES</span>
                    <span className="text-base font-black text-blue-400">
                      {activeIncident.geminiReport.technicalMetrics.trackedEntities}
                    </span>
                  </div>
                </div>

                {/* Chronology sequence log */}
                <div>
                  <div className="flex items-center gap-1.5 mb-3 text-slate-400">
                    <Terminal className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-mono uppercase tracking-wider">
                      Chronological Fusion Trace Logs
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {activeIncident.geminiReport.chronologicalSequence.map((seq, idx) => (
                      <div key={idx} className="flex gap-3 text-xs leading-relaxed font-mono">
                        <span className="text-indigo-400 flex-shrink-0">[{idx + 1}]</span>
                        <span className="text-slate-600 dark:text-slate-400">{seq}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-900">
                <button className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white shadow-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>EXECUTIVE SIGN-OFF REPORT</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
