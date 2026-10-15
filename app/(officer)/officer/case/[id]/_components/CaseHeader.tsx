'use client';

import React from 'react';
import { Copy, Check, MapPin, Clock, User, Paperclip, ExternalLink, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Incident } from '@/app/types';
import { statusLabel, statusColor } from '@/app/lib/statusLabels';

const SEV_STYLE: Record<Incident['severity'], string> = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-yellow-500 text-slate-950',
  LOW: 'bg-slate-600 text-slate-100',
};

export function CaseHeader({ incident }: { incident: Incident }) {
  const [copied, setCopied] = React.useState(false);
  const overdue =
    incident.slaDueAt &&
    new Date(incident.slaDueAt) < new Date() &&
    !['closed', 'resolved', 'rejected'].includes(incident.status);

  const trackPath = `/r/${encodeURIComponent(incident.id)}`;
  const trackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${trackPath}`
      : trackPath;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(incident.id);
      setCopied(true);
      toast.success('Reference ID copied.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy.');
    }
  };

  const handleCopyTrack = async () => {
    try {
      await navigator.clipboard.writeText(trackUrl);
      toast.success('Citizen track link copied.');
    } catch {
      toast.error('Could not copy link.');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 font-mono text-lg font-black text-yellow-400 hover:text-yellow-300"
          >
            {incident.id}
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 opacity-60" />}
          </button>
          <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {incident.region}
            </span>
            <span>{incident.mode}</span>
            <span>{new Date(incident.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded ${SEV_STYLE[incident.severity]}`}
          >
            {incident.severity}
          </span>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded ${statusColor(incident.status)}`}>
            {statusLabel(incident.status)}
          </span>
          {overdue && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded bg-rose-600/20 text-rose-300 border border-rose-500/40">
              <Clock className="w-3 h-3" /> SLA overdue
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopyTrack}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:border-yellow-500/50 hover:text-yellow-300 transition"
        >
          <Link2 className="w-3 h-3" />
          Copy citizen track link
        </button>
        <a
          href={trackPath}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:border-yellow-500/50 hover:text-yellow-300 transition"
        >
          <ExternalLink className="w-3 h-3" />
          Open citizen view
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <Field label="Category" value={incident.category} />
        <Field label="Location" value={incident.location} />
        {incident.vehicleRegistration && <Field label="Vehicle" value={incident.vehicleRegistration} mono />}
        {incident.operatorName && <Field label="Operator" value={incident.operatorName} />}
        {incident.driverName && <Field label="Driver" value={incident.driverName} />}
        {incident.establishmentName && (
          <Field label="Establishment" value={incident.establishmentName} />
        )}
        <Field
          label="Assigned officer"
          value={incident.assignedOfficerName ?? 'Unassigned'}
          valueClass={incident.assignedOfficerName ? '' : 'text-sky-400'}
        />
        <Field
          label="SLA due"
          value={incident.slaDueAt ? new Date(incident.slaDueAt).toLocaleString() : '—'}
          valueClass={overdue ? 'text-rose-400 font-bold' : ''}
        />
      </div>

      <div className="border-t border-slate-800 pt-4">
        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Description</div>
        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
          {incident.description}
        </p>
      </div>

      {!incident.isAnonymous && (incident.reporterName || incident.reporterPhone) && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs">
          <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
            <User className="w-3 h-3" /> Reporter
          </div>
          <div className="text-slate-200">
            {incident.reporterName ?? 'Unnamed'}
            {incident.reporterPhone && (
              <span className="text-slate-400"> · {incident.reporterPhone}</span>
            )}
          </div>
        </div>
      )}

      {incident.attachments.length > 0 && (
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-bold mb-2 flex items-center gap-1">
            <Paperclip className="w-3 h-3" /> Evidence ({incident.attachments.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {incident.attachments.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-24 h-24 rounded-xl overflow-hidden border border-slate-700 hover:border-yellow-500/60"
              >
                <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  valueClass = '',
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
      <div className="text-[10px] text-slate-500 uppercase font-bold">{label}</div>
      <div className={`text-slate-200 font-semibold mt-0.5 ${mono ? 'font-mono' : ''} ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}
