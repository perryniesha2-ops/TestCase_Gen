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
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;
  const hasBetaAccess = request.cookies.get("beta_auth")?.value === "true";

  // Public routes
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
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
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
      "Session expired. Please log in again."
    );

    const clearedResponse = NextResponse.redirect(loginUrl);

    // Clear auth cookies
    [
      "sb-access-token",
      "sb-refresh-token",
      "supabase-auth-token",
      "supabase.auth.token",
    ].forEach((name) => clearedResponse.cookies.delete(name));

    return clearedResponse;
  }

  // Redirect unauthenticated users from protected routes
  if (!user && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users from auth pages
  if (user && ["/login", "/beta-login"].includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
