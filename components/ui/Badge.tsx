'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'navy' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'navy',
  size = 'md',
  children,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] font-medium rounded-md',
    md: 'px-2.5 py-1 text-xs font-semibold rounded-lg',
  };

  const variantClasses = {
    navy: 'bg-navy/10 text-navy border border-navy/20',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/80',
    danger: 'bg-rose-50 text-rose-800 border border-rose-200/80',
    info: 'bg-sky-50 text-sky-800 border border-sky-200/80',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    outline: 'bg-transparent text-navy border border-surface-border',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center font-sans uppercase tracking-wider select-none',
          sizeClasses[size],
          variantClasses[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
};
