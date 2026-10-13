'use client';

import React, { useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';
import type { KpiSummary, RegionBreakdown, AnalyticsRange } from '@/app/types/analytics';

interface ExportPanelProps {
  kpis: KpiSummary | undefined;
  regions: RegionBreakdown[] | undefined;
  range: AnalyticsRange;
}

export function ExportPanel({ kpis, regions, range }: ExportPanelProps) {
  const [busy, setBusy] = useState(false);

  const handleCsvExport = () => {
    if (!kpis || !regions) {
      toast.error('Analytics still loading.');
      return;
    }
    setBusy(true);
    try {
      const lines: string[] = [];
      lines.push(`BIKA Analytics Export,${new Date().toISOString()}`);
      lines.push(`Range,${range}`);
      lines.push('');
      lines.push('KPIs');
      lines.push('Metric,Value');
      lines.push(`Total,${kpis.total}`);
      lines.push(`Open,${kpis.open}`);
      lines.push(`Critical,${kpis.critical}`);
      lines.push(`SLA Overdue,${kpis.slaOverdue}`);
      lines.push(`Resolved,${kpis.resolved}`);
      lines.push(`Resolution Rate,${kpis.resolutionRate}%`);
      lines.push(`Avg First Response (mins),${kpis.avgFirstResponseMins ?? 'N/A'}`);
      lines.push(`Avg Resolution (mins),${kpis.avgResolutionMins ?? 'N/A'}`);
      lines.push(`Compliments,${kpis.compliments}`);
      lines.push(`Emergencies,${kpis.emergencies}`);
      lines.push('');
      lines.push('Regional Breakdown');
      lines.push('Region,Total,Open,Critical,SLA Overdue,Resolved,Resolution Rate,Avg Ack (mins),Avg Resolve (mins)');
      for (const r of regions) {
        lines.push(
          [
            r.region,
            r.total,
            r.open,
            r.critical,
            r.slaOverdue,
            r.resolved,
            `${r.resolutionRate}%`,
            r.avgAckMins ?? 'N/A',
            r.avgResolveMins ?? 'N/A',
          ].join(',')
        );
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bika-analytics-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded.');
    } catch {
      toast.error('Could not export.');
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCsvExport}
        disabled={busy}
        className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-yellow-400 disabled:opacity-50"
      >
        <Download className="w-3.5 h-3.5" /> CSV
      </button>
      <button
        onClick={handlePrint}
        className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-sky-400"
      >
        <Printer className="w-3.5 h-3.5" /> Print
      </button>
    </div>
  );
}
