'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  highlight?: boolean;
  alert?: boolean;
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  highlight = false,
  alert = false,
  className,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={twMerge(
        clsx(
          'p-5 rounded-2xl bg-white border transition-all duration-200 flex flex-col justify-between',
          highlight
            ? 'border-navy/30 bg-gradient-to-br from-white to-slate-50/70 shadow-[7px_7px_20px_rgba(11,31,58,0.08),-7px_-7px_20px_rgba(255,255,255,0.95)]'
            : alert
            ? 'border-rose-200 bg-rose-50/20 shadow-[6px_6px_18px_rgba(197,40,40,0.06),-6px_-6px_18px_rgba(255,255,255,0.95)]'
            : 'border-surface-border/70 shadow-[6px_6px_18px_rgba(11,31,58,0.06),-6px_-6px_18px_rgba(255,255,255,0.95)]',
          onClick && 'cursor-pointer hover:shadow-[8px_8px_22px_rgba(11,31,58,0.10),-8px_-8px_22px_rgba(255,255,255,1)] hover:-translate-y-0.5',
          className
        )
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
          {title}
        </span>
        {icon && (
          <div
            className={clsx(
              'p-2 rounded-xl text-navy',
              alert
                ? 'bg-rose-100/60 text-rose-700'
                : 'bg-surface-inset text-navy shadow-[inset_1px_1px_3px_rgba(11,31,58,0.06)]'
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl lg:text-3xl font-bold tracking-tight text-navy">
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-secondary">
            {trend && (
              <span
                className={clsx(
                  'font-semibold px-1.5 py-0.5 rounded-md text-[11px]',
                  trend.isPositive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                )}
              >
                {trend.value}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
