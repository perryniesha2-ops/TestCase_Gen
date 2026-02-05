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
    "/resend-confirmation",
    "/pricing",
    "/privacy",
    "/terms",
    "/contact",
    "/billing",
    "/generate",
    "/cross-platform",
    "/test-cases",
  ];

  // ⭐ Define Pro-only routes (require active subscription)
  const proOnlyRoutes = [
    "/automation",
    "/test-library",
    "/analytics",
    "/integrations",
    "/requirements",
    "/projects",
    "/project-manager",
    "/template-manager",
    "/test-runs",
    "/automation",
  ];

  const isDocPage =
    pathname.startsWith("/docs") ||
    pathname === "/privacy" ||
    pathname === "/terms";
  const isAuthCallback = pathname.startsWith("/auth/callback");
  const isPublicRoute =
    publicRoutes.includes(pathname) || isAuthCallback || isDocPage;

  // Check if current route is Pro-only
  const isProOnlyRoute = proOnlyRoutes.some((route) =>
    pathname.startsWith(route),
  );

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

  // Get user session
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Handle auth errors on protected routes
  if (error && !isPublicRoute) {
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

  // ⭐ NEW: Check subscription tier for Pro-only routes
  if (user && isProOnlyRoute) {
    // Check if we have cached tier info (to avoid DB hit on every request)
    const cachedTier = request.cookies.get("user_tier")?.value;

    let userTier: string = cachedTier || "free";

    // If no cache or cache is stale (older than 5 minutes), fetch from DB
    const tierCacheTime = request.cookies.get("tier_cache_time")?.value;
    const now = Date.now();
    const cacheAge = tierCacheTime ? now - parseInt(tierCacheTime) : Infinity;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    if (!cachedTier || cacheAge > CACHE_TTL) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("subscription_tier, subscription_status")
        .eq("id", user.id)
        .single();

      userTier = profile?.subscription_tier || "free";
      const subscriptionStatus = profile?.subscription_status || "inactive";

      // Cache the tier info in a cookie (5 min TTL)

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

      // If subscription is not active, treat as free
      if (subscriptionStatus !== "active" && subscriptionStatus !== "trial") {
        userTier = "free";
      }
    }

    // Block free users from Pro-only routes
    if (userTier === "free") {
      const upgradeUrl = new URL("/billing", request.url);
      upgradeUrl.searchParams.set("upgrade", "required");
      upgradeUrl.searchParams.set("feature", pathname.split("/")[1]); // e.g., "automation"
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
