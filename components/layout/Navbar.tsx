'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import { useDataStore } from '@/lib/data/store';
import {
  Building2,
  LogOut,
  ChevronDown,
  Menu,
  Bell,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatPesoCompact } from '@/lib/email/format';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const { user, logout, isFounder } = useAuth();
  const { invoices, advances, attendance } = useDataStore();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Live notifications derived from the Supabase-backed ledger.
  const now = new Date();
  const overdueInvoices = invoices.filter(
    (i) =>
      i.status !== 'paid' &&
      i.status !== 'cancelled' &&
      (i.status === 'overdue' || new Date(i.due_date) < now)
  );
  const activeBales = advances.filter(
    (a) => a.status === 'active' || a.status === 'partially_deducted'
  );
  const recentAttendance = attendance.slice(0, 5).filter((a) => a.submitted_at);

  const notificationCount =
    overdueInvoices.length + (activeBales.length > 0 ? 1 : 0) + (recentAttendance.length > 0 ? 1 : 0);

  const formatPHP = formatPesoCompact;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-surface-border/80 shadow-[0_2px_10px_rgba(11,31,58,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand / Logo */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleMobileMenu}
            className="p-2 -ml-2 rounded-xl text-ink-secondary hover:text-navy hover:bg-surface-inset lg:hidden focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href={isFounder ? '/dashboard' : '/attendance'} className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-navy text-white flex items-center justify-center font-bold text-base shadow-[0_3px_10px_rgba(11,31,58,0.25)] group-hover:bg-navy-deep transition-all">
              B
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-navy text-base leading-none group-hover:text-navy-light transition-colors">
                BALE
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-ink-secondary leading-tight mt-0.5">
                Asinta Architects
              </span>
            </div>
          </Link>

          <div className="hidden sm:block h-5 w-px bg-surface-border mx-2" />

          {/* Architectural Badge */}
          <div className="hidden md:flex items-center space-x-1.5 text-xs text-ink-secondary bg-surface-inset/70 px-2.5 py-1 rounded-lg border border-surface-border/50">
            <Building2 className="w-3.5 h-3.5 text-navy" />
            <span>Batangas Studio & Build</span>
          </div>
        </div>

        {/* Right: Account panel and notifications */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Authenticated account panel */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-surface-inset border border-surface-border hover:border-navy/40 text-xs font-medium text-navy transition-all shadow-[inset_1px_1px_2px_rgba(11,31,58,0.04)]"
            >
              <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
              <span className="hidden sm:inline font-semibold">{user?.name || 'User'}</span>
              <Badge variant={isFounder ? 'navy' : 'warning'} size="sm">
                {isFounder ? 'Founder' : 'Supervisor'}
              </Badge>
              <ChevronDown className="w-3.5 h-3.5 text-ink-secondary" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-surface-border shadow-xl p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-surface-border/60">
                  <p className="text-xs font-bold text-navy uppercase tracking-wider">Signed-in Account</p>
                  <p className="text-sm font-semibold text-navy mt-0.5">{user?.name}</p>
                  <p className="text-xs text-ink-secondary">{user?.email}</p>
                  <div className="mt-2">
                    <Badge variant={isFounder ? 'navy' : 'warning'} size="sm">
                      {user?.role === 'founder'
                        ? 'Full Business Access (Founder)'
                        : 'Field Terminal (Supervisor)'}
                    </Badge>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-status-danger hover:bg-status-danger-bg rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out of Supabase Session</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notifications button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl text-ink-secondary hover:text-navy hover:bg-surface-inset border border-transparent hover:border-surface-border transition-all relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-status-warning rounded-full ring-2 ring-white" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-surface-border shadow-xl p-4 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-surface-border/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-navy">System Notifications</h4>
                  <Badge variant={notificationCount > 0 ? 'warning' : 'success'} size="sm">
                    {notificationCount > 0 ? `${notificationCount} Pending` : 'All Clear'}
                  </Badge>
                </div>
                <div className="divide-y divide-surface-border/40 text-xs">
                  {overdueInvoices.slice(0, 3).map((inv) => (
                    <div key={inv.id} className="py-2.5">
                      <div className="font-semibold text-navy">Overdue Progress Billing</div>
                      <div className="text-ink-secondary mt-0.5">
                        Invoice {inv.invoice_number} ({formatPHP(inv.amount - inv.amount_paid)}) past due.
                      </div>
                    </div>
                  ))}
                  {activeBales.length > 0 && (
                    <div className="py-2.5">
                      <div className="font-semibold text-navy">Active Bale Balances</div>
                      <div className="text-ink-secondary mt-0.5">
                        {activeBales.length} worker advance{activeBales.length > 1 ? 's' : ''} still being
                        deducted through payroll.
                      </div>
                    </div>
                  )}
                  {recentAttendance.length > 0 && (
                    <div className="py-2.5">
                      <div className="font-semibold text-navy">Attendance Sync Active</div>
                      <div className="text-ink-secondary mt-0.5">
                        Latest site log submitted {new Date(recentAttendance[0].submitted_at).toLocaleString('en-PH')}.
                      </div>
                    </div>
                  )}
                  {notificationCount === 0 && (
                    <div className="py-3 text-center text-ink-secondary">
                      No pending ledger notifications.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
