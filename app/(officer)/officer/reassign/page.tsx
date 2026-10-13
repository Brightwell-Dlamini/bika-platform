'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, UserPlus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import { useIncidents } from '@/app/lib/api/hooks/useIncidents';
import { useAssignIncident } from '@/app/lib/api/mutations/useIncidentActions';
import { canReassignAnyCase, ROLE_LABELS } from '@/app/lib/rbac';
import { statusLabel, statusColor } from '@/app/lib/statusLabels';
import { apiFetch } from '@/app/lib/api/fetcher';
import type { Incident } from '@/app/types';

interface OfficerOption {
  id: string;
  name: string;
  agencyCode: string | null;
  region: string;
  role: string;
  onDuty: boolean;
}

export default function ReassignPage() {
  const router = useRouter();
  const me = useOfficerMe();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [officerId, setOfficerId] = useState('');
  const [reason, setReason] = useState('');
  const [q, setQ] = useState('');
  const [officers, setOfficers] = useState<OfficerOption[]>([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);

  const incidents = useIncidents({ onlyUnassigned: true, limit: 100 }, { enabled: Boolean(me.data) });
  const assign = useAssignIncident(selectedId ?? '');

  const allowed = me.data && canReassignAnyCase(me.data.user.role);

  React.useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    (async () => {
      setLoadingOfficers(true);
      try {
        const res = await apiFetch<{ users: Array<Record<string, unknown>> }>('/api/admin/users?active=true&limit=100');
        if (cancelled) return;
        const list = (res.users ?? []).map((u) => ({
          id: String(u.id),
          name: String(u.name ?? ''),
          agencyCode: (u.agencyCode as string | null) ?? (u.agency_code as string | null) ?? null,
          region: String(u.region ?? ''),
          role: String(u.role ?? ''),
          onDuty: Boolean(u.onDuty ?? u.on_duty),
        }));
        setOfficers(list.filter((o) => o.role !== 'public'));
      } catch {
        toast.error('Could not load officer directory.');
      } finally {
        if (!cancelled) setLoadingOfficers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  const rows = useMemo(() => {
    let list = incidents.data?.incidents ?? [];
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.id.toLowerCase().includes(s) ||
          i.location.toLowerCase().includes(s) ||
          i.category.toLowerCase().includes(s)
      );
    }
    return list;
  }, [incidents.data, q]);

  if (me.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-3">
        <h1 className="text-xl font-black text-white">Access denied</h1>
        <p className="text-sm text-slate-400">Only Admins and Super Admins can reassign cases.</p>
        <Link href="/officer/queue" className="text-xs font-bold text-yellow-400 hover:underline">
          Back to queue
        </Link>
      </div>
    );
  }

  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const target = officers.find((o) => o.id === officerId);

  const handleAssign = async () => {
    if (!selectedId || !officerId || !target) {
      toast.error('Select a case and an officer.');
      return;
    }
    try {
      await assign.mutateAsync({
        officerId,
        agencyCode: (target.agencyCode as never) ?? 'BIKA',
        reason: reason.trim() || 'Reassigned from admin console',
      });
      toast.success(`Assigned ${selectedId} → ${target.name}`);
      setSelectedId(null);
      setOfficerId('');
      setReason('');
      incidents.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Assignment failed');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/officer/queue')}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-yellow-400"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-yellow-400" />
            Reassign cases
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {ROLE_LABELS[me.data!.user.role]} · pick an unassigned case and an officer
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter unassigned cases…"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
            />
          </div>
          {incidents.isLoading ? (
            <div className="py-10 text-center text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Loading unassigned…
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-slate-500 text-sm">No unassigned cases.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto space-y-2">
              {rows.map((inc) => (
                <CasePick key={inc.id} incident={inc} active={selectedId === inc.id} onSelect={() => setSelectedId(inc.id)} />
              ))}
            </ul>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Selected case</label>
            <p className="font-mono text-yellow-400 text-sm mt-1">{selected?.id ?? '—'}</p>
            {selected && (
              <p className="text-xs text-slate-400 mt-1">
                {selected.category} · {selected.location}
              </p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Assign to officer</label>
            {loadingOfficers ? (
              <p className="text-xs text-slate-500 mt-2">Loading directory…</p>
            ) : (
              <select
                value={officerId}
                onChange={(e) => setOfficerId(e.target.value)}
                className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
              >
                <option value="">Select officer…</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} · {o.agencyCode ?? '—'} · {o.region}
                    {o.onDuty ? ' · on duty' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Reason (optional)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder="Workload balance, specialty, region…"
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
            />
          </div>

          <button
            type="button"
            disabled={!selectedId || !officerId || assign.isPending}
            onClick={handleAssign}
            className="w-full py-3 rounded-xl bg-yellow-500 text-slate-950 font-black text-xs disabled:opacity-50"
          >
            {assign.isPending ? 'Assigning…' : 'Confirm assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CasePick({
  incident,
  active,
  onSelect,
}: {
  incident: Incident;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-xl border transition ${
        active
          ? 'border-yellow-500 bg-yellow-500/10'
          : 'border-slate-800 bg-slate-950 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[11px] font-bold text-yellow-400">{incident.id}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusColor(incident.status)}`}>
          {statusLabel(incident.status)}
        </span>
        <span className="text-[10px] text-slate-500">{incident.severity}</span>
      </div>
      <div className="text-xs text-white font-semibold mt-1 truncate">
        {incident.category} · {incident.location}
      </div>
      <div className="text-[10px] text-slate-500 mt-0.5">{incident.region}</div>
    </button>
  );
}
