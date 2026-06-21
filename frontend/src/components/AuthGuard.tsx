"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";

const PUBLIC_ROUTES = ["/login", "/intro"];

interface AuthGuardProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export default function AuthGuard({ children, showSidebar }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (PUBLIC_ROUTES.includes(pathname)) {
      setChecking(false);
      return;
    }
    if (!isLoggedIn()) {
      router.push("/login");
    } else {
      setChecking(false);
    }
  }, [router, pathname]);

  // Hide sidebar on public routes
  if (showSidebar && PUBLIC_ROUTES.includes(pathname)) {
    return null;
  }

  if (checking && !PUBLIC_ROUTES.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
}