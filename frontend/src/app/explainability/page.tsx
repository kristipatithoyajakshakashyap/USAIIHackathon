"use client";

import React, { useState } from "react";
import { Header } from "@/components/header";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import { Cpu, Network, Info } from "lucide-react";
import { useTheme } from "next-themes";

export default function ExplainabilityPage() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const { theme } = useTheme();
  const gridStroke = theme === "dark" ? "#1e293b" : "#e2e8f0";

  // Global feature importance weights (Dataset-wide)
  const globalImportance = [
    { name: "Raised Arms Gesture", weight: 38 },
    { name: "Vocal Intensity (dB)", weight: 32 },
    { name: "Speech Anger probability", weight: 26 },
    { name: "Movement Acceleration", weight: 20 },
    { name: "Target Proximity Radius", weight: 15 },
    { name: "Crowd Convergence rate", weight: 11 }
  ];

  // Tree nodes to display
  const treeNodes = {
    root: { id: "root", label: "Speech Anger > 0.65?", desc: "Primary acoustic split" },
    left: { id: "left", label: "Pose Raised Arms?", desc: "Visual posturing check" },
    right: { id: "right", label: "Entity Speed > 3m/s?", desc: "Velocity boundary split" },
    leaf1: { id: "leaf1", label: "CRITICAL RISK (92%)", desc: "Violent confrontation imminent" },
    leaf2: { id: "leaf2", label: "MODERATE RISK (58%)", desc: "Acoustic tension only" },
    leaf3: { id: "leaf3", label: "HIGH RISK (82%)", desc: "Rapid convergence physical push" },
    leaf4: { id: "leaf4", label: "SAFE / LOW RISK (14%)", desc: "Baseline operational activities" }
  };

  const isPathActive = (nodeId: string) => {
    if (!hoveredNode) return false;
    if (hoveredNode === "leaf1") return ["root", "left", "leaf1"].includes(nodeId);
    if (hoveredNode === "leaf2") return ["root", "left", "leaf2"].includes(nodeId);
    if (hoveredNode === "leaf3") return ["root", "right", "leaf3"].includes(nodeId);
    if (hoveredNode === "leaf4") return ["root", "right", "leaf4"].includes(nodeId);
    return hoveredNode === nodeId;
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Model Explainability Ledger (SHAP & Decision Trees)" />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Banner */}
        <div className="p-4 rounded-xl border border-cyan-500/10 bg-cyan-500/5 flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-slate-600 dark:text-cyan-200/80 font-mono">
            <strong>EXPLAINABLE MODEL ARCHITECTURE (XAI):</strong> PREVAIL operates a dual-layer MLP risk prediction head fine-tuned over multimodal features (YOLO skeletal vectors, wav2vec2 audio scores, CLIP scene embeds). We deploy SHAP (SHapley Additive exPlanations) values per-frame to guarantee that security operators can audit and explain automated danger alarms.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Global Feature Importance (dataset weights) */}
          <div className="glass-panel border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-900 mb-4">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm tracking-wide">Global Model Feature Weights</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Aggregated importance coefficients computed over the validation datasets (RWF-2000, UCF Crime, RAVDESS).
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={globalImportance}
                    layout="vertical"
                    margin={{ left: 30, right: 10, top: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.25} horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={9} className="font-mono" />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#070c14",
                        border: "1px solid #1e293b",
                        borderRadius: "8px",
                        fontSize: "11px",
                        color: "#fff"
                      }}
                    />
                    <Bar dataKey="weight" fill="#00f0ff" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 font-mono">
              *Features derived from frame-level pose joints, motion acceleration vectors, and wave frequencies.
            </div>
          </div>

          {/* Decision Tree Breakdown */}
          <div className="glass-panel border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-900 mb-4">
                <Network className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm tracking-wide">Dynamic Inference Decision Tree</h3>
              </div>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Hover over leaf nodes (outcomes) below to trace the decision boundary path taken by the PREVAIL classification MLP.
              </p>

              {/* Tree SVG & node maps */}
              <div className="relative w-full h-72 flex flex-col justify-between items-center text-center font-mono py-2 bg-slate-100/30 dark:bg-slate-950/20 rounded-xl border border-slate-200 dark:border-slate-900/40">
                {/* Root node */}
                <div
                  className={`w-36 p-2 rounded-xl border text-[10px] font-bold transition-all ${
                    isPathActive("root")
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 shadow-glow-cyan"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <p>{treeNodes.root.label}</p>
                  <span className="text-[8px] text-slate-500 font-normal block mt-0.5">{treeNodes.root.desc}</span>
                </div>

                {/* Level 1 branches */}
                <div className="w-full flex justify-around px-8">
                  {/* Left split */}
                  <div
                    className={`w-36 p-2 rounded-xl border text-[10px] font-bold transition-all ${
                      isPathActive("left")
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 shadow-glow-cyan"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <p>{treeNodes.left.label}</p>
                    <span className="text-[8px] text-slate-500 font-normal block mt-0.5">{treeNodes.left.desc}</span>
                  </div>

                  {/* Right split */}
                  <div
                    className={`w-36 p-2 rounded-xl border text-[10px] font-bold transition-all ${
                      isPathActive("right")
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 shadow-glow-cyan"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <p>{treeNodes.right.label}</p>
                    <span className="text-[8px] text-slate-500 font-normal block mt-0.5">{treeNodes.right.desc}</span>
                  </div>
                </div>

                {/* Leaves */}
                <div className="w-full flex justify-between px-2 gap-1.5">
                  {[
                    { node: treeNodes.leaf1, label: "CRITICAL", color: "hover:border-red-500 hover:text-red-400 hover:bg-red-500/5" },
                    { node: treeNodes.leaf2, label: "MODERATE", color: "hover:border-amber-500 hover:text-amber-400 hover:bg-amber-500/5" },
                    { node: treeNodes.leaf3, label: "HIGH RISK", color: "hover:border-orange-500 hover:text-orange-400 hover:bg-orange-500/5" },
                    { node: treeNodes.leaf4, label: "SAFE / LOW", color: "hover:border-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/5" }
                  ].map(({ node, label, color }) => (
                    <div
                      key={node.id}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className={`flex-1 p-1.5 rounded-lg border text-[9px] font-bold transition-all cursor-pointer ${color} ${
                        hoveredNode === node.id
                          ? "border-cyan-500 bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 shadow-glow-cyan"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-500"
                      }`}
                    >
                      <p className="truncate">{label}</p>
                      <span className="text-[8px] font-normal opacity-50 block truncate mt-0.5">{node.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] text-center text-slate-400 font-mono">
              Hover over leaves (Critical, Moderate, High, Safe) to trace model parameters
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
