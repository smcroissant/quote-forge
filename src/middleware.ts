import { NextRequest, NextResponse } from "next/server";

const publicRoutes = ["/login", "/register"];
const protectedRoutes = [
  "/dashboard",
  "/clients",
  "/products",
  "/quotes",
  "/settings",
  "/onboarding",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow API routes and public pages
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (publicRoutes.some((route) => pathname === route)) {
    return NextResponse.next();
  }

  // Root redirect — handled by page.tsx redirect()
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Check auth for protected routes
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    const sessionCookie = request.cookies.get("better-auth.session_token");

    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$).*)",
  ],
};
