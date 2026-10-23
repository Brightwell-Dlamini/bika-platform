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
  Activity,
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
    { assignedTo: me.data?.user.id, limit: 6 },
    { enabled: Boolean(me.data?.user.id) }
  );

  if (me.isLoading || !me.data) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading workspace…
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
      await apiFetch('/api/officer/me', {
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
    <div className="space-y-7 animate-fadeIn">
      {/* Command hero */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.06] bg-[#070b12]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-16 w-[28rem] h-[28rem] rounded-full bg-yellow-500/[0.07] blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-emerald-500/[0.04] blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.35))]" />
        </div>

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-xl">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500 text-slate-950 text-[10px] font-black uppercase tracking-[0.12em] px-2.5 py-1">
                  {ROLE_LABELS[user.role]}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 border ${
                    user.onDuty
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-white/10 bg-white/5 text-slate-400'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      user.onDuty ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'bg-slate-500'
                    }`}
                  />
                  {user.onDuty ? 'On duty' : 'Off duty'}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
                {user.name}
              </h1>
              <p className="mt-2.5 text-sm text-slate-400">
                <span className="text-slate-300">{user.department || 'Official'}</span>
                <span className="text-slate-600 mx-1.5">·</span>
                <span className="font-mono text-xs text-slate-500">
                  {user.agencyCode ?? 'Agency'} · {user.region}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleDuty}
                disabled={dutyBusy}
                className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border transition disabled:opacity-50 ${
                  user.onDuty
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {dutyBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                {user.onDuty ? 'Go off duty' : 'Go on duty'}
              </button>
              {isAdmin && (
                <Link
                  href="/officer/reassign"
                  className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-yellow-300 hover:bg-white/10"
                >
                  <UserPlus className="w-4 h-4" />
                  Reassign
                </Link>
              )}
              <Link
                href="/officer/queue"
                className="inline-flex items-center gap-2 text-xs font-black px-4 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 shadow-[0_0_24px_rgba(234,179,8,0.25)]"
              >
                Open queue
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {pressure && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-100 leading-relaxed">
                <span className="font-bold">SLA pressure</span> — {queue.slaOverdueMine} overdue on your
                desk
                {queue.slaOverdueInMyScope > queue.slaOverdueMine
                  ? ` · ${queue.slaOverdueInMyScope} in scope`
                  : ''}
                .{' '}
                <Link href="/officer/queue?overdue=1" className="underline font-bold text-white">
                  Review now
                </Link>
              </p>
            </div>
          )}
          {!user.onDuty && !pressure && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <Radio className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400">
                Off duty — auto-assignment will skip you until you go on duty.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* KPI monoliths */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi
          label="Assigned"
          value={queue.assignedToMe}
          href="/officer/queue?scope=mine"
          icon={Inbox}
        />
        <Kpi
          label="Unassigned"
          value={queue.unassignedInMyScope}
          href="/officer/queue?scope=unassigned"
          icon={Activity}
          tone="sky"
        />
        <Kpi
          label="Overdue · mine"
          value={queue.slaOverdueMine}
          href="/officer/queue?scope=mine&overdue=1"
          icon={Clock}
          tone="rose"
          pulse={queue.slaOverdueMine > 0}
        />
        <Kpi
          label="Overdue · scope"
          value={queue.slaOverdueInMyScope}
          href="/officer/queue?overdue=1"
          icon={AlertTriangle}
          tone="orange"
          pulse={queue.slaOverdueInMyScope > 0}
        />
        <Kpi
          label="Resolved 7d"
          value={queue.resolvedByMe7d}
          href="/officer/queue?scope=resolved"
          icon={CheckCircle2}
          tone="emerald"
        />
      </div>

      {/* Open cases */}
      <section className="rounded-[1.75rem] border border-white/[0.06] bg-[#0a0e16] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-white/[0.05]">
          <div>
            <h2 className="text-sm font-black text-white tracking-tight">Open on your desk</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Most recent active assignments</p>
          </div>
          <Link
            href="/officer/queue?scope=mine"
            className="text-[11px] font-bold text-yellow-400 hover:text-yellow-300 inline-flex items-center gap-0.5"
          >
            Full queue <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {mine.isLoading ? (
          <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-14">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : recent.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm text-slate-400">No open cases assigned to you.</p>
            <Link
              href="/officer/queue?scope=unassigned"
              className="inline-flex mt-3 text-xs font-bold text-yellow-400 hover:underline"
            >
              Browse unassigned queue
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {recent.slice(0, 6).map((inc) => (
              <li key={inc.id}>
                <Link
                  href={`/officer/case/${inc.id}`}
                  className="flex items-center justify-between gap-4 px-5 sm:px-6 py-3.5 hover:bg-white/[0.03] transition group"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-yellow-400">
                        {inc.id}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${statusColor(inc.status)}`}
                      >
                        {statusLabel(inc.status)}
                      </span>
                    </div>
                    <p className="text-sm text-white font-semibold truncate mt-1 group-hover:text-yellow-50">
                      {inc.category}
                      <span className="text-slate-600 font-normal"> · </span>
                      <span className="text-slate-300 font-normal">{inc.location}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden sm:inline text-[10px] font-mono text-slate-600">
                      {new Date(inc.createdAt).toLocaleDateString()}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-yellow-400 transition" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Hint title="Claim" body="Open the queue, pick a case, acknowledge or claim ownership." />
        <Hint title="Advance" body="Move status with one click. Keep citizens informed with public notes." />
        <Hint title="Duty" body="Stay on duty so critical auto-assignment can reach you." />
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  href,
  icon: Icon,
  tone = 'neutral',
  pulse,
}: {
  label: string;
  value: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'neutral' | 'sky' | 'rose' | 'orange' | 'emerald';
  pulse?: boolean;
}) {
  const tones = {
    neutral: 'text-white border-white/[0.06] hover:border-yellow-500/30',
    sky: 'text-sky-300 border-sky-500/20 hover:border-sky-400/40',
    rose: 'text-rose-300 border-rose-500/30 hover:border-rose-400/50 bg-rose-500/[0.06]',
    orange: 'text-orange-300 border-orange-500/25 hover:border-orange-400/40',
    emerald: 'text-emerald-300 border-emerald-500/20 hover:border-emerald-400/40',
  } as const;

  return (
    <Link
      href={href}
      className={`relative overflow-hidden rounded-2xl border bg-[#0a0e16] p-4 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40 ${tones[tone]}`}
    >
      {pulse && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </span>
        <Icon className="w-3.5 h-3.5 opacity-60" />
      </div>
      <div className="mt-3 text-3xl font-black font-mono tabular-nums tracking-tight">{value}</div>
    </Link>
  );
}

function Hint({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4">
      <div className="text-xs font-black text-white mb-1">{title}</div>
      <p className="text-[11px] text-slate-500 leading-relaxed">{body}</p>
    </div>
  );
}
