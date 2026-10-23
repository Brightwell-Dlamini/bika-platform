'use client';

import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, Flame, Siren } from 'lucide-react';
import { useKpis, useSlaStats } from '@/app/lib/api/hooks/useAnalytics';
import type { IncidentFilters } from '@/app/lib/api/queryKeys';

interface KpiRailProps {
  filters: IncidentFilters;
}

export function KpiRail({ filters }: KpiRailProps) {
  const kpis = useKpis({
    region: filters.region,
    mode: filters.mode,
  });
  const sla = useSlaStats();

  return (
    <div className="space-y-6">
      <Section title="Snapshot">
        <Tile label="Total in range" value={kpis.data?.total ?? '—'} icon={Activity} />
        <Tile label="Open" value={kpis.data?.open ?? '—'} icon={Activity} accent="text-sky-300" />
        <Tile label="Critical open" value={kpis.data?.critical ?? '—'} icon={Flame} accent="text-red-400" hot />
        <Tile label="Emergencies" value={kpis.data?.emergencies ?? '—'} icon={Siren} accent="text-orange-400" />
        <Tile label="Resolved" value={kpis.data?.resolved ?? '—'} icon={CheckCircle2} accent="text-emerald-400" />
      </Section>

      <Section title="SLA pressure">
        <Tile
          label="Overdue"
          value={sla.data?.overdue ?? '—'}
          icon={Clock}
          accent="text-rose-400"
          hot={(sla.data?.overdue ?? 0) > 0}
        />
        <Tile label="Due in 1h" value={sla.data?.dueIn1h ?? '—'} icon={Clock} accent="text-orange-400" />
        <Tile label="Due in 4h" value={sla.data?.dueIn4h ?? '—'} icon={Clock} accent="text-amber-400" />
      </Section>

      <Section title="Response speed">
        <Tile
          label="Avg first response"
          value={
            kpis.data?.avgFirstResponseMins != null
              ? formatMins(kpis.data.avgFirstResponseMins)
              : '—'
          }
          icon={Clock}
          accent="text-yellow-400"
        />
        <Tile
          label="Avg resolution"
          value={
            kpis.data?.avgResolutionMins != null ? formatMins(kpis.data.avgResolutionMins) : '—'
          }
          icon={CheckCircle2}
          accent="text-emerald-400"
        />
        <Tile
          label="Resolution rate"
          value={kpis.data ? `${kpis.data.resolutionRate}%` : '—'}
          icon={CheckCircle2}
          accent="text-emerald-400"
        />
      </Section>

      {sla.data && sla.data.overdue > 0 && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-rose-100 leading-relaxed">
              <div className="font-black text-rose-200">
                {sla.data.overdue} case{sla.data.overdue === 1 ? '' : 's'} past SLA
              </div>
              {sla.data.overdueBySeverity.CRITICAL > 0 && (
                <div className="mt-1 text-rose-300/90">
                  · {sla.data.overdueBySeverity.CRITICAL} critical
                </div>
              )}
              {sla.data.overdueBySeverity.HIGH > 0 && (
                <div className="text-rose-300/90">· {sla.data.overdueBySeverity.HIGH} high</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 mb-2.5">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Tile({
  label,
  value,
  icon: Icon,
  accent = 'text-white',
  hot,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
  hot?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 transition ${
        hot
          ? 'bg-rose-500/10 border border-rose-500/25'
          : 'hover:bg-white/[0.03] border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={`w-3.5 h-3.5 shrink-0 opacity-70 ${accent}`} />
        <span className="text-[11px] text-slate-400 truncate">{label}</span>
      </div>
      <span className={`text-sm font-black font-mono tabular-nums ${accent}`}>{value}</span>
    </div>
  );
}

function formatMins(m: number): string {
  if (m < 60) return `${m.toFixed(0)}m`;
  return `${(m / 60).toFixed(1)}h`;
}
