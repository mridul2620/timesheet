"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

// Paths that should be accessible without authentication
const publicPaths = ["/"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if user is logged out (via the flag we set)
    const isLoggedOut = sessionStorage.getItem("isLoggedOut") === "true";
    
    // Check if user is authenticated based on localStorage
    const isAuthenticated = localStorage.getItem("loginResponse") !== null;
    
    // Current path is a protected route (not in public paths list)
    const isProtectedRoute = !publicPaths.includes(pathname);

    // Handle logged out users trying to access protected routes
    if ((isLoggedOut || !isAuthenticated) && isProtectedRoute) {
      // Redirect to login page
      window.location.href = "/";
    }

    // If user is on login page and already authenticated, clear logout flag
    if (!isProtectedRoute && isAuthenticated) {
      sessionStorage.removeItem("isLoggedOut");
    }

    // Prevent back navigation after logout by handling the popstate event
    const handlePopState = () => {
      if (sessionStorage.getItem("isLoggedOut") === "true") {
        // Replace the current history entry with the login page
        window.history.replaceState(null, "", "/");
        // Force page reload to ensure login page is shown
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