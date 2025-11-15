import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Get user and handle potential errors
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  // Protected routes
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/pages/dashboard') ||
                          request.nextUrl.pathname.startsWith('/pages/test-cases') ||
                          request.nextUrl.pathname.startsWith('/pages/generate')    ||
                          request.nextUrl.pathname.startsWith('/pages/dashboard')    ||
                          request.nextUrl.pathname.startsWith('/pages/requirements')    ||
                          request.nextUrl.pathname.startsWith('/pages/settings')    ||
                          request.nextUrl.pathname.startsWith('/pages/contact')    ||
                          request.nextUrl.pathname.startsWith('/pages/privacy')    ||
                          request.nextUrl.pathname.startsWith('/pages/billing')    ||
                          request.nextUrl.pathname.startsWith('/pages/login')    ||
                          request.nextUrl.pathname.startsWith('/pages/signup')    ||
                          request.nextUrl.pathname.startsWith('/pages/terms')    






  // Auth routes
  const isAuthRoute = request.nextUrl.pathname.startsWith('/pages/login') ||
                     request.nextUrl.pathname.startsWith('/pages/signup')

  // Auth callback routes (don't redirect these)
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth/callback')

  // If there's an auth error and user is trying to access protected route, clear session and redirect
  if (error && isProtectedRoute) {
    const loginUrl = new URL('/pages/beta-login', request.url)
    loginUrl.searchParams.set('message', 'Session expired. Please log in again.')
    
    const clearedResponse = NextResponse.redirect(loginUrl)
    
    // Clear auth-related cookies
    const authCookieNames = [
      'sb-access-token',
      'sb-refresh-token', 
      'supabase-auth-token',
      'supabase.auth.token'
    ]
    
    authCookieNames.forEach(name => {
      clearedResponse.cookies.delete(name)
    })
    
    return clearedResponse
  }

  // If user is not logged in and trying to access protected route
  if (!user && isProtectedRoute) {
    const loginUrl = new URL('/pages/beta-login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If user is logged in and trying to access auth routes (but not callback)
  if (user && isAuthRoute && !isAuthCallback) {
    return NextResponse.redirect(new URL('/pages/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}