import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isLoggedIn = request.cookies.get("isLoggedIn")?.value;
  const { pathname, searchParams } = request.nextUrl;

  // Define public paths that do not require authentication
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/reset-password/");

  // Redirect loop protection: if we've already redirected once via middleware,
  // don't redirect again. The client-side AuthGuard will handle it from here.
  const middlewareRedirected = searchParams.get("_mr");

  // If the user does not have a refresh token and tries to access a protected route
  if (!isLoggedIn && !isPublicRoute) {
    // If we already redirected once, let the request through to avoid an infinite loop.
    // The client-side AuthGuard will handle re-setting the cookie or redirecting.
    if (middlewareRedirected === "1") {
      return NextResponse.next();
    }
    const url = new URL("/", request.url);
    url.searchParams.set("_mr", "1");
    return NextResponse.redirect(url);
  }

  // If the user has a refresh token and tries to visit the login page, redirect to home
  if (isLoggedIn && pathname === "/") {
    return NextResponse.redirect(new URL("/home-page", request.url));
  }

  return NextResponse.next();
}

// Config to specify which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - Next.js internal static assets (_next/static, _next/image)
     * - Static assets (favicon.ico, images, public directory assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};

