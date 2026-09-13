'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: Array<{ label: string; value: string | number; disabled?: boolean }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, children, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-navy uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full bg-surface-inset/60 text-ink-primary text-sm rounded-xl border border-surface-border py-2.5 px-3.5 pr-8 appearance-none transition-all duration-150',
                'shadow-[inset_2px_2px_4px_rgba(11,31,58,0.05),inset_-2px_-2px_4px_rgba(255,255,255,0.9)]',
                'focus:bg-white focus:border-navy focus:ring-2 focus:ring-navy/15 focus:outline-none cursor-pointer',
                error && 'border-status-danger ring-1 ring-status-danger/30 bg-red-50/20',
                className
              )
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <p className="text-xs font-medium text-status-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-ink-secondary">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
