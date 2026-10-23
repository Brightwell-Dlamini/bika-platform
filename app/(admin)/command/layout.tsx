'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, LogOut, User as UserIcon, ArrowLeft, Maximize2 } from 'lucide-react';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import { useIncidentsRealtime } from '@/app/lib/api/hooks/useRealtime';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { canRunWork, ROLE_LABELS } from '@/app/lib/rbac';
import { toast } from 'sonner';

export default function CommandLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading Command Centre…
        </div>
      }
    >
      <CommandLayoutInner>{children}</CommandLayoutInner>
    </Suspense>
  );
}

function CommandLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kiosk = searchParams.get('kiosk') === '1' || searchParams.get('wall') === '1';
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading Command Centre…
      </div>
    );
  }

  if (me.isError || !me.data || !canRunWork(me.data.user.role)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-8 max-w-md text-center space-y-4">
          <h1 className="text-xl font-black text-white">Command Centre restricted</h1>
          <p className="text-xs text-slate-400">
            {me.error?.message ?? 'Admin or Super Admin access required.'}
          </p>
          <Link
            href="/officer"
            className="inline-block bg-yellow-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs"
          >
            Go to officer dashboard
          </Link>
        </div>
      </div>
    );
  }

  const user = me.data.user;

  if (kiosk) {
    return (
      <div className="h-screen max-h-screen bg-[#070b12] text-slate-100 flex flex-col overflow-hidden">
        <header className="h-11 flex items-center justify-between px-5 shrink-0 border-b border-white/5 bg-black/40">
          <div className="flex items-center gap-3">
            <img src="/Bika.png" alt="" className="w-7 h-7 object-contain" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
                BIKA · National Command Wall
              </span>
            </div>
            <span className="hidden lg:inline text-[10px] text-slate-500 font-mono ml-2">
              {new Date().toLocaleString('en-SZ', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              {user.region} · {ROLE_LABELS[user.role]}
            </span>
            <Link
              href="/command"
              className="text-[10px] font-bold text-slate-400 hover:text-yellow-400 px-2 py-1 rounded-lg hover:bg-white/5"
              title="Exit wall mode"
            >
              Exit wall
            </Link>
          </div>
        </header>
        <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 h-12 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-yellow-400"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to admin
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              Live · Command Centre
            </span>
          </div>
          <Link
            href="/command?kiosk=1"
            className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-yellow-400 px-2 py-1 rounded-lg border border-slate-800 hover:border-yellow-500/40"
          >
            <Maximize2 className="w-3 h-3" />
            Wall mode
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[11px] font-bold text-white leading-tight">{user.name}</div>
            <div className="text-[10px] text-slate-500">
              {ROLE_LABELS[user.role]} · {user.region}
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-yellow-400 overflow-hidden">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-3.5 h-3.5" />
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
    </div>
  );
}
