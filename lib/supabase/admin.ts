import { createClient } from '@supabase/supabase-js';

/**
 * Trusted service-role Supabase client for SERVER-SIDE scheduled operations
 * only (e.g. /api/cron/reminders). The service-role key bypasses RLS by
 * design, so this module must NEVER be imported from client components and
 * the key must NEVER be prefixed with NEXT_PUBLIC_.
 */
export function isServiceRoleConfigured(): boolean {
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim() &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  );
}

export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase service-role client is not configured on the server.');
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
