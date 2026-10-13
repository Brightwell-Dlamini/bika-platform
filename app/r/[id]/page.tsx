'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useIncident } from '@/app/lib/api/hooks/useIncident';
import { statusLabel, statusColor } from '@/app/lib/statusLabels';
import { toast } from 'sonner';
import type { IncidentEvent } from '@/app/types';

function humanEventType(type: string): string {
  const map: Record<string, string> = {
    'incident.submitted': 'Report received',
    'incident.triaged': 'Under review',
    'incident.assigned': 'Assigned to an officer',
    'incident.status_changed': 'Status updated',
    'incident.note': 'Officer update',
    'incident.escalated': 'Escalated',
    'incident.resolved': 'Marked resolved',
    'incident.closed': 'Closed',
  };
  return map[type] ?? type.replace(/^incident\./, '').replace(/_/g, ' ');
}

export default function TrackIncidentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = decodeURIComponent(params.id ?? '');
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useIncident(id);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast.success('Reference ID copied.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Looking up {id}…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4 animate-fadeIn">
        <button
          type="button"
          onClick={() => router.push('/track')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-yellow-400"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to track
        </button>
        <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-red-400 font-bold">
            <AlertTriangle className="w-5 h-5" />
            <span>Report not found</span>
          </div>
          <p className="text-sm text-slate-400">
            No report matches reference{' '}
            <span className="font-mono text-yellow-400">{id}</span>. Check the ID and try again.
          </p>
          <button
            type="button"
            onClick={() => router.push('/track')}
            className="text-xs font-bold text-yellow-400 hover:underline"
          >
            Try another reference ID
          </button>
        </div>
      </div>
    );
  }

  const incident = data.incident;
  const events: IncidentEvent[] = data.events ?? [];
  const publicEvents = events.filter((e) => e.isPublic);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => router.push('/track')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-yellow-400"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to track
        </button>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-yellow-400 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="relative bg-slate-900 border border-slate-800 rounded-[1.5rem] p-6 sm:p-8 shadow-2xl space-y-5 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(234,179,8,0.08),_transparent_55%)]" />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Reference ID</p>
            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-xl font-black font-mono text-yellow-400 select-all">{incident.id}</h1>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
                aria-label="Copy reference ID"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${statusColor(incident.status)}`}>
            {statusLabel(incident.status)}
          </span>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            ['Category', incident.category],
            ['Location', incident.location],
            ['Region', incident.region],
            ['Submitted', new Date(incident.createdAt).toLocaleString()],
          ].map(([k, v]) => (
            <div key={k} className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800">
              <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">{k}</p>
              <p className="text-white font-semibold mt-1">{v}</p>
            </div>
          ))}
        </div>

        {incident.description && (
          <div className="relative bg-slate-950/80 rounded-xl p-4 border border-slate-800">
            <p className="text-[10px] uppercase text-slate-500 font-bold mb-1 tracking-wider">Description</p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{incident.description}</p>
          </div>
        )}

        {incident.assignedOfficerName && (
          <div className="relative flex items-center gap-2 text-sm text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Assigned to <strong className="text-white">{incident.assignedOfficerName}</strong>
              {incident.assignedAgencyCode ? ` (${incident.assignedAgencyCode})` : ''}
            </span>
          </div>
        )}
      </div>

      {publicEvents.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-[1.25rem] p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-extrabold text-white">Timeline</h2>
          </div>
          <ol className="space-y-3">
            {publicEvents.map((event) => (
              <li
                key={event.id}
                className="border-l-2 border-yellow-500/30 pl-4 py-1 text-sm text-slate-300"
              >
                <p className="text-[10px] text-slate-500 font-mono">
                  {new Date(event.createdAt).toLocaleString()}
                </p>
                <p className="font-semibold text-white">{humanEventType(event.type)}</p>
                {event.actorName && (
                  <p className="text-xs text-slate-400">by {event.actorName}</p>
                )}
                {typeof event.payload?.note === 'string' && event.payload.note && (
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{event.payload.note}</p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={() => router.push('/report')}
          className="text-xs font-bold text-slate-500 hover:text-yellow-400"
        >
          Submit another report
        </button>
      </div>
    </div>
  );
}
