import { describe, expect, it } from 'vitest';
import {
  AUTH_NOTICE_STORAGE_KEY,
  DELIBERATE_LOGOUT_STORAGE_KEY,
  buildAuthNotice,
  authNoticeMessage,
  computeSessionState,
  describeCountdown,
  describeDeadlineReason,
  formatCountdown,
  getSessionPolicy,
  parseAuthNotice,
  type SessionPolicy,
} from '@/lib/auth/session';

const policy: SessionPolicy = {
  idleTimeoutMs: 20 * 60_000,
  absoluteTimeoutMs: 8 * 60 * 60_000,
  warningMs: 2 * 60_000,
};

const MINUTE = 60_000;

describe('session policy from environment', () => {
  it('defaults to 20 minutes idle, 8 hours absolute, 2 minute warning', () => {
    const parsed = getSessionPolicy({});
    expect(parsed.idleTimeoutMs).toBe(20 * MINUTE);
    expect(parsed.absoluteTimeoutMs).toBe(8 * 60 * MINUTE);
    expect(parsed.warningMs).toBe(2 * 60_000);
  });

  it('honours overrides and ignores nonsense values', () => {
    expect(
      getSessionPolicy({
        NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES: '15',
        NEXT_PUBLIC_SESSION_ABSOLUTE_TIMEOUT_HOURS: '4',
      })
    ).toMatchObject({ idleTimeoutMs: 15 * MINUTE, absoluteTimeoutMs: 4 * 60 * MINUTE });

    expect(
      getSessionPolicy({
        NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES: 'zero',
      }).idleTimeoutMs
    ).toBe(20 * MINUTE);
  });

  it('never lets the warning exceed the idle window (which would warn on load)', () => {
    const parsed = getSessionPolicy({
      NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES: '1',
      NEXT_PUBLIC_SESSION_WARNING_SECONDS: '600',
    });
    expect(parsed.warningMs).toBeLessThan(parsed.idleTimeoutMs);
  });
});

describe('session clock', () => {
  const base = {
    sessionStartedAt: 1_000_000,
    policy,
  };

  it('stays quiet while there is plenty of time', () => {
    const state = computeSessionState({ ...base, lastActivityAt: 1_000_000, now: 1_000_000 + 5 * MINUTE });
    expect(state.shouldWarn).toBe(false);
    expect(state.hasExpired).toBe(false);
    expect(state.limitingFactor).toBe('idle');
  });

  it('warns inside the final two minutes and counts down', () => {
    const now = 1_000_000 + 19 * MINUTE;
    const state = computeSessionState({ ...base, lastActivityAt: 1_000_000, now });
    expect(state.shouldWarn).toBe(true);
    expect(state.hasExpired).toBe(false);
    expect(state.msUntilLogout).toBe(MINUTE);
  });

  it('expires at the idle deadline', () => {
    const state = computeSessionState({
      ...base,
      lastActivityAt: 1_000_000,
      now: 1_000_000 + 20 * MINUTE,
    });
    expect(state.hasExpired).toBe(true);
    expect(state.msUntilLogout).toBe(0);
    expect(state.limitingFactor).toBe('idle');
  });

  it('ends by absolute time even with continuous activity', () => {
    const sessionStartedAt = 0;
    const now = 8 * 60 * MINUTE; // 8 hours in, active one second ago
    const state = computeSessionState({
      lastActivityAt: now - 1_000,
      sessionStartedAt,
      now,
      policy,
    });
    expect(state.hasExpired).toBe(true);
    expect(state.limitingFactor).toBe('absolute');
  });

  it('reports the absolute limit as the driver when it comes first', () => {
    // 7h59m into the session, active a minute ago: idle would not fire until
    // 8h19m, but the 8-hour cap lands first, so `absolute` is what ends it.
    const now = 8 * 60 * MINUTE - MINUTE;
    const state = computeSessionState({
      lastActivityAt: now - MINUTE,
      sessionStartedAt: 0,
      now,
      policy,
    });
    expect(state.absoluteDeadline).toBe(8 * 60 * MINUTE);
    expect(state.idleDeadline).toBeGreaterThan(state.absoluteDeadline);
    expect(state.limitingFactor).toBe('absolute');
    // Two-minute warning is up (1 minute left).
    expect(state.shouldWarn).toBe(true);
    expect(state.msUntilLogout).toBe(MINUTE);
  });

  it('survives a laptop closed for hours: an old timestamp simply expires', () => {
    const state = computeSessionState({
      ...base,
      lastActivityAt: 1_000_000,
      now: 1_000_000 + 6 * 60 * MINUTE,
    });
    expect(state.hasExpired).toBe(true);
  });
});

describe('countdown formatting', () => {
  it('rounds UP so the display never promises more time than remains', () => {
    expect(formatCountdown(119_400)).toBe('2:00');
    expect(formatCountdown(60_000)).toBe('1:00');
    expect(formatCountdown(9_000)).toBe('0:09');
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(-5)).toBe('0:00');
  });

  it('speaks the countdown for screen readers instead of "one colon fifty-nine"', () => {
    expect(describeCountdown(119_000)).toBe('1 minute and 59 seconds');
    expect(describeCountdown(60_000)).toBe('1 minute');
    expect(describeCountdown(2_000)).toBe('2 seconds');
    expect(describeCountdown(0)).toBe('signed out now');
  });

  it('names the limit that is ending the session', () => {
    expect(describeDeadlineReason('idle')).toMatch(/no activity/i);
    expect(describeDeadlineReason('absolute')).toMatch(/maximum length/i);
  });
});

describe('sign-out notice', () => {
  it('round-trips through storage', () => {
    const notice = buildAuthNotice('idle_timeout', new Date('2026-10-06T02:00:00Z'));
    expect(parseAuthNotice(JSON.stringify(notice))).toEqual(notice);
  });

  it('ignores malformed or unrecognised payloads instead of claiming something happened', () => {
    expect(parseAuthNotice(null)).toBeNull();
    expect(parseAuthNotice('not json')).toBeNull();
    expect(parseAuthNotice(JSON.stringify({ code: 'surprise' }))).toBeNull();
  });

  it('explains each reason in plain language', () => {
    expect(authNoticeMessage('idle_timeout')).toMatch(/signed out after inactivity/i);
    expect(authNoticeMessage('absolute_timeout')).toMatch(/maximum length/i);
    expect(authNoticeMessage('server_ended_session')).toMatch(/session ended at the server/i);
  });

  it('uses distinct, namespaced storage keys for the notice and the deliberate-logout flag', () => {
    expect(AUTH_NOTICE_STORAGE_KEY).toBe('bale.auth.notice');
    expect(DELIBERATE_LOGOUT_STORAGE_KEY).toBe('bale.auth.deliberate_logout');
  });
});
