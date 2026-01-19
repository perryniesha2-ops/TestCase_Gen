// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Start with a pass-through response we can attach cookies to
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const hasBetaAccess = request.cookies.get("beta_auth")?.value === "true";

  const publicRoutes = [
    "/",
    "/login",
    "/beta-login",
    "/forgot-password",
    "/reset-password",
    "/confirm-email",
    "/pricing",
    "/privacy",
    "/terms",
    "/contact",
  ];

  const isDocPage =
    pathname.startsWith("/docs") ||
    pathname === "/privacy" ||
    pathname === "/terms";
  const isAuthCallback = pathname.startsWith("/auth/callback");
  const isPublicRoute =
    publicRoutes.includes(pathname) || isAuthCallback || isDocPage;

  // Special handling for /signup
  if (pathname === "/signup") {
    if (!hasBetaAccess) {
      const betaLoginUrl = new URL("/beta-login", request.url);
      betaLoginUrl.searchParams.set("redirect", "/signup");
      return NextResponse.redirect(betaLoginUrl);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return NextResponse.redirect(new URL("/dashboard", request.url));

    return response;
  }

  // Get user session (and error) ONCE
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Only handle auth errors on protected routes
  if (error && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "message",
      "Session expired. Please log in again.",
    );

    const cleared = NextResponse.redirect(loginUrl);

    // Clear cookies if you want, but note: cookie names vary by Supabase version.
    // If you keep this, it won't hurt, but it's not always necessary.
    [
      "sb-access-token",
      "sb-refresh-token",
      "supabase-auth-token",
      "supabase.auth.token",
    ].forEach((name) => cleared.cookies.delete(name));

    return cleared;
  }

  // Redirect unauthenticated users from protected routes
  if (!user && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === "/login" || pathname === "/beta-login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
