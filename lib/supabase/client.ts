import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client (anon key + user JWT via cookie sessions).
 *
 * Every query issued through this client carries the signed-in user's JWT so
 * PostgreSQL Row Level Security policies are enforced end-to-end.
 *
 * When environment variables are not set we fall back to the local Supabase
 * CLI development server (http://localhost:54321) so that `next build` and
 * offline tooling keep working. There are NO local mock data fallbacks —
 * if the database cannot be reached, requests surface real errors.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return browserClient;
}
