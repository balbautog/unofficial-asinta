import { afterEach, describe, expect, it } from 'vitest';
import {
  RATE_LIMITS,
  SlidingWindowRateLimiter,
  checkRateLimit,
  getClientAddress,
  getRateLimitIdentity,
  rateLimitHeaders,
  rateLimitMessage,
  resetRateLimits,
} from '@/lib/rateLimit';

afterEach(() => {
  resetRateLimits();
});

describe('sliding-window rate limiter', () => {
  it('allows requests up to the limit and refuses the next one', () => {
    const limiter = new SlidingWindowRateLimiter();
    const rule = { limit: 3, windowMs: 60_000 };

    expect(limiter.check('k', rule, 1_000).allowed).toBe(true);
    expect(limiter.check('k', rule, 1_001).allowed).toBe(true);
    expect(limiter.check('k', rule, 1_002).allowed).toBe(true);

    const refused = limiter.check('k', rule, 1_003);
    expect(refused.allowed).toBe(false);
    expect(refused.remaining).toBe(0);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('reports the true wait time, not a rounded-down one', () => {
    const limiter = new SlidingWindowRateLimiter();
    const rule = { limit: 1, windowMs: 10_000 };

    limiter.check('k', rule, 0);
    // 9.2s left → must round UP so the caller does not retry too early.
    const refused = limiter.check('k', rule, 800);
    expect(refused.retryAfterSeconds).toBe(10);
  });

  it('slides: capacity returns as old hits age out', () => {
    const limiter = new SlidingWindowRateLimiter();
    const rule = { limit: 2, windowMs: 1_000 };

    limiter.check('k', rule, 0);
    limiter.check('k', rule, 500);
    expect(limiter.check('k', rule, 900).allowed).toBe(false);

    // The first hit (t=0) has aged out by t=1001.
    expect(limiter.check('k', rule, 1_001).allowed).toBe(true);
  });

  it('keeps counters independent per key', () => {
    const limiter = new SlidingWindowRateLimiter();
    const rule = { limit: 1, windowMs: 60_000 };

    expect(limiter.check('founder-a', rule, 0).allowed).toBe(true);
    expect(limiter.check('founder-b', rule, 0).allowed).toBe(true);
    expect(limiter.check('founder-a', rule, 0).allowed).toBe(false);
  });

  it('caps tracked keys so a hostile client cannot grow memory without bound', () => {
    const limiter = new SlidingWindowRateLimiter(50);
    for (let i = 0; i < 500; i += 1) {
      // Each key is used once, then a sweep runs on the next window boundary.
      limiter.check(`key-${i}`, { limit: 5, windowMs: 1 }, i * 10);
    }
    expect(limiter.trackedKeyCount).toBeLessThanOrEqual(50);
  });
});

describe('route limits', () => {
  it('names a limit for every cost-bearing route', () => {
    expect(Object.keys(RATE_LIMITS)).toEqual(
      expect.arrayContaining(['smsSend', 'emailTest', 'emailSend', 'aiSuggest', 'aiExtract'])
    );
  });

  it('keeps SMS the tightest limit — each message is billed', () => {
    expect(RATE_LIMITS.smsSend.limit).toBeLessThan(RATE_LIMITS.emailSend.limit);
  });

  it('applies the limit per identity and returns retry headers', () => {
    const rule = RATE_LIMITS.aiSuggest;
    for (let i = 0; i < rule.limit; i += 1) {
      expect(checkRateLimit('aiSuggest', 'user:abc', 0).allowed).toBe(true);
    }

    const decision = checkRateLimit('aiSuggest', 'user:abc', 0);
    expect(decision.allowed).toBe(false);

    const headers = rateLimitHeaders('aiSuggest', decision);
    expect(Number(headers['Retry-After'])).toBeGreaterThan(0);
    expect(headers['X-RateLimit-Limit']).toBe(String(rule.limit));
    expect(headers['X-RateLimit-Remaining']).toBe('0');
  });

  it('states the retry delay in the message instead of "something went wrong"', () => {
    const decision = { allowed: false, remaining: 0, retryAfterSeconds: 120 };
    const message = rateLimitMessage('smsSend', decision);
    expect(message).toMatch(/too many requests/i);
    expect(message).toMatch(/2 minutes/);
    expect(message).toMatch(/limit: 15/);
  });
});

describe('caller identity', () => {
  it('prefers the authenticated user id over the client address', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' });
    expect(getRateLimitIdentity(headers, 'user-123')).toBe('user:user-123');
    expect(getRateLimitIdentity(headers, null)).toBe('ip:203.0.113.9');
  });

  it('falls back to a stable placeholder when no address is present', () => {
    expect(getClientAddress(new Headers())).toBe('unknown');
  });
});
