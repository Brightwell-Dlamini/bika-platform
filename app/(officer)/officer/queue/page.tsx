'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  Clock,
  Loader2,
  X,
  SlidersHorizontal,
  CheckCircle2,
  Inbox,
  UserPlus,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useIncidents } from '@/app/lib/api/hooks/useIncidents';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import {
  useAcknowledgeIncident,
  useAssignIncident,
} from '@/app/lib/api/mutations/useIncidentActions';
import { statusLabel, statusColor } from '@/app/lib/statusLabels';
import type { AgencyCode, Incident, IncidentStatus, Severity } from '@/app/types';
import { QueueKeyboardNav } from './_components/QueueKeyboardNav';
import { QueueSkeleton } from '@/app/components/ui/Skeleton';

const SEVERITY_RAIL: Record<Severity, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-slate-600',
};

const SEVERITY_STYLE: Record<Severity, string> = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30',
  LOW: 'bg-slate-800 text-slate-300 border border-slate-700',
};

const STATUS_KEYS: IncidentStatus[] = [
  'submitted',
  'triaged',
  'assigned',
  'in_progress',
  'awaiting_info',
  'escalated',
  'resolved',
  'closed',
  'rejected',
];

export default function QueuePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const me = useOfficerMe();

  const scope = sp.get('scope') ?? 'all';
  const overdue = sp.get('overdue') === '1';
  const status = (sp.get('status') as IncidentStatus | null) ?? undefined;
  const severity = (sp.get('severity') as Severity | null) ?? undefined;
  const region = sp.get('region') ?? undefined;
  const q = sp.get('q') ?? '';

  const [searchDraft, setSearchDraft] = useState(q);
  useEffect(() => {
    setSearchDraft(q);
  }, [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchDraft !== q) setParam('q', searchDraft || null);
    }, 320);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const filters = useMemo(() => {
    const base: Record<string, unknown> = {
      status,
      severity,
      region: region as never,
      search: q || undefined,
      onlyOverdue: overdue || undefined,
      limit: 200,
    };
    if (scope === 'mine' && me.data) {
      base.assignedTo = me.data.user.id;
    }
    if (scope === 'unassigned') {
      base.onlyUnassigned = true;
    }
    if (scope === 'resolved') {
      base.status = base.status ?? 'resolved';
    }
    return base;
  }, [scope, status, severity, region, q, overdue, me.data]);

  const incidents = useIncidents(filters as never, {
    enabled: scope !== 'mine' || Boolean(me.data),
    refetchInterval: 10_000,
  });

  const rows = incidents.data?.incidents ?? [];

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    router.replace(`/officer/queue?${next.toString()}`);
  };

  const scopes = [
    { id: 'all', label: 'All' },
    { id: 'mine', label: 'Mine' },
    { id: 'unassigned', label: 'Unassigned' },
  ] as const;

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              Live queue
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Case queue</h1>
          <p className="text-xs text-slate-400 mt-1.5">
            <span className="text-slate-200 font-semibold">{rows.length}</span> shown
            {incidents.data?.total != null ? (
              <>
                {' '}
                · <span className="font-mono">{incidents.data.total}</span> matched
              </>
            ) : null}
            {overdue ? <span className="text-rose-400"> · overdue only</span> : null}
            <span className="text-slate-600"> · updates automatically</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex p-1 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner">
            {scopes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setParam('scope', s.id === 'all' ? null : s.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  scope === s.id
                    ? 'bg-yellow-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setParam('overdue', overdue ? null : '1')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              overdue
                ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-900/30'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Overdue
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-3 sm:p-4 flex flex-col lg:flex-row gap-2.5 shadow-lg shadow-black/20">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search ID, vehicle, location, description…"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-yellow-500/70"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={status ?? ''}
            onChange={(e) => setParam('status', e.target.value || null)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="">All statuses</option>
            {STATUS_KEYS.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
          <select
            value={severity ?? ''}
            onChange={(e) => setParam('severity', e.target.value || null)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="">All severity</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select
            value={region ?? ''}
            onChange={(e) => setParam('region', e.target.value || null)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="">All regions</option>
            <option value="Hhohho">Hhohho</option>
            <option value="Manzini">Manzini</option>
            <option value="Shiselweni">Shiselweni</option>
            <option value="Lubombo">Lubombo</option>
          </select>
          {(q || status || severity || region || overdue || scope !== 'all') && (
            <button
              type="button"
              onClick={() => router.replace('/officer/queue')}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-yellow-400 px-2"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {incidents.isLoading ? (
        <QueueSkeleton rows={7} />
      ) : incidents.isError ? (
        <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-6 text-center text-red-300 text-sm">
          {incidents.error.message}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center space-y-3">
          <Inbox className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-sm font-bold text-slate-300">No cases match these filters</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try clearing filters, switching scope, or reviewing overdue cases.
          </p>
          <button
            type="button"
            onClick={() => router.replace('/officer/queue')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-yellow-400 hover:underline"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Reset filters
          </button>
        </div>
      ) : (
        <>
          <QueueKeyboardNav incidents={rows} />
          <div className="space-y-2.5">
            {rows.map((inc) => (
              <div key={inc.id} data-kbd-row>
                <CaseRow
                  incident={inc}
                  currentUserId={me.data?.user.id}
                  agencyCode={
                    (inc.assignedAgencyCode as AgencyCode | null) ||
                    me.data?.user.agencyCode ||
                    'BIKA'
                  }
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CaseRow({
  incident,
  currentUserId,
  agencyCode,
}: {
  incident: Incident;
  currentUserId?: string;
  agencyCode: AgencyCode | string;
}) {
  const overdue =
    incident.slaDueAt &&
    new Date(incident.slaDueAt) < new Date() &&
    !['closed', 'resolved', 'rejected'].includes(incident.status);

  const canAcknowledge =
    Boolean(currentUserId) &&
    ['submitted', 'triaged', 'assigned'].includes(incident.status) &&
    (!incident.assignedOfficerId || incident.assignedOfficerId === currentUserId);

  const canClaim =
    Boolean(currentUserId) &&
    !incident.assignedOfficerId &&
    !['closed', 'resolved', 'rejected'].includes(incident.status);

  const acknowledge = useAcknowledgeIncident(incident.id);
  const assign = useAssignIncident(incident.id);

  const handleAcknowledge = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    acknowledge.mutate(undefined, {
      onSuccess: () => toast.success(`Acknowledged ${incident.id}`),
      onError: (err) => toast.error(err.message || 'Could not acknowledge'),
    });
  };

  const handleClaim = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId) return;
    assign.mutate(
      {
        officerId: currentUserId,
        agencyCode: agencyCode as AgencyCode,
        reason: 'Self-claim from queue',
      },
      {
        onSuccess: () => toast.success(`Claimed ${incident.id}`),
        onError: (err) => toast.error(err.message || 'Could not claim case'),
      }
    );
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-slate-900/70 transition-all duration-200 hover:bg-slate-900 ${
        overdue
          ? 'border-rose-500/40 shadow-[0_0_0_1px_rgba(244,63,94,0.08)]'
          : 'border-slate-800/90 hover:border-yellow-500/30'
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${SEVERITY_RAIL[incident.severity]}`} />
      <div className="pl-4 pr-4 py-3.5 sm:pl-5 flex flex-wrap items-start justify-between gap-3">
        <Link href={`/officer/case/${incident.id}`} className="flex-1 min-w-0 block">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-mono text-xs font-bold text-yellow-400 tracking-tight">
              {incident.id}
            </span>
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${SEVERITY_STYLE[incident.severity]}`
              }
            >
              {incident.severity}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${statusColor(incident.status)}`}
            >
              {statusLabel(incident.status)}
            </span>
            {overdue && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-600/20 text-rose-300 border border-rose-500/40">
                <Clock className="w-3 h-3" /> SLA
              </span>
            )}
          </div>
          <div className="text-sm font-bold text-white truncate group-hover:text-yellow-50">
            {incident.category}
            <span className="text-slate-500 font-semibold"> · </span>
            <span className="text-slate-200">{incident.location}</span>
          </div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5 leading-relaxed">
            {incident.description}
          </div>
        </Link>
        <div className="text-[11px] text-slate-500 shrink-0 text-right space-y-1.5 min-w-[7.5rem]">
          <div className="text-slate-400">
            {incident.region} · {incident.mode}
          </div>
          <div>
            {incident.assignedOfficerName ? (
              <span className="text-slate-300">{incident.assignedOfficerName}</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sky-400 font-semibold">
                <UserPlus className="w-3 h-3" /> Unassigned
              </span>
            )}
          </div>
          <div className="opacity-60 font-mono text-[10px]">
            {new Date(incident.createdAt).toLocaleString()}
          </div>
          <div className="flex items-center justify-end gap-2 pt-0.5">
            {canClaim && (
              <button
                type="button"
                onClick={handleClaim}
                disabled={assign.isPending}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-[10px] font-black disabled:opacity-50"
              >
                {assign.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <UserPlus className="w-3 h-3" />
                )}
                Claim
              </button>
            )}
            {canAcknowledge && (
              <button
                type="button"
                onClick={handleAcknowledge}
                disabled={acknowledge.isPending}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-[10px] font-bold disabled:opacity-50"
              >
                {acknowledge.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3 h-3" />
                )}
                Ack
              </button>
            )}
            <Link
              href={`/officer/case/${incident.id}`}
              className="inline-flex items-center text-slate-500 group-hover:text-yellow-400"
              aria-label="Open case"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
