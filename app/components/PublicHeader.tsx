'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LogIn,
  FileText,
  Search,
  Wifi,
  WifiOff,
  Phone,
  AlertTriangle,
} from 'lucide-react';
import { getMyReports } from '@/app/lib/myReports';

export function PublicHeader() {
  const pathname = usePathname() ?? '';
  const [online, setOnline] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [reportCount, setReportCount] = useState(0);

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const trackActive = pathname.startsWith('/track') || pathname.startsWith('/r/');
  const reportActive = pathname.startsWith('/report') || pathname === '/';
  const hotlinesActive = pathname.startsWith('/hotlines');
  const loginActive = pathname.startsWith('/login');

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-yellow-500 focus:text-slate-950 focus:px-3 focus:py-2 focus:rounded-lg focus:text-xs focus:font-bold"
      >
        Skip to content
      </a>

      <header
        className={`public-header sticky top-0 z-40 border-b transition-[background,box-shadow,border-color] duration-200 ${
          scrolled
            ? 'bg-slate-950/95 backdrop-blur-xl border-slate-800 shadow-lg shadow-black/25'
            : 'bg-slate-950/85 backdrop-blur-xl border-slate-800/70'
        }`}
      >
        <div
          className={`overflow-hidden transition-[max-height,opacity] duration-200 ${
            scrolled ? 'max-h-0 opacity-0' : 'max-h-10 opacity-100'
          }`}
        >
          {online ? (
            <div className="brand-ribbon bg-gradient-to-r from-yellow-600 via-emerald-600 to-blue-600 text-[10px] sm:text-xs px-3 sm:px-4 py-1 flex items-center justify-between text-white">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" aria-hidden />
                <span className="truncate font-semibold tracking-wide text-white">
                  KINGDOM OF ESWATINI · NATIONAL REPORTING PLATFORM
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href="tel:999"
                  className="hidden sm:inline-flex items-center gap-1 font-mono hover:underline underline-offset-2 text-white"
                  title="Call emergency services"
                >
                  <Phone className="w-3 h-3" />
                  999
                </a>
                <div className="flex items-center gap-1 bg-black/30 px-1.5 py-0.5 rounded" aria-live="polite">
                  <Wifi className="w-3 h-3 text-white" aria-hidden />
                  <span className="text-white text-[10px] font-semibold">ONLINE</span>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="brand-ribbon bg-amber-600 text-[10px] sm:text-xs px-3 sm:px-4 py-1.5 flex items-center justify-center gap-2 text-white font-bold"
              role="status"
              aria-live="assertive"
            >
              <WifiOff className="w-3.5 h-3.5 text-white" />
              <span className="text-white">You are offline — tracking may be limited until connection returns</span>
              <a href="tel:999" className="ml-2 inline-flex items-center gap-1 underline underline-offset-2 text-white">
                <Phone className="w-3 h-3" />
                999
              </a>
            </div>
          )}
        </div>

        <div
          className={`max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-3 transition-[height] duration-200 ${
            scrolled ? 'h-12' : 'h-14'
          }`}
        >
          <Link
            href="/report"
            className="flex items-center gap-2.5 group shrink-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500"
          >
            <div
              className={`rounded-xl bg-slate-900 p-0.5 shadow-md shadow-yellow-500/10 group-hover:shadow-yellow-500/20 transition ${
                scrolled ? 'w-8 h-8' : 'w-9 h-9'
              }`}
            >
              <img src="/Bika.png" alt="" className="w-full h-full object-contain" />
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-black text-white tracking-tight group-hover:text-yellow-400 transition leading-none logo-wordmark">
                BIKA
              </div>
              {!scrolled && (
                <div className="text-[9px] text-slate-400 font-mono tracking-wider mt-0.5 logo-tagline">
                  REPORT · TRACK · RESPOND
                </div>
              )}
            </div>
            <span className="sr-only">BIKA home</span>
          </Link>

          <nav
            className="hidden sm:flex items-center p-1 rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-inner backdrop-blur-sm"
            aria-label="Primary"
          >
            <NavPill href="/report" active={reportActive} icon={FileText}>
              Report
            </NavPill>
            <NavPill
              href="/track"
              active={trackActive}
              icon={Search}
              badge={reportCount > 0 ? reportCount : undefined}
            >
              Track
            </NavPill>
            <NavPill href="/hotlines" active={hotlinesActive} icon={Phone}>
              Hotlines
            </NavPill>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {!online && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 px-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Offline
              </span>
            )}

            <Link
              href="/hotlines"
              className="sm:hidden p-2 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/60 transition"
              title="Emergency hotlines"
              aria-label="Emergency hotlines"
            >
              <Phone className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              aria-current={loginActive ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 font-bold px-3.5 py-2 rounded-xl text-[11px] transition-all duration-200 shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500 ${
                loginActive
                  ? 'bg-gradient-to-b from-yellow-300 to-yellow-500 text-slate-950 shadow-yellow-500/30'
                  : 'bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-yellow-500 text-slate-950 shadow-yellow-500/25 hover:shadow-yellow-500/35'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Official</span>
              <span className="sm:hidden">Login</span>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

function NavPill({
  href,
  active,
  icon: Icon,
  children,
  badge,
}: {
  href: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-500 ${
        active
          ? 'bg-yellow-500 text-slate-950 shadow-sm'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/80 hover:scale-[1.02]'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
      {typeof badge === 'number' && badge > 0 && (
        <span
          className={`min-w-[1.1rem] h-[1.1rem] px-1 rounded-full text-[9px] font-black flex items-center justify-center ${
            active ? 'bg-slate-950 text-yellow-400' : 'bg-yellow-500/20 text-yellow-300'
          }`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}
