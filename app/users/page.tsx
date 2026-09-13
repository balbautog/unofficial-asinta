'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useDataStore } from '@/lib/data/store';
import { useAuth } from '@/lib/auth/authContext';
import { User, UserRole } from '@/types';
import {
  UserCog,
  Shield,
  Compass,
  HardHat,
  Plus,
  Search,
  CheckCircle2,
  FolderKanban,
  Mail,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';

export default function UsersPage() {
  const { isFounder } = useAuth();
  const { users, projects, projectSupervisors } = useDataStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <AppShell requireFounder={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-border/60">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-navy uppercase tracking-widest">
                Firm Administration
              </span>
              <span className="text-xs text-ink-muted">·</span>
              <span className="text-xs text-ink-secondary">Postgres Role-Based Access Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight mt-1">
              Team Accounts & Role Security
            </h1>
          </div>
        </div>

        {/* Security Hierarchy Info Banner */}
        <div className="p-5 rounded-3xl bg-white border border-surface-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-navy">Asinta Architects Security Source of Truth</h3>
            <p className="text-xs text-ink-secondary leading-relaxed max-w-3xl">
              User permissions are strictly enforced at the PostgreSQL database level using Row Level Security (RLS) policies and Next.js server-side route guards. The login entry page never determines authorization.
            </p>
          </div>
          <Badge variant="navy" size="md" className="shrink-0">
            PostgreSQL RLS Active
          </Badge>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search team member name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="w-full sm:w-48">
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={[
                { label: 'All Roles', value: 'all' },
                { label: 'Founders', value: 'founder' },
                { label: 'Supervisors', value: 'supervisor' },
              ]}
            />
          </div>
        </div>

        {/* Users Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredUsers.map((u) => {
            const assignedProjectIds = projectSupervisors
              .filter((ps) => ps.supervisor_id === u.id)
              .map((ps) => ps.project_id);
            const assignedProjects = projects.filter((p) => assignedProjectIds.includes(p.id));

            return (
              <div
                key={u.id}
                className="p-6 rounded-3xl bg-white border border-surface-border shadow-[6px_6px_18px_rgba(11,31,58,0.06),-6px_-6px_18px_rgba(255,255,255,0.95)] space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-surface-inset text-navy flex items-center justify-center font-bold text-base border border-surface-border shadow-[inset_1px_1px_3px_rgba(11,31,58,0.06)]">
                      {u.role === 'founder' ? (
                        <Compass className="w-6 h-6 text-navy" />
                      ) : (
                        <HardHat className="w-6 h-6 text-amber-700" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-navy">{u.name}</h3>
                      <div className="text-xs text-ink-secondary flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{u.email}</span>
                      </div>
                    </div>
                  </div>

                  <Badge variant={u.role === 'founder' ? 'navy' : 'warning'} size="sm">
                    {u.role === 'founder' ? 'Founder' : 'Supervisor'}
                  </Badge>
                </div>

                {/* Permissions Description */}
                <div className="p-3.5 rounded-2xl bg-surface-inset/50 border border-surface-border/70 text-xs space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
                    Authorized Scope
                  </div>
                  {u.role === 'founder' ? (
                    <div className="text-ink-secondary">
                      Full administrative & financial access across all studio projects, client invoicing, expenses, payroll, advances, and settings.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="text-ink-secondary">
                        Restricted to field attendance terminal and assigned project sites only. Financial data is masked.
                      </div>
                      <div className="text-xs font-semibold text-navy">
                        Assigned Project Sites ({assignedProjects.length}):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {assignedProjects.length > 0 ? (
                          assignedProjects.map((p) => (
                            <span
                              key={p.id}
                              className="px-2 py-0.5 rounded-lg bg-white border border-surface-border text-[11px] font-medium text-navy"
                            >
                              {p.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-ink-muted italic">No specific site assigned</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-ink-muted">
                  <span>Account Active</span>
                  <span>Registered: {new Date(u.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
