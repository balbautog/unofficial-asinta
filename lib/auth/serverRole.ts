/**
 * Server-side role enforcement shared by all Founder-only API routes.
 * Never rely on client-side (React) role checks alone.
 */

export interface MinimalSupabaseAuthClient {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string; email?: string | null } | null }; error: unknown }>;
  };
  from: (table: string) => any;
}

export interface FounderCheckResult {
  ok: boolean;
  status: number;
  error?: string;
  userId?: string;
  userEmail?: string;
}

/**
 * Validates the current session against Supabase Auth and confirms the
 * caller's `public.users` role is 'founder'. RLS lets every authenticated
 * user read only their own profile row, so this lookup cannot be spoofed.
 */
export async function requireFounder(supabase: MinimalSupabaseAuthClient): Promise<FounderCheckResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, error: 'Authentication required' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== 'founder') {
    return { ok: false, status: 403, error: 'This action is restricted to Founder accounts' };
  }

  return { ok: true, status: 200, userId: user.id, userEmail: user.email || undefined };
}
