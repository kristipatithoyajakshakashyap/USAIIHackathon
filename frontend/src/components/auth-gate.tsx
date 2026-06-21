"use client";

import { useAuth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  if (!token) {
    return <LoginForm />;
  }

  return <>{children}</>;
}