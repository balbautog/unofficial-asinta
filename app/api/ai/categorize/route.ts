import { NextRequest, NextResponse } from 'next/server';
import { analyzeExpenseWithAI } from '@/lib/ai/groq';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { description, amount } = body;

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const result = await analyzeExpenseWithAI(description, Number(amount) || 0);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to analyze expense' },
      { status: 500 }
    );
  }
}
