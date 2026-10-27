'use client';

import React from 'react';

/**
 * BIKA loading primitives (2026)
 * - Layout-matched skeletons (not spinner walls)
 * - Soft shimmer; static pulse when prefers-reduced-motion
 * - Always expose aria-busy to assistive tech
 */

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function Skeleton({
  className,
  rounded = 'xl',
}: {
  className?: string;
  rounded?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
}) {
  const radius =
    rounded === 'full'
      ? 'rounded-full'
      : rounded === '2xl'
        ? 'rounded-2xl'
        : rounded === 'lg'
          ? 'rounded-lg'
          : rounded === 'md'
            ? 'rounded-md'
            : 'rounded-xl';

  return (
    <div
      className={cx(
        'bika-skeleton relative overflow-hidden bg-slate-800/70 border border-white/[0.04]',
        radius,
        className
      )}
    />
  );
}

export function SkeletonText({ lines = 2, className }: { lines?: number; className?: string }) {
  return (
    <div className={cx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cx('h-2.5', i === lines - 1 ? 'w-2/3 max-w-[12rem]' : 'w-full')}
          rounded="md"
        />
      ))}
    </div>
  );
}

/** Officer queue row placeholder */
export function QueueRowSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/60 pl-4 pr-4 py-3.5">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-700" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-24" rounded="md" />
            <Skeleton className="h-4 w-14" rounded="md" />
            <Skeleton className="h-4 w-16" rounded="md" />
          </div>
          <Skeleton className="h-4 w-3/4 max-w-md" rounded="md" />
          <Skeleton className="h-3 w-full max-w-lg" rounded="md" />
        </div>
        <div className="space-y-2 w-28">
          <Skeleton className="h-3 w-full" rounded="md" />
          <Skeleton className="h-3 w-20 ml-auto" rounded="md" />
          <Skeleton className="h-7 w-16 ml-auto" rounded="lg" />
        </div>
      </div>
    </div>
  );
}

export function QueueSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-5 animate-fadeIn" aria-busy="true" aria-label="Loading case queue">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" rounded="md" />
          <Skeleton className="h-8 w-48" rounded="lg" />
          <Skeleton className="h-3 w-40" rounded="md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-44" rounded="2xl" />
          <Skeleton className="h-9 w-24" rounded="xl" />
        </div>
      </div>
      <Skeleton className="h-14 w-full" rounded="2xl" />
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <QueueRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-7 animate-fadeIn" aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-40 w-full" rounded="2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24" rounded="2xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" rounded="2xl" />
    </div>
  );
}

export function MapSkeleton({ wall }: { wall?: boolean }) {
  return (
    <div
      className={cx(
        'relative w-full h-full min-h-[280px] bg-[#05080f] overflow-hidden',
        wall && 'min-h-screen'
      )}
      aria-busy="true"
      aria-label="Loading Kingdom map"
    >
      <div className="absolute inset-0 bika-skeleton-map" />
      <div className="absolute top-3 left-3 rounded-2xl border border-white/10 bg-black/60 p-3 w-48 space-y-2">
        <Skeleton className="h-3 w-28 bg-slate-700/80" rounded="md" />
        <Skeleton className="h-2.5 w-36 bg-slate-700/80" rounded="md" />
      </div>
      <div className="absolute top-3 right-3 rounded-2xl border border-white/10 bg-black/60 p-3 w-36 space-y-2">
        <Skeleton className="h-2.5 w-16 bg-slate-700/80" rounded="md" />
        <Skeleton className="h-2.5 w-full bg-slate-700/80" rounded="md" />
        <Skeleton className="h-2.5 w-full bg-slate-700/80" rounded="md" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full border-2 border-yellow-500/30 border-t-yellow-400 animate-spin" />
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Syncing Kingdom map
          </p>
        </div>
      </div>
    </div>
  );
}

export function FeedSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="h-full flex flex-col" aria-busy="true" aria-label="Loading live feed">
      <div className="p-3 border-b border-white/5 flex justify-between">
        <Skeleton className="h-3 w-20" rounded="md" />
        <Skeleton className="h-3 w-12" rounded="md" />
      </div>
      <div className="flex-1 overflow-hidden divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 space-y-2">
            <div className="flex justify-between gap-2">
              <Skeleton className="h-3 w-24" rounded="md" />
              <Skeleton className="h-4 w-14" rounded="md" />
            </div>
            <Skeleton className="h-3.5 w-3/4" rounded="md" />
            <Skeleton className="h-3 w-1/2" rounded="md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function OfficerShellSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col" aria-busy="true">
      <header className="h-14 border-b border-slate-800/80 px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-9 h-9" rounded="lg" />
          <div className="hidden sm:block space-y-1.5">
            <Skeleton className="h-3 w-16" rounded="md" />
            <Skeleton className="h-2.5 w-24" rounded="md" />
          </div>
        </div>
        <Skeleton className="hidden md:block h-9 w-64" rounded="2xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8" rounded="xl" />
          <Skeleton className="w-8 h-8" rounded="full" />
        </div>
      </header>
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6">
        <DashboardSkeleton />
      </main>
    </div>
  );
}

export function CommandShellSkeleton({ kiosk }: { kiosk?: boolean }) {
  if (kiosk) {
    return (
      <div className="h-screen bg-[#05080f] flex flex-col" aria-busy="true" aria-label="Loading wall">
        <div className="h-12 border-b border-white/5 px-4 flex items-center gap-4">
          <Skeleton className="h-3 w-32 bg-slate-800" rounded="md" />
          <Skeleton className="h-3 w-16 bg-slate-800" rounded="md" />
          <Skeleton className="h-3 w-16 bg-slate-800" rounded="md" />
        </div>
        <div className="flex-1 grid grid-cols-12 min-h-0">
          <div className="col-span-7 relative">
            <MapSkeleton />
          </div>
          <div className="col-span-5 border-l border-white/5">
            <FeedSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col" aria-busy="true">
      <header className="h-12 border-b border-slate-800 px-4 flex items-center gap-3">
        <Skeleton className="h-3 w-28" rounded="md" />
        <Skeleton className="h-3 w-24" rounded="md" />
      </header>
      <div className="flex-1 grid grid-cols-12 min-h-[70vh]">
        <div className="col-span-2 p-4 space-y-3 border-r border-slate-800">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" rounded="xl" />
          ))}
        </div>
        <div className="col-span-6 relative">
          <MapSkeleton />
        </div>
        <div className="col-span-4 border-l border-slate-800">
          <FeedSkeleton />
        </div>
      </div>
    </div>
  );
}
