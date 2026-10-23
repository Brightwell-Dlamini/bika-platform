'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  UserPlus,
  Radio,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import { useIncidents } from '@/app/lib/api/hooks/useIncidents';
import { apiFetch } from '@/app/lib/api/fetcher';
import { qk } from '@/app/lib/api/queryKeys';
import { ROLE_LABELS, canReassignAnyCase } from '@/app/lib/rbac';
import { statusLabel, statusColor } from '@/app/lib/statusLabels';

export default function OfficerDashboardPage() {
  const me = useOfficerMe();
  const qc = useQueryClient();
  const [dutyBusy, setDutyBusy] = useState(false);

  const mine = useIncidents(
    {
      assignedTo: me.data?.user.id,
      limit: 5,
    },
    { enabled: Boolean(me.data?.user.id) }
  );

  if (me.isLoading || !me.data) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  const { user, queue } = me.data;
  const pressure = queue.slaOverdueMine > 0 || queue.slaOverdueInMyScope > 0;
  const isAdmin = canReassignAnyCase(user.role);
  const recent = (mine.data?.incidents ?? []).filter(
    (i) => !['closed', 'resolved', 'rejected'].includes(i.status)
  );

  const toggleDuty = async () => {
    setDutyBusy(true);
    try {
      await apiFetch<{ user: typeof user }>('/api/officer/me', {
        method: 'PATCH',
        body: { onDuty: !user.onDuty },
      });
      toast.success(user.onDuty ? 'You are now off duty.' : 'You are now on duty.');
      qc.invalidateQueries({ queryKey: qk.users.me() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update duty status.');
    } finally {
      setDutyBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-7 shadow-2xl shadow-black/30">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_rgba(234,179,8,0.1),_transparent_55%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-yellow-500 text-slate-950 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                {ROLE_LABELS[user.role]}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                  user.onDuty
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <Radio className="w-3 h-3" />
                {user.onDuty ? 'On duty' : 'Off duty'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-3 tracking-tight">
              {user.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1.5">
              {user.department || 'Official'} · {user.agencyCode ?? 'Agency'} · {user.region}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleDuty}
              disabled={dutyBusy}
              className={`flex items-center gap-2 font-bold text-xs px-4 py-2.5 rounded-xl border transition disabled:opacity-50 ${
                user.onDuty
                  ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {dutyBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Radio className="w-4 h-4" />
              )}
              {user.onDuty ? 'Go off duty' : 'Go on duty'}
            </button>
            {isAdmin && (
              <Link
                href="/officer/reassign"
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-yellow-400 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-700 transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Reassign</span>
              </Link>
            )}
            <Link
              href="/officer/queue"
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-yellow-500/20 transition"
            >
              <span>Open queue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        {pressure && (
          <div className="relative mt-5 flex items-start gap-2 bg-rose-950/40 border border-rose-500/40 rounded-2xl px-3.5 py-3 text-[11px] text-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>
              SLA pressure: {queue.slaOverdueMine} overdue on your cases
              {queue.slaOverdueInMyScope > queue.slaOverdueMine
                ? ` · ${queue.slaOverdueInMyScope} in your scope`
                : ''}
              .{' '}
              <Link href="/officer/queue?overdue=1" className="underline font-bold text-rose-100">
                Review overdue
              </Link>
            </span>
          </div>
        )}
        {!user.onDuty && (
          <div className="relative mt-5 flex items-start gap-2 bg-slate-950/60 border border-slate-700 rounded-2xl px-3.5 py-3 text-[11px] text-slate-400">
            <Radio className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              You are off duty. Auto-assignment will skip you until you go on duty.
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="Assigned to me"
          value={queue.assignedToMe}
          icon={Inbox}
          accent="text-white"
          href="/officer/queue?scope=mine"
        />
        <StatCard
          label="Unassigned in scope"
          value={queue.unassignedInMyScope}
          icon={Inbox}
          accent="text-sky-400"
          href="/officer/queue?scope=unassigned"
        />
        <StatCard
          label="SLA overdue (mine)"
          value={queue.slaOverdueMine}
          icon={Clock}
          accent="text-rose-400"
          href="/officer/queue?scope=mine&overdue=1"
          emphasize={queue.slaOverdueMine > 0}
        />
        <StatCard
          label="SLA overdue (scope)"
          value={queue.slaOverdueInMyScope}
          icon={AlertTriangle}
          accent="text-orange-400"
          href="/officer/queue?overdue=1"
          emphasize={queue.slaOverdueInMyScope > 0}
        />
        <StatCard
          label="Resolved last 7d"
          value={queue.resolvedByMe7d}
          icon={CheckCircle2}
          accent="text-emerald-400"
          href="/officer/queue?scope=resolved"
        />
      </div>

      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5 space-y-3 shadow-xl shadow-black/20">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-white">Your open cases</h2>
          <Link
            href="/officer/queue?scope=mine"
            className="text-[10px] font-bold text-yellow-400 hover:underline inline-flex items-center gap-0.5"
          >
            View all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {mine.isLoading ? (
          <div className="flex items-center gap-2 text-slate-500 text-xs py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : recent.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No open cases assigned to you. Check the{' '}
            <Link href="/officer/queue?scope=unassigned" className="text-yellow-400 hover:underline">
              unassigned queue
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-slate-800/80">
            {recent.slice(0, 5).map((inc) => (
              <li key={inc.id}>
                <Link
                  href={`/officer/case/${inc.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-slate-800/40 -mx-2 px-2 rounded-xl transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-yellow-400">
                        {inc.id}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${statusColor(inc.status)}`}
                      >
                        {statusLabel(inc.status)}
                      </span>
                    </div>
                    <p className="text-xs text-white font-semibold truncate mt-0.5">
                      {inc.category} · {inc.location}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                    {new Date(inc.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/50 p-6 space-y-3">
        <h2 className="text-sm font-extrabold text-white">Getting started</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <GuideCard
            title="Claim a case"
            body="Open the queue and open a case. Use Claim or Acknowledge to take ownership."
          />
          <GuideCard
            title="Update status"
            body="Advance the lifecycle with status buttons. Log public notes citizens can see."
          />
          <GuideCard
            title="Duty status"
            body="Toggle on duty so automation can assign critical cases when you are available."
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  href,
  emphasize,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  href: string;
  emphasize?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border p-4 shadow-lg transition-all duration-200 hover:-translate-y-0.5 group ${
        emphasize
          ? 'border-rose-500/50 bg-rose-950/20 hover:border-rose-400/70 shadow-rose-500/5'
          : 'border-slate-800/80 bg-slate-900/70 hover:border-yellow-500/40'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className={`text-[10px] font-bold uppercase tracking-wider ${accent}`}>{label}</div>
        <Icon className={`w-4 h-4 ${accent} opacity-70 group-hover:opacity-100 transition`} />
      </div>
      <div className="text-2xl font-extrabold text-white font-mono mt-2 tabular-nums">{value}</div>
    </Link>
  );
}

function GuideCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition">
      <div className="font-bold text-white mb-1">{title}</div>
      <p className="text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
}
