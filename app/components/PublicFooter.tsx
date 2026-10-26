import React from 'react';
import Link from 'next/link';

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 border-t border-slate-800 py-8 px-4 text-center text-sm text-slate-400 space-y-4 mt-auto">
      <div className="font-bold text-slate-200 text-base">
        BIKA — Eswatini Integrated Real-Time Incident, Transport & Trade Reporting
      </div>
      <div className="max-w-2xl mx-auto leading-relaxed text-slate-500">
        Kingdom of Eswatini · Ministry of Public Works · National Road Transport Council · Royal
        Eswatini Police Service · Fire & Emergency Services
      </div>
      <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold">
        <Link
          href="/report"
          className="text-yellow-500 hover:text-yellow-400 transition underline-offset-4 hover:underline"
        >
          File a Report
        </Link>
        <span className="text-slate-600" aria-hidden="true">
          ·
        </span>
        <Link
          href="/track"
          className="text-yellow-500 hover:text-yellow-400 transition underline-offset-4 hover:underline"
        >
          Track a Case
        </Link>
        <span className="text-slate-600" aria-hidden="true">
          ·
        </span>
        <Link
          href="/hotlines"
          className="text-yellow-500 hover:text-yellow-400 transition underline-offset-4 hover:underline"
        >
          Hotlines
        </Link>
        <span className="text-slate-600" aria-hidden="true">
          ·
        </span>
        <Link
          href="/login"
          className="text-slate-500 hover:text-slate-300 transition underline-offset-4 hover:underline"
        >
          Official login
        </Link>
      </nav>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <a href="tel:999" className="hover:text-red-400 transition font-semibold">
          Emergency: 999
        </a>
        <span aria-hidden="true">·</span>
        <span>See something, say something</span>
        <span aria-hidden="true">·</span>
        <span>Bona lokutsite, yisho lokutsite</span>
      </div>
      <div className="text-[11px] text-slate-600">© {year} BIKA Platform · Kingdom of Eswatini</div>
    </footer>
  );
}
