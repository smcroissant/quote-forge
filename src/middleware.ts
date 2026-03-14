import { NextRequest, NextResponse } from "next/server";

const publicOnlyRoutes = ["/login", "/register"];
const alwaysPublicRoutes = ["/q"]; // Public quote viewing
const protectedRoutes = [
  "/dashboard",
  "/clients",
  "/products",
  "/quotes",
  "/settings",
  "/onboarding",
];

function hasSession(request: NextRequest): boolean {
  return !!request.cookies.get("better-auth.session_token");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow API routes through
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Always public routes (no auth needed)
  if (alwaysPublicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const loggedIn = hasSession(request);

  // Public-only routes: redirect to dashboard if already logged in
  if (publicOnlyRoutes.some((route) => pathname === route)) {
    if (loggedIn) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Root — let page.tsx handle redirect
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Protected routes: redirect to login if not logged in
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!loggedIn) {
      const loginUrl = new URL("/login", request.url);
      if (pathname !== "/onboarding") {
        loginUrl.searchParams.set("redirect", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$).*)",
  ],
};
