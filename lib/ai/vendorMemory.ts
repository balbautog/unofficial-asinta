/**
 * Vendor memory — Track A.
 *
 * The firm has always been able to override the categorizer, and BALE has
 * always stored both the suggestion and the Founder's final category. That is
 * labelled training data, and nothing read it. This module turns those labels
 * into a free, explainable suggestion layer that sits ABOVE the model:
 *
 *   known vendor  → vendor memory (explainable: "accepted 14 of 15 times")
 *   novel vendor  → the LLM (assistive, preview model, never authoritative)
 *   no vendor     → the deterministic rule layer
 *
 * EXPLICIT NON-GOALS
 * ------------------
 * No embeddings. No vector similarity. No scoring function with tuned weights.
 * The memory is a normalised token, a category, and two counters. Any Founder
 * can read the table, explain a suggestion, and correct it by hand. That
 * property is the reason the design works; a black box would lose it.
 */

import { isExpenseCategory, type ExpenseCategory } from '@/lib/ai/categories';

/**
 * Legal-form and noise tokens dropped before matching, so "JMC Hardware Inc."
 * and "JMC Hardware" are the same supplier.
 *
 * Only genuinely meaningless words are dropped. Trade words ("hardware",
 * "trading", "supply") are KEPT — they distinguish suppliers.
 */
const NOISE_TOKENS = new Set([
  'inc',
  'incorporated',
  'corp',
  'corporation',
  'co',
  'company',
  'ltd',
  'limited',
  'phils',
  'philippines',
  'ph',
  'the',
  'and',
  'enterprise',
  'enterprises',
]);

/**
 * Normalises a supplier name into a stable lookup key.
 *
 * Deterministic, inspectable, and cheap:
 *   "JMC Hardware, Inc."   → "jmc hardware"
 *   "  J&M TRADING  "      → "jm trading"
 *   "Mercury Drug - Bauan" → "mercury drug bauan"
 *
 * The trade-off is deliberate: aggressive normalisation can merge two
 * different suppliers. That is acceptable because the consequence is a
 * *suggestion* the Founder sees, with the counts that produced it — never a
 * silent write, and never a number in the ledger.
 */
export function normalizeVendorToken(name: string | null | undefined): string {
  if (!name) return '';

  return name
    .normalize('NFKD')
    // Strip diacritics so "Peña" and "Pena" match.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    // "J&M Trading" and "JM Trading" are the same shop; a space here would
    // create a third token ("j m trading") that matches neither.
    .replace(/&/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !NOISE_TOKENS.has(token))
    .join(' ')
    .trim();
}

export interface VendorMemoryRow {
  vendor_token: string;
  vendor_label: string;
  category: string;
  accepted_count: number;
  override_count: number;
  last_seen_at?: string;
}

export interface VendorMemorySuggestion {
  category: ExpenseCategory;
  vendorLabel: string;
  acceptedCount: number;
  overrideCount: number;
  /** accepted + override — the number of recorded decisions for this vendor. */
  totalCount: number;
  /**
   * MEASURED confidence: accepted / total, or null when no suggestion has ever
   * been accepted OR overridden (i.e. nothing to measure yet). This replaces
   * the old invented "% confidence" figure.
   */
  acceptedRate: number | null;
  /** Sentence shown in the UI. Never claims more than the counters support. */
  evidence: string;
}

function toCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

/**
 * Turns a memory row into a suggestion, or null when the row cannot support one
 * (unknown category, empty token).
 */
