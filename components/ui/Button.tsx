'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5',
      md: 'px-4 py-2 text-sm font-medium rounded-xl gap-2',
      lg: 'px-6 py-3 text-base font-semibold rounded-xl gap-2.5',
    };

    const variantClasses = {
      primary:
        'bg-navy text-white hover:bg-navy-deep border border-navy-deep shadow-[0_4px_12px_rgba(11,31,58,0.20)] active:translate-y-0 active:shadow-sm transition-all',
      secondary:
        'bg-white text-navy hover:bg-slate-50 border border-surface-border shadow-[3px_3px_8px_rgba(11,31,58,0.05),-3px_-3px_8px_rgba(255,255,255,0.9)] hover:border-slate-300 transition-all',
      outline:
        'bg-transparent text-navy hover:bg-white border border-surface-border hover:border-navy transition-all',
      danger:
        'bg-status-danger text-white hover:bg-red-700 border border-red-800 shadow-[0_3px_10px_rgba(197,40,40,0.25)] transition-all',
      ghost:
        'bg-transparent text-ink-secondary hover:text-navy hover:bg-surface-inset border-transparent transition-all',
      soft:
        'bg-surface-inset text-navy hover:bg-slate-200 border border-surface-border shadow-[inset_1px_1px_2px_rgba(11,31,58,0.04)] transition-all',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(
          clsx(
            'inline-flex items-center justify-center font-sans transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer',
            sizeClasses[size],
            variantClasses[variant],
            className
          )
        )}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
