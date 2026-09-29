import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSmtpConfigured } from '@/lib/email/mailer';
import { isGlobalAutomaticRemindersEnabled } from '@/lib/reminders/scheduler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Authenticated integration-status endpoint.
 * Returns booleans ONLY — secret values never leave the server.
 */
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
      philsmsSenderId: process.env.PHILSMS_SENDER_ID || 'PhilSMS',
      supabaseConfigured: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
      smtpConfigured: isSmtpConfigured(),
      automaticRemindersEnabled: isGlobalAutomaticRemindersEnabled(),
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
