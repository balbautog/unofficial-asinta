import { NextRequest, NextResponse } from 'next/server';
import { sendPhilSMS } from '@/lib/sms/philsms';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Dispatches an SMS through the PhilSMS gateway.
 * Requires an authenticated Supabase session whose public.users role is
 * 'founder' (client SMS dispatch is a Founder-only feature).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // RLS guarantees the caller can only read their own profile row.
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== 'founder') {
      return NextResponse.json(
        { error: 'Only Founders may dispatch SMS reminders' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { recipient, phone, message, invoiceId } = body;

    if (!recipient || !phone || !message) {
      return NextResponse.json(
        { error: 'Recipient, phone number, and message are required' },
        { status: 400 }
      );
    }

    const result = await sendPhilSMS({ recipient, phone, message, invoiceId });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to dispatch SMS' },
      { status: 500 }
    );
  }
}
