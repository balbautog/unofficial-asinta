import { describe, expect, it } from 'vitest';
import {
  decideCategory,
  normalizeVendorToken,
  resolveVendorToken,
  suggestFromVendorMemory,
  type VendorMemoryRow,
} from '@/lib/ai/vendorMemory';

const row = (overrides: Partial<VendorMemoryRow> = {}): VendorMemoryRow => ({
  vendor_token: 'jmc hardware',
  vendor_label: 'JMC Hardware',
  category: 'materials',
  accepted_count: 14,
  override_count: 1,
  ...overrides,
});

describe('vendor token normalisation', () => {
  it('matches the same supplier written differently', () => {
    expect(normalizeVendorToken('JMC Hardware')).toBe('jmc hardware');
    expect(normalizeVendorToken('JMC Hardware, Inc.')).toBe('jmc hardware');
    expect(normalizeVendorToken('  JMC   HARDWARE  ')).toBe('jmc hardware');
    expect(normalizeVendorToken('JMC Hardware Corp')).toBe('jmc hardware');
  });

  it('keeps trade words that distinguish suppliers', () => {
    expect(normalizeVendorToken('Wilcon Depot')).toBe('wilcon depot');
    expect(normalizeVendorToken('Mercury Drug')).toBe('mercury drug');
  });

  it('handles punctuation, accents and ampersands', () => {
    expect(normalizeVendorToken('J&M Trading')).toBe('jm trading');
    expect(normalizeVendorToken('Peña Hardware - Bauan')).toBe('pena hardware bauan');
  });

  it('returns an empty token for empty input', () => {
    expect(normalizeVendorToken('')).toBe('');
    expect(normalizeVendorToken(null)).toBe('');
    expect(normalizeVendorToken('   ')).toBe('');
  });
});

describe('suggestion from measured counters', () => {
  it('states the measured rate rather than an invented percentage', () => {
    const suggestion = suggestFromVendorMemory(row());
    expect(suggestion?.category).toBe('materials');
    expect(suggestion?.acceptedCount).toBe(14);
    expect(suggestion?.totalCount).toBe(15);
    expect(suggestion?.acceptedRate).toBeCloseTo(14 / 15);
    expect(suggestion?.evidence).toMatch(/14 of 15/);
  });

  it('admits when the category was always changed', () => {
    const suggestion = suggestFromVendorMemory(row({ accepted_count: 0, override_count: 4 }));
    expect(suggestion?.acceptedRate).toBe(0);
    expect(suggestion?.evidence).toMatch(/changed this category/i);
  });

  it('says nothing is measured yet for a brand-new supplier', () => {
    const suggestion = suggestFromVendorMemory(row({ accepted_count: 0, override_count: 0 }));
    expect(suggestion?.acceptedRate).toBeNull();
    expect(suggestion?.evidence).toMatch(/nothing measured yet/i);
  });

  it('ignores a row whose category is not a ledger category', () => {
    expect(suggestFromVendorMemory(row({ category: 'hardware' }))).toBeNull();
    expect(suggestFromVendorMemory(null)).toBeNull();
  });

  it('does not treat missing counters as negative', () => {
    const suggestion = suggestFromVendorMemory(
      row({ accepted_count: -5 as unknown as number, override_count: undefined as unknown as number })
    );
    expect(suggestion?.acceptedCount).toBe(0);
    expect(suggestion?.overrideCount).toBe(0);
  });
});

describe('layer order: memory → model → rules', () => {
  it('uses vendor memory when the supplier is known', () => {
    const decision = decideCategory({
      vendorToken: 'jmc hardware',
      memory: row(),
      llmCategory: 'equipment',
      rulesCategory: 'materials',
    });
    expect(decision.source).toBe('vendor_memory');
    expect(decision.category).toBe('materials');
  });

  it('uses the model for a supplier with no history', () => {
    const decision = decideCategory({
      vendorToken: 'bagong tindahan',
      memory: null,
      llmCategory: 'equipment',
      rulesCategory: 'materials',
    });
    expect(decision.source).toBe('llm');
    expect(decision.category).toBe('equipment');
    expect(decision.explanation).toMatch(/no recorded history/i);
  });

  it('uses the rule layer when there is no vendor and no model', () => {
    const decision = decideCategory({
      vendorToken: '',
      memory: null,
      llmCategory: null,
      rulesCategory: 'transportation',
      rulesEvidence: ['matched "diesel"'],
    });
    expect(decision.source).toBe('rules');
    expect(decision.category).toBe('transportation');
    expect(decision.explanation).toMatch(/diesel/);
  });

  it('uses the rule layer when a vendor is known but has no category row', () => {
    const decision = decideCategory({
      vendorToken: 'jmc hardware',
      memory: null,
      llmCategory: null,
      rulesCategory: 'other',
    });
    expect(decision.source).toBe('rules');
  });

  it('never returns a null category from the rules/model path', () => {
    const decision = decideCategory({
      vendorToken: '',
      memory: null,
      llmCategory: null,
      rulesCategory: 'other',
    });
    expect(decision.category).toBe('other');
  });
});

describe('vendor resolution from free text', () => {
  it('prefers an explicitly named supplier', () => {
    expect(resolveVendorToken('JMC Hardware', 'anything')).toBe('jmc hardware');
  });

  it('finds a supplier after "at" / "from" / "sa"', () => {
    expect(resolveVendorToken(null, '12 bags cement at JMC Hardware')).toBe('jmc hardware');
    expect(resolveVendorToken(null, 'bought from Mercury Drug')).toBe('mercury drug');
    expect(resolveVendorToken(null, 'semento sa Wilcon Depot')).toBe('wilcon depot');
  });

  it('returns nothing rather than guessing a supplier', () => {
    expect(resolveVendorToken(null, 'cement and sand for the slab')).toBe('');
  });

  it('does not mistake a project phrase for a supplier', () => {
    // "for" is a known stop word in the pattern, so the project name is not
    // captured as a vendor.
    expect(resolveVendorToken(null, 'cement 4800 for Casa Batangas')).toBe('');
  });
});
