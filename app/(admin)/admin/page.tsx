'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  PhoneCall,
  ShieldCheck,
  Activity,
  ArrowRight,
  Loader2,
  Radar,
  BarChart3,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import { useUsers } from '@/app/lib/api/hooks/useUsers';
import { useHotlines } from '@/app/lib/api/hooks/useReference';
import { isSuperAdmin, ROLE_LABELS } from '@/app/lib/rbac';

export default function AdminDashboardPage() {
  const me = useOfficerMe();
  const users = useUsers();
  const hotlines = useHotlines();

  if (me.isLoading || !me.data) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  const user = me.data.user;
  const isSuper = isSuperAdmin(user.role);
  const activeUsers = (users.data ?? []).filter((u) => u.active).length;
  const activeHotlines = (hotlines.data ?? []).filter((h) => h.active).length;
  const openIncidents = me.data.queue.unassignedInMyScope + me.data.queue.assignedToMe;

  return (
    <div className="space-y-8 animate-fadeIn">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-8 shadow-2xl shadow-black/30">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_rgba(168,85,247,0.12),_transparent_55%)]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2">
              <span className="bg-purple-500/20 text-purple-200 border border-purple-400/30 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                {ROLE_LABELS[user.role]}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{user.region}</span>
            </div>
            <h1 className="text-3xl font-black text-white mt-3 tracking-tight">
              {isSuper ? 'System control' : 'Operations centre'}
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">
              {isSuper
                ? 'Users, agencies, configuration, branding, and audit — one place.'
                : 'Queue oversight, agency users, and public emergency hotlines.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/command?kiosk=1"
              className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs px-4 py-2.5 shadow-lg shadow-yellow-500/20"
            >
              <Radar className="w-4 h-4" />
              Open wall
            </Link>
            <Link
              href="/analytics"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs px-4 py-2.5 border border-slate-700"
            >
              <BarChart3 className="w-4 h-4 text-yellow-400" />
              Analytics
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total users" value={users.data?.length ?? 0} icon={Users} accent="from-slate-700 to-slate-800" href="/admin/users" />
        <KpiCard label="Active users" value={activeUsers} icon={ShieldCheck} accent="from-emerald-900/80 to-slate-900" href="/admin/users?active=true" valueClass="text-emerald-300" />
        <KpiCard label="Active hotlines" value={activeHotlines} icon={PhoneCall} accent="from-amber-900/60 to-slate-900" href="/admin/hotlines" valueClass="text-yellow-300" />
        <KpiCard label="Open in scope" value={openIncidents} icon={Activity} accent="from-sky-900/60 to-slate-900" href="/officer/queue" valueClass="text-sky-300" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <QuickLink href="/admin/users" title="User management" body="Create, edit, and deactivate official accounts. Roles and agency assignments." icon={Users} />
        <QuickLink href="/admin/hotlines" title="Emergency hotlines" body="Public hotline directory on the citizen portal." icon={PhoneCall} />
        <QuickLink href="/command" title="Command Centre" body="Live map, KPI rail, and incident feed — filter by region and severity." icon={Radar} />
        <QuickLink href="/analytics" title="Analytics & reports" body="National KPIs, regional breakdowns, trends, and CSV export." icon={BarChart3} />
        {isSuper && (
          <QuickLink href="/admin/system" title="System settings" body="Branding, integrations, session rules, audit log, and backup." icon={Settings2} />
        )}
        <QuickLink href="/officer" title="Officer workspace" body="Switch to the field officer shell for queue and case work." icon={Sparkles} />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  href,
  valueClass = 'text-white',
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  href: string;
  valueClass?: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br ${accent} p-4 shadow-lg transition hover:border-yellow-500/30 hover:-translate-y-0.5`}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
        <Icon className="w-4 h-4 text-slate-400 group-hover:text-yellow-400 transition" />
      </div>
      <div className={`text-3xl font-black font-mono mt-3 tabular-nums ${valueClass}`}>{value}</div>
    </Link>
  );
}

function QuickLink({
  href,
  title,
  body,
  icon: Icon,
}: {
  href: string;
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 transition hover:border-yellow-500/40 hover:bg-slate-900 flex gap-4"
    >
      <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-yellow-500/40">
        <Icon className="w-5 h-5 text-slate-400 group-hover:text-yellow-400 transition" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-extrabold text-white group-hover:text-yellow-300 transition flex items-center justify-between gap-2">
          <span>{title}</span>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-yellow-400 shrink-0" />
        </div>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{body}</p>
      </div>
    </Link>
  );
}
