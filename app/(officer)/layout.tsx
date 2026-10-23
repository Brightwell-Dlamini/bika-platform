'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Loader2,
  LogOut,
  Shield,
  User as UserIcon,
  LayoutDashboard,
  Inbox,
  Users,
  Settings,
  Radio,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import { useIncidentsRealtime } from '@/app/lib/api/hooks/useRealtime';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { apiFetch } from '@/app/lib/api/fetcher';
import { qk } from '@/app/lib/api/queryKeys';
import { ROLE_LABELS, isSuperAdmin, isAdmin } from '@/app/lib/rbac';
import { toast } from 'sonner';

export default function OfficerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const me = useOfficerMe();
  const qc = useQueryClient();
  const [dutyBusy, setDutyBusy] = useState(false);

  useIncidentsRealtime();

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      toast.success('Signed out.');
      router.push('/login');
    } catch {
      toast.error('Could not sign out.');
    }
  };

  const toggleDuty = async () => {
    if (!me.data?.user) return;
    const next = !me.data.user.onDuty;
    setDutyBusy(true);
    try {
      await apiFetch('/api/officer/me', {
        method: 'PATCH',
        body: { onDuty: next },
      });
      toast.success(next ? 'On duty — eligible for auto-assign.' : 'Off duty.');
      qc.invalidateQueries({ queryKey: qk.users.me() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update duty.');
    } finally {
      setDutyBusy(false);
    }
  };

  if (me.isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading officer workspace…
      </div>
    );
  }

  if (me.isError || !me.data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-8 max-w-md text-center space-y-4 shadow-2xl">
          <Shield className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-xl font-black text-white">Access denied</h1>
          <p className="text-xs text-slate-400">
            {me.error?.message ??
              'You are not signed in as an authorised official. Please sign in with your official credentials.'}
          </p>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="bg-yellow-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-yellow-500/20"
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  const user = me.data.user;
  const queue = me.data.queue;
  const isTopTier = isSuperAdmin(user.role) || isAdmin(user.role);
  const queueBadge =
    (queue?.slaOverdueMine ?? 0) > 0
      ? queue.slaOverdueMine
      : (queue?.assignedToMe ?? 0) > 0
        ? queue.assignedToMe
        : 0;
  const queueUrgent = (queue?.slaOverdueMine ?? 0) > 0;

  const navItems = [
    {
      href: '/officer',
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: pathname === '/officer' || pathname === '/officer/',
    },
    {
      href: '/officer/queue',
      label: 'Queue',
      icon: Inbox,
      active: pathname.startsWith('/officer/queue') || pathname.startsWith('/officer/case'),
      badge: queueBadge > 0 ? queueBadge : undefined,
      urgent: queueUrgent,
    },
    ...(isTopTier
      ? [
          {
            href: '/officer/reassign',
            label: 'Reassign',
            icon: Users,
            active: pathname.startsWith('/officer/reassign'),
          },
        ]
      : []),
    ...(isSuperAdmin(user.role)
      ? [
          {
            href: '/admin',
            label: 'System',
            icon: Settings,
            active: pathname.startsWith('/admin'),
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link href="/officer" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 shrink-0">
              <img src="/Bika.png" alt="" className="w-full h-full object-contain" />
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-black text-white tracking-tight leading-none">BIKA OPS</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                {user.agencyCode ?? 'AGENCY'} · {user.region}
              </div>
            </div>
            <span className="sr-only">BIKA OPS dashboard</span>
          </Link>

          <nav
            className="hidden md:flex items-center p-1 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner"
            aria-label="Officer"
          >
            {navItems.map((item) => (
              <OfficerNavPill key={item.href} {...item} />
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={toggleDuty}
              disabled={dutyBusy}
              title={user.onDuty ? 'On duty — click to go off duty' : 'Off duty — click to go on duty'}
              aria-label={user.onDuty ? 'Go off duty' : 'Go on duty'}
              className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition disabled:opacity-50 ${
                user.onDuty
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {dutyBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Radio className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{user.onDuty ? 'On duty' : 'Off duty'}</span>
            </button>
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-white leading-tight">{user.name}</div>
              <div className="text-[10px] text-slate-500">{ROLE_LABELS[user.role]}</div>
            </div>
            <Link
              href="/officer/profile"
              className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xs text-yellow-400 overflow-hidden hover:border-yellow-500/50 transition"
              title="Profile"
              aria-label="Edit profile"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-4 h-4" />
              )}
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6">
        {children}
      </main>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.35)]"
        aria-label="Officer mobile"
      >
        <div
          className="grid h-16 max-w-lg mx-auto"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.active;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold min-h-[44px] ${
                  active ? 'text-yellow-400' : 'text-slate-500'
                }`}
              >
                <span
                  className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all ${
                    active ? 'w-8 bg-yellow-400' : 'w-0'
                  }`}
                  aria-hidden
                />
                <span className="relative">
                  <span
                    className={`flex items-center justify-center w-9 h-7 rounded-lg ${
                      active ? 'bg-yellow-500/15' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                  </span>
                  {item.badge != null && item.badge > 0 && (
                    <span
                      className={`absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center ${
                        item.urgent ? 'bg-rose-500 text-white' : 'bg-yellow-500 text-slate-950'
                      }`}
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function OfficerNavPill({
  href,
  label,
  icon: Icon,
  active,
  badge,
  urgent,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  badge?: number;
  urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-500 ${
        active
          ? 'bg-yellow-500 text-slate-950 shadow-sm'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      {typeof badge === 'number' && badge > 0 && (
        <span
          className={`min-w-[1.15rem] h-[1.15rem] px-1 rounded-full text-[9px] font-black flex items-center justify-center ${
            urgent
              ? active
                ? 'bg-slate-950 text-rose-400'
                : 'bg-rose-500 text-white'
              : active
                ? 'bg-slate-950 text-yellow-400'
                : 'bg-slate-700 text-slate-200'
          }`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}
