/**
 * Founder MFA (TOTP) helpers.
 *
 * Supabase Auth implements TOTP natively: a verified factor upgrades a session
 * from aal1 (password only) to aal2 (password + one-time code). This module
 * holds the policy decisions so the middleware, the API routes, the login page
 * and the settings card cannot disagree with each other.
 *
 * ENFORCEMENT IS OPT-IN, ON PURPOSE
 * ---------------------------------
 * `MFA_ENFORCE_FOUNDERS=false` (default): enrolment and verification are
 * available and the login flow challenges an enrolled Founder, but a Founder
 * without a factor is not locked out.
 * `MFA_ENFORCE_FOUNDERS=true`: founder-only routes and founder-only API routes
 * refuse a session that is not at aal2, and the user is sent to /mfa to enrol.
 *
 * The flag exists because turning enforcement on BEFORE both founders have
 * enrolled would lock the firm out of its own books, and the fault would be
 * ours. The upgrade path is: enrol → verify → set the flag → redeploy.
 */

/** Server-side flag. Read on the server only; enforcement is server-side. */
export const MFA_ENFORCEMENT_ENV = 'MFA_ENFORCE_FOUNDERS';

export function isMfaEnforcementEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  return (env[MFA_ENFORCEMENT_ENV] || 'false').trim().toLowerCase() === 'true';
}

export type AssuranceLevel = 'aal1' | 'aal2' | null;

export interface TotpFactorLike {
  id: string;
  friendly_name?: string | null;
  factor_type?: string;
  status?: string;
}

export interface TotpFactorSummary {
  id: string;
  friendlyName: string;
  /** 'verified' factors can be challenged; 'unverified' ones are abandoned enrolments. */
  verified: boolean;
}

/** Shapes the Supabase factor list for display without leaking library types. */
export function summarizeTotpFactors(factors: TotpFactorLike[] | null | undefined): TotpFactorSummary[] {
  if (!Array.isArray(factors)) return [];
  return factors
    .filter((factor) => (factor?.factor_type ?? 'totp') === 'totp')
    .map((factor) => ({
      id: factor.id,
      friendlyName: (factor.friendly_name || '').trim() || 'Authenticator app',
      verified: factor.status === 'verified',
    }));
}

export interface MfaRequirementInput {
  enforce: boolean;
  role: 'founder' | 'supervisor' | string | null | undefined;
  /** Current assurance level of the session. */
  currentLevel: AssuranceLevel;
  /** The level the session COULD reach — 'aal2' means a verified factor exists. */
  nextLevel: AssuranceLevel;
  factors?: TotpFactorLike[] | null;
}

export interface MfaRequirement {
  /** Enforcement is on and this account is in scope. */
  enforced: boolean;
  /** A verified factor exists and the session is still at aal1. */
  needsChallenge: boolean;
  /** Enforcement is on, in scope, and there is no verified factor. */
  needsEnrollment: boolean;
  /** The session satisfies the policy. */
  satisfied: boolean;
  /** Human-readable reason, safe to log or show. */
  explanation: string;
}

/**
 * Single decision point for "what does this session need?".
 *
 * `needsChallenge` is true whenever a verified factor exists and the session is
 * only aal1 — even with enforcement off. An enrolled Founder should always be
 * asked for the code; anything else would silently ignore the factor they set
 * up.
 */
export function resolveMfaRequirement(input: MfaRequirementInput): MfaRequirement {
  const { enforce, role, currentLevel, nextLevel, factors } = input;

  const inScope = role === 'founder';
  const enforced = enforce && inScope;
  const atAal2 = currentLevel === 'aal2';
  const hasVerifiedFactor =
    nextLevel === 'aal2' || summarizeTotpFactors(factors ?? []).some((factor) => factor.verified);

  if (!inScope) {
    return {
      enforced: false,
      needsChallenge: false,
      needsEnrollment: false,
      satisfied: true,
      explanation: 'MFA enforcement applies to Founder accounts only.',
    };
  }

  if (atAal2) {
    return {
      enforced,
      needsChallenge: false,
      needsEnrollment: false,
      satisfied: true,
      explanation: 'This session is verified with a second factor (aal2).',
    };
  }

  if (hasVerifiedFactor) {
    return {
      enforced,
      needsChallenge: true,
      needsEnrollment: false,
      satisfied: false,
      explanation: 'A verified authenticator factor exists; this session needs its one-time code.',
    };
  }

  return {
    enforced,
    needsChallenge: false,
    needsEnrollment: enforced,
    satisfied: !enforced,
    explanation: enforced
      ? 'MFA enforcement is enabled and this Founder has no verified authenticator factor yet.'
      : 'No authenticator factor is enrolled. Enrolment is available but not required.',
  };
}

/** Accepts "123 456" / "123-456" and returns "123456", or null when invalid. */
export function normalizeTotpCode(raw: string | null | undefined): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  return digits.length === 6 ? digits : null;
}

/** Maps Supabase MFA errors to messages a Founder can act on. */
export function friendlyMfaError(message: string | undefined | null): string {
  const text = (message || '').toLowerCase();
  if (!text) return 'The verification request failed. Enter the current 6-digit code and try again.';
  if (text.includes('invalid') && (text.includes('code') || text.includes('totp'))) {
    return 'That code is not valid. Codes change every 30 seconds — enter the current one.';
  }
  if (text.includes('expired')) {
    return 'That challenge expired. Request a new code and try again within 30 seconds.';
  }
  if (text.includes('mfa') && (text.includes('not enabled') || text.includes('disabled'))) {
    return 'TOTP MFA is not enabled on this Supabase project. Enable it in Authentication → Multi-Factor Authentication, then try again.';
  }
  if (text.includes('aal2') || text.includes('assurance')) {
    return 'This action needs a session verified with your authenticator app. Verify your code first.';
  }
  if (text.includes('failed to fetch') || text.includes('network')) {
    return 'Cannot reach the Supabase authentication server. Check your connection and try again.';
  }
  return message as string;
}

/** Shared copy so every surface explains MFA the same way. */
export const MFA_HELP_TEXT = {
  whatItIs:
    'A time-based one-time passcode (TOTP) from an authenticator app such as Google Authenticator, Authy, or 1Password.',
  whyItMatters:
    'Founder accounts can approve payroll, record payments, release advances and send client reminders. A stolen password alone should not be enough to move money.',
  recovery:
    'If you lose the device, an administrator must remove the factor from the Supabase dashboard (Authentication → Users → select the user → Factors) and you enrol again.',
} as const;
