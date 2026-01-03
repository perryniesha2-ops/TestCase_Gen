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

  // Public routes (accessible without auth)
  const publicRoutes = [
    "/",
    "/login",
    "/beta-login",
    "/billing",
    "/forgot-password",
    "/reset-password",
    "/confirm-email",
    "/pricing",
    "/privacy",
    "/terms",
    "/contact",
  ];

  // Auth callback routes (don't redirect these)
  const isAuthCallback = pathname.startsWith("/auth/callback");

  // Check if current route is public
  const isPublicRoute = publicRoutes.includes(pathname) || isAuthCallback;

  // Redirect /signup to /beta-login
  if (pathname === "/signup") {
    return NextResponse.redirect(new URL("/beta-login", request.url));
  }

  // Get user and handle potential errors
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // If there's an auth error and user is trying to access protected route, clear session and redirect
  if (error && !isPublicRoute) {
    const loginUrl = new URL("/beta-login", request.url);
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
    const loginUrl = new URL("/beta-login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is logged in and trying to access login/signup pages
  const authPages = ["/login", "/beta-login", "/signup"];
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
