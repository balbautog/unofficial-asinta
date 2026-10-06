'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { MfaCard } from '@/components/auth/MfaCard';
import { Button } from '@/components/ui/Button';
import { ShieldAlert } from 'lucide-react';

/**
 * Founder MFA gate.
 *
 * Middleware sends a Founder here when `MFA_ENFORCE_FOUNDERS=true` and the
 * session is not at aal2 — either because a verified factor exists and has not
 * been challenged, or because no factor is enrolled yet (in which case the card
 * below offers enrolment). It is deliberately not a dead end: the rules are
 * spelled out and the way forward is on the page.
 */
export default function MfaPage() {
  return (
    <AppShell requireFounder>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b border-surface-border/60 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-navy">
              Account Security
            </span>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
              Two-factor verification required
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-ink-secondary">
              Founder accounts can approve payroll, record payments and release advances. Firm
              policy requires an authenticator app on top of your password before those actions are
              available.
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="secondary" size="sm" leftIcon={<ShieldAlert className="w-3.5 h-3.5" />}>
              Back to dashboard
            </Button>
          </Link>
        </div>

        <MfaCard emphasiseEnforcement />

        <div className="rounded-2xl border border-surface-border bg-surface-inset p-4 text-[11px] leading-relaxed text-ink-secondary">
          <p className="font-semibold text-navy">What happens next</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>Enrol an authenticator app and verify the 6-digit code.</li>
            <li>
              Founder pages and Founder API actions unlock for this session; the code is asked for
              again at each new sign-in.
            </li>
            <li>
              Lost the device? An administrator removes the factor from the Supabase dashboard and
              you enrol again — nobody can bypass the prompt from inside BALE.
            </li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
