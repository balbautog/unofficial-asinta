import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireFounder } from '@/lib/auth/serverRole';
import { normalizePhilippineMobile } from '@/lib/sms/phone';
import { sendPhilSMS } from '@/lib/sms/philsms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Sends an explicitly requested test message to a Founder-provided number. */
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const founder = await requireFounder(supabase);
  if (!founder.ok) {
    return NextResponse.json({ error: founder.error }, { status: founder.status });
  }

  const body = await req.json().catch(() => null);
  const phone = normalizePhilippineMobile(typeof body?.phone === 'string' ? body.phone : null);
  if (!phone) {
    return NextResponse.json({ error: 'Enter a valid Philippine mobile number.' }, { status: 400 });
  }
  if (!process.env.PHILSMS_API_KEY) {
    return NextResponse.json({ error: 'PhilSMS API key is not configured; no SMS was sent.' }, { status: 503 });
  }

  const result = await sendPhilSMS({
    recipient: 'BALE test',
    phone,
    message: 'BALE PhilSMS test: this message was sent from Firm Settings.',
  });

  return NextResponse.json({
    accepted: result.success,
    providerStatus: result.providerStatus || null,
    providerMessageId: result.messageId || null,
    error: result.success ? null : result.error || 'PhilSMS did not confirm acceptance.',
    // Acceptance by the gateway is not proof of handset delivery. That requires a delivery receipt.
    note: result.success
      ? 'PhilSMS confirmed API acceptance. This does not prove handset delivery; check the PhilSMS dashboard for delivery status and unit usage.'
      : null,
  }, { status: result.success ? 200 : 502 });
}
