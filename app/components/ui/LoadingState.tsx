'use client';

import React from 'react';
import {
  AdminShellSkeleton,
  BrandPulse,
  DashboardSkeleton,
  FeedSkeleton,
  MapSkeleton,
  QueueSkeleton,
  ReassignSkeleton,
  Skeleton,
} from '@/app/components/ui/Skeleton';

export type LoadingVariant =
  | 'spinner'
  | 'skeleton'
  | 'queue'
  | 'dashboard'
  | 'map'
  | 'feed'
  | 'admin'
  | 'reassign'
  | 'inline'
  | 'brand';

interface LoadingStateProps {
  /** Ignored for page variants — kept for API compat */
  message?: string;
  full?: boolean;
  /** @deprecated use variant */
  skeleton?: boolean;
  rows?: number;
  variant?: LoadingVariant;
}

/**
 * Prefer layout skeletons. Never show weak "Loading workspace…" copy.
 */
export function LoadingState({
  full,
  skeleton,
  rows = 4,
  variant,
}: LoadingStateProps) {
  const mode: LoadingVariant = variant ?? (skeleton ? 'skeleton' : 'brand');

  if (mode === 'queue') return <QueueSkeleton rows={rows} />;
  if (mode === 'dashboard') return <DashboardSkeleton />;
  if (mode === 'map') return <MapSkeleton />;
  if (mode === 'feed') return <FeedSkeleton rows={rows} />;
  if (mode === 'admin') return <AdminShellSkeleton />;
  if (mode === 'reassign') return <ReassignSkeleton />;

  if (mode === 'skeleton') {
    return (
      <div className={`space-y-3 ${full ? 'py-12' : 'py-4'}`} aria-busy="true">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" rounded="2xl" />
        ))}
      </div>
    );
  }

  if (mode === 'inline') {
    return (
      <span className="inline-flex items-center" role="status" aria-label="Working">
        <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-600 border-t-yellow-400 animate-spin" />
      </span>
    );
  }

  // brand / default — ambient, no caption
  return (
    <div
      className={`flex flex-col items-center justify-center ${full ? 'py-24' : 'py-16'}`}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <BrandPulse />
    </div>
  );
}
