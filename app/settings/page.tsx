'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useDataStore } from '@/lib/data/store';
import { useAuth } from '@/lib/auth/authContext';
import {
  Settings,
  Building2,
  Shield,
  Bot,
  MessageSquareText,
  Database,
  Lock,
  RefreshCw,
  CheckCircle2,
  Key,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

export default function SettingsPage() {
  const { user, isFounder } = useAuth();
  const { resetToDefault } = useDataStore();

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleResetData = () => {
    if (confirm('Reset all ledger data and demo sessions back to the default Asinta Architects seed state?')) {
      resetToDefault();
      alert('Data reset successfully to default state.');
      window.location.reload();
    }
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

        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings and integration parameters updated successfully.</span>
          </div>
        )}

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
                    <Badge variant="navy" size="sm">Active</Badge>
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
                    <Badge variant="success" size="sm">Connected</Badge>
                  </div>
                  <div className="text-ink-secondary">
                    Sender ID: <span className="font-mono text-navy font-semibold">ASINTA</span>
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    Direct SMS reminders for client invoice due dates.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Database & Demo Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2.5">
              <Database className="w-5 h-5 text-navy" />
              <CardTitle>Database Management & Demo Reset</CardTitle>
            </div>
            <CardDescription>Supabase PostgreSQL schema and local data synchronization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="space-y-0.5">
                <div className="font-bold text-navy">Reset to Initial Asinta Batangas State</div>
                <div className="text-ink-secondary">
                  Restores all default projects, invoices, expenses, attendance logs, and bale records.
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetData}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Reset Demo Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
