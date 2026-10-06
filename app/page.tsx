'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth/authContext';
import { canRoleAccessPath, getSafeRedirectPath, type AppRole } from '@/lib/auth/routes';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const MIDDLEWARE_ERRORS: Record<string, string> = {
  no_profile:
    'Your account is authenticated but has no BALE role assigned. Please contact the firm administrator.',
  invalid_role:
    'Your account has an unrecognized role in the database. Please contact the firm administrator.',
};

/**
 * Canonical authentication URL for BALE. The unified role-aware login lives
 * at "/" — the account's database role decides which workspace opens next.
 */
export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [redirectNotice, setRedirectNotice] = useState<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('error');
    if (code && MIDDLEWARE_ERRORS[code]) setError(MIDDLEWARE_ERRORS[code]);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setRedirectNotice(null);
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'Invalid credentials');
        setIsLoading(false);
        return;
      }

      if (result.role !== 'founder' && result.role !== 'supervisor') {
        setError(MIDDLEWARE_ERRORS.invalid_role);
        setIsLoading(false);
        return;
      }

      const role = result.role as AppRole;
      const requestedPath = getSafeRedirectPath(
        new URLSearchParams(window.location.search).get('redirect_to')
      );
      const fallback = role === 'founder' ? '/dashboard' : '/attendance';
      const destination =
        requestedPath && canRoleAccessPath(role, requestedPath) ? requestedPath : fallback;
      const roleLabel = role === 'founder' ? 'Founder' : 'Supervisor';

      setRedirectNotice(`${roleLabel} role detected. Redirecting…`);
      window.setTimeout(() => router.replace(destination), 900);
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Authentication error');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-md w-full mx-auto pt-10 sm:pt-16">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-border shadow-[8px_8px_24px_rgba(11,31,58,0.08),-8px_-8px_24px_rgba(255,255,255,0.95)]">
          <div className="flex items-center justify-between pb-5 border-b border-surface-border/60">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-navy text-white flex items-center justify-center font-bold text-base shadow-[0_3px_10px_rgba(11,31,58,0.25)]">
                B
              </div>
              <div>
                <div className="text-base font-bold text-navy leading-none">BALE</div>
                <div className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider mt-1">
                  Asinta Architects
                </div>
              </div>
            </div>
            <Badge variant="navy" size="sm">Secure Portal</Badge>
          </div>

          <div className="mt-6">
            <h1 className="text-xl font-bold text-navy tracking-tight">Sign in to BALE</h1>
            <p className="text-xs text-ink-secondary mt-1">
              Billing &amp; Advance Ledger Engine. Your account role determines which workspace you
              can access.
            </p>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-status-danger-bg border border-status-danger/20 text-status-danger text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {redirectNotice && (
            <div className="mt-4 p-3 rounded-xl bg-status-info-bg border border-status-info/20 text-status-info text-xs flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{redirectNotice}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@asinta.ph"
              autoComplete="email"
              required
              leftIcon={<Mail className="w-4 h-4" />}
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your account password"
              autoComplete="current-password"
              required
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="text-ink-muted hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy/30 rounded-md p-0.5 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <p className="mt-4 text-[11px] text-ink-muted leading-relaxed">
            Credentials are verified by Supabase Auth. Access is restricted by your BALE database
            role and PostgreSQL Row Level Security. Authorized personnel only.
          </p>
        </div>
      </div>

      <div className="text-center text-xs text-ink-muted py-6">
        © 2026 Asinta Architects · Batangas, Philippines · Secure Ledger Platform
      </div>
    </div>
  );
}
