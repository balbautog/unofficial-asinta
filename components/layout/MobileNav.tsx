'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  CreditCard,
  UserCheck,
  Banknote,
  HandCoins,
  Users,
  Wrench,
  MessageSquareText,
  UserCog,
  Settings,
  X,
  Compass,
  Shield,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { isFounder, user } = useAuth();

  const founderNavItems = [
    { label: 'Executive Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Projects & Sites', href: '/projects', icon: FolderKanban },
    { label: 'Invoices & Billing', href: '/invoices', icon: Receipt },
    { label: 'Expenses & AI Ledger', href: '/expenses', icon: CreditCard },
    { label: 'Workforce Attendance', href: '/attendance', icon: UserCheck },
    { label: 'Payroll Engine', href: '/payroll', icon: Banknote },
    { label: 'Bale / Advances', href: '/advances', icon: HandCoins },
    { label: 'Clients Directory', href: '/clients', icon: Users },
    { label: 'Tools & Inventory', href: '/tools', icon: Wrench },
    { label: 'SMS Reminders', href: '/sms', icon: MessageSquareText },
    { label: 'Team & Permissions', href: '/users', icon: UserCog },
    { label: 'Firm Settings', href: '/settings', icon: Settings },
  ];

  const supervisorNavItems = [
    { label: 'Attendance Terminal', href: '/attendance', icon: UserCheck },
    { label: 'Assigned Projects', href: '/projects', icon: FolderKanban },
    { label: 'Supervisor Profile', href: '/settings', icon: UserCog },
  ];

  const items = isFounder ? founderNavItems : supervisorNavItems;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy/50 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-white border-r border-surface-border shadow-2xl z-10 flex flex-col p-4 animate-in slide-in-from-left duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-surface-border/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-navy text-white flex items-center justify-center font-bold text-sm">
              B
            </div>
            <div>
              <div className="font-bold text-navy text-sm">BALE</div>
              <div className="text-[10px] text-ink-secondary">Asinta Architects</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-secondary hover:text-navy hover:bg-surface-inset"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User preview */}
        <div className="my-4 p-3 rounded-xl bg-surface-inset border border-surface-border">
          <div className="text-[11px] font-bold text-ink-secondary uppercase">
            {isFounder ? 'Founder Session' : 'Supervisor Session'}
          </div>
          <div className="text-xs font-bold text-navy mt-0.5">{user?.name}</div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto space-y-1 py-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && item.href !== '/attendance' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-navy text-white shadow-md'
                    : 'text-ink-secondary hover:text-navy hover:bg-surface-inset'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-ink-secondary'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
