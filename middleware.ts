import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase/middleware';

/**
 * Route protection middleware.
 *
 * 1. Refreshes the Supabase auth session cookies on every request
 *    (via @supabase/ssr) so the authenticated user's JWT stays in sync.
 * 2. Validates the session server-side with `supabase.auth.getUser()`.
 * 3. Loads the user's database role from `public.users` and enforces the
 *    Founder-only route policy (PostgreSQL RLS remains the last line of
 *    defense for every data query).
 */

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
  '/settings',
];

function redirectTo(request: NextRequest, pathname: string, params?: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  }
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths: marketing gateway, login portals, API routes and Next assets.
  // We still run the client creation so session cookies get refreshed.
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    const { response } = createMiddlewareSupabaseClient(request);
    return response;
  }

  const { supabase, response } = createMiddlewareSupabaseClient(request);

  // Validate the session against the Supabase auth server (never trust the
  // cookie contents alone) and refresh tokens when needed.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return redirectTo(request, '/login/admin', { redirect_to: pathname });
  }

  // Fetch the database role for the authenticated user from public.users.
  // RLS allows every authenticated user to read their own profile row.
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    // Authenticated in Supabase Auth but no BALE profile row exists.
    // The client auth context performs the sign-out cleanup; here we just
    // bounce the request back to the login portal.
    return redirectTo(request, '/login/admin', { error: 'no_profile' });
  }

  const role = profile.role as string | null;

  if (role !== 'founder' && role !== 'supervisor') {
    return redirectTo(request, '/login/admin', { error: 'invalid_role' });
  }

  // Supervisors may only access the attendance terminal and project pages.
  if (role === 'supervisor') {
    const isRestricted = FOUNDER_ONLY_ROUTES.some((route) => pathname.startsWith(route));
    if (isRestricted) {
      return redirectTo(request, '/attendance');
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
