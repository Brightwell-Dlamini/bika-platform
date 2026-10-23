'use client';

import React, { useState } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { useKpis, useRegionBreakdown, useTrends } from '@/app/lib/api/hooks/useAnalytics';
import { ANALYTICS_RANGES, type AnalyticsRange } from '@/app/types/analytics';
import { BarChart } from './_components/BarChart';
import { ExportPanel } from './_components/ExportPanel';

export default function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const kpis = useKpis({ range });
  const regions = useRegionBreakdown({ range });
  const trends = useTrends({ days: range === 'all' ? 365 : range === 'year' ? 365 : 90 });

  return (
    <div className="space-y-7 animate-fadeIn">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <BarChart3 className="w-4.5 h-4.5 text-yellow-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Analytics</h1>
          </div>
          <p className="text-sm text-slate-400 mt-2 max-w-lg">
            National incident intelligence and operational performance.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-900/90 border border-slate-800 p-1 rounded-2xl inline-flex gap-0.5 shadow-inner">
            {ANALYTICS_RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  range === r.key
                    ? 'bg-yellow-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <ExportPanel kpis={kpis.data} regions={regions.data} range={range} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiBox label="Total" value={kpis.data?.total ?? '—'} accent="text-white" glow="from-slate-800/80" />
        <KpiBox label="Open" value={kpis.data?.open ?? '—'} accent="text-sky-300" glow="from-sky-950/50" />
        <KpiBox label="Critical" value={kpis.data?.critical ?? '—'} accent="text-red-300" glow="from-red-950/40" />
        <KpiBox label="SLA overdue" value={kpis.data?.slaOverdue ?? '—'} accent="text-rose-300" glow="from-rose-950/40" />
        <KpiBox
          label="Resolution rate"
          value={kpis.data ? `${kpis.data.resolutionRate}%` : '—'}
          accent="text-emerald-300"
          glow="from-emerald-950/40"
        />
        <KpiBox label="Compliments" value={kpis.data?.compliments ?? '—'} accent="text-purple-300" glow="from-purple-950/40" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Regional volume" subtitle="Total incidents by region">
          {(regions.data ?? []).map((r) => (
            <BarChart.Bar
              key={r.region}
              label={r.region}
              value={r.total}
              max={Math.max(...(regions.data ?? []).map((x) => x.total), 1)}
              barClass="bg-gradient-to-r from-yellow-500 to-amber-400"
              valueClass="text-yellow-400"
            />
          ))}
        </ChartCard>

        <ChartCard title="Regional SLA overdue" subtitle="Cases past response deadline">
          {(regions.data ?? []).map((r) => (
            <BarChart.Bar
              key={r.region}
              label={r.region}
              value={r.slaOverdue}
              max={Math.max(...(regions.data ?? []).map((x) => x.slaOverdue), 1)}
              barClass="bg-gradient-to-r from-rose-600 to-red-400"
              valueClass="text-rose-400"
            />
          ))}
        </ChartCard>

        <ChartCard title="Regional resolution rate" subtitle="Resolved or closed">
          {(regions.data ?? []).map((r) => (
            <BarChart.Bar
              key={r.region}
              label={r.region}
              value={r.resolutionRate}
              max={100}
              suffix="%"
              barClass="bg-gradient-to-r from-emerald-600 to-teal-400"
              valueClass="text-emerald-400"
            />
          ))}
        </ChartCard>

        <ChartCard title="Regional response time" subtitle="Average minutes to first response">
          {(regions.data ?? []).map((r) => (
            <BarChart.Bar
              key={r.region}
              label={r.region}
              value={r.avgAckMins ?? 0}
              max={Math.max(...(regions.data ?? []).map((x) => x.avgAckMins ?? 0), 1)}
              suffix="m"
              barClass="bg-gradient-to-r from-sky-600 to-blue-400"
              valueClass="text-sky-400"
            />
          ))}
        </ChartCard>
      </div>

      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5 sm:p-6 shadow-xl shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Submission trend
            </h2>
            <span className="text-[11px] text-slate-500">
              last {trends.data?.length ?? 0} days
            </span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-500" /> Submitted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Resolved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> SLA breach
            </span>
          </div>
        </div>

        {trends.data && trends.data.length > 0 ? (
          <TrendBars data={trends.data} />
        ) : (
          <div className="text-center py-10 text-slate-500 text-xs">No trend data.</div>
        )}
      </div>
    </div>
  );
}

function KpiBox({
  label,
  value,
  accent,
  glow,
}: {
  label: string;
  value: number | string;
  accent: string;
  glow: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br ${glow} to-slate-950 p-4 shadow-lg`}
    >
      <div className={`text-[10px] font-bold uppercase tracking-wider ${accent} opacity-90`}>
        {label}
      </div>
      <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-2 tabular-nums">
        {value}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl shadow-black/15 space-y-4">
      <div>
        <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-3.5">{children}</div>
    </div>
  );
}

function TrendBars({
  data,
}: {
  data: Array<{ date: string; submitted: number; resolved: number; slaBreaches: number }>;
}) {
  const max = Math.max(...data.map((d) => d.submitted + d.resolved + d.slaBreaches), 1);
  const width = 100 / Math.max(data.length, 1);

  return (
    <div className="relative">
      <div className="flex items-end gap-0.5 sm:gap-1 h-36">
        {data.map((d) => {
          const subH = (d.submitted / max) * 100;
          const resH = (d.resolved / max) * 100;
          const breachH = (d.slaBreaches / max) * 100;
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative"
              style={{ minWidth: `${width}%` }}
            >
              <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[10px] text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 shadow-xl">
                <div className="font-bold mb-0.5">{d.date}</div>
                <div className="text-yellow-400">Submitted: {d.submitted}</div>
                <div className="text-emerald-400">Resolved: {d.resolved}</div>
                <div className="text-rose-400">SLA breach: {d.slaBreaches}</div>
              </div>
              {d.slaBreaches > 0 && (
                <div className="w-full bg-rose-500 rounded-t-sm" style={{ height: `${breachH}%` }} />
              )}
              {d.resolved > 0 && (
                <div className="w-full bg-emerald-500" style={{ height: `${resH}%` }} />
              )}
              {d.submitted > 0 && (
                <div className="w-full bg-yellow-500 rounded-t-sm" style={{ height: `${subH}%` }} />
              )}
              {!d.submitted && !d.resolved && !d.slaBreaches && (
                <div className="w-full bg-slate-800 rounded-sm" style={{ height: '3px' }} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 mt-3 font-mono">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
