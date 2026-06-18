"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div className="w-14 h-7 rounded-full bg-slate-200 dark:bg-slate-800/50 animate-pulse" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      className="relative flex items-center w-14 h-7 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 transition-colors duration-300 focus:outline-none overflow-hidden group hover:border-cyan-500/40 cursor-pointer"
    >
      {/* Track glow */}
      <motion.div
        animate={{ x: isDark ? "100%" : "0%" }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="absolute inset-0 rounded-full"
        style={{
          background: isDark
            ? "linear-gradient(to right, transparent 40%, rgba(0,240,255,0.08) 100%)"
            : "linear-gradient(to right, rgba(253,186,116,0.15) 0%, transparent 60%)",
        }}
      />

      {/* Sliding knob */}
      <motion.div
        animate={{ x: isDark ? 30 : 4 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="absolute w-5 h-5 rounded-full flex items-center justify-center shadow-md"
        style={{
          background: isDark
            ? "linear-gradient(135deg, #1e3a5f, #0f2040)"
            : "linear-gradient(135deg, #fbbf24, #f59e0b)",
          boxShadow: isDark
            ? "0 0 8px rgba(0,240,255,0.3)"
            : "0 0 8px rgba(251,191,36,0.4)",
        }}
      >
        {isDark ? (
          <Moon className="w-2.5 h-2.5 text-cyan-300" />
        ) : (
          <Sun className="w-2.5 h-2.5 text-white" />
        )}
      </motion.div>

      {/* Ghost icon on the other side */}
      <div className="absolute right-1.5 flex items-center justify-center w-4 h-4 opacity-20">
        {isDark ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-slate-400" />}
      </div>
    </button>
  );
}
