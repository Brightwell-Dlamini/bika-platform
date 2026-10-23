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
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl border border-yellow-500/25 bg-yellow-500/10 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Analytics</h1>
            <p className="text-sm text-slate-400 mt-1">
              National intelligence · performance · pressure
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-[#0a0e16] border border-white/[0.06] p-1 rounded-2xl inline-flex gap-0.5">
            {ANALYTICS_RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
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
        <Kpi label="Total" value={kpis.data?.total ?? '—'} />
        <Kpi label="Open" value={kpis.data?.open ?? '—'} tone="sky" />
        <Kpi label="Critical" value={kpis.data?.critical ?? '—'} tone="red" />
        <Kpi label="SLA overdue" value={kpis.data?.slaOverdue ?? '—'} tone="rose" />
        <Kpi
          label="Resolution"
          value={kpis.data ? `${kpis.data.resolutionRate}%` : '—'}
          tone="emerald"
        />
        <Kpi label="Compliments" value={kpis.data?.compliments ?? '—'} tone="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Chart title="Regional volume" subtitle="Total incidents by region">
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
        </Chart>

        <Chart title="Regional SLA overdue" subtitle="Past response deadline">
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
        </Chart>

        <Chart title="Resolution rate" subtitle="Resolved or closed">
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
        </Chart>

        <Chart title="Response time" subtitle="Avg minutes to first response">
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
        </Chart>
      </div>

      <section className="rounded-[1.75rem] border border-white/[0.06] bg-[#0a0e16] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-[0.12em]">Trend</h2>
            <span className="text-[11px] text-slate-500">last {trends.data?.length ?? 0} days</span>
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
          <div className="text-center py-12 text-slate-500 text-xs">No trend data.</div>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number | string;
  tone?: 'neutral' | 'sky' | 'red' | 'rose' | 'emerald' | 'violet';
}) {
  const tones = {
    neutral: 'text-white',
    sky: 'text-sky-300',
    red: 'text-red-300',
    rose: 'text-rose-300',
    emerald: 'text-emerald-300',
    violet: 'text-violet-300',
  } as const;
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0a0e16] p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl sm:text-3xl font-black font-mono tabular-nums ${tones[tone]}`}>
        {value}
      </div>
    </div>
  );
}

function Chart({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/[0.06] bg-[#0a0e16] p-5 space-y-4">
      <div>
        <h2 className="text-sm font-black text-white tracking-tight">{title}</h2>
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
    <div>
      <div className="flex items-end gap-0.5 sm:gap-1 h-40">
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
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-[10px] text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 shadow-2xl">
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
