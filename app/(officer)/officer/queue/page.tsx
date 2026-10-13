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
} from 'lucide-react';
import { toast } from 'sonner';
import { useIncidents } from '@/app/lib/api/hooks/useIncidents';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import {
  useTransitionIncident,
  useAssignIncident,
} from '@/app/lib/api/mutations/useIncidentActions';
import { statusLabel, statusColor } from '@/app/lib/statusLabels';
import type { Incident, IncidentStatus, Severity } from '@/app/types';
import { QueueKeyboardNav } from './_components/QueueKeyboardNav';

const SEVERITY_STYLE: Record<Severity, string> = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  LOW: 'bg-slate-700 text-slate-200',
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

  // Debounced search so typing does not thrash the API
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
      // Client-side filter after fetch — API supports assignedTo but not "null"
      base.limit = 300;
    }
    if (scope === 'resolved') {
      base.status = base.status ?? 'resolved';
    }
    return base;
  }, [scope, status, severity, region, q, overdue, me.data]);

  const incidents = useIncidents(filters as never, {
    enabled: scope !== 'mine' || Boolean(me.data),
  });

  const rows = useMemo(() => {
    let list = incidents.data?.incidents ?? [];
    if (scope === 'unassigned') {
      list = list.filter((i) => !i.assignedOfficerId);
    }
    return list;
  }, [incidents.data, scope]);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Case queue</h1>
          <p className="text-xs text-slate-400 mt-1">
            {rows.length} case{rows.length === 1 ? '' : 's'}
            {incidents.data?.total != null && scope !== 'unassigned'
              ? ` · ${incidents.data.total} total in query`
              : ''}
            {overdue ? ' · overdue only' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-800">
            {scopes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setParam('scope', s.id === 'all' ? null : s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  scope === s.id
                    ? 'bg-yellow-500 text-slate-950'
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              overdue
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Overdue
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search ID, vehicle reg, location, description…"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
          />
        </div>
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

      {incidents.isLoading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading cases…
        </div>
      ) : incidents.isError ? (
        <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-6 text-center text-red-300 text-sm">
          {incidents.error.message}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-slate-900 border border-dashed border-slate-700 rounded-2xl p-12 text-center space-y-3">
          <Inbox className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-sm font-bold text-slate-300">No cases match these filters</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try clearing filters, switching scope, or checking overdue cases.
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
          <div className="space-y-2">
            {rows.map((inc) => (
              <div key={inc.id} data-kbd-row>
                <CaseRow
                  incident={inc}
                  currentUserId={me.data?.user.id}
                  agencyCode={me.data?.user.agencyCode}
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
  agencyCode?: string | null;
}) {
  const overdue =
    incident.slaDueAt &&
    new Date(incident.slaDueAt) < new Date() &&
    !['closed', 'resolved', 'rejected'].includes(incident.status);

  const canAcknowledge =
    Boolean(currentUserId) &&
    ['submitted', 'triaged', 'assigned'].includes(incident.status);

  const transition = useTransitionIncident(incident.id);
  const assign = useAssignIncident(incident.id);

  const handleAcknowledge = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId) return;

    try {
      if (!incident.assignedOfficerId) {
        await assign.mutateAsync({
          officerId: currentUserId,
          agencyCode: agencyCode ?? 'BIKA',
          reason: 'Acknowledged from queue',
        });
      }
      await transition.mutateAsync({ to: 'in_progress', note: 'Acknowledged from queue' });
      toast.success(`Acknowledged ${incident.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not acknowledge');
    }
  };

  const busy = transition.isPending || assign.isPending;

  return (
    <div
      className={`bg-slate-900 hover:bg-slate-800/80 border rounded-2xl p-4 transition-colors ${
        overdue ? 'border-rose-500/50' : 'border-slate-800 hover:border-yellow-500/40'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href={`/officer/case/${incident.id}`} className="flex-1 min-w-0 block">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-mono text-xs font-bold text-yellow-400">{incident.id}</span>
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${SEVERITY_STYLE[incident.severity]}`}
            >
              {incident.severity}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusColor(incident.status)}`}>
              {statusLabel(incident.status)}
            </span>
            {overdue && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-600/20 text-rose-300 border border-rose-500/40">
                <Clock className="w-3 h-3" /> SLA overdue
              </span>
            )}
          </div>
          <div className="text-sm font-bold text-white truncate">
            {incident.category} · {incident.location}
          </div>
          <div className="text-[11px] text-slate-400 truncate mt-0.5">{incident.description}</div>
        </Link>
        <div className="text-[11px] text-slate-500 shrink-0 text-right space-y-2">
          <div>
            {incident.region} · {incident.mode}
          </div>
          <div>
            {incident.assignedOfficerName ? (
              `→ ${incident.assignedOfficerName}`
            ) : (
              <span className="inline-flex items-center gap-1 text-sky-400 font-semibold">
                <UserPlus className="w-3 h-3" /> Unassigned
              </span>
            )}
          </div>
          <div className="opacity-70">{new Date(incident.createdAt).toLocaleString()}</div>
          {canAcknowledge && (
            <button
              type="button"
              onClick={handleAcknowledge}
              disabled={busy}
              className="inline-flex items-center gap-1 mt-1 px-2.5 py-1 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-[10px] font-bold disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Acknowledge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
