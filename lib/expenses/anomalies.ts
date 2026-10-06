/**
 * Track C — duplicate, outlier and missing-receipt checks.
 *
 * This is arithmetic, not AI. It is also the highest value per hour in the AI
 * plan: weekly site purchasing produces the same receipt entered twice more
 * often than it produces a categorisation problem, and an outlier that is 5×
 * the usual materials spend is worth more to a Founder than any wording change.
 *
 * Design rules:
 *   - Every finding states its arithmetic ("same supplier + same amount, 2 days
 *     apart" / "materials average ₱9,200 across 63 entries"), so a Founder can
 *     disagree with it. No scores out of 100.
 *   - Nothing is blocked. A flagged expense can still be saved — the Founder
 *     knows about the deliveries that genuinely repeat.
 *   - No network, no model. It runs on the rows the app already loaded.
 */

import { normalizeVendorToken } from '@/lib/ai/vendorMemory';

export interface ExpenseLike {
  id: string;
  project_id: string;
  amount: number;
  expense_date: string;
  category: string;
  description: string;
  receipt_url?: string | null;
  vendor?: string | null;
}

export interface DuplicateCandidate {
  amount: number;
  expenseDate: string;
  vendor?: string | null;
  projectId: string;
  /** Exclude the row being edited, if any. */
  ignoreId?: string;
}

export interface DuplicateMatch {
  expense: ExpenseLike;
  daysApart: number;
  /** Which supplier key matched, for the explanation. */
  supplierKey: string;
  sameProject: boolean;
  reason: string;
}

export interface DuplicateOptions {
  /** Two entries this many days apart (or closer) can be duplicates. */
  windowDays?: number;
  /** Compare the amount exactly (default) — a different amount is a different purchase. */
  includeDifferentProjects?: boolean;
}

const MS_PER_DAY = 86_400_000;

