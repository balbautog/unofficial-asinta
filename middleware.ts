import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const FOUNDER_ONLY_ROUTES = [
  '/dashboard',
  '/invoices',
  '/expenses',
  '/payroll',
  '/advances',
  '/clients',
  '/tools',
  '/users',
  '/sms',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const roleCookie = request.cookies.get('bale_user_role')?.value;
  const isAuthActive = request.cookies.get('bale_auth_active')?.value === 'true';

  // Public paths
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // If not authenticated and attempting to access private route
  if (!isAuthActive || !roleCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/login/admin';
    return NextResponse.redirect(url);
  }

  // If user is supervisor and tries to access Founder-only routes
  if (roleCookie === 'supervisor') {
    const isRestricted = FOUNDER_ONLY_ROUTES.some((route) => pathname.startsWith(route));
    if (isRestricted) {
      const url = request.nextUrl.clone();
      url.pathname = '/attendance';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
