"use client";

import React, { useState } from "react";
import { Header } from "@/components/header";
import { Save, Cpu, Database, Key } from "lucide-react";

export default function SettingsPage() {
  const [fpsLimit, setFpsLimit] = useState(12);
  const [poseWeight, setPoseWeight] = useState(30);
  const [audioWeight, setAudioWeight] = useState(30);
  const [motionWeight, setMotionWeight] = useState(40);
  const [savedStatus, setSavedStatus] = useState(false);

  const handleSave = () => {
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="System Configuration Settings" />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Fusion weights */}
          <div className="lg:col-span-2 glass-panel border rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-900">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-sm tracking-wide">Multimodal Risk Fusion Weights</h3>
            </div>

            <div className="space-y-6">
              {/* Pose weight */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Skeletal Pose Aggression Weight</span>
                  <span className="font-mono text-cyan-400">{poseWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={poseWeight}
                  onChange={(e) => setPoseWeight(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Audio weight */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Acoustic Vocal Anger Weight</span>
                  <span className="font-mono text-cyan-400">{audioWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={audioWeight}
                  onChange={(e) => setAudioWeight(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Motion speed */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Velocity Motion Acceleration Weight</span>
                  <span className="font-mono text-cyan-400">{motionWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={motionWeight}
                  onChange={(e) => setMotionWeight(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{savedStatus ? "CONFIGURATION SAVED" : "COMMIT WEIGHT SETTINGS"}</span>
            </button>
          </div>

          {/* System settings */}
          <div className="glass-panel border rounded-2xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-900">
                <Database className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm tracking-wide">Processor Hardware Configuration</h3>
              </div>

              {/* FPS Limit */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span>Target Processing FPS Limit</span>
                  <span className="font-mono text-indigo-400">{fpsLimit} FPS</span>
                </div>
                <select
                  value={fpsLimit}
                  onChange={(e) => setFpsLimit(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value={5}>5 FPS (Eco Mode)</option>
                  <option value={10}>10 FPS (Default)</option>
                  <option value={12}>12 FPS (Tactical)</option>
                  <option value={15}>15 FPS (High Telemetry)</option>
                  <option value={30}>30 FPS (Full Realtime)</option>
                </select>
              </div>

              {/* API keys */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-1 font-semibold">
                  <Key className="w-4 h-4 text-slate-400" />
                  <span>Gemini Developer Token Credentials</span>
                </div>
                <input
                  type="password"
                  value="••••••••••••••••••••••••••••"
                  disabled
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-slate-800 dark:text-white"
                />
                <span className="text-[10px] text-slate-500 leading-normal block">
                  Fine-tuned executive summary report generator uses the Gemini 2.5 Flash API client.
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 leading-normal">
              System credentials and GPU memory metrics are read from the global environment config file.
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
