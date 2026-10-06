import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeExpenseWithAI, categorizeWithRules } from '@/lib/ai/groq';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const mockGroqResponse = (body: unknown, ok = true, status = 200) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok,
      status,
      json: async () => body,
    })) as unknown as typeof fetch
  );

const completion = (content: string) => ({ choices: [{ message: { content } }] });

describe('rule-based categorizer (works with no API key)', () => {
  it('classifies construction materials from keywords', () => {
    const result = categorizeWithRules('12 bags cement and rebar for the slab');
    expect(result.category).toBe('materials');
    expect(result.isBale).toBe(false);
    expect(result.source).toBe('rules');
    expect(result.evidence).toContain('matched "cement"');
  });

  it('flags a worker bale and its category', () => {
    const result = categorizeWithRules('cash advance para sa mason');
    expect(result.category).toBe('labor');
    expect(result.isBale).toBe(true);
  });

  it('does NOT silently default unrecognised text to materials', () => {
    const result = categorizeWithRules('miscellaneous site item');
    expect(result.category).toBe('other');
    expect(result.evidence).toEqual([]);
    expect(result.reasoning).toMatch(/choose the category manually/i);
  });
});

describe('LLM assistance degrades visibly', () => {
  it('report missing configuration instead of pretending an AI ran', async () => {
    vi.stubEnv('GROQ_API_KEY', '');
    const result = await analyzeExpenseWithAI('cement for the footing');
    expect(result.source).toBe('rules');
    expect(result.degradedReason).toMatch(/GROQ_API_KEY/);
  });

  it('uses the model when it returns a valid category', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    mockGroqResponse(
      completion(JSON.stringify({ category: 'permits', isBale: false, reasoning: 'LGU filing.' }))
    );

    const result = await analyzeExpenseWithAI('barangay clearance fee');
    expect(result.source).toBe('llm');
    expect(result.category).toBe('permits');
    expect(result.degradedReason).toBeUndefined();
  });

  it('falls back to the rules when the model returns an out-of-enum category', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    mockGroqResponse(
      completion(JSON.stringify({ category: 'hardware', isBale: false, reasoning: 'Guess.' }))
    );

    const result = await analyzeExpenseWithAI('cement bags');
    expect(result.source).toBe('rules');
    expect(result.category).toBe('materials');
    expect(result.degradedReason).toMatch(/unsupported category/i);
  });

  it('falls back and reports the HTTP failure', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    mockGroqResponse({}, false, 500);

    const result = await analyzeExpenseWithAI('cement bags');
    expect(result.source).toBe('rules');
    expect(result.degradedReason).toMatch(/HTTP 500/);
  });

  it('falls back when the model returns unparseable JSON', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    mockGroqResponse(completion('not json at all'));

    const result = await analyzeExpenseWithAI('cement bags');
    expect(result.source).toBe('rules');
    expect(result.degradedReason).toMatch(/could not be parsed/i);
  });

  it('falls back when the network request throws', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }) as unknown as typeof fetch
    );

    const result = await analyzeExpenseWithAI('cement bags');
    expect(result.source).toBe('rules');
    expect(result.degradedReason).toMatch(/request failed/i);
  });
});
