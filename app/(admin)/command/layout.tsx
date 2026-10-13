'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, User as UserIcon, ArrowLeft } from 'lucide-react';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import { useIncidentsRealtime } from '@/app/lib/api/hooks/useRealtime';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { canRunWork, ROLE_LABELS } from '@/app/lib/rbac';
import { toast } from 'sonner';

export default function CommandLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Compact command bar — no max-width, full bleed */}
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
