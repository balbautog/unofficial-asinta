import { NextRequest, NextResponse } from 'next/server';
import { sendPhilSMS } from '@/lib/sms/philsms';

export async function POST(req: NextRequest) {
  try {
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
