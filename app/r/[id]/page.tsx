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
} from 'lucide-react';
import { useIncident } from '@/app/lib/api/hooks/useIncident';
import { toast } from 'sonner';
import type { IncidentEvent, IncidentStatus } from '@/app/types';

const STATUS_LABELS: Record<IncidentStatus, string> = {
  submitted: 'Submitted',
  triaged: 'Under review',
  assigned: 'Assigned to officer',
  in_progress: 'In progress',
  awaiting_info: 'Awaiting information',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Not accepted',
};

const STATUS_COLORS: Record<IncidentStatus, string> = {
  submitted: 'bg-slate-700 text-slate-200',
  triaged: 'bg-sky-500/20 text-sky-300 border border-sky-500/40',
  assigned: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
  in_progress: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  awaiting_info: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
  escalated: 'bg-red-500/20 text-red-300 border border-red-500/40',
  resolved: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
  closed: 'bg-slate-700 text-slate-300',
  rejected: 'bg-red-900/40 text-red-300 border border-red-800/60',
};

export default function TrackIncidentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = decodeURIComponent(params.id ?? '');
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useIncident(id);

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
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
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
            <span className="font-mono text-yellow-400">{id}</span>. Check the ID and try
            again.
          </p>
        </div>
      </div>
    );
  }

  const incident = data.incident;
  const events: IncidentEvent[] = data.events ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      <button
        type="button"
        onClick={() => router.push('/track')}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-yellow-400"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to track
      </button>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              Reference ID
            </p>
            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-xl font-black font-mono text-yellow-400">{incident.id}</h1>
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
          <span
            className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_COLORS[incident.status]}`}
          >
            {STATUS_LABELS[incident.status]}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
            <p className="text-[10px] uppercase text-slate-500 font-bold">Category</p>
            <p className="text-white font-semibold mt-0.5">{incident.category}</p>
          </div>
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
            <p className="text-[10px] uppercase text-slate-500 font-bold">Location</p>
            <p className="text-white font-semibold mt-0.5">{incident.location}</p>
          </div>
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
            <p className="text-[10px] uppercase text-slate-500 font-bold">Region</p>
            <p className="text-white font-semibold mt-0.5">{incident.region}</p>
          </div>
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
            <p className="text-[10px] uppercase text-slate-500 font-bold">Submitted</p>
            <p className="text-white font-semibold mt-0.5">
              {new Date(incident.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {incident.description && (
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
            <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Description</p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{incident.description}</p>
          </div>
        )}

        {incident.assignedOfficerName && (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              Assigned to <strong className="text-white">{incident.assignedOfficerName}</strong>
              {incident.assignedAgencyCode ? ` (${incident.assignedAgencyCode})` : ''}
            </span>
          </div>
        )}
      </div>

      {events.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-extrabold text-white">Timeline</h2>
          </div>
          <ol className="space-y-3">
            {events
              .filter((e) => e.isPublic)
              .map((event) => (
                <li
                  key={event.id}
                  className="border-l-2 border-slate-700 pl-4 py-1 text-sm text-slate-300"
                >
                  <p className="text-[10px] text-slate-500 font-mono">
                    {new Date(event.createdAt).toLocaleString()}
                  </p>
                  <p className="font-semibold text-white">{event.type.replace('incident.', '')}</p>
                  {event.actorName && (
                    <p className="text-xs text-slate-400">by {event.actorName}</p>
                  )}
                </li>
              ))}
          </ol>
        </div>
      )}
    </div>
  );
}
