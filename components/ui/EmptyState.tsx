'use client';

import React from 'react';
import { clsx } from 'clsx';

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional call to action, e.g. a <Button>. */
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Shown whenever a list has nothing to render — including the case where a
 * filter or search simply matched nothing. Without this the app rendered a
 * blank region, which is indistinguishable from a broken page.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
  className,
}) => (
  <div
    className={clsx(
      'flex flex-col items-center justify-center text-center gap-2 px-6 py-12',
      className
    )}
  >
    {icon && (
      <div className="w-12 h-12 rounded-2xl bg-surface-inset border border-surface-border flex items-center justify-center text-ink-secondary">
        {icon}
      </div>
    )}
    <div className="text-sm font-bold text-navy">{title}</div>
    {description && (
      <p className="text-xs text-ink-secondary max-w-sm leading-relaxed">{description}</p>
    )}
    {action && <div className="pt-1">{action}</div>}
  </div>
);

EmptyState.displayName = 'EmptyState';
