'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, LogOut, Shield, User as UserIcon } from 'lucide-react';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import { useIncidentsRealtime } from '@/app/lib/api/hooks/useRealtime';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { canRunWork, isSuperAdmin, ROLE_LABELS } from '@/app/lib/rbac';
import { toast } from 'sonner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
        Loading admin workspace…
      </div>
    );
  }

  if (me.isError || !me.data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-8 max-w-md text-center space-y-4">
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

  const isSuper = isSuperAdmin(user.role);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="w-9 h-9 shrink-0">
                <img src="/Bika.png" alt="BIKA" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="text-xs font-black text-white tracking-tight">
                  BIKA {isSuper ? 'SUPER' : 'OPS'} CONTROL
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {user.agencyCode ?? 'ALL'} · {user.region}
                </div>
              </div>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
            <AdminNavLink href="/admin" active={pathname === '/admin'}>
              Dashboard
            </AdminNavLink>
            <AdminNavLink href="/admin/users" active={pathname?.startsWith('/admin/users')}>
              Users
            </AdminNavLink>
            <AdminNavLink href="/admin/hotlines" active={pathname?.startsWith('/admin/hotlines')}>
              Hotlines
            </AdminNavLink>
            <AdminNavLink href="/command" active={pathname?.startsWith('/command')}>
              Command Centre
            </AdminNavLink>
            <AdminNavLink href="/analytics" active={pathname?.startsWith('/analytics')}>
              Analytics
            </AdminNavLink>
            {isSuper && (
              <AdminNavLink href="/admin/system" active={pathname?.startsWith('/admin/system')}>
                System
              </AdminNavLink>
            )}
            <Link
              href="/officer"
              className="ml-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-yellow-400 transition-colors"
            >
              ← Officer view
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-white leading-tight">{user.name}</div>
              <div className="text-[10px] text-slate-500">{ROLE_LABELS[user.role]}</div>
            </div>
            <Link
              href="/profile"
              className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-yellow-400 overflow-hidden hover:border-yellow-500/50 transition"
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
              onClick={handleSignOut}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}

function AdminNavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg transition-colors ${
        active
          ? 'bg-yellow-500 text-slate-950 font-bold'
          : 'text-slate-400 hover:text-yellow-400 hover:bg-slate-800'
      }`}
    >
      {children}
    </Link>
  );
}
