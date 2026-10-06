'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, LogOut, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/authContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  ACTIVITY_EVENTS,
  ACTIVITY_THROTTLE_MS,
  AUTH_NOTICE_STORAGE_KEY,
  DELIBERATE_LOGOUT_STORAGE_KEY,
  buildAuthNotice,
  computeSessionState,
  describeCountdown,
  describeDeadlineReason,
  formatCountdown,
  getSessionPolicy,
  type AuthNoticeCode,
  type SessionClockState,
} from '@/lib/auth/session';

/**
 * "Are you still there?" — the client half of the session timeout.
 *
 * Supabase enforces the timeout when it refuses to refresh the token; it does
 * not warn anyone first. This component watches the same two clocks locally so
 * a Founder is told two minutes ahead, can extend the session with one click,
 * and — if they walk away — gets an honest "you were signed out after
 * inactivity" message instead of a silent bounce to the login form.
 *
 * Correctness notes that matter more than they look:
 *   - Every check recomputes from wall-clock timestamps. Timers do not fire
 *     while a laptop is suspended and are throttled to about once a minute in
 *     background tabs, so a timer-only implementation would miss the deadline
 *     entirely; `visibilitychange` forces an immediate recompute on wake-up.
 *   - Activity listeners are throttled (ACTIVITY_THROTTLE_MS) and only observe
 *     intentional events (see ACTIVITY_EVENTS). Continuous movement is not
 *     "activity" for the purpose of an inactivity timeout.
 *   - The dialog cannot be dismissed by clicking outside
 *     (`dismissOnBackdrop={false}`) and the countdown is announced politely in
 *     words as well as drawn as `m:ss`.
 *   - Client clocks start fresh on reload while the server's clock keeps
 *     running. The server can therefore expire a session before the local
 *     countdown reaches zero — that case is handled explicitly (the extend
 *     button fails and we say so) rather than being papered over.
 */

/** Recompute cadence: seconds while the warning is up (countdown), else slower. */
const ACTIVE_TICK_MS = 1_000;
const IDLE_TICK_MS = 10_000;

