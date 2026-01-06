import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  // Check if user has beta access (passed the beta gate)
  // Changed from "beta-access" to "beta_auth" to match your API route
  const hasBetaAccess = request.cookies.get("beta_auth")?.value === "true";

  // Public routes (accessible without any auth)
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
    "/billing",
  ];

  // Doc/guide pages (accessible without auth)
  const isDocPage =
    pathname.startsWith("/docs") ||
    pathname === "/privacy" ||
    pathname === "/terms";

  // Auth callback routes (don't redirect these)
  const isAuthCallback = pathname.startsWith("/auth/callback");

  // Check if current route is public
  const isPublicRoute =
    publicRoutes.includes(pathname) || isAuthCallback || isDocPage;

  // Special handling for /signup - requires beta access
  if (pathname === "/signup") {
    if (!hasBetaAccess) {
      // No beta access - redirect to beta login
      const betaLoginUrl = new URL("/beta-login", request.url);
      betaLoginUrl.searchParams.set("redirect", "/signup");
      return NextResponse.redirect(betaLoginUrl);
    }
    // Has beta access - continue to signup page
    // Check if user is already logged in
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      // Already logged in, redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Not logged in but has beta access - allow access to signup
    return response;
  }

  // Get user and handle potential errors
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // If there's an auth error and user is trying to access protected route, clear session and redirect
  if (error && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "message",
      "Session expired. Please log in again."
    );

    const clearedResponse = NextResponse.redirect(loginUrl);

    // Clear auth-related cookies
    const authCookieNames = [
      "sb-access-token",
      "sb-refresh-token",
      "supabase-auth-token",
      "supabase.auth.token",
    ];

    authCookieNames.forEach((name) => {
      clearedResponse.cookies.delete(name);
    });

    return clearedResponse;
  }

  // If user is not logged in and trying to access protected route
  if (!user && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is logged in and trying to access login pages
  const authPages = ["/login", "/beta-login"];
  if (user && authPages.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes
     */
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
