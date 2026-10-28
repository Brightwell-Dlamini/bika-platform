'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  PhoneCall,
  ShieldCheck,
  Activity,
  ArrowRight,
  Radar,
  BarChart3,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { DashboardSkeleton } from '@/app/components/ui/Skeleton';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import { useUsers } from '@/app/lib/api/hooks/useUsers';
import { useHotlines } from '@/app/lib/api/hooks/useReference';
import { isSuperAdmin, ROLE_LABELS } from '@/app/lib/rbac';

export default function AdminDashboardPage() {
  const me = useOfficerMe();
  const users = useUsers();
  const hotlines = useHotlines();

  if (me.isLoading || !me.data) {
    return <DashboardSkeleton />;
  }

  const user = me.data.user;
  const isSuper = isSuperAdmin(user.role);
  const activeUsers = (users.data ?? []).filter((u) => u.active).length;
  const activeHotlines = (hotlines.data ?? []).filter((h) => h.active).length;
  const openIncidents = me.data.queue.unassignedInMyScope + me.data.queue.assignedToMe;

  return (
    <div className="space-y-8 animate-fadeIn">
      <section className="relative overflow-hidden rounded-[1.85rem] border border-white/[0.08] bg-[#070b12] shadow-2xl shadow-black/40">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 right-0 w-[28rem] h-[28rem] rounded-full bg-violet-500/[0.12] blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-yellow-500/[0.07] blur-3xl" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
        </div>
        <div className="relative p-6 sm:p-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="rounded-full border border-violet-400/35 bg-violet-500/15 text-violet-200 text-[10px] font-black uppercase tracking-[0.14em] px-2.5 py-1 shadow-sm">
                {ROLE_LABELS[user.role]}
              </span>
              <span className="text-[10px] font-mono text-slate-500">{user.region}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {isSuper ? 'System control' : 'Operations centre'}
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-lg leading-relaxed">
              {isSuper
                ? 'People, configuration, branding, and national situational awareness.'
                : 'Agency oversight, queue pressure, and public emergency channels.'}
            </p>
          </div>
          <Link
            href="/command"
            className="inline-flex items-center gap-2 text-xs font-black px-4 py-2.5 rounded-xl bg-gradient-to-b from-yellow-300 to-amber-500 hover:brightness-110 text-slate-950 shadow-[0_0_28px_rgba(234,179,8,0.3)] transition"
          >
            <Radar className="w-4 h-4" />
            Command centre
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat href="/admin/users" label="Active users" value={activeUsers} icon={Users} tone="emerald" />
        <Stat href="/admin/hotlines" label="Hotlines" value={activeHotlines} icon={PhoneCall} tone="sky" />
        <Stat href="/officer/queue" label="Open in scope" value={openIncidents} icon={Activity} tone="amber" />
        <Stat href="/officer/queue?scope=unassigned" label="Unassigned" value={me.data.queue.unassignedInMyScope} icon={ShieldCheck} />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <NavCard href="/admin/users" title="Users" body="Roles, agencies, duty status, access." icon={Users} />
        <NavCard href="/admin/hotlines" title="Hotlines" body="Public emergency numbers and channels." icon={PhoneCall} />
        <NavCard href="/command" title="Command" body="Live map, feed, wall mode." icon={Radar} />
        <NavCard href="/analytics" title="Analytics" body="KPIs, regional performance, trends, export." icon={BarChart3} />
        {isSuper && (
          <NavCard href="/admin/system" title="System settings" body="Branding, integrations, audit, backup." icon={Settings2} />
        )}
        <NavCard href="/officer" title="Officer workspace" body="Field queue and case handling shell." icon={Sparkles} />
      </div>
    </div>
  );
}

function Stat({
  href,
  label,
  value,
  icon: Icon,
  tone = 'neutral',
}: {
  href: string;
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'neutral' | 'emerald' | 'amber' | 'sky';
}) {
  const tones = {
    neutral: 'text-white',
    emerald: 'text-emerald-300',
    amber: 'text-yellow-300',
    sky: 'text-sky-300',
  } as const;
  const glows = {
    neutral: '',
    emerald: 'group-hover:shadow-emerald-500/10',
    amber: 'group-hover:shadow-yellow-500/15',
    sky: 'group-hover:shadow-sky-500/10',
  } as const;
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0e16]/95 p-5 transition hover:-translate-y-0.5 hover:border-yellow-500/30 shadow-lg shadow-black/20 ${glows[tone]}`}
    >
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(ellipse_at_top_right,_rgba(234,179,8,0.06),_transparent_55%)]" />
      <div className="relative flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</span>
        <Icon className="w-4 h-4 text-slate-600 group-hover:text-yellow-400 transition" />
      </div>
      <div className={`relative mt-3 text-3xl font-black font-mono tabular-nums ${tones[tone]}`}>{value}</div>
    </Link>
  );
}

function NavCard({
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
      className="group flex gap-4 rounded-2xl border border-white/[0.07] bg-[#0a0e16]/95 p-5 transition hover:border-yellow-500/35 hover:bg-[#0c121c] shadow-lg shadow-black/15 hover:-translate-y-0.5"
    >
      <div className="w-11 h-11 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent flex items-center justify-center shrink-0 group-hover:border-yellow-500/35 transition shadow-inner">
        <Icon className="w-5 h-5 text-slate-400 group-hover:text-yellow-400 transition" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-black text-white group-hover:text-yellow-200 transition tracking-tight">{title}</span>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-yellow-400 shrink-0 transition" />
        </div>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{body}</p>
      </div>
    </Link>
  );
}
