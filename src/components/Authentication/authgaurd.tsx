"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const publicPaths = ["/", "/forgot-password"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isLoggedOut = sessionStorage.getItem("isLoggedOut") === "true";
    const isAuthenticated = localStorage.getItem("loginResponse") !== null;
    const isProtectedRoute = !publicPaths.includes(pathname);
    if ((isLoggedOut || !isAuthenticated) && isProtectedRoute) {
      window.location.href = "/";
    }
    if (!isProtectedRoute && isAuthenticated) {
      sessionStorage.removeItem("isLoggedOut");
    }
    const handlePopState = () => {
      if (sessionStorage.getItem("isLoggedOut") === "true") {
        window.history.replaceState(null, "", "/");
        window.location.reload();
      }
    };

    window.addEventListener("popstate", handlePopState);
    
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pathname, router]);

  return <>{children}</>;
}