'use client';

import React from 'react';

/**
 * BIKA loading system — structure first, zero weak copy.
 * Page waits = skeletons. Button waits = tiny spinner only.
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

/** Ambient brand mark — no words, just presence */
export function BrandPulse({ className }: { className?: string }) {
  return (
    <div className={cx('relative flex items-center justify-center', className)} aria-hidden>
      <div className="absolute w-16 h-16 rounded-full bg-yellow-500/10 animate-ping" />
      <div className="absolute w-10 h-10 rounded-full bg-yellow-500/15" />
      <div className="relative w-9 h-9 rounded-xl bg-slate-900 border border-yellow-500/30 flex items-center justify-center shadow-[0_0_24px_rgba(234,179,8,0.25)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Bika.png" alt="" className="w-6 h-6 object-contain opacity-90" />
      </div>
    </div>
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

export function QueueRowSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/60 pl-4 pr-4 py-3.5">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-500/40 to-slate-700" />
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
    <div className="space-y-5 animate-fadeIn" aria-busy="true" aria-label="Loading">
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
    <div className="space-y-7 animate-fadeIn" aria-busy="true" aria-label="Loading">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.06] bg-[#070b12] p-6 sm:p-8">
        <div className="absolute -top-24 -right-16 w-[28rem] h-[28rem] rounded-full bg-yellow-500/[0.05] blur-3xl" />
        <div className="relative space-y-4 max-w-md">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" rounded="full" />
            <Skeleton className="h-6 w-16" rounded="full" />
          </div>
          <Skeleton className="h-10 w-56" rounded="lg" />
          <Skeleton className="h-3 w-40" rounded="md" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-10 w-28" rounded="xl" />
            <Skeleton className="h-10 w-28" rounded="xl" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24" rounded="2xl" />
        ))}
      </div>
      <div className="rounded-[1.75rem] border border-white/[0.06] bg-[#0a0e16] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.05] flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" rounded="md" />
            <Skeleton className="h-3 w-40" rounded="md" />
          </div>
          <Skeleton className="h-3 w-16" rounded="md" />
        </div>
        <div className="divide-y divide-white/[0.04]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-6 py-3.5 flex justify-between gap-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-24" rounded="md" />
                <Skeleton className="h-4 w-2/3 max-w-xs" rounded="md" />
              </div>
              <Skeleton className="h-3 w-16" rounded="md" />
            </div>
          ))}
        </div>
      </div>
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
      aria-label="Loading map"
    >
      <div className="absolute inset-0 bika-skeleton-map" />
      {/* soft kingdom glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[min(70%,280px)] aspect-[4/5] rounded-[40%] border border-yellow-500/10 bg-yellow-500/[0.03]" />
      </div>
      <div className="absolute top-3 left-3 rounded-2xl border border-white/10 bg-black/60 p-3 w-48 space-y-2">
        <Skeleton className="h-3 w-28 bg-slate-700/80" rounded="md" />
        <Skeleton className="h-2.5 w-36 bg-slate-700/80" rounded="md" />
      </div>
      <div className="absolute top-3 right-3 rounded-2xl border border-white/10 bg-black/60 p-3 w-36 space-y-2">
        <Skeleton className="h-2.5 w-16 bg-slate-700/80" rounded="md" />
        <Skeleton className="h-2.5 w-full bg-slate-700/80" rounded="md" />
        <Skeleton className="h-2.5 w-full bg-slate-700/80" rounded="md" />
        <Skeleton className="h-2.5 w-3/4 bg-slate-700/80" rounded="md" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <BrandPulse />
      </div>
    </div>
  );
}

export function FeedSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="h-full flex flex-col" aria-busy="true" aria-label="Loading feed">
      <div className="p-3 border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
          <Skeleton className="h-3 w-16" rounded="md" />
        </div>
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
          <div className="w-9 h-9 rounded-lg bg-slate-900 border border-yellow-500/20 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Bika.png" alt="" className="w-6 h-6 object-contain opacity-80" />
          </div>
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
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 min-h-0">
          <div className="xl:col-span-7 relative min-h-[40vh]">
            <MapSkeleton />
          </div>
          <div className="xl:col-span-5 border-l border-white/5">
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
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-7 w-7" rounded="full" />
        </div>
      </header>
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 min-h-[70vh]">
        <div className="xl:col-span-2 p-4 space-y-3 border-r border-slate-800">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" rounded="xl" />
          ))}
        </div>
        <div className="xl:col-span-6 relative min-h-[320px]">
          <MapSkeleton />
        </div>
        <div className="xl:col-span-4 border-l border-slate-800">
          <FeedSkeleton />
        </div>
      </div>
    </div>
  );
}

export function AdminShellSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col" aria-busy="true">
      <header className="h-14 border-b border-slate-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border border-yellow-500/25 flex items-center justify-center bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Bika.png" alt="" className="w-5 h-5 object-contain" />
          </div>
          <Skeleton className="h-3 w-28" rounded="md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" rounded="xl" />
          <Skeleton className="h-8 w-8" rounded="full" />
        </div>
      </header>
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" rounded="lg" />
          <Skeleton className="h-3 w-72" rounded="md" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" rounded="2xl" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" rounded="2xl" />
      </div>
    </div>
  );
}

export function ReassignSkeleton() {
  return (
    <div className="space-y-6 animate-fadeIn" aria-busy="true">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8" rounded="lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" rounded="md" />
          <Skeleton className="h-3 w-56" rounded="md" />
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" rounded="xl" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" rounded="xl" />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" rounded="xl" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" rounded="xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function NotificationListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="py-1" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-3 py-2.5 flex gap-2.5 border-b border-white/5 last:border-0">
          <Skeleton className="w-2 h-2 mt-1.5 shrink-0" rounded="full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-4/5" rounded="md" />
            <Skeleton className="h-2.5 w-1/2" rounded="md" />
          </div>
        </div>
      ))}
    </div>
  );
}
