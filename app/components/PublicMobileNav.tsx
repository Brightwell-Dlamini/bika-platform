'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Search, LogIn, WifiOff, Plus } from 'lucide-react';
import { getMyReports } from '@/app/lib/myReports';

export function PublicMobileNav() {
  const pathname = usePathname() ?? '';
  const [reportCount, setReportCount] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const refresh = () => setReportCount(getMyReports().length);
    refresh();
    window.addEventListener('bika-my-reports', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('bika-my-reports', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const reportActive = pathname.startsWith('/report') || pathname === '/';
  const trackActive = pathname.startsWith('/track') || pathname.startsWith('/r/');
  const loginActive = pathname.startsWith('/login');

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-50">
      {!online && (
        <div className="bg-amber-600/95 text-amber-950 text-[10px] font-bold px-3 py-1 flex items-center justify-center gap-1.5 border-t border-amber-500">
          <WifiOff className="w-3 h-3" />
          Offline mode
        </div>
      )}

      <nav
        className="relative border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.35)]"
        aria-label="Primary"
      >
        <div className="grid grid-cols-3 h-[4.25rem] max-w-lg mx-auto items-end">
          {/* Track */}
          <Link
            href="/track"
            aria-current={trackActive ? 'page' : undefined}
            className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold min-h-[48px] pb-2 transition-colors ${
              trackActive ? 'text-yellow-400' : 'text-slate-500 active:text-slate-300'
            }`}
          >
            <span
              className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-200 ${
                trackActive ? 'w-8 bg-yellow-400' : 'w-0'
              }`}
              aria-hidden
            />
            <span className="relative">
              <span
                className={`flex items-center justify-center w-10 h-8 rounded-xl ${
                  trackActive ? 'bg-yellow-500/15' : ''
                }`}
              >
                <Search className="w-5 h-5" strokeWidth={trackActive ? 2.5 : 2} />
              </span>
              {reportCount > 0 && (
                <span className="absolute -top-0.5 -right-1 min-w-[1rem] h-4 px-1 rounded-full bg-yellow-500 text-slate-950 text-[9px] font-black flex items-center justify-center">
                  {reportCount > 9 ? '9+' : reportCount}
                </span>
              )}
            </span>
            <span>Track</span>
          </Link>

          {/* Center raised Report FAB */}
          <div className="relative flex flex-col items-center justify-end pb-1.5">
            <Link
              href="/report"
              aria-current={reportActive ? 'page' : undefined}
              aria-label="File a report"
              className={`-mt-7 flex flex-col items-center gap-1 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500`}
            >
              <span
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-transform active:scale-95 ${
                  reportActive
                    ? 'bg-yellow-400 text-slate-950 shadow-yellow-500/40 ring-4 ring-yellow-500/20'
                    : 'bg-yellow-500 text-slate-950 shadow-yellow-500/30 group-hover:brightness-110'
                }`}
              >
                {reportActive ? (
                  <FileText className="w-6 h-6" strokeWidth={2.5} />
                ) : (
                  <Plus className="w-7 h-7" strokeWidth={2.5} />
                )}
              </span>
              <span
                className={`text-[10px] font-bold ${
                  reportActive ? 'text-yellow-400' : 'text-slate-400'
                }`}
              >
                Report
              </span>
            </Link>
          </div>

          {/* Official */}
          <Link
            href="/login"
            aria-current={loginActive ? 'page' : undefined}
            className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold min-h-[48px] pb-2 transition-colors ${
              loginActive ? 'text-yellow-400' : 'text-slate-500 active:text-slate-300'
            }`}
          >
            <span
              className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-200 ${
                loginActive ? 'w-8 bg-yellow-400' : 'w-0'
              }`}
              aria-hidden
            />
            <span
              className={`flex items-center justify-center w-10 h-8 rounded-xl ${
                loginActive ? 'bg-yellow-500/15' : ''
              }`}
            >
              <LogIn className="w-5 h-5" strokeWidth={loginActive ? 2.5 : 2} />
            </span>
            <span>Official</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
