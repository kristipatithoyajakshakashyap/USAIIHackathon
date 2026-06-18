"use client";

import React, { useState } from "react";
import { Header } from "@/components/header";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line
} from "recharts";
import { Map, BarChart3, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

export default function AnalyticsPage() {
  const [selectedZone, setSelectedZone] = useState<string | null>("Zone-01");
  const { theme } = useTheme();
  const gridStroke = theme === "dark" ? "#1e293b" : "#e2e8f0";

  // Mock static historical telemetry
  const hourlyData = [
    { time: "09:00", avgRisk: 18, peopleCount: 8, audioAnger: 0.04 },
    { time: "10:00", avgRisk: 22, peopleCount: 14, audioAnger: 0.08 },
    { time: "11:00", avgRisk: 34, peopleCount: 20, audioAnger: 0.12 },
    { time: "12:00", avgRisk: 48, peopleCount: 28, audioAnger: 0.28 },
    { time: "13:00", avgRisk: 42, peopleCount: 18, audioAnger: 0.21 },
    { time: "14:00", avgRisk: 30, peopleCount: 15, audioAnger: 0.10 },
    { time: "15:00", avgRisk: 28, peopleCount: 22, audioAnger: 0.08 },
    { time: "16:00", avgRisk: 55, peopleCount: 32, audioAnger: 0.35 },
    { time: "17:00", avgRisk: 72, peopleCount: 36, audioAnger: 0.62 },
    { time: "18:00", avgRisk: 64, peopleCount: 25, audioAnger: 0.44 }
  ];

  // Grid size 6x6 simulating spatial locations in lobby
  // Higher index = denser heat
  const heatmapGrid = [
    { row: 1, col: 1, count: 2, zone: "Zone-01 (Main Lobby)" },
    { row: 1, col: 2, count: 4, zone: "Zone-01 (Main Lobby)" },
    { row: 1, col: 3, count: 12, zone: "Zone-01 (Main Lobby)" }, // Hotspot
    { row: 1, col: 4, count: 2, zone: "Zone-01 (Main Lobby)" },
    { row: 1, col: 5, count: 1, zone: "Zone-02 (Elevators)" },
    { row: 1, col: 6, count: 0, zone: "Zone-02 (Elevators)" },

    { row: 2, col: 1, count: 1, zone: "Zone-01 (Main Lobby)" },
    { row: 2, col: 2, count: 2, zone: "Zone-01 (Main Lobby)" },
    { row: 2, col: 3, count: 14, zone: "Zone-01 (Main Lobby)" }, // Hotspot
    { row: 2, col: 4, count: 3, zone: "Zone-02 (Elevators)" },
    { row: 2, col: 5, count: 5, zone: "Zone-02 (Elevators)" },
    { row: 2, col: 6, count: 2, zone: "Zone-02 (Elevators)" },

    { row: 3, col: 1, count: 0, zone: "Zone-03 (South Corridor)" },
    { row: 3, col: 2, count: 0, zone: "Zone-03 (South Corridor)" },
    { row: 3, col: 3, count: 1, zone: "Zone-03 (South Corridor)" },
    { row: 3, col: 4, count: 2, zone: "Zone-03 (South Corridor)" },
    { row: 3, col: 5, count: 1, zone: "Zone-02 (Elevators)" },
    { row: 3, col: 6, count: 0, zone: "Zone-02 (Elevators)" },

    { row: 4, col: 1, count: 1, zone: "Zone-03 (South Corridor)" },
    { row: 4, col: 2, count: 3, zone: "Zone-03 (South Corridor)" },
    { row: 4, col: 3, count: 6, zone: "Zone-03 (South Corridor)" },
    { row: 4, col: 4, count: 1, zone: "Zone-04 (Security Checkpoint)" },
    { row: 4, col: 5, count: 8, zone: "Zone-04 (Security Checkpoint)" }, // Hotspot
    { row: 4, col: 6, count: 3, zone: "Zone-04 (Security Checkpoint)" },

    { row: 5, col: 1, count: 2, zone: "Zone-03 (South Corridor)" },
    { row: 5, col: 2, count: 1, zone: "Zone-03 (South Corridor)" },
    { row: 5, col: 3, count: 2, zone: "Zone-04 (Security Checkpoint)" },
    { row: 5, col: 4, count: 9, zone: "Zone-04 (Security Checkpoint)" }, // Hotspot
    { row: 5, col: 5, count: 7, zone: "Zone-04 (Security Checkpoint)" },
    { row: 5, col: 6, count: 2, zone: "Zone-04 (Security Checkpoint)" },

    { row: 6, col: 1, count: 0, zone: "Zone-05 (Staff Lounge)" },
    { row: 6, col: 2, count: 1, zone: "Zone-05 (Staff Lounge)" },
    { row: 6, col: 3, count: 0, zone: "Zone-05 (Staff Lounge)" },
    { row: 6, col: 4, count: 1, zone: "Zone-05 (Staff Lounge)" },
    { row: 6, col: 5, count: 2, zone: "Zone-05 (Staff Lounge)" },
    { row: 6, col: 6, count: 1, zone: "Zone-05 (Staff Lounge)" }
  ];

  const getHeatColor = (count: number) => {
    if (count > 10) return "bg-red-600/70 border-red-500/50 shadow-[0_0_8px_rgba(220,38,38,0.3)]";
    if (count > 6) return "bg-orange-500/60 border-orange-400/40 shadow-[0_0_8px_rgba(249,115,22,0.2)]";
    if (count > 3) return "bg-amber-400/45 border-amber-300/35";
    if (count > 0) return "bg-cyan-500/20 border-cyan-400/20";
    return "bg-slate-100/30 dark:bg-slate-900/10 border-slate-200/20 dark:border-slate-800/10";
  };

  const zonesSummary = [
    { id: "Zone-01", name: "Main Lobby Entrance", avgDensity: 8.4, trend: "+12%" },
    { id: "Zone-02", name: "Elevator Lobby Corridor", avgDensity: 4.1, trend: "-4%" },
    { id: "Zone-03", name: "South Gate Exit", avgDensity: 2.3, trend: "Stable" },
    { id: "Zone-04", name: "Security Checkpoint C", avgDensity: 6.8, trend: "+18%" }
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Historical Analytics & Spatial Heatmaps" />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Spatial Heatmap (Left 5 cols) */}
          <div className="lg:col-span-5 glass-panel border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-900 mb-4">
                <Map className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm tracking-wide">Lobby Spatial Grid Heatmap</h3>
              </div>

              {/* 2D Heatmap Grid Layout */}
              <div className="grid grid-cols-6 gap-2 aspect-square w-full bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-900 shadow-inner">
                {heatmapGrid.map((node, index) => (
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    key={index}
                    onClick={() => setSelectedZone(node.zone)}
                    className={`rounded border flex flex-col items-center justify-center font-mono cursor-pointer transition-all duration-200 ${getHeatColor(node.count)}`}
                  >
                    <span className="text-[10px] font-black text-slate-700 dark:text-white/80 select-none">
                      {node.count}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-xs text-center font-mono">
              {selectedZone ? (
                <p>
                  Active Zone inspection: <strong className="text-cyan-400">{selectedZone}</strong>
                </p>
              ) : (
                <p>Hover/Click nodes to inspect zone densities</p>
              )}
            </div>
          </div>

          {/* Core Analytics Charts (Right 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Chart 1: Risk Index vs People Count */}
            <div className="glass-panel border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900 mb-4">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-sm tracking-wide">Escalation Threat Index vs. Occupancy</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">10-HOUR WINDOW</span>
              </div>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="colorRiskAvg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.25} vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={9} className="font-mono" />
                    <YAxis stroke="#64748b" fontSize={9} className="font-mono" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#070c14",
                        border: "1px solid #1e293b",
                        borderRadius: "8px",
                        fontSize: "11px",
                        color: "#fff"
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgRisk"
                      name="Average Risk %"
                      stroke="#00f0ff"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRiskAvg)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Audio anger/fear spikes */}
            <div className="glass-panel border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900 mb-4">
                <div className="flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-sm tracking-wide">Speech Anger probability Timeline</span>
                </div>
                <span className="text-[10px] font-mono text-indigo-400">ACOUSTIC CLASSIFIER</span>
              </div>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.25} vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={9} className="font-mono" />
                    <YAxis domain={[0, 1]} stroke="#64748b" fontSize={9} className="font-mono" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#070c14",
                        border: "1px solid #1e293b",
                        borderRadius: "8px",
                        fontSize: "11px",
                        color: "#fff"
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="audioAnger"
                      name="Speech Anger Value"
                      stroke="#818cf8"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Zone Summaries Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {zonesSummary.map((z) => (
            <div key={z.id} className="glass-panel border rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <span>{z.id}</span>
                <span className={z.trend.startsWith("+") ? "text-red-500" : "text-emerald-500"}>
                  {z.trend}
                </span>
              </div>
              <h4 className="text-xs font-bold">{z.name}</h4>
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-2xl font-black">{z.avgDensity}</span>
                <span className="text-[10px] text-slate-400 font-mono">Avg Targets/hr</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
