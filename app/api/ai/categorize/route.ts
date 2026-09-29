import { NextRequest, NextResponse } from 'next/server';
import { analyzeExpenseWithAI } from '@/lib/ai/groq';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Groq AI expense categorization.
 * Requires an authenticated Supabase session whose public.users role is
 * 'founder' (expense recording is a Founder-only feature).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // RLS guarantees the caller can only read their own profile row.
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== 'founder') {
      return NextResponse.json(
        { error: 'Only Founders may use AI expense categorization' },
        { status: 403 }
      );
    }

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
