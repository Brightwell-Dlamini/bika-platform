import React from 'react';
import Link from 'next/link';

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-slate-800/80 bg-gradient-to-b from-slate-900/95 to-slate-950 py-10 px-4 text-center text-sm text-slate-400 space-y-5 mt-auto overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,_rgba(234,179,8,0.04),_transparent)] pointer-events-none" />

      <div className="relative z-10 space-y-5">
        <div className="font-bold text-slate-100 text-base tracking-tight">
          BIKA — Eswatini Integrated Real-Time Incident, Transport &amp; Trade Reporting
        </div>
        <div className="max-w-2xl mx-auto leading-relaxed text-slate-500 text-[13px]">
          Kingdom of Eswatini · Ministry of Public Works · National Road Transport Council · Royal
          Eswatini Police Service · Fire &amp; Emergency Services
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold">
          <Link
            href="/report"
            className="text-yellow-500 hover:text-yellow-300 transition-colors underline-offset-4 hover:underline"
          >
            File a Report
          </Link>
          <span className="text-slate-700" aria-hidden="true">
            ·
          </span>
          <Link
            href="/track"
            className="text-yellow-500 hover:text-yellow-300 transition-colors underline-offset-4 hover:underline"
          >
            Track a Case
          </Link>
          <span className="text-slate-700" aria-hidden="true">
            ·
          </span>
          <Link
            href="/hotlines"
            className="text-yellow-500 hover:text-yellow-300 transition-colors underline-offset-4 hover:underline"
          >
            Hotlines
          </Link>
          <span className="text-slate-700" aria-hidden="true">
            ·
          </span>
          <Link
            href="/login"
            className="text-slate-500 hover:text-slate-300 transition-colors underline-offset-4 hover:underline"
          >
            Official login
          </Link>
        </nav>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <a href="tel:999" className="hover:text-red-400 transition-colors font-semibold">
            Emergency: 999
          </a>
          <span aria-hidden="true">·</span>
          <span>See something, say something</span>
          <span aria-hidden="true">·</span>
          <span>Bona lokutsite, yisho lokutsite</span>
        </div>
        <div className="text-[11px] text-slate-600 tracking-wide">
          © {year} BIKA Platform · Kingdom of Eswatini
        </div>
      </div>
    </footer>
  );
}
