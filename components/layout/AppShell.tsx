'use client';

import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useAuth } from '@/lib/auth/authContext';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface AppShellProps {
  children: React.ReactNode;
  requireFounder?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({ children, requireFounder = false }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isFounder, isLoading } = useAuth();

  // If page strictly requires Founder role and user is Supervisor, show security access denied screen
  if (!isLoading && requireFounder && !isFounder) {
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <Navbar onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-surface-border shadow-xl text-center space-y-4">
            <div className="w-14 h-14 bg-rose-50 text-status-danger rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-navy">Restricted Business Portal</h2>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Access is restricted to Asinta Architects Founders (Ar. Junel & Ar. Rei Buyagon).
              Your current account is logged in with <strong>Supervisor</strong> permissions.
            </p>
            <div className="pt-2">
              <Link href="/attendance">
                <Button variant="primary" className="w-full">
                  Return to Attendance Terminal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col antialiased">
      <Navbar onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />
      <MobileNav isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
