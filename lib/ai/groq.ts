import { ExpenseCategory } from '@/types';

export interface AICategorizationResult {
  category: ExpenseCategory;
  isBale: boolean;
  approvalRouting: string;
  confidence: number;
  reasoning: string;
}

export async function analyzeExpenseWithAI(
  description: string,
  amount: number
): Promise<AICategorizationResult> {
  const groqApiKey = process.env.GROQ_API_KEY;

  if (groqApiKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are the AI ledger assistant for Asinta Architects, an architecture & design-build firm in Batangas, Philippines.
Analyze the expense description and amount (in Philippine Pesos PHP ₱).
Determine:
1. Category: exactly one of: "materials", "labor", "equipment", "permits", "transportation", "other".
2. isBale: boolean (true if this represents a cash advance or "bale" to a worker or sub-contractor for personal/family/advance salary).
3. approvalRouting: brief recommendation (e.g. "Auto-verified under threshold", "Founder approval required for amount > ₱10,000", "Flagged for Bale Ledger deduction").
4. confidence: number between 0.5 and 1.0.
5. reasoning: 1 concise sentence in architectural/construction context.

Respond ONLY in valid JSON matching this schema:
{"category": "materials"|"labor"|"equipment"|"permits"|"transportation"|"other", "isBale": boolean, "approvalRouting": string, "confidence": number, "reasoning": string}`,
            },
            {
              role: 'user',
              content: `Expense Description: "${description}"\nAmount: ₱${amount.toLocaleString()}`,
            },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            category: parsed.category || 'materials',
            isBale: Boolean(parsed.isBale),
            approvalRouting: parsed.approvalRouting || (amount > 10000 ? 'Founder approval required' : 'Verified standard'),
            confidence: parsed.confidence || 0.95,
            reasoning: parsed.reasoning || 'Categorized using architectural semantic analysis.',
          };
        }
      }
    } catch (e) {
      console.warn('Groq API direct call error, falling back to local heuristic analyzer:', e);
    }
  }

  // Robust built-in architectural & construction heuristic analyzer (works offline & fallback)
  const lower = description.toLowerCase();
  let category: ExpenseCategory = 'materials';
  let isBale = false;
  let approvalRouting = amount > 15000 ? 'Founder approval required (> ₱15,000)' : 'Standard operating disbursement';
  let reasoning = 'Matched architectural ledger rules.';

  if (
    lower.includes('bale') ||
    lower.includes('advance') ||
    lower.includes('cash advance') ||
    lower.includes('emergency cash') ||
    lower.includes('ayuda') ||
    lower.includes('pamasahe advance')
  ) {
    category = 'labor';
    isBale = true;
    approvalRouting = 'Worker Advance (Bale) detected. Flag for Payroll Ledger deduction.';
    reasoning = 'Identified worker wage advance keywords. Deductible from upcoming payroll cycle.';
  } else if (
    lower.includes('cement') ||
    lower.includes('steel') ||
    lower.includes('rebar') ||
    lower.includes('gravel') ||
    lower.includes('sand') ||
    lower.includes('lumber') ||
    lower.includes('plywood') ||
    lower.includes('paint') ||
    lower.includes('tile') ||
    lower.includes('pipe') ||
    lower.includes('concrete') ||
    lower.includes('wire') ||
    lower.includes('hollow block') ||
    lower.includes('chb')
  ) {
    category = 'materials';
    reasoning = 'Classified as construction raw materials and architectural finishes.';
    approvalRouting = amount > 25000 ? 'Executive Founder sign-off needed (> ₱25k PO)' : 'Supplier PO verified';
  } else if (
    lower.includes('payroll') ||
    lower.includes('sweldo') ||
    lower.includes('labor') ||
    lower.includes('carpenter') ||
    lower.includes('mason') ||
    lower.includes('electrician') ||
    lower.includes('wages')
  ) {
    category = 'labor';
    reasoning = 'Site manpower compensation and direct craft labor.';
  } else if (
    lower.includes('crane') ||
    lower.includes('mixer') ||
    lower.includes('scaffolding') ||
    lower.includes('drill') ||
    lower.includes('backhoe') ||
    lower.includes('rental') ||
    lower.includes('generator') ||
    lower.includes('grinder')
  ) {
    category = 'equipment';
    reasoning = 'Machinery rental, heavy tools, and site plant equipment.';
  } else if (
    lower.includes('permit') ||
    lower.includes('lgu') ||
    lower.includes('clearance') ||
    lower.includes('barangay') ||
    lower.includes('city hall') ||
    lower.includes('bir') ||
    lower.includes('occupancy')
  ) {
    category = 'permits';
    reasoning = 'Statutory municipal permits, zoning, and regulatory filings.';
  } else if (
    lower.includes('gas') ||
    lower.includes('diesel') ||
    lower.includes('fuel') ||
    lower.includes('toll') ||
    lower.includes('trucking') ||
    lower.includes('delivery') ||
    lower.includes('fare')
  ) {
    category = 'transportation';
    reasoning = 'Site logistics, fuel, tollway corridor, and material freight.';
  }

  return {
    category,
    isBale,
    approvalRouting,
    confidence: isBale ? 0.98 : 0.92,
    reasoning,
  };
}
