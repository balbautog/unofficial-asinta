import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireFounder } from '@/lib/auth/serverRole';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { extractExpenseDraft } from '@/lib/ai/draft';
import { loadDraftData, loadTranscriptionContext } from '@/lib/ai/draftData';
import { transcribeAudio, validateAudioPayload } from '@/lib/ai/transcribe';
import { buildTranscriptionPrompt } from '@/lib/ai/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Track D — voice note → transcript → draft.
 *
 * The recording is transcribed by Whisper with a context prompt seeded from the
 * firm's real worker, project and supplier names, then the transcript goes
 * through the SAME extraction and verification path as a typed line. A spoken
 * note therefore cannot bypass a check that a typed note must pass.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const founder = await requireFounder(supabase);
    if (!founder.ok) {
      return NextResponse.json({ error: founder.error }, { status: founder.status });
    }

    const limited = enforceRateLimit('aiExtract', req.headers, founder.userId);
    if (limited) return limited;

    const form = await req.formData().catch(() => null);
    const file = form?.get('audio');
    if (!form || !file || typeof file === 'string') {
      return NextResponse.json({ error: 'No recording was uploaded.' }, { status: 400 });
    }

    const audio = file as File;
    const validation = validateAudioPayload({
      byteLength: audio.size,
      mimeType: audio.type || 'audio/webm',
    });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.reason }, { status: 400 });
    }

    const context = await loadTranscriptionContext(supabase);
    const prompt = buildTranscriptionPrompt(context);

    const transcription = await transcribeAudio({
      bytes: await audio.arrayBuffer(),
      fileName: audio.name || 'site-note.webm',
      mimeType: audio.type || 'audio/webm',
      prompt,
    });

    if (!transcription.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: transcription.reason,
          manualEntryAvailable: true,
        },
        { status: 502 }
      );
    }

    const { context: draftContext, errors } = await loadDraftData(supabase);
    const draft = await extractExpenseDraft(transcription.text, draftContext);

    return NextResponse.json(
      {
        ok: true,
        transcript: transcription.text,
        transcriptionModel: transcription.model,
        durationSeconds: transcription.durationSeconds ?? null,
        // Voice is transcribed by a model, so the draft is model-reported in the
        // same sense as a photo: the transcript is a model's output, and the
        // Founder checks it against what they said.
        draft: { ...draft, verification: 'model-reported' as const },
        contextWarnings: errors,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process the recording' },
      { status: 500 }
    );
  }
}
