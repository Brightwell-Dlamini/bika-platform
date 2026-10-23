'use client';

import React, { useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FilterBar } from './_components/FilterBar';
import { KpiRail } from './_components/KpiRail';
import { MapPanel } from './_components/MapPanel';
import { LiveFeed } from './_components/LiveFeed';
import { useIncidents } from '@/app/lib/api/hooks/useIncidents';
import type { IncidentFilters } from '@/app/lib/api/queryKeys';
import type { IncidentStatus, Mode, Region, Severity } from '@/app/types';

export default function CommandPage() {
  return (
    <Suspense fallback={null}>
      <CommandPageInner />
    </Suspense>
  );
}

function CommandPageInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const kiosk = sp.get('kiosk') === '1' || sp.get('wall') === '1';

  const filters: IncidentFilters = useMemo(
    () => ({
      region: (sp.get('region') as Region | null) ?? undefined,
      mode: (sp.get('mode') as Mode | null) ?? undefined,
      severity: (sp.get('severity') as Severity | null) ?? undefined,
      status: (sp.get('status') as IncidentStatus | null) ?? undefined,
      search: sp.get('q') || undefined,
      onlyOverdue: sp.get('overdue') === '1',
      limit: 500,
    }),
    [sp]
  );

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const incidents = useIncidents(filters);

  const sorted = useMemo(() => {
    const list = [...(incidents.data?.incidents ?? [])];
    const sevRank: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };
    list.sort((a, b) => {
      const sa = sevRank[a.severity] ?? 9;
      const sb = sevRank[b.severity] ?? 9;
      if (sa !== sb) return sa - sb;
      const aOver =
        a.slaDueAt &&
        new Date(a.slaDueAt) < new Date() &&
        !['closed', 'resolved', 'rejected'].includes(a.status)
          ? 0
          : 1;
      const bOver =
        b.slaDueAt &&
        new Date(b.slaDueAt) < new Date() &&
        !['closed', 'resolved', 'rejected'].includes(b.status)
          ? 0
          : 1;
      if (aOver !== bOver) return aOver - bOver;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [incidents.data?.incidents]);

  return (
    <div className={`h-full flex flex-col ${kiosk ? 'bg-[#070b12]' : ''}`}>
      {!kiosk && <FilterBar />}

      <div
        className={`flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-0 ${
          kiosk ? 'border-t border-white/5' : 'border-t border-slate-800'
        }`}
      >
        <aside
          className={`xl:col-span-2 overflow-y-auto p-4 space-y-4 ${
            kiosk ? 'border-r border-white/5 bg-black/20' : 'border-r border-slate-800'
          }`}
        >
          <KpiRail filters={filters} />
        </aside>

        <section className="xl:col-span-6 min-h-[400px] xl:min-h-0 relative">
          <MapPanel
            incidents={sorted}
            isLoading={incidents.isLoading}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={(id) => setSelectedIncidentId(id)}
          />
        </section>

        <aside
          className={`xl:col-span-4 overflow-hidden flex flex-col ${
            kiosk ? 'border-l border-white/5 bg-black/20' : 'border-l border-slate-800'
          }`}
        >
          <LiveFeed
            incidents={sorted}
            isLoading={incidents.isLoading}
            selectedIncidentId={selectedIncidentId}
            kiosk={kiosk}
            onSelectIncident={(id) => {
              setSelectedIncidentId(id);
              if (!kiosk) router.push(`/officer/case/${id}`);
            }}
          />
        </aside>
      </div>
    </div>
  );
}
