// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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

  // ─── Route Definitions ──────────────────────────────────────────────────────

  // Fully public — no auth required, no tier check
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/confirm-email",
    "/resend-confirmation",
    "/pricing",
    "/privacy",
    "/terms",
    "/contact",
    "/docs",
  ];

  // Requires login, accessible to free tier
  const freeAuthRoutes = [
    "/dashboard",
    "/billing",
    "/settings",
    "/generate",
    "/test-cases",
    "/cross-platform-cases",
  ];

  // Requires login + active paid subscription
  const proOnlyRoutes = [
    "/automation",
    "/test-library",
    "/requirements",
    "/project-manager",
    "/template-manager",
    "/analytics",
    "/integrations",
    "/test-runs",
  ];

  const isDocPage =
    pathname.startsWith("/docs") ||
    pathname === "/privacy" ||
    pathname === "/terms";
  const isAuthCallback = pathname.startsWith("/auth/callback");

  const isPublicRoute =
    publicRoutes.some((r) => pathname === r) || isAuthCallback || isDocPage;

  const isFreeAuthRoute = freeAuthRoutes.some((r) => pathname.startsWith(r));

  const isProOnlyRoute = proOnlyRoutes.some((r) => pathname.startsWith(r));

  // ─── Get User ───────────────────────────────────────────────────────────────

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // ─── Auth Error on Protected Routes ────────────────────────────────────────

  if (error && (isFreeAuthRoute || isProOnlyRoute)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "message",
      "Session expired. Please log in again.",
    );
    const cleared = NextResponse.redirect(loginUrl);
    [
      "sb-access-token",
      "sb-refresh-token",
      "supabase-auth-token",
      "supabase.auth.token",
    ].forEach((name) => cleared.cookies.delete(name));
    return cleared;
  }

  // ─── Unauthenticated Users ──────────────────────────────────────────────────

  if (!user && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Redirect Logged-in Users Away from Auth Pages ─────────────────────────

  if (user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ─── Pro-Only Route Gate ────────────────────────────────────────────────────

  if (user && isProOnlyRoute) {
    const cachedTier = request.cookies.get("user_tier")?.value;
    const tierCacheTime = request.cookies.get("tier_cache_time")?.value;
    const now = Date.now();
    const cacheAge = tierCacheTime ? now - parseInt(tierCacheTime) : Infinity;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    let userTier: string = "free";

    // Always fetch fresh if cache is stale or missing
    if (!cachedTier || cacheAge > CACHE_TTL) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("subscription_tier, subscription_status")
        .eq("id", user.id)
        .single();

      const subscriptionStatus = profile?.subscription_status ?? "inactive";
      const rawTier = profile?.subscription_tier ?? "free";

      // Only grant pro access if subscription is actually active
      const isActive =
        subscriptionStatus === "active" || subscriptionStatus === "trial";

      userTier = isActive && rawTier !== "free" ? rawTier : "free";

      // Cache the resolved tier
      response.cookies.set("user_tier", userTier, {
        maxAge: CACHE_TTL / 1000,
        httpOnly: true,
        sameSite: "lax",
      });
      response.cookies.set("tier_cache_time", now.toString(), {
        maxAge: CACHE_TTL / 1000,
        httpOnly: true,
        sameSite: "lax",
      });
    } else {
      userTier = cachedTier;
    }

    if (userTier === "free") {
      const upgradeUrl = new URL("/billing", request.url);
      upgradeUrl.searchParams.set("upgrade", "required");
      upgradeUrl.searchParams.set("feature", pathname.split("/")[1]);
      upgradeUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(upgradeUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
