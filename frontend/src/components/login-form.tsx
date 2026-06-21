"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

export function LoginForm() {
  const { login, error } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(username, password);
    } catch {
      // error state is already set inside useAuth
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#030712]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg"
      >
        <h1 className="text-2xl font-bold mb-1 text-slate-900 dark:text-slate-100">
          PREVAIL Login
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Sign in to access the dashboard
        </p>

        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          placeholder="admin / operator / viewer"
          required
        />

        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          required
        />

        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-xs text-slate-400 mt-4">
          Test accounts: admin/admin123, operator/operator123, viewer/viewer123
        </p>
      </form>
    </div>
  );
}