'use client';

import React from 'react';
import { Clock, Lock, Globe } from 'lucide-react';
import type { IncidentEvent } from '@/app/types';

export function CaseTimeline({ events }: { events: IncidentEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center text-slate-500 text-xs">
        No events yet.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl shadow-black/20">
      <h3 className="text-sm font-extrabold text-white mb-5 flex items-center gap-2">
        <Clock className="w-4 h-4 text-yellow-400" />
        Timeline
        <span className="text-[11px] font-mono text-slate-500 font-normal">({events.length})</span>
      </h3>
      <div className="space-y-0">
        {events.map((e, i) => {
          const body = bodyFor(e);
          return (
            <div key={e.id} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0 pt-0.5">
                <div
                  className={`w-2.5 h-2.5 rounded-full ring-4 ${
                    e.isPublic
                      ? 'bg-emerald-400 ring-emerald-500/15'
                      : 'bg-purple-400 ring-purple-500/15'
                  }`}
                />
                {i < events.length - 1 && (
                  <div className="w-px flex-1 min-h-[1.25rem] bg-slate-800" />
                )}
              </div>
              <div className="pb-5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white">{labelFor(e.type)}</span>
                  {e.isPublic ? (
                    <span
                      title="Visible to the citizen"
                      className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md"
                    >
                      <Globe className="w-2.5 h-2.5" /> Public
                    </span>
                  ) : (
                    <span
                      title="Internal only"
                      className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-md"
                    >
                      <Lock className="w-2.5 h-2.5" /> Internal
                    </span>
                  )}
                </div>
                {body && (
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed whitespace-pre-wrap">
                    {body}
                  </p>
                )}
                <div className="text-[10px] text-slate-500 mt-1.5 font-mono">
                  {new Date(e.createdAt).toLocaleString()}
                  <span className="text-slate-600"> · </span>
                  <span className="text-slate-400 font-sans">{e.actorName}</span>
                  <span className="text-slate-600"> ({e.actorRole})</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function labelFor(type: IncidentEvent['type']): string {
  switch (type) {
    case 'incident.submitted':
      return 'Submitted';
    case 'incident.triaged':
      return 'Triaged';
    case 'incident.assigned':
      return 'Assigned';
    case 'incident.status_changed':
      return 'Status changed';
    case 'incident.escalated':
      return 'Escalated';
    case 'incident.resolved':
      return 'Resolved';
    case 'incident.closed':
      return 'Closed';
    case 'incident.note_added':
      return 'Note added';
    case 'incident.message_sent':
      return 'Message';
    case 'incident.rated':
      return 'Citizen rated';
    case 'incident.attachment_added':
      return 'Attachment added';
    case 'incident.duplicate_linked':
      return 'Duplicate linked';
    default:
      return String(type).replace('incident.', '').replace(/_/g, ' ');
  }
}

function bodyFor(e: IncidentEvent): string {
  const p = e.payload as Record<string, unknown>;
  if (typeof p.note === 'string' && p.note) return p.note;
  if (typeof p.reason === 'string' && p.reason) return p.reason;
  if (typeof p.message === 'string' && p.message) return p.message;
  if (typeof p.from === 'string' && typeof p.to === 'string') {
    return `${p.from} → ${p.to}`;
  }
  if (typeof p.to === 'string') return `→ ${p.to}`;
  if (typeof p.score === 'number') {
    return `Rating: ${p.score}/5${typeof p.comment === 'string' && p.comment ? ` — ${p.comment}` : ''}`;
  }
  return '';
}
