'use client';

import React from 'react';
import Link from 'next/link';
import { Users, PhoneCall, ShieldCheck, Activity, ArrowRight, Loader2 } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="bg-purple-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded uppercase">
              {ROLE_LABELS[user.role]}
            </span>
            <h1 className="text-2xl font-black text-white mt-2">
              {isSuper ? 'System control centre' : 'Operations centre'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {isSuper
                ? 'Manage users, agencies, configuration, branding, and audit logs.'
                : 'Oversee the incident queue, users in your agency, and emergency hotlines.'}
            </p>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total users"
          value={users.data?.length ?? 0}
          icon={Users}
          accent="text-white"
          href="/admin/users"
        />
        <KpiCard
          label="Active users"
          value={(users.data ?? []).filter((u) => u.active).length}
          icon={ShieldCheck}
          accent="text-emerald-400"
          href="/admin/users?active=true"
        />
        <KpiCard
          label="Active hotlines"
          value={(hotlines.data ?? []).filter((h) => h.active).length}
          icon={PhoneCall}
          accent="text-yellow-400"
          href="/admin/hotlines"
        />
        <KpiCard
          label="Open incidents"
          value={me.data.queue.unassignedInMyScope + me.data.queue.assignedToMe}
          icon={Activity}
          accent="text-sky-400"
          href="/officer/queue"
        />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickLink
          href="/admin/users"
          title="User management"
          body="Create, edit, and deactivate official accounts. Manage roles and agency assignments."
          showIf={true}
        />
        <QuickLink
          href="/admin/hotlines"
          title="Emergency hotlines"
          body="Update the public hotline directory shown on the citizen portal."
          showIf={true}
        />
<QuickLink
  href="/command"
  title="Command Centre"
  body="Live tactical map with KPI rail and incident feed. Filter by region, severity, and status."
  showIf={true}
/>
<QuickLink
  href="/analytics"
  title="Analytics & reports"
  body="National KPIs, regional breakdowns, trend charts, and CSV export."
  showIf={true}
/>
        {isSuper && (
          <QuickLink
            href="/admin/system"
            title="System settings"
            body="Branding, integrations, session rules, audit log, and database backup."
            showIf={true}
          />
        )}
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
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-slate-900 border border-slate-800 hover:border-yellow-500/40 rounded-xl p-4 shadow-lg transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className={`text-[10px] font-bold uppercase tracking-wider ${accent}`}>{label}</div>
        <Icon className={`w-4 h-4 ${accent} opacity-70`} />
      </div>
      <div className="text-2xl font-extrabold text-white font-mono mt-2">{value}</div>
    </Link>
  );
}

function QuickLink({
  href,
  title,
  body,
  showIf,
}: {
  href: string;
  title: string;
  body: string;
  showIf: boolean;
}) {
  if (!showIf) return null;
  return (
    <Link
      href={href}
      className="group bg-slate-900 border border-slate-800 hover:border-yellow-500/60 rounded-2xl p-5 transition-all flex items-center justify-between gap-4"
    >
      <div>
        <div className="font-extrabold text-white group-hover:text-yellow-400 transition-colors">
          {title}
        </div>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{body}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-yellow-400 shrink-0" />
    </Link>
  );
}
