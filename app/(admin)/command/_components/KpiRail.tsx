'use client';

import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, Flame, Siren } from 'lucide-react';
import { useKpis } from '@/app/lib/api/hooks/useAnalytics';
import { useSlaStats } from '@/app/lib/api/hooks/useAnalytics';
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
    <div className="space-y-4">
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
          Snapshot
        </div>
        <KpiTile
          label="Total in range"
          value={kpis.data?.total ?? '—'}
          icon={Activity}
          accent="text-white"
        />
        <KpiTile
          label="Open"
          value={kpis.data?.open ?? '—'}
          icon={Activity}
          accent="text-sky-400"
        />
        <KpiTile
          label="Critical open"
          value={kpis.data?.critical ?? '—'}
          icon={Flame}
          accent="text-red-400"
        />
        <KpiTile
          label="Emergencies"
          value={kpis.data?.emergencies ?? '—'}
          icon={Siren}
          accent="text-orange-400"
        />
        <KpiTile
          label="Resolved"
          value={kpis.data?.resolved ?? '—'}
          icon={CheckCircle2}
          accent="text-emerald-400"
        />
      </div>

      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
          SLA pressure
        </div>
        <KpiTile
          label="Overdue"
          value={sla.data?.overdue ?? '—'}
          icon={Clock}
          accent="text-rose-400"
          emphasize
        />
        <KpiTile
          label="Due in 1h"
          value={sla.data?.dueIn1h ?? '—'}
          icon={Clock}
          accent="text-orange-400"
        />
        <KpiTile
          label="Due in 4h"
          value={sla.data?.dueIn4h ?? '—'}
          icon={Clock}
          accent="text-amber-400"
        />
      </div>

      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
          Response speed
        </div>
        <KpiTile
          label="Avg first response"
          value={
            kpis.data?.avgFirstResponseMins != null
              ? formatMins(kpis.data.avgFirstResponseMins)
              : '—'
          }
          icon={Clock}
          accent="text-yellow-400"
        />
        <KpiTile
          label="Avg resolution"
          value={
            kpis.data?.avgResolutionMins != null
              ? formatMins(kpis.data.avgResolutionMins)
              : '—'
          }
          icon={CheckCircle2}
          accent="text-emerald-400"
        />
        <KpiTile
          label="Resolution rate"
          value={kpis.data ? `${kpis.data.resolutionRate}%` : '—'}
          icon={CheckCircle2}
          accent="text-emerald-400"
        />
      </div>

      {sla.data && sla.data.overdue > 0 && (
        <div className="bg-rose-950/40 border border-rose-600/40 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-rose-200 leading-relaxed">
              <div className="font-bold text-rose-300">
                {sla.data.overdue} case{sla.data.overdue === 1 ? '' : 's'} past SLA
              </div>
              {sla.data.overdueBySeverity.CRITICAL > 0 && (
                <div>· {sla.data.overdueBySeverity.CRITICAL} critical</div>
              )}
              {sla.data.overdueBySeverity.HIGH > 0 && (
                <div>· {sla.data.overdueBySeverity.HIGH} high</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiTile({
  label,
  value,
  icon: Icon,
  accent,
  emphasize,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-2 px-3 rounded-lg mb-1 ${
        emphasize ? 'bg-slate-950 border border-slate-800' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${accent} opacity-70`} />
        <span className="text-[11px] text-slate-400">{label}</span>
      </div>
      <span className={`text-sm font-black font-mono ${accent}`}>{value}</span>
    </div>
  );
}

function formatMins(m: number): string {
  if (m < 60) return `${m.toFixed(0)}m`;
  return `${(m / 60).toFixed(1)}h`;
}
