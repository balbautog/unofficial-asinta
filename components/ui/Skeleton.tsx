import React from 'react';
import { clsx } from 'clsx';

/**
 * Loading placeholder primitives. Used instead of a bare spinner so the page
 * keeps its shape while data loads and content does not jump on arrival.
 */
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div
    aria-hidden="true"
    className={clsx('animate-pulse rounded-xl bg-surface-inset', className)}
  />
);

/** Placeholder for a stack of list rows. */
export const SkeletonRows: React.FC<{ rows?: number; className?: string }> = ({
  rows = 5,
  className,
}) => (
  <div className={clsx('space-y-3', className)} aria-hidden="true">
    {Array.from({ length: rows }).map((_, index) => (
      <div
        key={index}
        className="p-4 rounded-2xl bg-white border border-surface-border flex items-center justify-between gap-4"
      >
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    ))}
  </div>
);

/** Placeholder for the application shell while the session/ledger syncs. */
export const SkeletonShell: React.FC = () => (
  <div className="min-h-screen bg-surface flex" aria-busy="true" aria-live="polite">
    <span className="sr-only">Loading your workspace…</span>
    <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-4 p-5 border-r border-surface-border/70">
      <Skeleton className="h-10 w-40" />
      <div className="space-y-2 pt-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    </aside>
    <main className="flex-1 p-6 space-y-6">
      <Skeleton className="h-10 w-56" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
      <SkeletonRows rows={5} />
    </main>
  </div>
);