export function suggestFromVendorMemory(
  row: VendorMemoryRow | null | undefined
): VendorMemorySuggestion | null {
  if (!row || !isExpenseCategory(row.category)) return null;

  const acceptedCount = toCount(row.accepted_count);
  const overrideCount = toCount(row.override_count);
  const totalCount = acceptedCount + overrideCount;
  const acceptedRate = totalCount > 0 ? acceptedCount / totalCount : null;

  const label = (row.vendor_label || row.vendor_token || 'this supplier').trim();
  const evidence =
    totalCount === 0
      ? `First time categorising ${label} — nothing measured yet.`
      : acceptedCount > 0
        ? `You kept this category for ${label} in ${acceptedCount} of ${totalCount} recorded decision${
            totalCount === 1 ? '' : 's'
          }${overrideCount > 0 ? ` (changed ${overrideCount} time${overrideCount === 1 ? '' : 's'})` : ''}.`
        : `You changed this category for ${label} in all ${totalCount} recorded decision${
            totalCount === 1 ? '' : 's'
          } — check it before saving.`;

  return {
    category: row.category,
    vendorLabel: label,
    acceptedCount,
    overrideCount,
    totalCount,
    acceptedRate,
    evidence,
  };
}

export type CategorySource = 'vendor_memory' | 'llm' | 'rules';

export interface CategoryDecision {
  category: ExpenseCategory | null;
  source: CategorySource;
  /** Why this layer won — displayed verbatim to the Founder. */
  explanation: string;
  /** Counters behind the decision when vendor memory was used. */
  vendorMemory?: VendorMemorySuggestion;
}

export interface CategoryDecisionInput {
  /** Normalised vendor token, when a supplier could be identified. */
  vendorToken: string;
  memory: VendorMemoryRow | null | undefined;
  /** Validated LLM category, if one was produced. */
  llmCategory: ExpenseCategory | null;
  /** Deterministic rule-layer category (always available). */
  rulesCategory: ExpenseCategory;
  rulesEvidence?: string[];
}

/**
 * The layer order, in one function so it cannot drift between callers.
 *
 * Vendor memory wins when it exists because it is the Founder's OWN previous
 * decision for that exact supplier — free, instant, and explainable. The model
 * is only consulted for suppliers the firm has never categorised, and the rule
 * layer covers everything else (including "AI fully off").
 */
export function decideCategory(input: CategoryDecisionInput): CategoryDecision {
  const memorySuggestion = suggestFromVendorMemory(input.memory);

  if (input.vendorToken && memorySuggestion) {
    return {
      category: memorySuggestion.category,
      source: 'vendor_memory',
      explanation: memorySuggestion.evidence,
      vendorMemory: memorySuggestion,
    };
  }

  if (input.llmCategory) {
    return {
      category: input.llmCategory,
      source: 'llm',
      explanation: input.vendorToken
        ? `No recorded history for “${input.vendorToken}”, so the AI model classified this description.`
        : 'The AI model classified this description.',
    };
  }

  return {
    category: input.rulesCategory,
    source: 'rules',
    explanation:
      (input.rulesEvidence ?? []).length > 0
        ? `Built-in rules matched ${(input.rulesEvidence ?? []).join(', ')}.`
        : 'No model was available and no built-in rule matched — choose the category yourself.',
  };
}

/**
 * Resolves the vendor token to use for learning/suggesting, preferring an
 * explicitly named supplier and falling back to a name that literally appears
 * in the description ("12 bags cement at JMC Hardware …").
 *
 * The fallback is a plain substring search over known tokens plus a small set
 * of trade words — no inference, no model call. When nothing is found the
 * function returns '' and the vendor layer is skipped entirely rather than
 * guessing a supplier.
 */
export function resolveVendorToken(
  explicitVendor: string | null | undefined,
  description: string
): string {
  const explicit = normalizeVendorToken(explicitVendor);
  if (explicit) return explicit;

  const text = normalizeVendorToken(description);
  if (!text) return '';

  // "... at JMC Hardware" / "... from Mercury Drug" / "... sa Wilcon"
  const match = text.match(
    /\b(?:at|from|sa|kay|ni|of)\s+([a-z0-9 ]{2,40}?)(?=\s+(?:for|para|sa|in|on|worth|amounting)\b|$)/
  );
  return match ? match[1].trim() : '';
}
