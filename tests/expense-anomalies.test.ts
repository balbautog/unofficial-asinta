import { describe, expect, it } from 'vitest';
import {
  buildExpenseWarnings,
  computeCategoryOutlier,
  findDuplicateCandidates,
  findLedgerDuplicates,
  findMissingReceipts,
  supplierKeyFor,
  type ExpenseLike,
} from '@/lib/expenses/anomalies';

const expense = (overrides: Partial<ExpenseLike> = {}): ExpenseLike => ({
  id: 'exp-1',
  project_id: 'proj-1',
  amount: 4800,
  expense_date: '2026-10-01',
  category: 'materials',
  description: 'cement',
  receipt_url: null,
  vendor: 'JMC Hardware',
  ...overrides,
});

describe('supplier keys', () => {
  it('uses the recorded vendor first', () => {
    expect(supplierKeyFor({ vendor: 'JMC Hardware, Inc.', description: '' })).toBe('jmc hardware');
  });

  it('falls back to the description', () => {
    expect(supplierKeyFor({ vendor: null, description: 'cement at JMC Hardware' })).toBe('jmc hardware');
  });

  it('returns nothing when no supplier is identifiable', () => {
    expect(supplierKeyFor({ vendor: null, description: 'cement and sand' })).toBe('');
  });
});

describe('duplicate detection', () => {
  it('flags the same supplier and amount within the window', () => {
    const matches = findDuplicateCandidates(
      { amount: 4800, expenseDate: '2026-10-03', vendor: 'JMC Hardware', projectId: 'proj-1' },
      [expense({ id: 'existing', expense_date: '2026-10-01' })]
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].daysApart).toBe(2);
    expect(matches[0].reason).toMatch(/same supplier/i);
    expect(matches[0].reason).toMatch(/2 days apart/);
  });

  it('ignores the same amount outside the window', () => {
    const matches = findDuplicateCandidates(
      { amount: 4800, expenseDate: '2026-10-20', vendor: 'JMC Hardware', projectId: 'proj-1' },
      [expense({ expense_date: '2026-10-01' })],
      { windowDays: 7 }
    );
    expect(matches).toHaveLength(0);
  });

  it('ignores a different amount at the same supplier', () => {
    const matches = findDuplicateCandidates(
      { amount: 5000, expenseDate: '2026-10-01', vendor: 'JMC Hardware', projectId: 'proj-1' },
      [expense({ amount: 4800 })]
    );
    expect(matches).toHaveLength(0);
  });

  it('ignores a different supplier in the same project', () => {
    const matches = findDuplicateCandidates(
      { amount: 4800, expenseDate: '2026-10-01', vendor: 'Wilcon Depot', projectId: 'proj-1' },
      [expense({ vendor: 'JMC Hardware' })]
    );
    expect(matches).toHaveLength(0);
  });

  it('still compares when the new entry has no supplier, and says so', () => {
    const matches = findDuplicateCandidates(
      { amount: 4800, expenseDate: '2026-10-01', vendor: null, projectId: 'proj-1' },
      [expense()]
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].reason).toMatch(/no supplier recorded/i);
  });

  it('never matches the row against itself when editing', () => {
    const matches = findDuplicateCandidates(
      { amount: 4800, expenseDate: '2026-10-01', vendor: 'JMC Hardware', projectId: 'proj-1', ignoreId: 'exp-1' },
      [expense()]
    );
    expect(matches).toHaveLength(0);
  });

  it('reports ledger-wide pairs once each', () => {
    const pairs = findLedgerDuplicates([
      expense({ id: 'a', expense_date: '2026-10-01' }),
      expense({ id: 'b', expense_date: '2026-10-03' }),
      expense({ id: 'c', expense_date: '2026-10-04', vendor: 'Wilcon Depot' }),
    ]);

    expect(pairs).toHaveLength(1);
    expect([pairs[0].a.id, pairs[0].b.id].sort()).toEqual(['a', 'b']);
  });
});

describe('outlier detection', () => {
  const history: ExpenseLike[] = Array.from({ length: 9 }, (_, index) =>
    expense({ id: `h-${index}`, amount: 9000 + index * 100, category: 'materials' })
  );

  it('does not call anything an outlier with too little history', () => {
    const result = computeCategoryOutlier({ amount: 100_000, category: 'materials' }, history.slice(0, 3));
    expect(result.isOutlier).toBe(false);
    expect(result.ratio).toBeNull();
    expect(result.message).toMatch(/not enough comparable/i);
  });

  it('flags a large amount against the median and states the numbers', () => {
    const result = computeCategoryOutlier({ amount: 48_000, category: 'materials' }, history);
    expect(result.isOutlier).toBe(true);
    expect(result.sampleSize).toBe(9);
    expect(result.message).toMatch(/median of your 9 recorded materials entries/i);
    expect(result.message).toMatch(/5\.2×|5\.1×|5\.0×/);
  });

  it('uses the median, so one huge purchase does not move the bar', () => {
    const withHuge = [...history, expense({ id: 'huge', amount: 400_000, category: 'materials' })];
    const result = computeCategoryOutlier({ amount: 48_000, category: 'materials' }, withHuge);
    expect(result.isOutlier).toBe(true);
    expect(result.median).toBeLessThan(10_000);
    expect(result.mean).toBeGreaterThan(result.median);
  });

  it('stays quiet for a normal amount', () => {
    const result = computeCategoryOutlier({ amount: 9_500, category: 'materials' }, history);
    expect(result.isOutlier).toBe(false);
    expect(result.message).toMatch(/in line with/i);
  });
});

describe('missing receipts', () => {
  it('flags entries above the threshold with no photo', () => {
    const findings = findMissingReceipts(
      [expense({ id: 'big', amount: 12_000 }), expense({ id: 'small', amount: 800 })],
      5000
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].expense.id).toBe('big');
    expect(findings[0].reason).toMatch(/threshold ₱5,000/);
  });

  it('does not flag an entry that has a photo', () => {
    const findings = findMissingReceipts([expense({ amount: 12_000, receipt_url: 'user/1.jpg' })]);
    expect(findings).toHaveLength(0);
  });
});

describe('combined warnings', () => {
  it('bundles duplicates, outlier and receipt policy for one candidate', () => {
    const history = [
      expense({ id: 'a', expense_date: '2026-10-01' }),
      ...Array.from({ length: 8 }, (_, index) =>
        expense({ id: `m-${index}`, amount: 9000, category: 'materials', expense_date: '2026-09-01' })
      ),
    ];

    const warnings = buildExpenseWarnings(
      {
        amount: 48_000,
        expenseDate: '2026-10-02',
        vendor: 'JMC Hardware',
        projectId: 'proj-1',
        category: 'materials',
        receipt_url: null,
      },
      history
    );

    expect(warnings.duplicates).toHaveLength(0); // different amount
    expect(warnings.outlier?.isOutlier).toBe(true);
    expect(warnings.missingReceipt?.reason).toMatch(/no receipt photo/i);
  });
});
