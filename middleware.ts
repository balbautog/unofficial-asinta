import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase/middleware';
import { canRoleAccessPath, getSafeRedirectPath, isFounderOnlyPath, type AppRole } from '@/lib/auth/routes';

/**
 * Route protection middleware.
 *
 * 1. "/" is the canonical authentication URL (unified role-aware login).
 *    Legacy /login portals permanently redirect there.
 * 2. Refreshes the Supabase auth session cookies on every request
 *    (via @supabase/ssr) so the authenticated user's JWT stays in sync.
 * 3. Validates the session server-side with `supabase.auth.getUser()`.
 * 4. Loads the user's database role from `public.users` and enforces the
 *    Founder-only route policy (PostgreSQL RLS remains the last line of
 *    defense for every data query).
 */

function redirectTo(request: NextRequest, pathname: string, params?: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  url.hash = '';
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  }
  return NextResponse.redirect(url);
}

/** Redirects to a sanitized same-site path (may carry its own query string). */
function redirectToSafePath(request: NextRequest, safePath: string) {
  const url = new URL(safePath, request.nextUrl.origin);
  const target = request.nextUrl.clone();
  target.pathname = url.pathname;
  target.search = url.search;
  target.hash = url.hash;
  return NextResponse.redirect(target);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Legacy login portals (/login, /login/admin, /login/supervisor, …) are
  // permanently redirected to the canonical "/" login. Query parameters such
  // as redirect_to and error are preserved.
  if (pathname === '/login' || pathname.startsWith('/login/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url, 308);
  }

  // API routes and Next assets: only refresh session cookies.
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
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

  // "/" — the unified login. Unauthenticated visitors see the form;
  // authenticated users are forwarded to their role-based workspace.
  if (pathname === '/') {
    if (userError || !user) {
      return response;
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role as string | undefined;
    if (role !== 'founder' && role !== 'supervisor') {
      // Authenticated but without a valid BALE profile — render the login
      // page (the client auth context surfaces the error and cleans up).
      return response;
    }

    const requestedPath = getSafeRedirectPath(request.nextUrl.searchParams.get('redirect_to'));
    const fallback = role === 'founder' ? '/dashboard' : '/attendance';
    const destination =
      requestedPath && canRoleAccessPath(role as AppRole, requestedPath) ? requestedPath : fallback;
    return redirectToSafePath(request, destination);
  }

  // Protected application routes.
  if (userError || !user) {
    const returnTo = getSafeRedirectPath(`${pathname}${request.nextUrl.search || ''}`);
    return redirectTo(request, '/', returnTo ? { redirect_to: returnTo } : undefined);
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
    return redirectTo(request, '/', { error: 'no_profile' });
  }

  const role = profile.role as string | null;

  if (role !== 'founder' && role !== 'supervisor') {
    return redirectTo(request, '/', { error: 'invalid_role' });
  }

  // Supervisors may only access the attendance terminal and project pages —
  // they are never redirected into Founder-only routes.
  if (role === 'supervisor' && isFounderOnlyPath(pathname)) {
    return redirectTo(request, '/attendance');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
