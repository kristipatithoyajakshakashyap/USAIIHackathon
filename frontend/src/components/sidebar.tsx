"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  LayoutDashboard,
  Eye,
  AlertTriangle,
  FolderSearch,
  BarChart3,
  Cpu,
  Video,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  Activity
} from "lucide-react";

const LINKS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Live Monitoring", href: "/live", icon: Eye },
  { name: "Alert Center", href: "/alerts", icon: AlertTriangle, badge: 3 },
  { name: "Incident Explorer", href: "/explorer", icon: FolderSearch },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Explainability", href: "/explainability", icon: Cpu },
  { name: "Camera Management", href: "/cameras", icon: Video },
  { name: "AI Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface NavLinkProps {
  link: typeof LINKS[0];
  isCollapsed: boolean;
  pathname: string;
}

const NavLink = ({ link, isCollapsed, pathname }: NavLinkProps) => {
  const Icon = link.icon;
  const isActive = pathname === link.href;

  return (
    <Link
      href={link.href}
      title={isCollapsed ? link.name : undefined}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 overflow-hidden ${
        isActive
          ? "bg-gradient-to-r from-cyan-500/15 to-blue-500/5 border border-cyan-500/25 text-cyan-500 dark:text-cyan-400 font-semibold"
          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
      }`}
    >
      {/* Hover fill bg */}
      {!isActive && (
        <span className="absolute inset-0 bg-slate-100/0 dark:bg-white/0 group-hover:bg-slate-100 dark:group-hover:bg-white/[0.04] transition-colors duration-200 rounded-xl" />
      )}

      {/* Icon */}
      <div className="relative z-10 flex-shrink-0">
        <Icon
          className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${
            isActive ? "text-cyan-500" : ""
          }`}
        />
        {isCollapsed && link.badge && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full font-bold border border-white dark:border-[#060b15]">
            {link.badge}
          </span>
        )}
      </div>

      {/* Label */}
      {!isCollapsed && (
        <motion.span
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 text-sm tracking-wide"
        >
          {link.name}
        </motion.span>
      )}

      {/* Badge */}
      {!isCollapsed && link.badge && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 ml-auto bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
        >
          {link.badge}
        </motion.span>
      )}

      {/* Active left indicator */}
      {isActive && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-cyan-500 rounded-r-full shadow-[0_0_8px_rgba(0,240,255,0.8)]"
        />
      )}
    </Link>
  );
};

export function Sidebar() {
  const pathname = usePathname();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [clock, setClock] = useState("");
  const [fps, setFps] = useState(12.4);
  const [latency, setLatency] = useState(22);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString("en-US", { hour12: false }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setFps(+(12 + Math.random() * 1.2).toFixed(1));
      setLatency(Math.floor(18 + Math.random() * 12));
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const sidebarVariants = {
    expanded: { width: "260px" },
    collapsed: { width: "76px" },
  };

  if (pathname === "/intro") return null;

  return (
    <>
      {/* Mobile Toggle Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-[#060b15] border-b border-slate-200 dark:border-slate-900 text-slate-800 dark:text-slate-100 z-50">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />
          <span className="font-extrabold tracking-wider text-xl bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
            PREVAIL
          </span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Nav overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="lg:hidden fixed top-[60px] left-0 right-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 z-40 flex flex-col p-4 gap-1.5 shadow-2xl"
          >
            {LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-4 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-500"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-semibold text-sm">{link.name}</span>
                  {link.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial="expanded"
        animate={isCollapsed ? "collapsed" : "expanded"}
        variants={sidebarVariants}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden lg:flex flex-col h-screen sticky top-0 left-0 bg-white dark:bg-[#04080f] border-r border-slate-200 dark:border-[#0f1d35] shadow-md dark:shadow-2xl z-30 overflow-hidden select-none"
      >
        {/* Header / Logo */}
        <div className="relative flex items-center justify-between p-5 border-b border-slate-100 dark:border-[#0f1d35] overflow-hidden">
          {/* Subtle scan line effect */}
          <motion.div
            animate={{ y: ["0%", "700%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent pointer-events-none z-10"
          />

          <AnimatePresence mode="wait">
            {!isCollapsed ? (
              <motion.div
                key="expanded-logo"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3"
              >
                <div className="relative p-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <ShieldAlert className="w-6 h-6 text-red-500" />
                  <span className="absolute inset-0 rounded-lg border border-red-500/10 animate-ping opacity-60" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold tracking-widest text-lg bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                    PREVAIL
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono tracking-[0.3em] leading-none uppercase">
                    Decision Support
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed-logo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mx-auto relative"
              >
                <ShieldAlert className="w-7 h-7 text-red-500" />
                <span className="absolute inset-0 rounded-lg border border-red-500/20 animate-ping opacity-50" />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {LINKS.map((link) => (
            <NavLink key={link.name} link={link} isCollapsed={isCollapsed} pathname={pathname} />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-[#0f1d35]">
          {!isCollapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-2"
            >
              {/* Live clock */}
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot flex-shrink-0" />
                <span className="text-[11px] font-mono text-emerald-500 tracking-widest">
                  {clock}
                </span>
              </div>

              {/* System stats */}
              <div className="grid grid-cols-2 gap-1.5 text-center font-mono">
                <div className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                  <span className="block text-[9px] text-slate-400 uppercase tracking-wider">FPS</span>
                  <span className="text-[11px] text-cyan-500 font-bold">{fps}</span>
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                  <span className="block text-[9px] text-slate-400 uppercase tracking-wider">LAT</span>
                  <span className="text-[11px] text-cyan-500 font-bold">{latency}ms</span>
                </div>
              </div>

              {/* System state label */}
              <div className="flex items-center gap-1.5 justify-center">
                <Activity className="w-3 h-3 text-emerald-500" />
                <span className="text-[9px] font-mono text-slate-400 tracking-widest uppercase">System: Secure</span>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full live-dot" />
              <span className="text-[9px] font-mono text-slate-400 tracking-widest">
                {clock.slice(0, 5)}
              </span>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
}
