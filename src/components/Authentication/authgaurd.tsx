"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import "@/src/lib/apiClient";
import { setAccessToken, getAccessToken } from "@/src/lib/apiClient";

// Updated to include dynamic reset password routes
const publicPaths = ["/", "/forgot-password"];

// Helper to check if the isLoggedIn cookie exists
function hasIsLoggedInCookie(): boolean {
  return document.cookie.split(";").some((c) => c.trim().startsWith("isLoggedIn="));
}

// Helper to set the isLoggedIn cookie with proper attributes
function setIsLoggedInCookie() {
  const isSecure = window.location.protocol === "https:";
  document.cookie = `isLoggedIn=true; path=/; max-age=604800; SameSite=Lax${isSecure ? "; Secure" : ""}`;
}

// Helper to clear the isLoggedIn cookie
function clearIsLoggedInCookie() {
  document.cookie = "isLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

// Redirect loop detection: track recent redirects in sessionStorage
function isRedirectLooping(): boolean {
  const key = "authGuardRedirects";
  const now = Date.now();
  const raw = sessionStorage.getItem(key);
  let timestamps: number[] = raw ? JSON.parse(raw) : [];

  // Keep only timestamps from the last 2 seconds
  timestamps = timestamps.filter((t) => now - t < 2000);
  timestamps.push(now);
  sessionStorage.setItem(key, JSON.stringify(timestamps));

  // If 3+ redirects in 2 seconds, we're looping
  return timestamps.length >= 3;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isLoggedOut = sessionStorage.getItem("isLoggedOut") === "true";
    const isAuthenticated = localStorage.getItem("loginResponse") !== null;

    // Check if the current path is public or a reset password path
    const isResetPasswordPath = pathname.startsWith("/reset-password/");
    const isPublicPath = publicPaths.includes(pathname) || isResetPasswordPath;

    // KEY FIX: If the user is authenticated in localStorage but the cookie is missing,
    // re-set the cookie. This happens on mobile browsers that silently drop cookies
    // without proper SameSite/Secure attributes.
    if (isAuthenticated && !isLoggedOut && !hasIsLoggedInCookie()) {
      setIsLoggedInCookie();
    }

    // KEY FIX #2: Restore the in-memory access token from localStorage after a full
    // page reload. Without this, API calls fail with 401 because the token is only
    // stored in-memory and is lost on navigation via window.location.href.
    if (isAuthenticated && !isLoggedOut && !getAccessToken()) {
      try {
        const storedData = localStorage.getItem("loginResponse");
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (parsedData.accessToken) {
            setAccessToken(parsedData.accessToken);
          }
        }
      } catch (e) {
        console.error("[AuthGuard] Error restoring access token:", e);
      }
    }

    // Redirect to login if not authenticated and trying to access a protected route
    if ((isLoggedOut || !isAuthenticated) && !isPublicPath) {
      // Check for redirect loop before redirecting
      if (isRedirectLooping()) {
        // Break the loop: clear everything and stay on the current page
        console.warn("[AuthGuard] Redirect loop detected, clearing auth state");
        localStorage.removeItem("loginResponse");
        clearIsLoggedInCookie();
        sessionStorage.removeItem("authGuardRedirects");
        sessionStorage.setItem("isLoggedOut", "true");
        // Only redirect to "/" if we're not already there
        if (pathname !== "/") {
          window.location.href = "/";
        }
        return;
      }

      window.location.href = "/";
      return;
    }

    // Clear logout flag if on a public route and authenticated
    if (isPublicPath && isAuthenticated && isLoggedOut) {
      sessionStorage.removeItem("isLoggedOut");
    }

    // Clear redirect tracking on successful page load (no redirect needed)
    sessionStorage.removeItem("authGuardRedirects");

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