/**
 * Server-side data loading for the extraction engine.
 *
 * Two rules encoded here:
 *   - The model is given REAL database identities: project UUIDs with their
 *     names, and the firm's actual supplier labels for the Whisper prompt.
 *   - Nothing about the ledger is summarised or invented; the whole point of
 *     loading these rows is to keep the model's output mappable to a real row.
 */

import type { DraftContext } from '@/lib/ai/draft';
import type { VendorMemoryRow } from '@/lib/ai/vendorMemory';

export interface MinimalDb {
  from: (table: string) => any;
  /** PostgREST RPC, used for the atomic vendor-memory upsert. */
  rpc?: (
    fn: string,
    args: Record<string, unknown>
  ) => PromiseLike<{ data?: unknown; error: { message: string } | null }>;
}

/** Today's date in the firm's timezone. The server may run anywhere. */
export function manilaTodayISO(now: Date = new Date()): string {
  // 'en-CA' formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now);
}

export interface LoadedDraftData {
  context: DraftContext;
  errors: string[];
}

/**
 * Loads everything the draft needs. Never throws: a partial context still
 * produces a usable draft, and every failure is reported in `errors` so the API
 * can tell the Founder what was unavailable instead of implying full coverage.
 */
export async function loadDraftData(db: MinimalDb): Promise<LoadedDraftData> {
  const errors: string[] = [];

  const [projectsResult, memoryResult] = await Promise.all([
    db.from('projects').select('id, name'),
    db.from('vendor_memory').select('vendor_token, vendor_label, category, accepted_count, override_count'),
  ]);

  if (projectsResult.error) {
    errors.push(`Projects could not be loaded: ${projectsResult.error.message}`);
  }
  if (memoryResult.error) {
    // The migration may not be applied yet; the draft still works without it.
    errors.push(
      `Vendor memory could not be loaded (${memoryResult.error.message}). Suggestions fall back to the model or the built-in rules.`
    );
  }

  return {
    context: {
      projects: (projectsResult.data ?? []).map((row: any) => ({ id: row.id, name: row.name })),
      vendorMemory: (memoryResult.data ?? []) as VendorMemoryRow[],
      todayISO: manilaTodayISO(),
    },
    errors,
  };
}

export interface TranscriptionContextData {
  workerNames: string[];
  projectNames: string[];
  vendorNames: string[];
}

/** Names used to seed the Whisper prompt (see buildTranscriptionPrompt). */
export async function loadTranscriptionContext(db: MinimalDb): Promise<TranscriptionContextData> {
  const [workers, projects, vendors] = await Promise.all([
    db.from('workers').select('name').eq('active', true),
    db.from('projects').select('name'),
    db.from('vendor_memory').select('vendor_label').order('last_seen_at', { ascending: false }).limit(40),
  ]);

  return {
    workerNames: (workers.data ?? []).map((row: any) => String(row.name || '')).filter(Boolean),
    projectNames: (projects.data ?? []).map((row: any) => String(row.name || '')).filter(Boolean),
    vendorNames: (vendors.data ?? []).map((row: any) => String(row.vendor_label || '')).filter(Boolean),
  };
}

export interface VendorOutcomeInput {
  vendorToken: string;
  vendorLabel: string;
  suggestedCategory: string | null;
  finalCategory: string;
}

/**
 * Records an accepted/overridden suggestion through the atomic SQL function
 * from migration 20261006000001. Returns a result instead of throwing so the
 * caller can decide how visible the failure needs to be.
 */
export async function recordVendorOutcome(
  db: MinimalDb,
  input: VendorOutcomeInput
): Promise<{ ok: boolean; error?: string }> {
  if (typeof db.rpc !== 'function') {
    return { ok: false, error: 'This Supabase client cannot call database functions.' };
  }

  try {
    const { error } = await db.rpc('record_vendor_outcome', {
      p_vendor_token: input.vendorToken,
      p_vendor_label: input.vendorLabel,
      p_suggested_category: input.suggestedCategory,
      p_final_category: input.finalCategory,
    });

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (caught) {
    return {
      ok: false,
      error: caught instanceof Error ? caught.message : 'unexpected vendor-memory error',
    };
  }
}
