'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-navy uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && <div className="absolute left-3 text-ink-muted pointer-events-none">{leftIcon}</div>}
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full bg-surface-inset/60 text-ink-primary placeholder:text-ink-muted text-sm rounded-xl border border-surface-border py-2.5 transition-all duration-150',
                'shadow-[inset_2px_2px_4px_rgba(11,31,58,0.05),inset_-2px_-2px_4px_rgba(255,255,255,0.9)]',
                'focus:bg-white focus:border-navy focus:ring-2 focus:ring-navy/15 focus:outline-none',
                leftIcon ? 'pl-9' : 'pl-3.5',
                rightIcon ? 'pr-9' : 'pr-3.5',
                error && 'border-status-danger ring-1 ring-status-danger/30 bg-red-50/20',
                className
              )
            )}
            {...props}
          />
          {rightIcon && <div className="absolute right-3 text-ink-muted">{rightIcon}</div>}
        </div>
        {error && <p className="text-xs font-medium text-status-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-ink-secondary">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-navy uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full bg-surface-inset/60 text-ink-primary placeholder:text-ink-muted text-sm rounded-xl border border-surface-border p-3 transition-all duration-150',
              'shadow-[inset_2px_2px_4px_rgba(11,31,58,0.05),inset_-2px_-2px_4px_rgba(255,255,255,0.9)]',
              'focus:bg-white focus:border-navy focus:ring-2 focus:ring-navy/15 focus:outline-none resize-none',
              error && 'border-status-danger ring-1 ring-status-danger/30 bg-red-50/20',
              className
            )
          )}
          {...props}
        />
        {error && <p className="text-xs font-medium text-status-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-ink-secondary">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
