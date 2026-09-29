'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import { Lock, Mail, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

const MIDDLEWARE_ERRORS: Record<string, string> = {
  no_profile:
    'Your account is authenticated but has no BALE role assigned. Please contact the firm administrator.',
  invalid_role:
    'Your account has an unrecognized role in the database. Please contact the firm administrator.',
};

function AdminLoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [redirectNotice, setRedirectNotice] = useState<string | null>(null);

  // Surface middleware-rejected sessions (e.g. missing BALE profile).
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('error');
    if (code && MIDDLEWARE_ERRORS[code]) {
      setError(MIDDLEWARE_ERRORS[code]);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRedirectNotice(null);
    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error || 'Invalid credentials');
        setIsLoading(false);
        return;
      }

      // Role check from the database (public.users.role)
      if (res.role === 'supervisor') {
        // Enforce rule: Supervisor logging in here must be sent to /attendance
        setRedirectNotice('Supervisor role detected. Redirecting to Attendance Terminal...');
        setTimeout(() => {
          router.push('/attendance');
        }, 1000);
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto pt-6 sm:pt-12">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center space-x-2 text-xs font-semibold text-ink-secondary hover:text-navy transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Gateway</span>
      </Link>

      {/* Login Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-border shadow-[8px_8px_24px_rgba(11,31,58,0.08),-8px_-8px_24px_rgba(255,255,255,0.95)]">
        {/* Header */}
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
          <Badge variant="navy" size="sm">
            Business Portal
          </Badge>
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-bold text-navy tracking-tight">Business Management</h2>
          <p className="text-xs text-ink-secondary mt-1">
            Sign in with your Supabase credentials to manage projects, finances, workforce, and operations.
          </p>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-status-danger text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {redirectNotice && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{redirectNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="Authorized Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="junel@asinta.ph"
            required
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your account password"
            required
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <Button type="submit" variant="primary" size="lg" className="w-full mt-2" isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        <p className="mt-4 text-[11px] text-ink-muted leading-relaxed">
          Credentials are verified against Supabase Auth and your role is loaded from the
          <span className="font-mono"> public.users </span>
          table — access is enforced by PostgreSQL Row Level Security.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between p-4 sm:p-6">
      <AdminLoginForm />

      <div className="text-center text-xs text-ink-muted py-6">
        Asinta Architects · Batangas, Philippines · Secure Ledger Platform
      </div>
    </div>
  );
}
