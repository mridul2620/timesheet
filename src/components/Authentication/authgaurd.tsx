"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

// Updated to include dynamic reset password routes
const publicPaths = ["/", "/forgot-password"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isLoggedOut = sessionStorage.getItem("isLoggedOut") === "true";
    const isAuthenticated = localStorage.getItem("loginResponse") !== null;
    
    // Check if the current path is public or a reset password path
    const isResetPasswordPath = pathname.startsWith("/reset-password");
    const isPublicPath = publicPaths.includes(pathname) || isResetPasswordPath;
    
    // Redirect to login if not authenticated and trying to access a protected route
    if ((isLoggedOut || !isAuthenticated) && !isPublicPath) {
      window.location.href = "/";
    }
    
    // Clear logout flag if on a public route and authenticated
    if (isPublicPath && isAuthenticated) {
      sessionStorage.removeItem("isLoggedOut");
    }
    
    // Handle back button navigation when logged out
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