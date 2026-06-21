"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { BASE_URL } from "./prevail";

interface AuthState {
  token: string | null;
  username: string | null;
  role: string | null;
  loginWithContext: (username: string, password: string) => Promise<void>;
  logoutFromContext: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("prevail_token");
    const savedUsername = localStorage.getItem("prevail_username");
    const savedRole = localStorage.getItem("prevail_role");
    if (savedToken) {
      setToken(savedToken);
      setUsername(savedUsername);
      setRole(savedRole);
    }
    setIsLoading(false);
  }, []);

  async function loginWithContext(usernameInput: string, password: string) {
    setError(null);
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usernameInput, password }),
    });

    if (!res.ok) {
      setError("Incorrect username or password");
      throw new Error("login failed");
    }

    const data = await res.json();
    setToken(data.access_token);
    setUsername(data.username);
    setRole(data.role);

    localStorage.setItem("prevail_token", data.access_token);
    localStorage.setItem("prevail_username", data.username);
    localStorage.setItem("prevail_role", data.role);
  }

  function logoutFromContext() {
    setToken(null);
    setUsername(null);
    setRole(null);
    localStorage.removeItem("prevail_token");
    localStorage.removeItem("prevail_username");
    localStorage.removeItem("prevail_role");
  }

  return (
    <AuthContext.Provider value={{ token, username, role, loginWithContext, logoutFromContext, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("prevail_token");
}

export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("prevail_token");
  localStorage.removeItem("prevail_username");
  localStorage.removeItem("prevail_role");
  window.location.href = "/login";
}

export async function login(credentials: { username: string; password: string }): Promise<{ role: string; username: string }> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    throw new Error("Invalid username or password");
  }

  const data = await res.json();

  localStorage.setItem("prevail_token", data.access_token);
  localStorage.setItem("prevail_username", data.username);
  localStorage.setItem("prevail_role", data.role);

  return { role: data.role, username: data.username };
}