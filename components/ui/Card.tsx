'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'raised' | 'flat' | 'inset' | 'interactive';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'raised', children, ...props }, ref) => {
    const variantClasses = {
      raised:
        'bg-white border border-surface-border/80 shadow-[6px_6px_18px_rgba(11,31,58,0.06),-6px_-6px_18px_rgba(255,255,255,0.95)] rounded-2xl',
      flat: 'bg-white border border-surface-border rounded-2xl',
      inset:
        'bg-surface-inset/60 border border-surface-border/70 shadow-[inset_2px_2px_5px_rgba(11,31,58,0.06),inset_-2px_-2px_5px_rgba(255,255,255,0.90)] rounded-xl',
      interactive:
        'bg-white border border-surface-border/80 shadow-[6px_6px_18px_rgba(11,31,58,0.06),-6px_-6px_18px_rgba(255,255,255,0.95)] hover:shadow-[8px_8px_22px_rgba(11,31,58,0.09),-8px_-8px_22px_rgba(255,255,255,1)] hover:border-navy/30 transition-all duration-200 cursor-pointer rounded-2xl',
    };

    return (
      <div
        ref={ref}
        className={twMerge(clsx(variantClasses[variant], 'p-5 md:p-6 transition-all', className))}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={twMerge(clsx('flex flex-col space-y-1.5 pb-4', className))} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3
    className={twMerge(
      clsx('text-lg font-semibold text-navy tracking-tight leading-none', className)
    )}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={twMerge(clsx('text-xs text-ink-secondary mt-1', className))} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => <div className={twMerge(clsx('pt-0', className))} {...props}>{children}</div>;

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={twMerge(clsx('flex items-center pt-4 border-t border-surface-border/60', className))} {...props}>
    {children}
  </div>
);
