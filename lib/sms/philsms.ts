export interface SendSMSParams {
  recipient: string;
  phone: string;
  message: string;
  invoiceId?: string;
}

export interface SendSMSResult {
  success: boolean;
  /** true when the gateway is not configured and the message was NOT actually sent */
  simulated?: boolean;
  messageId?: string;
  error?: string;
}

export async function sendPhilSMS({
  recipient,
  phone,
  message,
}: SendSMSParams): Promise<SendSMSResult> {
  const apiKey = process.env.PHILSMS_API_KEY;

  if (!apiKey) {
    console.warn('PHILSMS_API_KEY is not configured — SMS recorded in simulation mode only.');
    return {
      success: true,
      simulated: true,
      messageId: `sim-sms-${Date.now()}`,
    };
  }

  try {
    const response = await fetch('https://app.philsms.com/api/v3/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        recipient: phone.replace(/[^0-9]/g, ''),
        sender_id: 'ASINTA',
        type: 'plain',
        message: message,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        messageId: data.data?.uid || `philsms-${Date.now()}`,
      };
    }

    return {
      success: false,
      error: `PhilSMS gateway rejected the request (HTTP ${response.status}).`,
    };
  } catch (e: any) {
    console.error('PhilSMS gateway request failed:', e);
    return {
      success: false,
      error: e?.message || 'PhilSMS gateway network error.',
    };
  }
}

export function generateInvoiceReminderSMS(
  clientName: string,
  invoiceNumber: string,
  balance: number,
  dueDate: string,
  type: 'upcoming' | 'due_today' | 'overdue'
): string {
  const formattedBalance = `₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  switch (type) {
    case 'upcoming':
      return `Good day ${clientName}, Asinta Architects reminder: Invoice ${invoiceNumber} for ${formattedBalance} is scheduled for ${dueDate}. We appreciate your support.`;
    case 'due_today':
      return `Good day ${clientName}, Asinta Architects reminder: Invoice ${invoiceNumber} for ${formattedBalance} is due today (${dueDate}). Please send payment confirmation once settled.`;
    case 'overdue':
      return `Urgent: Good day ${clientName}, Asinta Architects notices Invoice ${invoiceNumber} for ${formattedBalance} was due on ${dueDate}. Kindly settle at your earliest convenience. Thank you.`;
  }
}
