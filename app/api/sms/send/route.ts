import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireFounder } from '@/lib/auth/serverRole';
import { deliverAndLogSMS } from '@/lib/sms/deliver';
import { normalizePhilippineMobile } from '@/lib/sms/phone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Founder-only SMS dispatch through the PhilSMS gateway.
 *
 * The recipient is ALWAYS resolved server-side from an invoice's client or a
 * client record — arbitrary browser-submitted phone numbers are rejected.
 * The final message, honest status, provider message ID, and any error are
 * recorded in sms_logs on the server.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const founder = await requireFounder(supabase);
    if (!founder.ok) {
      return NextResponse.json({ error: founder.error }, { status: founder.status });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const invoiceId = typeof body.invoiceId === 'string' && body.invoiceId ? body.invoiceId : null;
    const clientId = typeof body.clientId === 'string' && body.clientId ? body.clientId : null;
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json({ error: 'A message is required' }, { status: 400 });
    }
    if (message.length > 1000) {
      return NextResponse.json({ error: 'The message is too long (1,000 character limit)' }, { status: 400 });
    }
    if (!invoiceId && !clientId) {
      return NextResponse.json(
        { error: 'Select an invoice or a client — SMS can only be sent to registered client contacts' },
        { status: 400 }
      );
    }

    // Resolve the authoritative recipient server-side.
    let resolvedClientId = clientId;
    if (invoiceId) {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('id, client_id, status')
        .eq('id', invoiceId)
        .maybeSingle();
      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      if (invoice.status === 'cancelled') {
        return NextResponse.json({ error: 'This invoice is cancelled — reminders cannot be sent for it' }, { status: 422 });
      }
      resolvedClientId = invoice.client_id;
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id, name, contact_person, phone')
      .eq('id', resolvedClientId)
      .maybeSingle();
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const normalizedPhone = normalizePhilippineMobile(client.phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'The client does not have a valid Philippine mobile number on file. Update the client record first.' },
        { status: 422 }
      );
    }

    const recipientName = (client.contact_person || '').trim() || client.name;

    // Shared delivery + honest logging (see lib/sms/deliver.ts).
    const outcome = await deliverAndLogSMS({
      db: supabase,
      invoiceId,
      recipient: recipientName,
      phone: normalizedPhone,
      message,
    });

    if (outcome.logWriteFailed) {
      return NextResponse.json({ error: outcome.error }, { status: 500 });
    }

    return NextResponse.json({
      success: outcome.success,
      simulated: outcome.simulated,
      statusLabel: outcome.statusLabel,
      error: outcome.error,
      log: outcome.log,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to dispatch SMS' }, { status: 500 });
  }
}