function daysBetween(aISO: string, bISO: string): number {
  const a = Date.parse(`${aISO}T00:00:00Z`);
  const b = Date.parse(`${bISO}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
  return Math.round(Math.abs(a - b) / MS_PER_DAY);
}

/**
 * Supplier key for duplicate matching: the recorded vendor when there is one,
 * otherwise the text after "at/from/sa" in the description. Returns '' when no
 * supplier can be identified — in that case the amount+date+project match alone
 * is used, and the explanation says "no supplier recorded".
 */
export function supplierKeyFor(expense: {
  vendor?: string | null;
  description?: string | null;
}): string {
  const fromVendor = normalizeVendorToken(expense.vendor);
  if (fromVendor) return fromVendor;

  const description = expense.description ?? '';
  const normalised = normalizeVendorToken(description);
  const match = normalised.match(/\b(?:at|from|sa|kay|ni)\s+([a-z0-9 ]{2,40})$/);
  return match ? match[1].trim() : '';
}

/**
 * Finds entries that look like the same purchase as `candidate`.
 *
 * Match rule: same amount (within a centavo) AND within `windowDays`, ranked by
 * (same project, same supplier, closest date). A candidate with no supplier is
 * still compared — the reason text then says the supplier was not recorded, so
 * the Founder knows the basis of the flag.
 */
export function findDuplicateCandidates(
  candidate: DuplicateCandidate,
  existing: ExpenseLike[],
  options: DuplicateOptions = {}
): DuplicateMatch[] {
  const windowDays = options.windowDays ?? 7;
  const candidateSupplier = supplierKeyFor(candidate);

  return existing
    .filter((expense) => expense.id !== candidate.ignoreId)
    .filter((expense) => Math.abs(Number(expense.amount) - candidate.amount) < 0.01)
    .filter((expense) => daysBetween(expense.expense_date, candidate.expenseDate) <= windowDays)
    .filter((expense) => {
      if (options.includeDifferentProjects) return true;

      const matchSupplier = supplierKeyFor(expense);
      const bothSuppliersKnown = Boolean(candidateSupplier) && Boolean(matchSupplier);

      // Two different named suppliers with the same amount in the same week is
      // ordinary site purchasing, not a double entry. Only a supplier match
      // (any project) or a same-project match with no contradicting supplier
      // counts.
      if (bothSuppliersKnown && candidateSupplier !== matchSupplier) return false;

      const sameProject = expense.project_id === candidate.projectId;
      return sameProject || (bothSuppliersKnown && candidateSupplier === matchSupplier);
    })
    .map((expense) => {
      const matchSupplier = supplierKeyFor(expense);
      const sameProject = expense.project_id === candidate.projectId;
      const daysApart = daysBetween(expense.expense_date, candidate.expenseDate);

      const supplierPhrase =
        candidateSupplier && matchSupplier && candidateSupplier === matchSupplier
          ? `same supplier “${(candidate.vendor || candidateSupplier).trim()}”`
          : 'no supplier recorded to compare';

      return {
        expense,
        daysApart,
        supplierKey: matchSupplier,
        sameProject,
        reason: `₱${candidate.amount.toLocaleString('en-PH')} ${supplierPhrase}${sameProject ? ', same project' : ', another project'}, ${
          daysApart === 0 ? 'the same day' : `${daysApart} day${daysApart === 1 ? '' : 's'} apart`
        }.`,
      };
    })
    .sort((a, b) => {
      if (a.sameProject !== b.sameProject) return a.sameProject ? -1 : 1;
      if (a.daysApart !== b.daysApart) return a.daysApart - b.daysApart;
      return a.expense.expense_date < b.expense.expense_date ? 1 : -1;
    });
}

export interface OutlierResult {
  median: number;
  mean: number;
  sampleSize: number;
  /** candidate amount ÷ median, or null when there is nothing to compare. */
  ratio: number | null;
  isOutlier: boolean;
  message: string;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/**
 * Compares an amount against the firm's history for the same category.
 *
 * Median, not mean: one ₱400,000 equipment purchase must not raise the
 * "typical materials spend" bar. A finding needs at least 8 comparable entries
 * before it is stated at all — with five rows the median is noise, and a
 * warning that cries wolf gets ignored.
 */
export function computeCategoryOutlier(
  candidate: { amount: number; category: string },
  existing: ExpenseLike[],
  options: { multiplier?: number; minimumSampleSize?: number } = {}
): OutlierResult {
  const multiplier = options.multiplier ?? 3;
  const minimumSampleSize = options.minimumSampleSize ?? 8;

  const comparable = existing
    .filter((expense) => expense.category === candidate.category)
    .map((expense) => Number(expense.amount))
    .filter((amount) => Number.isFinite(amount) && amount > 0);

  const sampleSize = comparable.length;
  const medianAmount = median(comparable);
  const meanAmount =
    sampleSize > 0 ? comparable.reduce((total, value) => total + value, 0) / sampleSize : 0;

  if (sampleSize < minimumSampleSize || medianAmount <= 0) {
    return {
      median: medianAmount,
      mean: meanAmount,
      sampleSize,
      ratio: null,
      isOutlier: false,
      message: `Not enough comparable ${candidate.category} entries yet (${sampleSize} of ${minimumSampleSize} needed) to say whether this amount is usual.`,
    };
  }

  const ratio = candidate.amount / medianAmount;
  const isOutlier = candidate.amount > medianAmount * multiplier;

  return {
    median: medianAmount,
    mean: meanAmount,
    sampleSize,
    ratio,
    isOutlier,
    message: isOutlier
      ? `₱${Math.round(candidate.amount).toLocaleString('en-PH')} for ${candidate.category} — the median of your ${sampleSize} recorded ${candidate.category} entries is ₱${Math.round(
          medianAmount
        ).toLocaleString('en-PH')} (${ratio.toFixed(1)}× the usual).`
      : `In line with your ${sampleSize} recorded ${candidate.category} entries (median ₱${Math.round(
          medianAmount
        ).toLocaleString('en-PH')}).`,
  };
}

export interface MissingReceiptFinding {
  expense: ExpenseLike;
  reason: string;
}

/**
 * Receipts above a threshold should exist for audit purposes. Below it, a
 * sari-sari store run is normal and nagging about it trains people to ignore
 * the panel.
 */
export function findMissingReceipts(
  expenses: ExpenseLike[],
  threshold = 5000
): MissingReceiptFinding[] {
  return expenses
    .filter((expense) => !expense.receipt_url && Number(expense.amount) >= threshold)
    .map((expense) => ({
      expense,
      reason: `₱${Math.round(Number(expense.amount)).toLocaleString('en-PH')} recorded with no receipt photo attached (threshold ₱${threshold.toLocaleString('en-PH')}).`,
    }));
}

export interface ExpenseWarningSummary {
  duplicates: DuplicateMatch[];
  outlier: OutlierResult | null;
  /** The candidate itself, when it breaks the receipt policy. */
  missingReceipt: MissingReceiptFinding | null;
}

/**
 * Everything the UI needs about ONE candidate expense, computed in one call so
 * the pre-save panel and the list badges cannot disagree. Ledger-wide findings
 * (all missing receipts) come from `findMissingReceipts` directly.
 */
export function buildExpenseWarnings(
  candidate: DuplicateCandidate & { category: string; receipt_url?: string | null },
  existing: ExpenseLike[],
  options: { duplicateWindowDays?: number; receiptThreshold?: number } = {}
): ExpenseWarningSummary {
  const threshold = options.receiptThreshold ?? 5000;
  const missing = findMissingReceipts(
    [
      {
        id: candidate.ignoreId ?? 'candidate',
        project_id: candidate.projectId,
        amount: candidate.amount,
        expense_date: candidate.expenseDate,
        category: candidate.category,
        description: '',
        vendor: candidate.vendor ?? null,
        receipt_url: candidate.receipt_url ?? null,
      },
    ],
    threshold
  );

  return {
    duplicates: findDuplicateCandidates(candidate, existing, {
      windowDays: options.duplicateWindowDays,
    }),
    outlier: computeCategoryOutlier(
      { amount: candidate.amount, category: candidate.category },
      existing
    ),
    missingReceipt: missing[0] ?? null,
  };
}

export interface DuplicatePair {
  a: ExpenseLike;
  b: ExpenseLike;
  daysApart: number;
  reason: string;
}

/**
 * Ledger-wide duplicate scan used by the "Ledger checks" panel.
 *
 * Pairs only, de-duplicated, so the panel shows "these two entries look like the
 * same purchase" rather than N² rows of noise.
 */
export function findLedgerDuplicates(
  expenses: ExpenseLike[],
  options: DuplicateOptions = {}
): DuplicatePair[] {
  const seen = new Set<string>();
  const pairs: DuplicatePair[] = [];

  for (const expense of expenses) {
    const matches = findDuplicateCandidates(
      {
        amount: Number(expense.amount),
        expenseDate: expense.expense_date,
        vendor: expense.vendor,
        projectId: expense.project_id,
        ignoreId: expense.id,
      },
      expenses,
      options
    );

    for (const match of matches) {
      const key = [expense.id, match.expense.id].sort().join('::');
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({
        a: expense,
        b: match.expense,
        daysApart: match.daysApart,
        reason: match.reason,
      });
    }
  }

  return pairs.sort((x, y) => x.daysApart - y.daysApart);
}