export const SessionWatcher: React.FC = () => {
  const supabase = useMemo(() => createClient(), []);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const policy = useMemo(() => getSessionPolicy(), []);
  const [clock, setClock] = useState<SessionClockState | null>(null);
  const [isExtending, setIsExtending] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());
  const sessionStartedRef = useRef<number>(Date.now());
  const lastRecordedActivityRef = useRef<number>(0);
  /** Guards against a timer and an event both trying to end the session. */
  const endedRef = useRef(false);
  /** Always points at the newest tick closure, so listeners never go stale. */
  const tickRef = useRef<() => void>(() => {});

  const leaveNotice = useCallback((code: AuthNoticeCode) => {
    try {
      window.sessionStorage.setItem(AUTH_NOTICE_STORAGE_KEY, JSON.stringify(buildAuthNotice(code)));
    } catch {
      // Storage can be unavailable (private mode / blocked storage). The login
      // page then shows no notice — it degrades to the previous behaviour and
      // never claims something happened that we could not record.
    }
  }, []);

  const endSession = useCallback(
    async (code: AuthNoticeCode) => {
      if (endedRef.current) return;
      endedRef.current = true;
      setIsSigningOut(true);
      leaveNotice(code);
      try {
        await supabase.auth.signOut();
      } catch {
        // A session the server already invalidated can fail to sign out; clear
        // the local half so the tab cannot keep rendering stale data.
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // Middleware refuses the session on the next request anyway.
        }
      }
      router.replace('/');
    },
    [leaveNotice, router, supabase]
  );

  /** Recompute from wall clock; warn, or end the session when it is over. */
  const tick = useCallback(() => {
    if (!user || endedRef.current) return;
    const now = Date.now();
    const state = computeSessionState({
      lastActivityAt: lastActivityRef.current,
      sessionStartedAt: sessionStartedRef.current,
      now,
      policy,
    });
    setClock(state);

    if (state.hasExpired) {
      void endSession(state.limitingFactor === 'absolute' ? 'absolute_timeout' : 'idle_timeout');
    }
  }, [endSession, policy, user]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  // Clocks start when a session appears (and reset if the user changes).
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      endedRef.current = false;
      setClock(null);
      return;
    }
    const now = Date.now();
    lastActivityRef.current = now;
    sessionStartedRef.current = now;
    lastRecordedActivityRef.current = 0;
    endedRef.current = false;
    setExtendError(null);
    tickRef.current();
  }, [isLoading, user]);

  // Activity listeners (throttled) + wake-up recompute.
  useEffect(() => {
    if (!user || isLoading) return;

    const noteActivity = () => {
      const now = Date.now();
      // Throttle: these events can fire continuously, and React state updates
      // per keystroke would be pure overhead.
      if (now - lastRecordedActivityRef.current < ACTIVITY_THROTTLE_MS) return;
      lastRecordedActivityRef.current = now;
      lastActivityRef.current = now;
      tickRef.current();
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, noteActivity, { passive: true })
    );

    const handleWake = () => {
      // Recompute immediately rather than waiting for the next tick: this is
      // the "laptop was closed for an hour" path.
      tickRef.current();
    };
    document.addEventListener('visibilitychange', handleWake);
    window.addEventListener('focus', handleWake);
    window.addEventListener('online', handleWake);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, noteActivity));
      document.removeEventListener('visibilitychange', handleWake);
      window.removeEventListener('focus', handleWake);
      window.removeEventListener('online', handleWake);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading]);

  // The tick loop. Faster while the warning is on screen so the countdown moves.
  useEffect(() => {
    if (!user || isLoading) return;
    tick();
    const interval = window.setInterval(tick, clock?.shouldWarn ? ACTIVE_TICK_MS : IDLE_TICK_MS);
    return () => window.clearInterval(interval);
  }, [clock?.shouldWarn, isLoading, tick, user]);

  // Supabase also ends sessions server-side (idle timeout at refresh, revoked
  // session, expired refresh token). Leave an honest notice — unless the Founder
  // clicked Sign out themselves.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_OUT' || endedRef.current) return;

      let deliberate = false;
      try {
        deliberate = window.sessionStorage.getItem(DELIBERATE_LOGOUT_STORAGE_KEY) === '1';
        window.sessionStorage.removeItem(DELIBERATE_LOGOUT_STORAGE_KEY);
      } catch {
        // Treat storage failure as "not deliberate" only if a session existed;
        // an unnecessary notice is less harmful than a mysterious bounce.
      }
      if (deliberate) return;

      const state = computeSessionState({
        lastActivityAt: lastActivityRef.current,
        sessionStartedAt: sessionStartedRef.current,
        now: Date.now(),
        policy,
      });
      leaveNotice(
        state.hasExpired
          ? state.limitingFactor === 'absolute'
            ? 'absolute_timeout'
            : 'idle_timeout'
          : 'server_ended_session'
      );
    });

    return () => subscription.unsubscribe();
  }, [leaveNotice, policy, supabase]);

  const handleStaySignedIn = async () => {
    setIsExtending(true);
    setExtendError(null);

    // Slow network: the server may have dropped the session while the dialog
    // sat there. A hard timeout keeps the button honest instead of spinning.
    const timeout = new Promise<{ timedOut: true }>((resolve) =>
      window.setTimeout(() => resolve({ timedOut: true }), 10_000)
    );

    try {
      const outcome = await Promise.race([supabase.auth.refreshSession(), timeout]);
      if ('timedOut' in outcome) {
        setExtendError(
          'The authentication server did not respond within 10 seconds. You will be signed out when the timer reaches zero — reopen BALE after signing in again if this keeps happening.'
        );
        return;
      }

      if (outcome.error) {
        // The server already ended it (usually the clock ran out while the tab
        // was throttled). Say so plainly instead of pretending we extended it.
        await endSession('server_ended_session');
        return;
      }

      const now = Date.now();
      lastActivityRef.current = now;
      lastRecordedActivityRef.current = now;
      setClock(
        computeSessionState({
          lastActivityAt: now,
          sessionStartedAt: sessionStartedRef.current,
          now,
          policy,
        })
      );
    } catch (caught) {
      setExtendError(
        caught instanceof Error
          ? `Could not reach the authentication server: ${caught.message}. You will be signed out when the timer reaches zero.`
          : 'Could not reach the authentication server. You will be signed out when the timer reaches zero.'
      );
    } finally {
      setIsExtending(false);
    }
  };

  const handleSignOutNow = () => {
    void endSession(clock?.limitingFactor === 'absolute' ? 'absolute_timeout' : 'idle_timeout');
  };

  if (!user || !clock?.shouldWarn) return null;

  const remaining = formatCountdown(clock.msUntilLogout);
  const spoken = describeCountdown(clock.msUntilLogout);
  const reason = describeDeadlineReason(clock.limitingFactor);

  return (
    <Modal
      isOpen
      onClose={handleSignOutNow}
      title="Still there? Your session is about to end"
      description="Nothing already saved is lost — BALE records every write as you make it. Unfinished form entries are not saved."
      // No accidental escape routes: an outside click, Escape, or the header
      // close button must never decide whether a session continues. The two
      // explicit buttons below are the only exits.
      role="alertdialog"
      dismissOnBackdrop={false}
      dismissOnEscape={false}
      showCloseButton={false}
      maxWidth="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-status-warning/20 bg-status-warning-bg p-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-status-warning" aria-hidden="true" />
          <div className="text-xs text-navy">
            <p className="font-semibold">{reason}</p>
            <p className="mt-1 text-ink-secondary">
              BALE closes idle sessions to protect payroll, billing and client data. You will be
              signed out and returned to the sign-in page.
            </p>
          </div>
        </div>

        <div
          className="rounded-2xl border border-surface-border bg-surface-inset p-4 text-center"
          role="timer"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">
            Time remaining
          </div>
          {/* Visual countdown, hidden from the accessibility tree… */}
          <div aria-hidden="true" className="mt-1 font-mono text-3xl font-extrabold text-navy">
            {remaining}
          </div>
          {/* …because this is the announcement: "1:59" is not read reliably. */}
          <div className="sr-only">{`Your session ends in ${spoken}.`}</div>
        </div>

        {extendError && (
          <p className="rounded-xl border border-status-danger/20 bg-status-danger-bg p-3 text-[11px] text-status-danger">
            {extendError}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={handleSignOutNow}
            disabled={isExtending || isSigningOut}
            leftIcon={<LogOut className="h-4 w-4" />}
          >
            Sign out now
          </Button>
          <Button
            variant="primary"
            onClick={handleStaySignedIn}
            isLoading={isExtending}
            disabled={isSigningOut}
            leftIcon={<ShieldCheck className="h-4 w-4" />}
          >
            Stay signed in
          </Button>
        </div>

        <p className="text-center text-[10px] text-ink-muted">
          If you are not at this device, choose “Sign out now”.
        </p>
      </div>
    </Modal>
  );
};
