import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  return NextResponse.json(
    {
      groqConfigured: Boolean(process.env.GROQ_API_KEY),
      philsmsConfigured: Boolean(process.env.PHILSMS_API_KEY),
      supabaseConfigured: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
