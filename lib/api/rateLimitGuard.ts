import { NextResponse } from 'next/server';
import {
  checkRateLimit,
  getRateLimitIdentity,
  rateLimitHeaders,
  rateLimitMessage,
  type RateLimitName,
} from '@/lib/rateLimit';

/**
 * Route-handler guard for cost-bearing endpoints.
 *
 * Usage (after authentication, so the key can be the Founder's user id):
 *
 *   const limited = enforceRateLimit('smsSend', req.headers, founder.userId);
 *   if (limited) return limited;
 *
 * Returns null when the request is within budget. The 429 body states the
 * limit, the window, and when to retry — a Founder should never have to guess
 * why a send was refused.
 */
export function enforceRateLimit(
  name: RateLimitName,
  headers: Headers,
  userId?: string | null
): NextResponse | null {
  const identity = getRateLimitIdentity(headers, userId);
  const decision = checkRateLimit(name, identity);
  const responseHeaders = rateLimitHeaders(name, decision);

  if (!decision.allowed) {
    return NextResponse.json(
      {
        error: rateLimitMessage(name, decision),
        rateLimited: true,
        retryAfterSeconds: decision.retryAfterSeconds,
      },
      { status: 429, headers: { ...responseHeaders, 'Cache-Control': 'no-store' } }
    );
  }

  return null;
}
