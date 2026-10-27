'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  DashboardSkeleton,
  FeedSkeleton,
  MapSkeleton,
  QueueSkeleton,
  Skeleton,
} from '@/app/components/ui/Skeleton';

export type LoadingVariant =
  | 'spinner'
  | 'skeleton'
  | 'queue'
  | 'dashboard'
  | 'map'
  | 'feed'
  | 'inline';

interface LoadingStateProps {
  message?: string;
  /** Center vertically with generous padding (spinner). */
  full?: boolean;
  /** @deprecated use variant="skeleton" */
  skeleton?: boolean;
  rows?: number;
  variant?: LoadingVariant;
}

/**
 * Unified loading surface.
 * Prefer layout skeletons over spinners for page-level waits.
 */
export function LoadingState({
  message = 'Loading…',
  full,
  skeleton,
  rows = 4,
  variant,
}: LoadingStateProps) {
  const mode: LoadingVariant = variant ?? (skeleton ? 'skeleton' : 'spinner');

  if (mode === 'queue') return <QueueSkeleton rows={rows} />;
  if (mode === 'dashboard') return <DashboardSkeleton />;
  if (mode === 'map') return <MapSkeleton />;
  if (mode === 'feed') return <FeedSkeleton rows={rows} />;

  if (mode === 'skeleton') {
    return (
      <div
        className={`space-y-3 ${full ? 'py-12' : 'py-4'}`}
        aria-busy="true"
        aria-label={message}
      >
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" rounded="2xl" />
        ))}
      </div>
    );
  }

  if (mode === 'inline') {
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs" role="status">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {message}
      </span>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-slate-500 ${
        full ? 'py-24' : 'py-12'
      }`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-yellow-400 animate-spin" />
      </div>
      <p className="text-xs font-semibold tracking-wide">{message}</p>
    </div>
  );
}
