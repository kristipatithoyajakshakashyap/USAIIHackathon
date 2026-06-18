"use client";

import React, { useState } from "react";
import { Header } from "@/components/header";
import { Video, Plus, ToggleLeft, ToggleRight } from "lucide-react";

export default function CamerasPage() {
  const [cameras, setCameras] = useState([
    { id: "CAM-01", name: "Main Lobby Entrance", ip: "192.168.1.50", status: "ONLINE", fps: 12.4, resolution: "1920x1080", recording: true },
    { id: "CAM-02", name: "South Gate Exit Way", ip: "192.168.1.51", status: "ONLINE", fps: 15.0, resolution: "1280x720", recording: true },
    { id: "CAM-03", name: "Parking Lot Row C", ip: "192.168.1.52", status: "ONLINE", fps: 10.0, resolution: "1280x720", recording: false },
    { id: "CAM-04", name: "Employee Hallway B", ip: "192.168.1.53", status: "ONLINE", fps: 12.0, resolution: "1920x1080", recording: true }
  ]);

  const toggleRecording = (id: string) => {
    setCameras(prev => prev.map(c => c.id === id ? { ...c, recording: !c.recording } : c));
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Camera Management Hub" />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Actions bar */}
        <div className="glass-panel border rounded-2xl p-4 flex justify-between items-center shadow-sm">
          <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">
            Active Nodes: {cameras.length} / 4 Online
          </span>
          <button className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white shadow-sm text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" />
            <span>Add Node</span>
          </button>
        </div>

        {/* Camera List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cameras.map((c) => (
            <div key={c.id} className="glass-panel border rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 rounded-xl">
                    <Video className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">{c.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5">{c.id} | IP: {c.ip}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[10px] font-bold font-mono text-emerald-500">{c.status}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 dark:border-slate-900 text-center font-mono text-[10px] text-slate-400">
                <div>
                  <span className="block mb-1">FPS LIMIT</span>
                  <span className="text-slate-800 dark:text-white font-bold">{c.fps} FPS</span>
                </div>
                <div>
                  <span className="block mb-1">RESOLUTION</span>
                  <span className="text-slate-800 dark:text-white font-bold">{c.resolution}</span>
                </div>
                <div>
                  <span className="block mb-1">STREAM LINK</span>
                  <span className="text-cyan-500 font-bold">RTSP://</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Node Recording:</span>
                <button
                  onClick={() => toggleRecording(c.id)}
                  className="text-slate-400 hover:text-cyan-500 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {c.recording ? (
                    <ToggleRight className="w-8 h-8 text-cyan-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-400" />
                  )}
                </button>
              </div>

            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
