import { NextRequest, NextResponse } from 'next/server';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/admin',
  '/employee',
  '/users',
  '/settings',
  '/payroll',
  '/leaves',
  '/holidays',
  '/my-info',
  '/super-admin',
];

// Routes only for unauthenticated users
const AUTH_ROUTES = ['/login'];

// Public routes (no auth needed)
const PUBLIC_ROUTES = ['/', '/checkin', '/scan', '/reset-password', '/c'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // Allow public routes always
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
  if (isPublic) return NextResponse.next();

  // If logged in and visiting login page, redirect to appropriate dashboard
  if (token && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    // We can't read the JWT payload in proxy easily, so redirect to a generic route
    // The auth-context will handle role-based routing
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // If not logged in and visiting protected route, redirect to login
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next (static files)
     * - api routes
     * - static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};