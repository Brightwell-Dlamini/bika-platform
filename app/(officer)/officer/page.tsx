'use client';

import React from 'react';
import Link from 'next/link';
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import { ROLE_LABELS } from '@/app/lib/rbac';

export default function OfficerDashboardPage() {
  const me = useOfficerMe();

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

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_rgba(234,179,8,0.08),_transparent_50%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="bg-yellow-500 text-slate-950 font-extrabold text-[10px] px-2.5 py-0.5 rounded uppercase tracking-wide">
              {ROLE_LABELS[user.role]}
            </span>
            <h1 className="text-2xl font-black text-white mt-2">{user.name}</h1>
            <p className="text-xs text-slate-400 mt-1">
              {user.department || 'Official'} · {user.agencyCode ?? 'Agency'} · {user.region}
            </p>
          </div>
          <Link
            href="/officer/queue"
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-yellow-500/15 transition"
          >
            <span>Open queue</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {pressure && (
          <div className="relative mt-4 flex items-start gap-2 bg-rose-950/40 border border-rose-500/40 rounded-xl px-3 py-2.5 text-[11px] text-rose-200">
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

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-sm font-extrabold text-white">Getting started</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <GuideCard
            title="Claim a case"
            body="Open the queue and open a case. Use Claim or Acknowledge to take ownership."
          />
          <GuideCard
            title="Update status"
            body="Advance the lifecycle with status buttons. Log public notes citizens can see."
          />
          <GuideCard
            title="Use templates"
            body="Note chips (Acknowledge, On scene, Resolved) speed consistent citizen updates."
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
      className={`bg-slate-900 border rounded-xl p-4 shadow-lg transition-all duration-200 hover:-translate-y-0.5 group ${
        emphasize
          ? 'border-rose-500/50 hover:border-rose-400/70 shadow-rose-500/5'
          : 'border-slate-800 hover:border-yellow-500/40'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className={`text-[10px] font-bold uppercase tracking-wider ${accent}`}>{label}</div>
        <Icon className={`w-4 h-4 ${accent} opacity-70 group-hover:opacity-100 transition`} />
      </div>
      <div className="text-2xl font-extrabold text-white font-mono mt-2">{value}</div>
    </Link>
  );
}

function GuideCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition">
      <div className="font-bold text-white mb-1">{title}</div>
      <p className="text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
}
