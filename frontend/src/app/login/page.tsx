"use client";

import { useState } from "react";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      const data = await login({ username, password });
      // Save role in sessionStorage for dashboard to use
      sessionStorage.setItem("prevail_role", data.role);
      sessionStorage.setItem("prevail_username", data.username);
      // Redirect to dashboard
      window.location.href = "/intro";
    } catch {
      setError("Invalid username or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-gray-900 border border-cyan-500 rounded-lg p-8 w-full max-w-md">
        
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-cyan-400">PREVAIL</h1>
          <p className="text-gray-400 text-sm mt-1">
            Predictive Violence & Aggression Escalation Intelligence
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black border border-gray-700 text-white rounded px-3 py-2 mt-1 focus:outline-none focus:border-cyan-500"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-gray-700 text-white rounded px-3 py-2 mt-1 focus:outline-none focus:border-cyan-500"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-2 rounded mt-4"
          >
            {loading ? "Logging in..." : "LOGIN"}
          </button>
        </div>

        {/* Roles hint for demo */}
        <div className="mt-6 border-t border-gray-800 pt-4">
          <p className="text-gray-500 text-xs text-center mb-2">Demo Credentials</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Admin: admin / prevail-admin-2024</p>
            <p>Operator: operator1 / operator-pass</p>
            <p>Viewer: viewer1 / viewer-pass</p>
          </div>
        </div>

      </div>
    </div>
  );
}