'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useDataStore } from '@/lib/data/store';
import { useAuth } from '@/lib/auth/authContext';
import { Building2, Shield, Bot, Database, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { TemplateEditorCard } from '@/components/email/TemplateEditorCard';
import { TestEmailCard } from '@/components/email/TestEmailCard';

interface IntegrationStatus {
  groqConfigured: boolean;
  philsmsConfigured: boolean;
  supabaseConfigured: boolean;
  smtpConfigured: boolean;
  automaticRemindersEnabled: boolean;
}

export default function SettingsPage() {
  const { isFounder } = useAuth();
  const { refresh, isLoading, isLoaded } = useDataStore();

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);

  useEffect(() => {
    let active = true;

    fetch('/api/integrations/status', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load integration status');
        return response.json() as Promise<IntegrationStatus>;
      })
      .then((status) => {
        if (active) setIntegrationStatus(status);
      })
      .catch(() => {
        if (active) {
          setIntegrationStatus({
            groqConfigured: false,
            philsmsConfigured: false,
            supabaseConfigured: false,
            smtpConfigured: false,
            automaticRemindersEnabled: false,
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleResyncData = async () => {
    setIsResyncing(true);
    await refresh();
    setIsResyncing(false);
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-border/60">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-navy uppercase tracking-widest">
                System Configurations
              </span>
              <span className="text-xs text-ink-muted">·</span>
              <span className="text-xs text-ink-secondary">BALE v1.0 Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight mt-1">
              Firm Settings & Integrations
            </h1>
          </div>
        </div>

        {/* Firm Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2.5">
              <Building2 className="w-5 h-5 text-navy" />
              <CardTitle>Asinta Architects Studio Profile</CardTitle>
            </div>
            <CardDescription>Firm principals and official studio registration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-navy uppercase text-[11px] block mb-1">Firm Name</label>
                <div className="p-2.5 rounded-xl bg-surface-inset border border-surface-border font-semibold text-navy">
                  Asinta Architects (Design & Build)
                </div>
              </div>

              <div>
                <label className="font-bold text-navy uppercase text-[11px] block mb-1">Studio Location</label>
                <div className="p-2.5 rounded-xl bg-surface-inset border border-surface-border font-semibold text-navy">
                  Ayala Greenfield / Sto. Tomas, Batangas, Philippines
                </div>
              </div>

              <div>
                <label className="font-bold text-navy uppercase text-[11px] block mb-1">Founders & Principals</label>
                <div className="p-2.5 rounded-xl bg-surface-inset border border-surface-border font-semibold text-navy">
                  Ar. Junel Buyagon & Ar. Rei Viviene Buyagon
                </div>
              </div>

              <div>
                <label className="font-bold text-navy uppercase text-[11px] block mb-1">Primary Currency</label>
                <div className="p-2.5 rounded-xl bg-surface-inset border border-surface-border font-semibold text-navy">
                  Philippine Peso (PHP ₱)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optional Founder MFA (Section 13) */}
        {isFounder && (
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2.5">
                <Shield className="w-5 h-5 text-navy" />
                <CardTitle>Founder Security & Supabase MFA</CardTitle>
              </div>
              <CardDescription>
                Multi-Factor Authentication (TOTP / Authenticator App) for Founder accounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-inset/60 border border-surface-border">
                <div className="space-y-0.5">
                  <div className="font-bold text-navy">Founder Multi-Factor Authentication</div>
                  <div className="text-ink-secondary">
                    Require a one-time passcode from an authenticator app when accessing financial ledgers.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMfaEnabled(!mfaEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    mfaEnabled ? 'bg-navy' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      mfaEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI & SMS Integrations */}
        {isFounder && (
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2.5">
                <Bot className="w-5 h-5 text-navy" />
                <CardTitle>External Service Integrations</CardTitle>
              </div>
              <CardDescription>Groq AI semantic ledger assistance and PhilSMS gateway</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-surface-inset/50 border border-surface-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy">Groq AI Engine</span>
                    <Badge
                      variant={integrationStatus?.groqConfigured ? 'success' : 'warning'}
                      size="sm"
                    >
                      {!integrationStatus
                        ? 'Checking'
                        : integrationStatus.groqConfigured
                          ? 'Configured'
                          : 'Not Configured'}
                    </Badge>
                  </div>
                  <div className="text-ink-secondary">
                    Model: <span className="font-mono text-navy font-semibold">llama-3.3-70b-versatile</span>
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    Auto-categorizes expenses and detects worker bale advances.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface-inset/50 border border-surface-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy">PhilSMS Gateway</span>
                    <Badge
                      variant={integrationStatus?.philsmsConfigured ? 'success' : 'warning'}
                      size="sm"
                    >
                      {!integrationStatus
                        ? 'Checking'
                        : integrationStatus.philsmsConfigured
                          ? 'Configured'
                          : 'Simulation Mode'}
                    </Badge>
                  </div>
                  <div className="text-ink-secondary">
                    Sender ID: <span className="font-mono text-navy font-semibold">ASINTA</span>
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    Direct SMS reminders for client invoice due dates.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface-inset/50 border border-surface-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy">SMTP Email (Nodemailer)</span>
                    <Badge
                      variant={integrationStatus?.smtpConfigured ? 'success' : 'warning'}
                      size="sm"
                    >
                      {!integrationStatus
                        ? 'Checking'
                        : integrationStatus.smtpConfigured
                          ? 'Configured'
                          : 'Not configured'}
                    </Badge>
                  </div>
                  <div className="text-ink-secondary">
                    Request for Payment emails and SMTP test messages.
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    Credentials are server-side environment variables and are never displayed
                    here. See <span className="font-mono">docs/COMMUNICATIONS_SETUP.md</span>.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface-inset/50 border border-surface-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy">Automatic SMS Reminders</span>
                    <Badge
                      variant={integrationStatus?.automaticRemindersEnabled ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {!integrationStatus
                        ? 'Checking'
                        : integrationStatus.automaticRemindersEnabled
                          ? 'Enabled globally'
                          : 'Disabled (default)'}
                    </Badge>
                  </div>
                  <div className="text-ink-secondary">
                    Scheduled reminders run only when enabled globally AND per invoice.
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    Controlled by <span className="font-mono">AUTOMATIC_REMINDERS_ENABLED</span> on
                    the server; sends Mon–Sat 8AM–6PM Asia/Manila only.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email Templates (Founder only) */}
        {isFounder && <TemplateEditorCard />}

        {/* SMTP Test Email (Founder only) */}
        {isFounder && <TestEmailCard />}

        {/* Database & Sync Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2.5">
              <Database className="w-5 h-5 text-navy" />
              <CardTitle>Supabase Database & Sync</CardTitle>
            </div>
            <CardDescription>Live PostgreSQL ledger — all records are stored and mutated server-side</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-navy">Supabase Project</span>
                <Badge
                  variant={integrationStatus?.supabaseConfigured ? 'success' : 'warning'}
                  size="sm"
                >
                  {!integrationStatus
                    ? 'Checking'
                    : integrationStatus.supabaseConfigured
                      ? 'Configured'
                      : 'Local Dev Default'}
                </Badge>
              </div>
              <div className="text-ink-secondary">
                Endpoint:{' '}
                <span className="font-mono text-navy font-semibold">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'}
                </span>
              </div>
              <div className="text-[11px] text-ink-muted">
                Data is fetched and mutated directly through Supabase PostgreSQL with Row Level
                Security enforced on every query. There is no local mock data — to seed the demo
                ledger, run the SQL scripts in <span className="font-mono">supabase/migrations/</span>.
              </div>
              <div className="text-[11px] text-ink-secondary">
                Ledger status:{' '}
                <span className="font-semibold text-navy">
                  {isLoading ? 'Synchronizing…' : isLoaded ? 'Synchronized' : 'Not loaded'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="space-y-0.5">
                <div className="font-bold text-navy">Resync Ledger from Supabase</div>
                <div className="text-ink-secondary">
                  Re-fetches projects, invoices, expenses, attendance, payroll, and bale records
                  from the live database.
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResyncData}
                isLoading={isResyncing}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Resync Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
