/**
 * Single source of truth for expense categories.
 *
 * This list previously existed in three places that could silently drift:
 *   1. the TypeScript union in `types/index.ts`
 *   2. the SQL CHECK constraint on `public.expenses.category`
 *   3. the enum baked into the Groq prompt
 *
 * Drift matters: a category accepted by the model but absent from the CHECK
 * constraint fails the insert with a raw Postgres error. Keep this list as the
 * only definition — `tests/expense-categories.test.ts` asserts that it still
 * matches the migration.
 */

export const EXPENSE_CATEGORIES = [
  'materials',
  'labor',
  'equipment',
  'permits',
  'transportation',
  'other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Narrowing guard used to validate model output before it reaches the database. */
export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === 'string' && (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

/** Human-readable labels for selects and badges. */
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  materials: 'Materials',
  labor: 'Labor',
  equipment: 'Equipment',
  permits: 'Permits',
  transportation: 'Transportation',
  other: 'Other',
};

/**
 * The category used when nothing could be determined. Deliberately `other`
 * rather than `materials`: the old default silently filed unrecognised
 * descriptions as materials, which is a false statement about the ledger.
 */
export const UNCLASSIFIED_EXPENSE_CATEGORY: ExpenseCategory = 'other';
