'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Phone,
  PhoneCall,
  Loader2,
  AlertTriangle,
  Clock,
  Shield,
  Flame,
  Cross,
  Bus,
  Scale,
  Headphones,
  ExternalLink,
} from 'lucide-react';
import { useHotlines } from '@/app/lib/api/hooks/useReference';
import type { Hotline } from '@/app/types';

type HotlineCategory = Hotline['category'];

const CATEGORY_META: Record<
  HotlineCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; accent: string }
> = {
  emergency: {
    label: 'Emergency',
    icon: AlertTriangle,
    accent: 'text-red-400 border-red-500/30 bg-red-500/10',
  },
  police: {
    label: 'Police',
    icon: Shield,
    accent: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
  },
  fire: {
    label: 'Fire & rescue',
    icon: Flame,
    accent: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  },
  medical: {
    label: 'Medical',
    icon: Cross,
    accent: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
  transport: {
    label: 'Transport',
    icon: Bus,
    accent: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  },
  anti_corruption: {
    label: 'Anti-corruption',
    icon: Scale,
    accent: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
  },
  general: {
    label: 'General',
    icon: Headphones,
    accent: 'text-slate-300 border-white/10 bg-white/5',
  },
};

const FILTERS: { key: 'all' | HotlineCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'emergency', label: 'Emergency' },
  { key: 'police', label: 'Police' },
  { key: 'fire', label: 'Fire' },
  { key: 'medical', label: 'Medical' },
  { key: 'transport', label: 'Transport' },
  { key: 'anti_corruption', label: 'Integrity' },
  { key: 'general', label: 'General' },
];

/** Fallback national numbers if the directory is empty or offline. */
const FALLBACK: Array<Pick<Hotline, 'name' | 'number' | 'category' | 'availableHours' | 'isTollFree' | 'description'>> =
  [
    {
      name: 'Police emergency',
      number: '999',
      category: 'police',
      availableHours: '24/7',
      isTollFree: true,
      description: 'Royal Eswatini Police Service — life-threatening emergencies.',
    },
    {
      name: 'Ambulance',
      number: '977',
      category: 'medical',
      availableHours: '24/7',
      isTollFree: true,
      description: 'Emergency medical services.',
    },
    {
      name: 'Fire & rescue',
      number: '933',
      category: 'fire',
      availableHours: '24/7',
      isTollFree: true,
      description: 'Fire and rescue services.',
    },
    {
      name: 'Disaster management',
      number: '800 2452',
      category: 'emergency',
      availableHours: '24/7',
      isTollFree: true,
      description: 'National disaster management.',
    },
  ];

function telHref(number: string) {
  const cleaned = number.replace(/[\s()-]/g, '');
  return `tel:${cleaned}`;
}

export default function PublicHotlinesPage() {
  const { data, isLoading, isError, refetch, isFetching } = useHotlines();
  const [filter, setFilter] = useState<'all' | HotlineCategory>('all');

  const list = useMemo(() => {
    const source =
      data && data.length > 0
        ? [...data].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name))
        : null;

    const rows: Array<{
      id: string;
      name: string;
      number: string;
      category: HotlineCategory;
      description: string | null;
      availableHours: string;
      isTollFree: boolean;
      isFallback?: boolean;
    }> = source
      ? source.map((h) => ({
          id: h.id,
          name: h.name,
          number: h.number,
          category: h.category,
          description: h.description,
          availableHours: h.availableHours || 'See agency',
          isTollFree: h.isTollFree,
        }))
      : FALLBACK.map((h, i) => ({
          id: `fallback-${i}`,
          ...h,
          isFallback: true,
        }));

    if (filter === 'all') return rows;
    return rows.filter((r) => r.category === filter);
  }, [data, filter]);

  const usingFallback = !data || data.length === 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-300">
          <PhoneCall className="w-3.5 h-3.5" />
          Public directory
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Emergency hotlines
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
          Official numbers for the Kingdom of Eswatini. If someone is in immediate danger, call{' '}
          <a href="tel:999" className="text-red-300 font-bold underline underline-offset-2">
            999
          </a>{' '}
          now — do not wait to file an online report.
        </p>
      </header>

      {/* Life-threatening banner */}
      <a
        href="tel:999"
        className="flex items-center gap-4 rounded-2xl border border-red-500/40 bg-gradient-to-r from-red-950/80 to-red-900/40 px-4 py-4 sm:px-5 shadow-lg shadow-red-950/30 hover:border-red-400/60 transition"
      >
        <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-900/50">
          <Phone className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-red-300">
            Life-threatening emergency
          </div>
          <div className="text-xl font-black text-white tabular-nums">Call 999</div>
          <div className="text-xs text-red-100/70">Police · tap to dial</div>
        </div>
        <ExternalLink className="w-4 h-4 text-red-300/80 shrink-0" />
      </a>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition ${
              filter === f.key
                ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading directory…
        </div>
      )}

      {!isLoading && (
        <>
          {(isError || usingFallback) && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/90 leading-relaxed">
              {isError
                ? 'Could not load the live directory. Showing national fallback numbers.'
                : 'No active hotlines configured yet. Showing national fallback numbers.'}{' '}
              <button
                type="button"
                onClick={() => refetch()}
                className="font-bold underline underline-offset-2 text-amber-50"
                disabled={isFetching}
              >
                {isFetching ? 'Refreshing…' : 'Retry'}
              </button>
            </div>
          )}

          {list.length === 0 ? (
            <div className="text-center py-14 text-slate-500 text-sm">
              No hotlines in this category.
            </div>
          ) : (
            <ul className="space-y-3">
              {list.map((h) => {
                const meta = CATEGORY_META[h.category] ?? CATEGORY_META.general;
                const Icon = meta.icon;
                return (
                  <li key={h.id}>
                    <a
                      href={telHref(h.number)}
                      className="group flex items-stretch gap-3 sm:gap-4 rounded-2xl border border-white/[0.06] bg-[#0a0e16] p-3.5 sm:p-4 hover:border-yellow-500/30 hover:bg-[#0c121c] transition"
                    >
                      <div
                        className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${meta.accent}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-black text-white group-hover:text-yellow-50">
                            {h.name}
                          </h2>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                            {meta.label}
                          </span>
                          {h.isTollFree && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                              Toll-free
                            </span>
                          )}
                        </div>
                        {h.description && (
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                            {h.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {h.availableHours}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-center gap-1 shrink-0 pl-1">
                        <span className="text-base sm:text-lg font-black tabular-nums text-yellow-400 group-hover:text-yellow-300">
                          {h.number}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-300 inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          Tap to call
                        </span>
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5 space-y-3">
        <h3 className="text-sm font-black text-white">Not an emergency?</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Use BIKA to report transport, trade, or service issues. You will get a reference number
          to track progress.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/report"
            className="inline-flex items-center justify-center rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs px-4 py-2.5"
          >
            File a report
          </Link>
          <Link
            href="/track"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-4 py-2.5"
          >
            Track a case
          </Link>
        </div>
      </div>
    </div>
  );
}
