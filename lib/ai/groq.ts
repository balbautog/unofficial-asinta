import {
  EXPENSE_CATEGORIES,
  isExpenseCategory,
  UNCLASSIFIED_EXPENSE_CATEGORY,
  type ExpenseCategory,
} from '@/lib/ai/categories';

/**
 * Expense categorization: API-assisted, rule-based decision support.
 *
 * Design rule (deliberate, please keep it):
 *   - The LLM may only *extract* — map a free-text description onto a category.
 *   - Every *decision* stays in inspectable code (the rule layer below).
 *   - Nothing here writes to the ledger; a Founder confirms every suggestion.
 *
 * The result is always usable. When the model is missing, unreachable, or
 * returns something unusable, this falls back to the deterministic rule layer
 * and reports WHY in `degradedReason` — degradation is visible, never silent.
 */

export const GROQ_MODEL = 'llama-3.3-70b-versatile';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export type CategorizationSource = 'llm' | 'rules';

export interface AICategorizationResult {
  category: ExpenseCategory;
  isBale: boolean;
  reasoning: string;
  /**
   * Why the suggestion was made — matched keywords, or the model that classified
   * it. Replaces the previously invented numeric "confidence", which asserted a
   * precision that was never measured.
   */
  evidence: string[];
  source: CategorizationSource;
  /** Set when an LLM was configured but could not be used. Safe to show to Founders. */
  degradedReason?: string;
}

/* -------------------------------------------------------------------------- */
/* Layer 1 + 3: deterministic rules (always available, never calls the network) */
/* -------------------------------------------------------------------------- */

const BALE_KEYWORDS = [
  'bale',
  'cash advance',
  'advance',
  'emergency cash',
  'ayuda',
  'pamasahe',
];

interface CategoryRule {
  category: ExpenseCategory;
  keywords: string[];
  reasoning: string;
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'materials',
    keywords: [
      'cement',
      'steel',
      'rebar',
      'gravel',
      'sand',
      'lumber',
      'plywood',
      'paint',
      'tile',
      'pipe',
      'concrete',
      'wire',
      'hollow block',
      'chb',
      'hardware',
      'supplies',
    ],
    reasoning: 'Construction raw materials and architectural finishes.',
  },
  {
    category: 'labor',
    keywords: ['payroll', 'sweldo', 'labor', 'carpenter', 'mason', 'electrician', 'wages'],
    reasoning: 'Site manpower compensation and direct craft labor.',
  },
  {
    category: 'equipment',
    keywords: [
      'crane',
      'mixer',
      'scaffolding',
      'drill',
      'backhoe',
      'rental',
      'generator',
      'grinder',
    ],
    reasoning: 'Machinery rental, heavy tools, and site plant equipment.',
  },
  {
    category: 'permits',
    keywords: ['permit', 'lgu', 'clearance', 'barangay', 'city hall', 'bir', 'occupancy'],
    reasoning: 'Statutory municipal permits, zoning, and regulatory filings.',
  },
  {
    category: 'transportation',
    keywords: ['gas', 'diesel', 'fuel', 'toll', 'trucking', 'delivery', 'fare', 'hauling'],
    reasoning: 'Site logistics, fuel, tollway corridors, and material freight.',
  },
];

const quoteMatches = (keywords: string[]): string[] => keywords.map((word) => `matched "${word}"`);

/**
 * The rule layer. Used on its own when no API key is configured, and as the
 * fallback whenever the model call cannot produce a usable answer.
 */
export function categorizeWithRules(description: string): AICategorizationResult {
  const lower = (description || '').toLowerCase();

  const baleMatches = BALE_KEYWORDS.filter((keyword) => lower.includes(keyword));
  if (baleMatches.length > 0) {
    return {
      category: 'labor',
      isBale: true,
      reasoning:
        'Worker wage advance (bale) detected — deductible from the next payroll cycle.',
      evidence: quoteMatches(baleMatches),
      source: 'rules',
    };
  }

  for (const rule of CATEGORY_RULES) {
    const matched = rule.keywords.filter((keyword) => lower.includes(keyword));
    if (matched.length > 0) {
      return {
        category: rule.category,
        isBale: false,
        reasoning: rule.reasoning,
        evidence: quoteMatches(matched),
        source: 'rules',
      };
    }
  }

  return {
    category: UNCLASSIFIED_EXPENSE_CATEGORY,
    isBale: false,
    reasoning: 'No built-in rule matched this description — please choose the category manually.',
    evidence: [],
    source: 'rules',
  };
}

/* -------------------------------------------------------------------------- */
/* Layer 2: LLM extraction (only when configured)                              */
/* -------------------------------------------------------------------------- */

function buildSystemPrompt(): string {
  const enumList = EXPENSE_CATEGORIES.map((category) => `"${category}"`).join(', ');
  return `You are the ledger assistant for Asinta Architects, an architecture and design-build firm in Batangas, Philippines.
Classify the expense description into exactly one category from this list: ${enumList}.
Set isBale to true only when the expense is a cash advance ("bale") to a worker or sub-contractor.
Write one concise sentence of reasoning in a construction context.
Respond ONLY with valid JSON in this exact shape:
{"category": "<one of the listed categories>", "isBale": <true or false>, "reasoning": "<one sentence>"}`;
}

function withDegradation(
  fallback: AICategorizationResult,
  degradedReason: string
): AICategorizationResult {
  return { ...fallback, degradedReason };
}

/**
 * Suggests a category for an expense description.
 *
 * Never throws and never returns an invalid category — the caller can always
 * render the result. Check `source` / `degradedReason` to tell the Founder
 * whether the built-in rules or the model produced the suggestion.
 */
export async function analyzeExpenseWithAI(description: string): Promise<AICategorizationResult> {
  const rules = categorizeWithRules(description);
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return withDegradation(rules, 'GROQ_API_KEY is not configured — using built-in rules.');
  }

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: `Expense description: "${description}"` },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.warn(`Groq categorization unavailable (HTTP ${response.status}); using built-in rules.`);
      return withDegradation(rules, `Groq returned HTTP ${response.status} — using built-in rules.`);
    }

    const data = await response.json().catch(() => null);
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || !content.trim()) {
      return withDegradation(rules, 'Groq returned an empty response — using built-in rules.');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return withDegradation(rules, 'Groq returned a response that could not be parsed.');
    }

    // Validate before the suggestion can reach the database: an out-of-enum
    // category would otherwise fail the CHECK constraint mid-write.
    if (!isExpenseCategory(parsed?.category)) {
      return withDegradation(
        rules,
        `Groq returned an unsupported category (${String(parsed?.category)}) — using built-in rules.`
      );
    }

    const reasoning =
      typeof parsed?.reasoning === 'string' && parsed.reasoning.trim()
        ? parsed.reasoning.trim()
        : 'Classified by the Groq model.';

    return {
      category: parsed.category,
      isBale: Boolean(parsed?.isBale),
      reasoning,
      evidence: [`Classified by ${GROQ_MODEL}`],
      source: 'llm',
    };
  } catch (error) {
    console.warn('Groq API request failed; using built-in rules.', error);
    return withDegradation(rules, 'The Groq request failed — using built-in rules.');
  }
}
