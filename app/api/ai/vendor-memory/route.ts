import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireFounder } from '@/lib/auth/serverRole';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { isExpenseCategory } from '@/lib/ai/categories';
import { normalizeVendorToken } from '@/lib/ai/vendorMemory';
import { recordVendorOutcome } from '@/lib/ai/draftData';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Track A — learning write for vendor memory.
 *
 * Called after the Founder SAVES an expense that had a suggestion attached.
 * `suggestedCategory` is what we showed them; `finalCategory` is what they
 * kept. Equal → accepted, different → overridden. Those two counters are the
 * entire "training" mechanism: no embeddings, no hidden state, and every value
 * can be inspected or corrected in the database.
 *
 * The write goes through the atomic SQL function `record_vendor_outcome`, which
 * re-checks `public.is_founder()` server-side.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const founder = await requireFounder(supabase);
    if (!founder.ok) {
      return NextResponse.json({ error: founder.error }, { status: founder.status });
    }

    const limited = enforceRateLimit('aiSuggest', req.headers, founder.userId);
    if (limited) return limited;

    const body = await req.json().catch(() => null);

    const vendorLabel = typeof body?.vendor === 'string' ? body.vendor.trim() : '';
    const token = normalizeVendorToken(vendorLabel);
    if (!token) {
      return NextResponse.json({ error: 'A supplier name is required.' }, { status: 400 });
    }

    const finalCategory = typeof body?.finalCategory === 'string' ? body.finalCategory : '';
    if (!isExpenseCategory(finalCategory)) {
      return NextResponse.json(
        { error: 'The final category must be one of the ledger categories.' },
        { status: 400 }
      );
    }

    const suggestedCategory =
      typeof body?.suggestedCategory === 'string' && isExpenseCategory(body.suggestedCategory)
        ? body.suggestedCategory
        : null;

    const result = await recordVendorOutcome(supabase, {
      vendorToken: token,
      vendorLabel: vendorLabel || token,
      suggestedCategory,
      finalCategory,
    });

    if (!result.ok) {
      // Visible degradation: the expense IS saved, but the firm should know the
      // learning step did not happen.
      return NextResponse.json(
        {
          ok: false,
          error: `The expense was saved, but the supplier history was not updated: ${result.error}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, vendorToken: token });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record the supplier outcome' },
      { status: 500 }
    );
  }
}
