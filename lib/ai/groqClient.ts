/**
 * Thin, shared Groq JSON client.
 *
 * One place decides: which endpoint, what the failure looks like, and how a
 * response is turned into JSON. Callers get a discriminated result instead of
 * exceptions, because every caller here degrades rather than fails — the ledger
 * must keep working when the model does not.
 *
 * Nothing in this file reads the ledger or writes to it.
 */

import { GROQ_CHAT_ENDPOINT } from '@/lib/ai/models';

export type GroqJsonResult =
  | { ok: true; parsed: unknown; model: string }
  | { ok: false; reason: string; status?: number; model: string };

export interface GroqJsonRequest {
  model: string;
  system: string;
  /** String for text-only calls; content parts for vision calls. */
  user: string | Array<Record<string, unknown>>;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** Sentinel used by tests and by callers that want no network at all. */
  apiKey?: string;
}

/** Strips anything that looks like a credential from provider error bodies. */
function safeSnippet(body: string): string {
  return body
    .replace(/gsk_[A-Za-z0-9]+/g, '[redacted-key]')
    .replace(/\s+/g, ' ')
    .slice(0, 200);
}

/**
 * Sends one chat completion and parses a JSON object from it.
 *
 * The model is asked for `response_format: json_object`, and the content is
 * still parsed defensively: a truncated or prose-wrapped answer is a normal
 * failure mode and must be reported as one.
 */
export async function requestGroqJson(request: GroqJsonRequest): Promise<GroqJsonResult> {
  const apiKey = request.apiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: 'GROQ_API_KEY is not configured.', model: request.model };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request.timeoutMs ?? 20_000);

  try {
    const response = await fetch(GROQ_CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user },
        ],
        temperature: request.temperature ?? 0.1,
        max_completion_tokens: request.maxTokens ?? 1024,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Never assume the body is readable: a mocked fetch, an aborted response,
      // or a proxy error page can all lack it, and a TypeError here would be
      // reported as "the request failed" instead of the real HTTP status.
      let body = '';
      try {
        body = typeof response.text === 'function' ? await response.text() : '';
      } catch {
        body = '';
      }
      return {
        ok: false,
        status: response.status,
        reason: `Groq returned HTTP ${response.status}${body ? `: ${safeSnippet(body)}` : '.'}`,
        model: request.model,
      };
    }

    const data = await response.json().catch(() => null);
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || !content.trim()) {
      return { ok: false, reason: 'Groq returned an empty response.', model: request.model };
    }

    try {
      return { ok: true, parsed: JSON.parse(content), model: request.model };
    } catch {
      return {
        ok: false,
        reason: 'Groq returned a response that could not be parsed as JSON.',
        model: request.model,
      };
    }
  } catch (caught) {
    const aborted = caught instanceof Error && caught.name === 'AbortError';
    return {
      ok: false,
      reason: aborted
        ? `The Groq request timed out after ${Math.round((request.timeoutMs ?? 20_000) / 1000)}s.`
        : `The Groq request failed: ${caught instanceof Error ? caught.message : 'network error'}.`,
      model: request.model,
    };
  } finally {
    clearTimeout(timeout);
  }
}
