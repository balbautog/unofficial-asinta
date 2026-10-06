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
  BellRing,
  UserCog,
  Settings,
  Compass,
  Shield,
  Clock,
  LucideIcon,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { isFounder, user } = useAuth();

  const founderNavItems: NavItem[] = [
    { label: 'Executive Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Projects & Sites', href: '/projects', icon: FolderKanban },
    { label: 'Invoices & Billing', href: '/invoices', icon: Receipt },
    { label: 'Expenses & AI Ledger', href: '/expenses', icon: CreditCard, badge: 'AI' },
    { label: 'Workforce Attendance', href: '/attendance', icon: UserCheck },
    { label: 'Payroll Engine', href: '/payroll', icon: Banknote },
    { label: 'Bale / Advances', href: '/advances', icon: HandCoins },
    { label: 'Clients Directory', href: '/clients', icon: Users },
    { label: 'Tools & Inventory', href: '/tools', icon: Wrench },
    { label: 'SMS Reminders', href: '/sms', icon: MessageSquareText },
    { label: 'Reminder Queue', href: '/reminders', icon: BellRing },
    { label: 'Team & Permissions', href: '/users', icon: UserCog },
    { label: 'Firm Settings', href: '/settings', icon: Settings },
  ];

  const supervisorNavItems: NavItem[] = [
    { label: 'Attendance Terminal', href: '/attendance', icon: UserCheck },
    { label: 'Assigned Projects', href: '/projects', icon: FolderKanban },
    { label: 'Attendance History', href: '/attendance?tab=history', icon: Clock },
    { label: 'Supervisor Profile', href: '/settings', icon: UserCog },
  ];

  const items: NavItem[] = isFounder ? founderNavItems : supervisorNavItems;

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-[calc(100vh-4rem)] bg-white border-r border-surface-border/80 p-4 space-y-6 select-none shrink-0">
      {/* Role Context Card */}
      <div className="p-3.5 rounded-2xl bg-surface-inset/70 border border-surface-border shadow-[inset_1px_1px_3px_rgba(11,31,58,0.05)]">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-white border border-surface-border text-navy shadow-sm">
            {isFounder ? <Compass className="w-4 h-4 text-navy" /> : <Shield className="w-4 h-4 text-status-warning" />}
          </div>
          <div className="truncate">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
              {isFounder ? 'Business Portal' : 'Field Terminal'}
            </div>
            <div className="text-xs font-bold text-navy truncate">{user?.name}</div>
          </div>
        </div>
      </div>

      {/* Navigation list */}
      <div className="space-y-1">
        <div className="px-3 pb-1.5 text-[10px] font-bold text-ink-muted uppercase tracking-widest">
          {isFounder ? 'Core Management' : 'Field Operations'}
        </div>
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && item.href !== '/attendance' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-navy text-white shadow-[0_3px_10px_rgba(11,31,58,0.22)]'
                    : 'text-ink-secondary hover:text-navy hover:bg-surface-inset'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-ink-secondary group-hover:text-navy'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-navy/10 text-navy'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Studio info footer */}
      <div className="mt-auto pt-6 border-t border-surface-border/60 text-[11px] text-ink-muted px-2 space-y-1">
        <div className="font-semibold text-navy">Asinta Architects</div>
        <div>Batangas Studio · v1.0.0</div>
        <div className="text-[10px] text-status-success flex items-center gap-1 mt-1 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
          <span>Postgres RLS Enforced</span>
        </div>
      </div>
    </aside>
  );
};
