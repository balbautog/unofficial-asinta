/**
 * Track D — voice → draft (step 1: audio → text).
 *
 * Groq serves Whisper (`whisper-large-v3-turbo`) on the same API key as the
 * text models. The `prompt` parameter is the interesting part: seeding it with
 * the firm's real worker, supplier and project names is what stops a Taglish
 * site note from becoming "Daniel Magpante bought cement at JMZ hardware".
 *
 * This module only transcribes. The transcript is then handed to the same
 * `extractExpenseDraft` used by the typed path, so a spoken note and a typed
 * note go through identical verification gates.
 */

import {
  GROQ_TRANSCRIPTION_ENDPOINT,
  TRANSCRIPTION_ALLOWED_MIME_TYPES,
  TRANSCRIPTION_MAX_FILE_BYTES,
  getTranscriptionModel,
} from '@/lib/ai/models';

export interface TranscriptionRequest {
  bytes: ArrayBuffer;
  fileName: string;
  mimeType: string;
  /** Context prompt (see buildTranscriptionPrompt in lib/ai/models.ts). */
  prompt?: string;
  /** ISO-639-1 hint. Omitted by default: Taglish is not a single language and
   *  pinning 'en' makes Whisper translate Tagalog words instead of writing them. */
  language?: string;
}

export interface TranscriptionResult {
  ok: boolean;
  text: string;
  model: string;
  reason?: string;
  /** Provider-reported duration when available. */
  durationSeconds?: number;
}

export function validateAudioPayload(input: {
  byteLength: number;
  mimeType: string;
}): { ok: true } | { ok: false; reason: string } {
  const mime = (input.mimeType || '').toLowerCase().split(';')[0];

  if (!TRANSCRIPTION_ALLOWED_MIME_TYPES.includes(mime)) {
    return {
      ok: false,
      reason: `That audio format (${mime || 'unknown'}) is not supported. Supported: ${TRANSCRIPTION_ALLOWED_MIME_TYPES.join(', ')}.`,
    };
  }
  if (input.byteLength <= 0) {
    return { ok: false, reason: 'The recording was empty — nothing was sent for transcription.' };
  }
  if (input.byteLength > TRANSCRIPTION_MAX_FILE_BYTES) {
    return {
      ok: false,
      reason: `The recording is larger than the ${Math.round(
        TRANSCRIPTION_MAX_FILE_BYTES / (1024 * 1024)
      )} MB limit. Record a shorter note.`,
    };
  }

  return { ok: true };
}

/** Sends one audio file to Groq and returns the transcript. */
export async function transcribeAudio(
  request: TranscriptionRequest,
  options: { apiKey?: string; timeoutMs?: number } = {}
): Promise<TranscriptionResult> {
  const model = getTranscriptionModel();
  const apiKey = options.apiKey ?? process.env.GROQ_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      text: '',
      model,
      reason: 'GROQ_API_KEY is not configured, so voice notes cannot be transcribed. Type the expense instead.',
    };
  }

  const form = new FormData();
  form.append(
    'file',
    new Blob([request.bytes], { type: request.mimeType || 'audio/webm' }),
    request.fileName || 'note.webm'
  );
  form.append('model', model);
  form.append('response_format', 'json');
  form.append('temperature', '0');
  if (request.prompt) form.append('prompt', request.prompt);
  if (request.language) form.append('language', request.language);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);

  try {
    const response = await fetch(GROQ_TRANSCRIPTION_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return {
        ok: false,
        text: '',
        model,
        reason: `Groq transcription returned HTTP ${response.status}. ${
          response.status === 413
            ? 'The recording is too large for the speech-to-text endpoint.'
            : ''
        }`.trim(),
      };
    }

    const data = await response.json().catch(() => null);
    const text = typeof data?.text === 'string' ? data.text.trim() : '';

    if (!text) {
      return {
        ok: false,
        text: '',
        model,
        reason:
          'No speech was recognised in that recording. Check the microphone, speak closer, or type the expense instead.',
      };
    }

    return {
      ok: true,
      text,
      model,
      durationSeconds: typeof data?.duration === 'number' ? data.duration : undefined,
    };
  } catch (caught) {
    const aborted = caught instanceof Error && caught.name === 'AbortError';
    return {
      ok: false,
      text: '',
      model,
      reason: aborted
        ? 'The transcription request timed out. Try a shorter recording.'
        : `The transcription request failed: ${caught instanceof Error ? caught.message : 'network error'}.`,
    };
  } finally {
    clearTimeout(timeout);
  }
}
