'use client';

import React, { useEffect, useRef } from 'react';
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
  kiosk?: boolean;
  /** Slow continuous scroll for wall displays */
  autoScroll?: boolean;
}

export function LiveFeed({
  incidents,
  isLoading,
  selectedIncidentId,
  onSelectIncident,
  kiosk = false,
  autoScroll = false,
}: LiveFeedProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const paused = useRef(false);

  useEffect(() => {
    if (!autoScroll || !kiosk) return;
    const el = listRef.current;
    if (!el) return;

    const id = window.setInterval(() => {
      if (paused.current || !listRef.current) return;
      const node = listRef.current;
      const max = node.scrollHeight - node.clientHeight;
      if (max <= 0) return;
      if (node.scrollTop >= max - 2) {
        node.scrollTop = 0;
      } else {
        node.scrollTop += 1;
      }
    }, 50);

    return () => window.clearInterval(id);
  }, [autoScroll, kiosk, incidents.length]);

  return (
    <div className="h-full flex flex-col">
      <div
        className={`p-3 flex items-center justify-between shrink-0 ${
          kiosk ? 'border-b border-white/5' : 'border-b border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span
            className={`font-black uppercase tracking-widest text-emerald-400 ${
              kiosk ? 'text-xs' : 'text-[10px]'
            }`}
          >
            Live feed
          </span>
        </div>
        <span className={`font-mono text-slate-500 ${kiosk ? 'text-xs' : 'text-[10px]'}`}>
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
        <div
          ref={listRef}
          className={`flex-1 overflow-y-auto ${
            kiosk ? 'divide-y divide-white/5' : 'divide-y divide-slate-800/60'
          }`}
          onMouseEnter={() => {
            paused.current = true;
          }}
          onMouseLeave={() => {
            paused.current = false;
          }}
        >
          {incidents.map((incident) => {
            const overdue =
              incident.slaDueAt &&
              new Date(incident.slaDueAt) < new Date() &&
              !['closed', 'resolved', 'rejected'].includes(incident.status);
            const selected = incident.id === selectedIncidentId;

            return (
              <button
                key={incident.id}
                type="button"
                onClick={() => onSelectIncident(incident.id)}
                className={`w-full text-left transition border-l-2 ${
                  kiosk ? 'p-4' : 'p-3'
                } ${
                  selected
                    ? 'bg-yellow-500/10 border-l-yellow-500'
                    : kiosk
                      ? 'hover:bg-white/[0.04] border-l-transparent'
                      : 'hover:bg-slate-800/60 border-l-transparent'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`font-mono font-bold text-yellow-400 truncate ${
                      kiosk ? 'text-base' : 'text-[11px]'
                    }`}
                  >
                    {incident.id}
                  </span>
                  <span
                    className={`font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
                      kiosk ? 'text-[11px]' : 'text-[9px]'
                    } ${SEV_STYLE[incident.severity]}`}
                  >
                    {incident.severity}
                  </span>
                </div>

                <div className={`font-bold text-white truncate ${kiosk ? 'text-base' : 'text-xs'}`}>
                  {incident.category}
                </div>
                <div
                  className={`text-slate-400 truncate mt-0.5 ${
                    kiosk ? 'text-sm' : 'text-[11px]'
                  }`}
                >
                  {incident.location} · {incident.region}
                </div>

                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <span
                    className={`font-bold uppercase ${STATUS_COLOR[incident.status]} ${
                      kiosk ? 'text-xs' : 'text-[10px]'
                    }`}
                  >
                    {incident.status.replace('_', ' ')}
                  </span>
                  <div
                    className={`flex items-center gap-2 text-slate-500 shrink-0 ${
                      kiosk ? 'text-xs' : 'text-[10px]'
                    }`}
                  >
                    {overdue && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-600/20 text-rose-300 border border-rose-500/40">
                        <Clock className="w-3 h-3" /> SLA
                      </span>
                    )}
                    <span className="opacity-70">
                      {new Date(incident.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {!kiosk && <ArrowRight className="w-3 h-3 opacity-50" />}
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
