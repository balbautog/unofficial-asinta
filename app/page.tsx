'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, ArrowRight, Compass, HardHat, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function GatewayPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between selection:bg-navy selection:text-white">
      {/* Top Brand Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-navy text-white flex items-center justify-center font-bold text-lg shadow-[0_4px_14px_rgba(11,31,58,0.22)] border border-navy-deep">
            B
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight text-navy">BALE</div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-secondary">
              Asinta Architects
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-ink-secondary bg-white px-3.5 py-1.5 rounded-xl border border-surface-border shadow-[3px_3px_8px_rgba(11,31,58,0.04),-3px_-3px_8px_rgba(255,255,255,0.9)]">
          <Building2 className="w-3.5 h-3.5 text-navy" />
          <span className="font-medium">Batangas, Philippines</span>
        </div>
      </header>

      {/* Hero & Workspace Selector */}
      <main className="w-full max-w-5xl mx-auto px-6 py-8 md:py-12 flex flex-col items-center text-center">
        {/* Architectural Subtitle Tag */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-surface-border/80 shadow-[3px_3px_8px_rgba(11,31,58,0.04),-3px_-3px_8px_rgba(255,255,255,0.9)] mb-6">
          <span className="w-2 h-2 rounded-full bg-navy" />
          <span className="text-xs font-semibold tracking-wide text-navy uppercase">
            Internal Management System
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-navy tracking-tight max-w-2xl leading-[1.15]">
          Billing & Advance Ledger Engine
        </h1>
        <p className="mt-4 text-sm sm:text-base text-ink-secondary max-w-xl font-normal leading-relaxed">
          Centralized project cost monitoring, client progress billing, attendance tracking, and worker advances (&ldquo;bale&rdquo;) for Asinta Architects.
        </p>

        {/* Portal Entry Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full mt-12 text-left">
          {/* Card 1: Business Management (Founder / Admin) */}
          <div className="group relative bg-white rounded-3xl p-8 border border-surface-border/80 shadow-[8px_8px_24px_rgba(11,31,58,0.07),-8px_-8px_24px_rgba(255,255,255,0.95)] hover:shadow-[12px_12px_32px_rgba(11,31,58,0.11),-12px_-12px_32px_rgba(255,255,255,1)] hover:border-navy/30 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-navy text-white flex items-center justify-center shadow-[0_4px_12px_rgba(11,31,58,0.25)] group-hover:scale-105 transition-transform">
                  <Compass className="w-6 h-6 text-white" />
                </div>
                <Badge variant="navy" size="sm">
                  Founder / Admin
                </Badge>
              </div>

              <h2 className="text-xl font-bold text-navy tracking-tight">Business Management</h2>
              <p className="mt-2 text-xs sm:text-sm text-ink-secondary leading-relaxed">
                Manage projects, client milestone billings, expense approvals, payroll computation, worker advance ledgers, and operational financials.
              </p>

              <div className="mt-6 pt-6 border-t border-surface-border/60 space-y-2 text-xs text-ink-secondary">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-navy" />
                  <span>Founders: Ar. Junel & Ar. Rei Viviene Buyagon</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-navy" />
                  <span>Financial summaries & AI expense categorization</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Link href="/login" className="block w-full">
                <Button variant="primary" size="lg" className="w-full justify-between group-hover:bg-navy-deep">
                  <span>Enter Business Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Card 2: Workforce Attendance (Supervisor) */}
          <div className="group relative bg-white rounded-3xl p-8 border border-surface-border/80 shadow-[8px_8px_24px_rgba(11,31,58,0.07),-8px_-8px_24px_rgba(255,255,255,0.95)] hover:shadow-[12px_12px_32px_rgba(11,31,58,0.11),-12px_-12px_32px_rgba(255,255,255,1)] hover:border-navy/30 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-surface-inset text-navy flex items-center justify-center border border-surface-border shadow-[inset_1px_1px_3px_rgba(11,31,58,0.08)] group-hover:scale-105 transition-transform">
                  <HardHat className="w-6 h-6 text-navy" />
                </div>
                <Badge variant="warning" size="sm">
                  Site Supervisor
                </Badge>
              </div>

              <h2 className="text-xl font-bold text-navy tracking-tight">Workforce Attendance</h2>
              <p className="mt-2 text-xs sm:text-sm text-ink-secondary leading-relaxed">
                Field terminal for recording daily site crew attendance, work hours, overtime, and daily field notes for assigned project sites.
              </p>

              <div className="mt-6 pt-6 border-t border-surface-border/60 space-y-2 text-xs text-ink-secondary">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                  <span>Mobile-optimized touch interface for site use</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                  <span>Assigned projects & instant submission</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Link href="/login" className="block w-full">
                <Button variant="secondary" size="lg" className="w-full justify-between">
                  <span>Enter Attendance Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-12 inline-flex items-center space-x-2 text-xs text-ink-secondary bg-surface-inset/60 px-4 py-2 rounded-xl border border-surface-border/60">
          <Lock className="w-3.5 h-3.5 text-navy" />
          <span>
            Authorized personnel only. Access is strictly restricted according to your authenticated BALE database role.
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-surface-border/70 py-6 px-6 text-center text-xs text-ink-muted">
        <p>© 2026 Asinta Architects. All rights reserved. Batangas, Philippines.</p>
      </footer>
    </div>
  );
}
