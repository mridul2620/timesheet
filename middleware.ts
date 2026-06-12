import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const refreshToken = request.cookies.get("refreshToken")?.value;
  const { pathname } = request.nextUrl;

  // Define public paths that do not require authentication
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/reset-password/");

  // If the user does not have a refresh token and tries to access a protected route
  if (!refreshToken && !isPublicRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If the user has a refresh token and tries to visit the login page, redirect to home
  if (refreshToken && pathname === "/") {
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
