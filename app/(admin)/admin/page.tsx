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
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading control centre…
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
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.06] bg-[#070b12]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-0 w-96 h-96 rounded-full bg-violet-500/[0.1] blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 rounded-full bg-yellow-500/[0.05] blur-3xl" />
        </div>
        <div className="relative p-6 sm:p-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="rounded-full border border-violet-400/30 bg-violet-500/15 text-violet-200 text-[10px] font-black uppercase tracking-[0.14em] px-2.5 py-1">
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
          <div className="flex flex-wrap gap-2">
            <Link
              href="/command?kiosk=1"
              className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs px-4 py-2.5 shadow-[0_0_28px_rgba(234,179,8,0.28)]"
            >
              <Radar className="w-4 h-4" />
              National wall
            </Link>
            <Link
              href="/analytics"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-4 py-2.5"
            >
              <BarChart3 className="w-4 h-4 text-yellow-400" />
              Analytics
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat href="/admin/users" label="Total users" value={users.data?.length ?? 0} icon={Users} />
        <Stat
          href="/admin/users?active=true"
          label="Active users"
          value={activeUsers}
          icon={ShieldCheck}
          tone="emerald"
        />
        <Stat
          href="/admin/hotlines"
          label="Hotlines live"
          value={activeHotlines}
          icon={PhoneCall}
          tone="amber"
        />
        <Stat
          href="/officer/queue"
          label="Open in scope"
          value={openIncidents}
          icon={Activity}
          tone="sky"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <NavCard href="/admin/users" title="User management" body="Accounts, roles, agencies, activation." icon={Users} />
        <NavCard href="/admin/hotlines" title="Emergency hotlines" body="Public directory on the citizen portal." icon={PhoneCall} />
        <NavCard href="/command" title="Command Centre" body="Live map, KPI rail, national incident feed." icon={Radar} />
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
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0e16] p-5 transition hover:-translate-y-0.5 hover:border-yellow-500/25"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</span>
        <Icon className="w-4 h-4 text-slate-600 group-hover:text-yellow-400 transition" />
      </div>
      <div className={`mt-3 text-3xl font-black font-mono tabular-nums ${tones[tone]}`}>{value}</div>
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
      className="group flex gap-4 rounded-2xl border border-white/[0.06] bg-[#0a0e16] p-5 transition hover:border-yellow-500/30 hover:bg-[#0c121c]"
    >
      <div className="w-11 h-11 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center shrink-0 group-hover:border-yellow-500/30">
        <Icon className="w-5 h-5 text-slate-400 group-hover:text-yellow-400 transition" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-black text-white group-hover:text-yellow-200 transition">{title}</span>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-yellow-400 shrink-0" />
        </div>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{body}</p>
      </div>
    </Link>
  );
}
