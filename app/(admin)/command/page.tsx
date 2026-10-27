'use client';

import React, { useMemo, useState, Suspense, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FilterBar } from './_components/FilterBar';
import { KpiRail } from './_components/KpiRail';
import { MapPanel } from './_components/MapPanel';
import { LiveFeed } from './_components/LiveFeed';
import {
  WallTopBar,
  WallFlashBanner,
  useIdleChrome,
  useWakeLock,
  shouldPlayWallAudio,
  playWallTone,
} from './_components/WallChrome';
import { useIncidents } from '@/app/lib/api/hooks/useIncidents';
import { useSlaStats } from '@/app/lib/api/hooks/useAnalytics';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import type { IncidentFilters } from '@/app/lib/api/queryKeys';
import type { Incident, IncidentStatus, Mode, Region, Severity } from '@/app/types';
import { ROLE_LABELS } from '@/app/lib/rbac';

const REGIONS: Region[] = ['Hhohho', 'Manzini', 'Shiselweni', 'Lubombo'];

type WallLayout = 'balanced' | 'map' | 'feed';

function isOpen(status: Incident['status']) {
  return !['resolved', 'closed', 'rejected'].includes(status);
}

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
  const layoutParam = (sp.get('layout') as WallLayout | null) ?? 'balanced';
  const layout: WallLayout =
    layoutParam === 'map' || layoutParam === 'feed' ? layoutParam : 'balanced';
  const rotateRegions = sp.get('rotate') === '1';

  const me = useOfficerMe();
  const sla = useSlaStats();

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
  const [flash, setFlash] = useState<Incident | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [online, setOnline] = useState(true);
  const prevIds = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const featureIdx = useRef(0);
  const regionIdx = useRef(0);

  const chromeVisible = useIdleChrome(4500);
  useWakeLock(kiosk);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bika-wall-audio');
      if (stored === '0') setAudioEnabled(false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const setRegionFilter = useCallback(
    (region: Region | null) => {
      const next = new URLSearchParams(sp.toString());
      if (!region) next.delete('region');
      else next.set('region', region);
      if (kiosk) {
        next.set('kiosk', '1');
        if (layout !== 'balanced') next.set('layout', layout);
        if (rotateRegions) next.set('rotate', '1');
      }
      router.replace(`/command?${next.toString()}`);
    },
    [router, sp, kiosk, layout, rotateRegions]
  );

  const handleSelectIncident = useCallback((id: string | null) => {
    setSelectedIncidentId(id && id.length > 0 ? id : null);
  }, []);

  const incidents = useIncidents(filters, { refetchInterval: 8_000 });

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

  const openList = useMemo(() => sorted.filter((i) => isOpen(i.status)), [sorted]);
  const criticalCount = openList.filter((i) => i.severity === 'CRITICAL').length;
  const overdueCount = sla.data?.overdue ?? 0;

  useEffect(() => {
    const ids = new Set(sorted.map((i) => i.id));
    if (!primed.current) {
      prevIds.current = ids;
      primed.current = true;
      return;
    }
    const newcomers = sorted.filter((i) => !prevIds.current.has(i.id));
    prevIds.current = ids;
    if (newcomers.length === 0) return;

    const alertable =
      newcomers.find((i) => i.severity === 'CRITICAL') ||
      newcomers.find((i) => i.severity === 'HIGH') ||
      newcomers[0];

    if (!alertable) return;

    if (kiosk) {
      setFlash(alertable);
      handleSelectIncident(alertable.id);
      if (shouldPlayWallAudio(alertable.severity, audioEnabled)) {
        playWallTone(alertable.severity);
      }
      const t = window.setTimeout(() => setFlash(null), 10000);
      return () => window.clearTimeout(t);
    }

    toast.message(`${alertable.severity}: ${alertable.id}`, {
      description: `${alertable.category} · ${alertable.location}`,
      duration: alertable.severity === 'CRITICAL' ? 12_000 : 6_000,
    });
  }, [sorted, kiosk, audioEnabled, handleSelectIncident]);

  useEffect(() => {
    if (!kiosk) return;
    const pool = openList.filter(
      (i) => i.severity === 'CRITICAL' || i.severity === 'HIGH'
    );
    if (pool.length === 0) return;
    const id = window.setInterval(() => {
      featureIdx.current = (featureIdx.current + 1) % pool.length;
      handleSelectIncident(pool[featureIdx.current].id);
    }, 12000);
    return () => window.clearInterval(id);
  }, [kiosk, openList, handleSelectIncident]);

  useEffect(() => {
    if (!kiosk || !rotateRegions) return;
    const id = window.setInterval(() => {
      regionIdx.current = (regionIdx.current + 1) % REGIONS.length;
      setRegionFilter(REGIONS[regionIdx.current]);
    }, 45000);
    return () => window.clearInterval(id);
  }, [kiosk, rotateRegions, setRegionFilter]);

  const stale =
    kiosk &&
    (incidents.isError ||
      (!incidents.isLoading &&
        incidents.dataUpdatedAt > 0 &&
        Date.now() - incidents.dataUpdatedAt > 90_000));

  const toggleAudio = () => {
    setAudioEnabled((v) => {
      const next = !v;
      try {
        localStorage.setItem('bika-wall-audio', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const regionLabel = filters.region ?? 'Nationwide';
  const roleLabel = me.data ? ROLE_LABELS[me.data.user.role] : 'Command';

  if (kiosk) {
    const mapSpan =
      layout === 'map' ? 'xl:col-span-9' : layout === 'feed' ? 'xl:col-span-5' : 'xl:col-span-7';
    const feedSpan =
      layout === 'map' ? 'xl:col-span-3' : layout === 'feed' ? 'xl:col-span-7' : 'xl:col-span-5';

    return (
      <div className="h-full flex flex-col bg-[#05080f] text-slate-100 overflow-hidden">
        <WallTopBar
          openCount={openList.length}
          criticalCount={criticalCount}
          overdueCount={overdueCount}
          regionLabel={regionLabel}
          roleLabel={roleLabel}
          stale={Boolean(stale)}
          online={online && !incidents.isError}
          audioEnabled={audioEnabled}
          onToggleAudio={toggleAudio}
          chromeVisible={chromeVisible}
          layout={layout}
          rotating={rotateRegions}
        />

        <WallFlashBanner incident={flash} onDismiss={() => setFlash(null)} />

        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12">
          <section className={`${mapSpan} min-h-[280px] xl:min-h-0 relative`}>
            <MapPanel
              incidents={sorted}
              isLoading={incidents.isLoading}
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={handleSelectIncident}
              onRegionFilter={setRegionFilter}
              activeRegion={filters.region ?? null}
              wallMode
            />
          </section>

          <aside className={`${feedSpan} overflow-hidden flex flex-col border-l border-white/5 bg-black/30`}>
            <LiveFeed
              incidents={sorted}
              isLoading={incidents.isLoading}
              selectedIncidentId={selectedIncidentId}
              kiosk
              autoScroll
              onSelectIncident={(id) => handleSelectIncident(id)}
            />
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <FilterBar />

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-0 border-t border-slate-800">
        <aside className="xl:col-span-2 overflow-y-auto p-4 space-y-4 border-r border-slate-800">
          <KpiRail filters={filters} />
        </aside>

        <section className="xl:col-span-6 min-h-[400px] xl:min-h-0 relative">
          <MapPanel
            incidents={sorted}
            isLoading={incidents.isLoading}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={handleSelectIncident}
            onRegionFilter={setRegionFilter}
            activeRegion={filters.region ?? null}
          />
        </section>

        <aside className="xl:col-span-4 overflow-hidden flex flex-col border-l border-slate-800">
          <LiveFeed
            incidents={sorted}
            isLoading={incidents.isLoading}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={(id) => {
              handleSelectIncident(id);
              router.push(`/officer/case/${id}`);
            }}
          />
        </aside>
      </div>
    </div>
  );
}
