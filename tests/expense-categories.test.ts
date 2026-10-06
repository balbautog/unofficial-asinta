import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EXPENSE_CATEGORIES,
  isExpenseCategory,
  UNCLASSIFIED_EXPENSE_CATEGORY,
} from '@/lib/ai/categories';

/**
 * Guards the one definition of the expense categories.
 *
 * Before this test the list lived in three places (TypeScript union, SQL CHECK
 * constraint, Groq prompt) and nothing kept them aligned — a category accepted
 * by the model but missing from the CHECK constraint failed the insert with a
 * raw Postgres error.
 */
describe('expense category single source of truth', () => {
  it('matches the SQL CHECK constraint in the schema migration', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260913000000_bale_schema.sql'),
      'utf8'
    );

    const match = migration.match(/category TEXT NOT NULL CHECK \(category IN \(([^)]+)\)\)/);
    expect(match, 'category CHECK constraint not found in migration').toBeTruthy();

    const sqlCategories = (match as RegExpMatchArray)[1]
      .split(',')
      .map((value) => value.trim().replace(/^'|'$/g, ''));

    expect(sqlCategories).toEqual([...EXPENSE_CATEGORIES]);
  });

  it('accepts every valid category and rejects anything else', () => {
    for (const category of EXPENSE_CATEGORIES) {
      expect(isExpenseCategory(category)).toBe(true);
    }

    expect(isExpenseCategory('hardware')).toBe(false);
    expect(isExpenseCategory('Materials')).toBe(false);
    expect(isExpenseCategory('')).toBe(false);
    expect(isExpenseCategory(null)).toBe(false);
    expect(isExpenseCategory(42)).toBe(false);
  });

  it('uses an existing category as the unclassified fallback', () => {
    // Must be a real column value — otherwise the honest "we could not tell"
    // path would itself violate the CHECK constraint.
    expect(EXPENSE_CATEGORIES).toContain(UNCLASSIFIED_EXPENSE_CATEGORY);
  });
});
