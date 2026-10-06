'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import {
  MFA_HELP_TEXT,
  friendlyMfaError,
  normalizeTotpCode,
  summarizeTotpFactors,
  type TotpFactorSummary,
} from '@/lib/auth/mfa';
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';

/**
 * Real TOTP enrolment / verification for Founder accounts.
 *
 * The previous version of this card was a toggle that flipped React state and
 * changed nothing — the UI claimed MFA was on while no factor existed. This
 * card talks to Supabase Auth for real and reports exactly what the server
 * says, including the "MFA is not enabled on this project" case.
 */

interface EnrollmentState {
  factorId: string;
  /** SVG data URI from Supabase (rendered as an <img>). */
  qrCode: string;
  secret: string;
}

interface MfaCardProps {
  /** Render the challenge first: used by /mfa when enforcement is on. */
  emphasiseEnforcement?: boolean;
}

export const MfaCard: React.FC<MfaCardProps> = ({ emphasiseEnforcement = false }) => {
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [factors, setFactors] = useState<TotpFactorSummary[]>([]);
  const [assurance, setAssurance] = useState<{ current: string | null; next: string | null }>({
    current: null,
    next: null,
  });
  const [loadError, setLoadError] = useState<string | null>(null);

  const [enrollment, setEnrollment] = useState<EnrollmentState | null>(null);
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshFactors = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [{ data: factorData, error: factorError }, { data: aal }] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);

      if (factorError) {
        setLoadError(friendlyMfaError(factorError.message));
        return;
      }

      setFactors(summarizeTotpFactors((factorData?.totp ?? []) as any));
      setAssurance({ current: aal?.currentLevel ?? null, next: aal?.nextLevel ?? null });
    } catch (caught) {
      setLoadError(
        caught instanceof Error
          ? `Could not load authenticator factors: ${caught.message}`
          : 'Could not load authenticator factors.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void refreshFactors();
  }, [refreshFactors]);

  const handleEnroll = async () => {
    setIsEnrolling(true);
    setActionError(null);
    setStatusMessage(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `BALE authenticator (${new Date().toISOString().slice(0, 10)})`,
      });

      if (error || !data) {
        setActionError(friendlyMfaError(error?.message));
        return;
      }

      // An abandoned enrolment stays 'unverified' forever; remove it so the
      // factor list does not collect ghosts.
      const abandoned = factors.filter((factor) => !factor.verified);
      for (const factor of abandoned) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id }).catch(() => undefined);
      }

      setEnrollment({
        factorId: data.id,
        qrCode: (data.totp as any)?.qr_code ?? '',
        secret: (data.totp as any)?.secret ?? '',
      });
      setCode('');
    } catch (caught) {
      setActionError(
        caught instanceof Error ? friendlyMfaError(caught.message) : 'Enrolment could not be started.'
      );
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = normalizeTotpCode(code);
    if (!normalized) {
      setActionError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    if (!enrollment) return;

    setIsVerifying(true);
    setActionError(null);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollment.factorId,
        code: normalized,
      });

      if (error) {
        setActionError(friendlyMfaError(error.message));
        return;
      }

      setEnrollment(null);
      setCode('');
      setStatusMessage(
        'Authenticator verified. This session now requires the 6-digit code, and your next sign-in will ask for it too.'
      );
      await refreshFactors();
    } catch (caught) {
      setActionError(caught instanceof Error ? friendlyMfaError(caught.message) : 'Verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemove = async (factor: TotpFactorSummary) => {
    setIsRemoving(factor.id);
    setActionError(null);
    setStatusMessage(null);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) {
        setActionError(friendlyMfaError(error.message));
        return;
      }
      setStatusMessage(
        `Removed “${factor.friendlyName}”. Sign-in will no longer ask for a code until a new factor is verified.`
      );
      await refreshFactors();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? friendlyMfaError(caught.message) : 'The factor could not be removed.'
      );
    } finally {
      setIsRemoving(null);
    }
  };

  const verifiedFactors = factors.filter((factor) => factor.verified);
  const hasVerifiedFactor = verifiedFactors.length > 0;
  const sessionVerified = assurance.current === 'aal2';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2.5">
          <ShieldCheck className="w-5 h-5 text-navy" />
          <CardTitle>Two-Factor Authentication (TOTP)</CardTitle>
        </div>
        <CardDescription>
          Authenticator-app codes for Founder accounts. Enforced by Supabase Auth, not by this screen.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 text-xs">
        {emphasiseEnforcement && !sessionVerified && (
          <div className="p-3 rounded-xl bg-status-warning-bg border border-status-warning/20 text-status-warning flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {hasVerifiedFactor
                ? 'Your session needs a one-time code before you can use Founder pages.'
                : 'This firm requires a second factor for Founder accounts. Enrol an authenticator app to continue.'}
            </span>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-ink-secondary">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking authenticator factors with Supabase…
          </div>
        )}

        {loadError && (
          <div className="p-3 rounded-xl bg-status-danger-bg border border-status-danger/20 text-status-danger">
            {loadError}
          </div>
        )}

        {statusMessage && (
          <div className="p-3 rounded-xl bg-status-success-bg border border-status-success/20 text-status-success flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{statusMessage}</span>
          </div>
        )}

        {actionError && (
          <div className="p-3 rounded-xl bg-status-danger-bg border border-status-danger/20 text-status-danger">
            {actionError}
          </div>
        )}

        {!isLoading && !loadError && (
          <>
            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-surface-inset/60 border border-surface-border">
              <div className="space-y-0.5">
                <div className="font-bold text-navy flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-navy" />
                  {hasVerifiedFactor ? 'Authenticator enrolled' : 'No authenticator enrolled'}
                </div>
                <div className="text-ink-secondary">
                  {hasVerifiedFactor
                    ? verifiedFactors.map((factor) => factor.friendlyName).join(', ')
                    : 'Anyone with the password alone can reach payroll and billing.'}
                </div>
              </div>
              <Badge variant={hasVerifiedFactor ? 'success' : 'warning'} size="sm">
                {hasVerifiedFactor ? 'Enrolled' : 'Not enrolled'}
              </Badge>
            </div>

            {hasVerifiedFactor && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-surface-border">
                <span className="text-ink-secondary">
                  Current session:{' '}
                  <span className="font-semibold text-navy">
                    {sessionVerified ? 'verified with a second factor (aal2)' : 'password only (aal1)'}
                  </span>
                </span>
                <Badge variant={sessionVerified ? 'success' : 'warning'} size="sm">
                  {sessionVerified ? 'aal2' : 'aal1'}
                </Badge>
              </div>
            )}

            {verifiedFactors.length > 0 && (
              <ul className="space-y-2">
                {verifiedFactors.map((factor) => (
                  <li
                    key={factor.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-surface-border"
                  >
                    <span className="font-semibold text-navy">{factor.friendlyName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(factor)}
                      isLoading={isRemoving === factor.id}
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {enrollment ? (
              <form onSubmit={handleVerify} className="space-y-3 p-4 rounded-2xl bg-white border border-surface-border">
                <div className="font-bold text-navy flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  Scan, then confirm the code
                </div>
                {enrollment.qrCode && (
                  // Supabase returns an SVG data URI; CSP allows data: images.
                  <img
                    src={enrollment.qrCode}
                    alt="Authenticator enrolment QR code"
                    className="w-40 h-40 mx-auto rounded-xl border border-surface-border bg-white p-2"
                  />
                )}
                <div className="text-ink-secondary">
                  Can’t scan? Enter this key manually in your authenticator app:
                  <div className="mt-1 font-mono text-[11px] break-all p-2 rounded-xl bg-surface-inset border border-surface-border text-navy">
                    {enrollment.secret}
                  </div>
                </div>
                <Input
                  label="6-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  required
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEnrollment(null);
                      setCode('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={isVerifying}>
                    Verify &amp; enable
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                variant={emphasiseEnforcement && !sessionVerified ? 'primary' : 'secondary'}
                onClick={handleEnroll}
                isLoading={isEnrolling}
                leftIcon={<Smartphone className="w-4 h-4" />}
              >
                {hasVerifiedFactor ? 'Add another authenticator' : 'Enrol authenticator app'}
              </Button>
            )}

            <p className="text-[11px] text-ink-muted leading-relaxed">
              {MFA_HELP_TEXT.whatItIs} {MFA_HELP_TEXT.whyItMatters} {MFA_HELP_TEXT.recovery}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
