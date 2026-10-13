'use client';

import React, { useState } from 'react';
import { BarChart3, Download, FileText, TrendingUp } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-yellow-400" />
            <h1 className="text-2xl font-black text-white">Analytics</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            National incident intelligence and performance metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl inline-flex gap-1">
            {ANALYTICS_RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  range === r.key
                    ? 'bg-yellow-500 text-slate-950 shadow'
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

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiBox label="Total" value={kpis.data?.total ?? '—'} accent="text-white" />
        <KpiBox label="Open" value={kpis.data?.open ?? '—'} accent="text-sky-400" />
        <KpiBox label="Critical" value={kpis.data?.critical ?? '—'} accent="text-red-400" />
        <KpiBox label="SLA overdue" value={kpis.data?.slaOverdue ?? '—'} accent="text-rose-400" />
        <KpiBox
          label="Resolution rate"
          value={kpis.data ? `${kpis.data.resolutionRate}%` : '—'}
          accent="text-emerald-400"
        />
        <KpiBox label="Compliments" value={kpis.data?.compliments ?? '—'} accent="text-purple-400" />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Regional volume"
          subtitle="Total incidents by region"
        >
          {(regions.data ?? []).map((r) => (
            <BarChart.Bar
              key={r.region}
              label={r.region}
              value={r.total}
              max={Math.max(...(regions.data ?? []).map((x) => x.total), 1)}
              barClass="bg-gradient-to-r from-yellow-500 to-amber-500"
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
              barClass="bg-gradient-to-r from-rose-600 to-red-500"
              valueClass="text-rose-400"
            />
          ))}
        </ChartCard>

        <ChartCard
          title="Regional resolution rate"
          subtitle="Percentage of incidents resolved or closed"
        >
          {(regions.data ?? []).map((r) => (
            <BarChart.Bar
              key={r.region}
              label={r.region}
              value={r.resolutionRate}
              max={100}
              suffix="%"
              barClass="bg-gradient-to-r from-emerald-600 to-teal-500"
              valueClass="text-emerald-400"
            />
          ))}
        </ChartCard>

        <ChartCard
          title="Regional response time"
          subtitle="Average minutes to first officer response"
        >
          {(regions.data ?? []).map((r) => (
            <BarChart.Bar
              key={r.region}
              label={r.region}
              value={r.avgAckMins ?? 0}
              max={Math.max(
                ...(regions.data ?? []).map((x) => x.avgAckMins ?? 0),
                1
              )}
              suffix="m"
              barClass="bg-gradient-to-r from-sky-600 to-blue-500"
              valueClass="text-sky-400"
            />
          ))}
        </ChartCard>
      </div>

      {/* Trend chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Submission trend (last {trends.data?.length ?? 0} days)
            </h2>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" /> Submitted
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Resolved
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> SLA breach
            </span>
          </div>
        </div>

        {trends.data && trends.data.length > 0 ? (
          <TrendBars data={trends.data} />
        ) : (
          <div className="text-center py-8 text-slate-500 text-xs">No trend data.</div>
        )}
      </div>
    </div>
  );
}

function KpiBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
      <div className={`text-[10px] font-bold uppercase tracking-wider ${accent}`}>{label}</div>
      <div className="text-2xl font-black font-mono text-white mt-1">{value}</div>
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div>
        <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-3">{children}</div>
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
      <div className="flex items-end gap-1 h-32">
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
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 shadow-xl">
                <div className="font-bold">{d.date}</div>
                <div className="text-yellow-400">Submitted: {d.submitted}</div>
                <div className="text-emerald-400">Resolved: {d.resolved}</div>
                <div className="text-rose-400">SLA breach: {d.slaBreaches}</div>
              </div>
              {d.slaBreaches > 0 && (
                <div
                  className="w-full bg-rose-500 rounded-t-sm"
                  style={{ height: `${breachH}%` }}
                />
              )}
              {d.resolved > 0 && (
                <div
                  className="w-full bg-emerald-500"
                  style={{ height: `${resH}%` }}
                />
              )}
              {d.submitted > 0 && (
                <div
                  className="w-full bg-yellow-500 rounded-t-sm"
                  style={{ height: `${subH}%` }}
                />
              )}
              {!d.submitted && !d.resolved && !d.slaBreaches && (
                <div className="w-full bg-slate-800" style={{ height: '2px' }} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
