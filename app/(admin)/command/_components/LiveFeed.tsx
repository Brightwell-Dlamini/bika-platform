'use client';

import React from 'react';
import { Clock, Loader2, ArrowRight } from 'lucide-react';
import type { Incident, IncidentStatus, Severity } from '@/app/types';

const SEV_STYLE: Record<Severity, string> = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  LOW: 'bg-slate-700 text-slate-200',
};

const STATUS_COLOR: Record<IncidentStatus, string> = {
  submitted: 'text-slate-300',
  triaged: 'text-sky-300',
  assigned: 'text-blue-300',
  in_progress: 'text-yellow-300',
  awaiting_info: 'text-amber-300',
  escalated: 'text-red-300',
  resolved: 'text-emerald-300',
  closed: 'text-slate-400',
  rejected: 'text-red-400',
};

interface LiveFeedProps {
  incidents: Incident[];
  isLoading: boolean;
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
}

export function LiveFeed({
  incidents,
  isLoading,
  selectedIncidentId,
  onSelectIncident,
}: LiveFeedProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
            Live feed
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          {incidents.length} incident{incidents.length === 1 ? '' : 's'}
        </span>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading feed…
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-xs p-6 text-center">
          No incidents match the current filters.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {incidents.map((incident) => {
            const overdue =
              incident.slaDueAt &&
              new Date(incident.slaDueAt) < new Date() &&
              !['closed', 'resolved', 'rejected'].includes(incident.status);
            const isSelected = incident.id === selectedIncidentId;

            return (
              <button
                key={incident.id}
                onClick={() => onSelectIncident(incident.id)}
                className={`w-full text-left p-3 transition-colors ${
                  isSelected
                    ? 'bg-yellow-500/10 border-l-2 border-l-yellow-500'
                    : 'hover:bg-slate-800/60 border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-[11px] font-bold text-yellow-400 truncate">
                    {incident.id}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${SEV_STYLE[incident.severity]}`}
                  >
                    {incident.severity}
                  </span>
                </div>

                <div className="text-xs font-bold text-white truncate">
                  {incident.category}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {incident.location} · {incident.region}
                </div>

                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <span
                    className={`text-[10px] font-bold uppercase ${STATUS_COLOR[incident.status]}`}
                  >
                    {incident.status.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 shrink-0">
                    {overdue && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-600/20 text-rose-300 border border-rose-500/40">
                        <Clock className="w-2.5 h-2.5" /> SLA
                      </span>
                    )}
                    <span className="opacity-70">
                      {new Date(incident.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <ArrowRight className="w-3 h-3 opacity-50" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
