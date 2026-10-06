/**
 * Every Groq model ID BALE uses, in one place.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * While implementing this pass, the two model IDs the app depended on turned
 * out to be RETIRED. Verified against https://console.groq.com/docs/deprecations
 * on 2026-10-06:
 *
 *   - `llama-3.3-70b-versatile` (the categorizer's model) — deprecated
 *     2026-08-16. Requests to a shut-down ID return errors; the categorizer was
 *     therefore degrading to the rule layer on every call and saying so, which
 *     is why nobody had noticed. Replacement: `openai/gpt-oss-120b`.
 *   - `meta-llama/llama-4-scout-17b-16e-instruct` (the planned vision model) —
 *     deprecated 2026-07-17. Vision is now served by `qwen/qwen3.8-27b`.
 *
 * Groq retires models on a schedule of months, so the IDs must be data, not
 * code: each one is overridable with an environment variable and the active
 * choice is reported by /api/integrations/status.
 *
 * Everything here is *assistive*. Losing a model degrades the suggestion
 * quality and is reported to the user; it never blocks manual entry.
 */

export const GROQ_CHAT_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_TRANSCRIPTION_ENDPOINT =
  'https://api.groq.com/openai/v1/audio/transcriptions';

function modelFromEnv(name: string, fallback: string): string {
  return (process.env[name] || '').trim() || fallback;
}

/** Text extraction / classification (status → suggestion text). */
export function getTextModel(): string {
  return modelFromEnv('GROQ_TEXT_MODEL', 'openai/gpt-oss-120b');
}

/** Vision model for receipt photos. */
export function getVisionModel(): string {
  return modelFromEnv('GROQ_VISION_MODEL', 'qwen/qwen3.8-27b');
}

/**
 * Speech-to-text. `whisper-large-v3-turbo` is current and multilingual, which
 * matters here: site instructions arrive in Tagalog, English, and the Taglish
 * mixture of both.
 */
export function getTranscriptionModel(): string {
  return modelFromEnv('GROQ_TRANSCRIBE_MODEL', 'whisper-large-v3-turbo');
}

/**
 * Vision fallbacks tried in order if the primary model errors (retired ID,
 * preview withdrawal, rate limit). Kept deliberately short: silently walking a
 * long list of models would make failures slow and confusing.
 *
 * The Llama 4 Scout entry is retained only because it may still answer on
 * committed-spend (enterprise) accounts; on free/developer tiers it returns an
 * error and we move on.
 */
export const VISION_FALLBACK_MODELS = ['meta-llama/llama-4-scout-17b-16e-instruct'];

/**
 * Request limits, from the Groq docs:
 *   - Vision, image passed as a URL: 20 MB per request.
 *   - Vision, image passed as base64: smaller in practice (Groq documents the
 *     20 MB figure for URL inputs; base64 bodies are capped lower). 4 MB of
 *     image bytes is ~5.3 MB of base64 and sits safely inside the documented
 *     URL ceiling while staying well under any body-size limit.
 *   - Receipts bucket: 5 MB per object (storage.objects.file_size_limit).
 * A photo between those two numbers is still storable — it just cannot be sent
 * to the vision model, and the UI says exactly that instead of failing vaguely.
 */
export const VISION_MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Audio: 25 MB on the free tier, 100 MB on the developer tier. */
export const TRANSCRIPTION_MAX_FILE_BYTES = 20 * 1024 * 1024;

export const TRANSCRIPTION_ALLOWED_MIME_TYPES = [
  'audio/flac',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/x-m4a',
  'audio/x-wav',
  'video/webm', // MediaRecorder in some browsers reports webm audio as video/webm
];

/** Whisper's `prompt` parameter is capped at 224 tokens (~180 words). */
export const TRANSCRIPTION_PROMPT_MAX_CHARS = 700;

/**
 * Builds the Whisper context prompt from real firm data so proper nouns and
 * Taglish spellings transcribe correctly.
 *
 * Without this, "Danilo Magpantay" becomes "Daniel Magpante", "JMC Hardware"
 * becomes "JMZ hardware", and a supplier name in the ledger stops matching the
 * vendor memory. The prompt is context only — it is not instructions, and the
 * model cannot be made to invent a value from it.
 */
export function buildTranscriptionPrompt(input: {
  workerNames: string[];
  projectNames: string[];
  vendorNames: string[];
}): string {
  const parts: string[] = [
    'Asinta Architects (Batangas, Philippines) site expense note. Speakers mix Filipino (Tagalog) and English.',
  ];

  const push = (label: string, values: string[]) => {
    const cleaned = values.map((value) => value.trim()).filter(Boolean);
    if (cleaned.length === 0) return;
    parts.push(`${label}: ${cleaned.slice(0, 40).join(', ')}.`);
  };

  push('Workers', input.workerNames);
  push('Projects', input.projectNames);
  push('Suppliers', input.vendorNames);
  parts.push('Transcribe verbatim, including Tagalog numbers and words such as kahapon, kanina, at, bale.');

  // Hard cap: exceeding 224 tokens makes the API reject the request.
  return parts.join(' ').slice(0, TRANSCRIPTION_PROMPT_MAX_CHARS);
}
