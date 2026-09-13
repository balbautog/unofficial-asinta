'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import { INITIAL_USERS } from '@/lib/data/mockData';
import {
  Building2,
  LogOut,
  UserCheck,
  ShieldAlert,
  ChevronDown,
  Menu,
  Bell,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const { user, role, logout, switchUser, isFounder } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSwitch = (userId: string) => {
    switchUser(userId);
    setShowUserMenu(false);
    const target = INITIAL_USERS.find((u) => u.id === userId);
    if (target?.role === 'supervisor') {
      router.push('/attendance');
    } else {
      router.push('/dashboard');
    }
  };

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

        {/* Right: Quick Demo Account Switcher, Notification, and User profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Quick Role View Switcher - Helpful for reviewing both experiences */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-surface-inset border border-surface-border hover:border-navy/40 text-xs font-medium text-navy transition-all shadow-[inset_1px_1px_2px_rgba(11,31,58,0.04)]"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
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
                  <p className="text-xs font-bold text-navy uppercase tracking-wider">Active Account</p>
                  <p className="text-sm font-semibold text-navy mt-0.5">{user?.name}</p>
                  <p className="text-xs text-ink-secondary">{user?.email}</p>
                  <div className="mt-2">
                    <Badge variant={isFounder ? 'navy' : 'warning'} size="sm">
                      {user?.role === 'founder' ? 'Full Business Access (Founder)' : 'Field Terminal (Supervisor)'}
                    </Badge>
                  </div>
                </div>

                <div className="py-2">
                  <p className="px-3 text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">
                    Quick Role Switch (Demo)
                  </p>
                  {INITIAL_USERS.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleSwitch(u.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        user?.id === u.id ? 'bg-navy/10 font-semibold text-navy' : 'hover:bg-surface-inset text-ink-primary'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-[10px] text-ink-secondary">{u.role === 'founder' ? 'Founder & Principal' : 'Site Supervisor'}</div>
                      </div>
                      <Badge variant={u.role === 'founder' ? 'navy' : 'warning'} size="sm">
                        {u.role}
                      </Badge>
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-surface-border/60">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-status-danger hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
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
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-status-warning rounded-full ring-2 ring-white" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-surface-border shadow-xl p-4 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-surface-border/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-navy">System Notifications</h4>
                  <Badge variant="warning" size="sm">3 Pending</Badge>
                </div>
                <div className="divide-y divide-surface-border/40 text-xs">
                  <div className="py-2.5">
                    <div className="font-semibold text-navy">Overdue Progress Billing</div>
                    <div className="text-ink-secondary mt-0.5">Invoice ASINTA-2026-004 (₱612,500) past due. SMS reminder suggested.</div>
                  </div>
                  <div className="py-2.5">
                    <div className="font-semibold text-navy">AI Bale Flag</div>
                    <div className="text-ink-secondary mt-0.5">₱3,000 disbursement flagged as worker advance for Danilo Magpantay.</div>
                  </div>
                  <div className="py-2.5">
                    <div className="font-semibold text-navy">Daily Attendance Ready</div>
                    <div className="text-ink-secondary mt-0.5">Engr. Marco Santos submitted Casa Batangas site logs.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
