"use client";

import React, { useState, useEffect } from "react";
import { Bell, Search, ShieldCheck, HelpCircle, User, ArrowRight, Wifi } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface HeaderProps {
  title?: string;
  onOpenWalkthrough?: () => void;
}

export function Header({ title = "Operations Dashboard", onOpenWalkthrough }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [clock, setClock] = useState("");
  const [pipelinePulse, setPipelinePulse] = useState(true);
  const [notifCount, setNotifCount] = useState(3);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString("en-US", { hour12: false }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Heartbeat pulse toggle for pipeline badge
  useEffect(() => {
    const t = setInterval(() => setPipelinePulse((p) => !p), 1400);
    return () => clearInterval(t);
  }, []);

  const notifications = [
    { id: 1, type: "CRITICAL", title: "Aggression Detected", cam: "CAM-01 (Zone A)", time: "2 min ago" },
    { id: 2, type: "HIGH", title: "Crowd Convergence Peak", cam: "CAM-04 (Zone B)", time: "5 min ago" },
    { id: 3, type: "MODERATE", title: "Sudden Running Pattern", cam: "CAM-02 (South Gate)", time: "12 min ago" },
  ];

  const handleOpenNotif = () => {
    setShowNotifications((v) => !v);
    if (!showNotifications) setNotifCount(0);
  };

  return (
    <header className="sticky top-0 right-0 left-0 h-[68px] glass-panel border-b border-slate-200/80 dark:border-[#0f1d35] px-5 flex items-center justify-between z-20">
      {/* Left: Title + Status */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col leading-tight">
          <h1 className="text-[15px] font-extrabold tracking-tight text-slate-800 dark:text-white capitalize">
            {title}
          </h1>
          <span className="font-mono text-[9px] text-slate-400 tracking-widest uppercase">
            PREVAIL · MULTIMODAL AI
          </span>
        </div>

        {/* Pipeline Status Badge */}
        <motion.div
          animate={{ opacity: pipelinePulse ? 1 : 0.55 }}
          transition={{ duration: 0.7 }}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]"
        >
          <ShieldCheck className="w-3 h-3" />
          <span>AI PIPELINE ACTIVE</span>
          <div className="w-1 h-1 rounded-full bg-emerald-500" />
        </motion.div>

        {/* Latency indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-[10px]">
          <Wifi className="w-3 h-3" />
          <span>{clock}</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5">
        {/* Search */}
        <div className="relative hidden md:block w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search cameras, logs..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 transition-all"
          />
        </div>

        {/* Help / Walkthrough */}
        {onOpenWalkthrough && (
          <button
            onClick={onOpenWalkthrough}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-500 hover:text-cyan-500 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer"
            title="Open Demo Walkthrough"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={handleOpenNotif}
            className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all cursor-pointer"
          >
            <motion.div
              animate={notifCount > 0 ? { rotate: [0, -8, 8, -5, 5, 0] } : {}}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 5 }}
            >
              <Bell className="w-4 h-4" />
            </motion.div>
            <AnimatePresence>
              {notifCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] font-extrabold flex items-center justify-center border border-white dark:border-slate-900"
                >
                  {notifCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-2xl z-20"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900">
                    <span className="font-bold text-sm">System Alerts</span>
                    <span className="text-[10px] font-mono text-cyan-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full live-dot inline-block" />
                      LIVE FEED
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {notifications.map((n, i) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="flex flex-col p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-900 hover:border-cyan-500/20 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm ${
                              n.type === "CRITICAL"
                                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                : n.type === "HIGH"
                                ? "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                                : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            }`}
                          >
                            {n.type}
                          </span>
                          <span className="text-xs font-semibold">{n.title}</span>
                          <span className="ml-auto text-[10px] text-slate-400">{n.time}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-mono">{n.cam}</span>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-900 text-center">
                    <Link
                      href="/alerts"
                      onClick={() => setShowNotifications(false)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-500 hover:text-cyan-400 transition-colors"
                    >
                      <span>Go to Alert Center</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Divider */}
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />

        {/* User Profile */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-extrabold text-sm">
            <User className="w-4 h-4" />
            <span className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white dark:border-slate-900" />
          </div>
          <div className="hidden lg:flex flex-col leading-tight">
            <span className="text-xs font-bold">OPERATOR-A</span>
            <span className="text-[9px] text-slate-400 font-mono tracking-wider">ROLE: MONITOR</span>
          </div>
        </div>
      </div>
    </header>
  );
}
