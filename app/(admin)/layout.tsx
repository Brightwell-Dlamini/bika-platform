'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Loader2,
  LogOut,
  Shield,
  User as UserIcon,
  LayoutDashboard,
  Users,
  PhoneCall,
  Radio,
  BarChart3,
  Settings2,
  ChevronRight,
} from 'lucide-react';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import { useIncidentsRealtime } from '@/app/lib/api/hooks/useRealtime';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { canRunWork, isSuperAdmin, ROLE_LABELS } from '@/app/lib/rbac';
import { toast } from 'sonner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const me = useOfficerMe();
  useIncidentsRealtime();

  const handleSignOut = async () => {
    try {
      await getSupabaseBrowserClient().auth.signOut();
      toast.success('Signed out.');
      router.push('/login');
    } catch {
      toast.error('Could not sign out.');
    }
  };

  if (me.isLoading) {
    return (
      <div className="min-h-screen bg-[#05080f] flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading ops workspace…
      </div>
    );
  }

  if (me.isError || !me.data) {
    return (
      <div className="min-h-screen bg-[#05080f] flex items-center justify-center p-6">
        <div className="bg-slate-900/90 border border-red-500/40 rounded-3xl p-8 max-w-md text-center space-y-4 shadow-2xl shadow-red-950/30">
          <Shield className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-xl font-black text-white">Access denied</h1>
          <p className="text-xs text-slate-400">
            {me.error?.message ?? 'You must sign in as an Admin or Super Admin.'}
          </p>
          <button
            onClick={() => router.push('/login')}
            className="bg-yellow-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs"
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  const user = me.data.user;

  if (!canRunWork(user.role)) {
    router.replace('/officer');
    return null;
  }

  // Command Centre (incl. wall mode) owns its own full-bleed chrome — do not
  // stack the ops shell navbar or a second avatar/logout cluster.
  if (pathname.startsWith('/command')) {
    return <>{children}</>;
  }

  const isSuper = isSuperAdmin(user.role);
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  const nav = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, match: (p: string) => p === '/admin' },
    { href: '/admin/users', label: 'Users', icon: Users, match: (p: string) => p.startsWith('/admin/users') },
    {
      href: '/admin/hotlines',
      label: 'Hotlines',
      icon: PhoneCall,
      match: (p: string) => p.startsWith('/admin/hotlines'),
    },
    { href: '/command', label: 'Command', icon: Radio, match: (p: string) => p.startsWith('/command') },
    {
      href: '/analytics',
      label: 'Analytics',
      icon: BarChart3,
      match: (p: string) => p.startsWith('/analytics'),
    },
    ...(isSuper
      ? [
          {
            href: '/admin/system',
            label: 'System',
            icon: Settings2,
            match: (p: string) => p.startsWith('/admin/system'),
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100 flex flex-col">
      {/* Ambient top glow */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-40 bg-gradient-to-b from-yellow-500/[0.06] to-transparent z-0"
        aria-hidden
      />

      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#070b12]/85 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 h-[3.6rem] flex items-center justify-between gap-3">
          {/* Brand */}
          <Link
            href="/admin"
            className="flex items-center gap-2.5 shrink-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-yellow-500/30 p-1 shadow-[0_0_24px_rgba(234,179,8,0.12)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Bika.png" alt="" className="w-full h-full object-contain" />
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-[11px] font-black tracking-[0.14em] text-white uppercase">
                BIKA {isSuper ? 'Control' : 'Ops'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {user.agencyCode ?? 'ALL'} · {user.region}
              </div>
            </div>
          </Link>

          {/* Primary nav — pill rail */}
          <nav
            className="hidden lg:flex items-center gap-0.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] shadow-inner"
            aria-label="Admin"
          >
            {nav.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                    active
                      ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={active ? 2.5 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User cluster — single instance */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/officer"
              className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-yellow-400 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition"
            >
              Officer view
              <ChevronRight className="w-3 h-3" />
            </Link>

            <div className="h-6 w-px bg-white/10 hidden sm:block" />

            <Link
              href="/profile"
              className="group flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-yellow-500/30 hover:bg-white/[0.05] pl-1.5 pr-2.5 py-1 transition"
              title="Profile"
            >
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500/20 to-amber-600/10 border border-yellow-500/20 flex items-center justify-center text-[11px] font-black text-yellow-400 overflow-hidden">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials || <UserIcon className="w-3.5 h-3.5" />
                )}
              </span>
              <span className="hidden sm:block text-right leading-tight">
                <span className="block text-[11px] font-bold text-white group-hover:text-yellow-50">
                  {user.name.split(' ')[0]}
                </span>
                <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                  {ROLE_LABELS[user.role]}
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="p-2 rounded-xl text-slate-500 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile nav strip */}
        <nav
          className="lg:hidden flex gap-1 overflow-x-auto px-3 pb-2 scrollbar-none"
          aria-label="Admin mobile"
        >
          {nav.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition ${
                  active
                    ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                    : 'bg-white/[0.03] text-slate-400 border-white/[0.06]'
                }`}
              >
                <Icon className="w-3 h-3" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="relative z-10 flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
