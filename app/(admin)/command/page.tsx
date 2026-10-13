'use client';

import React, { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FilterBar } from './_components/FilterBar';
import { KpiRail } from './_components/KpiRail';
import { MapPanel } from './_components/MapPanel';
import { LiveFeed } from './_components/LiveFeed';
import { useIncidents } from '@/app/lib/api/hooks/useIncidents';
import type { IncidentFilters } from '@/app/lib/api/queryKeys';
import type { IncidentStatus, Mode, Region, Severity } from '@/app/types';

export default function CommandPage() {
  const sp = useSearchParams();
  const router = useRouter();

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

  return (
    <div className="h-full flex flex-col">
      <FilterBar />

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-0 border-t border-slate-800">
        {/* KPI rail — left */}
        <aside className="xl:col-span-2 border-r border-slate-800 overflow-y-auto p-4 space-y-4">
          <KpiRail filters={filters} />
        </aside>

        {/* Map — center */}
        <section className="xl:col-span-6 min-h-[400px] xl:min-h-0 relative">
          <MapPanel
            incidents={incidents.data?.incidents ?? []}
            isLoading={incidents.isLoading}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={(id) => setSelectedIncidentId(id)}
          />
        </section>

        {/* Live feed — right */}
        <aside className="xl:col-span-4 border-l border-slate-800 overflow-hidden flex flex-col">
          <LiveFeed
            incidents={incidents.data?.incidents ?? []}
            isLoading={incidents.isLoading}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={(id) => {
              setSelectedIncidentId(id);
              router.push(`/officer/case/${id}`);
            }}
          />
        </aside>
      </div>
    </div>
  );
}
