import React from 'react';
import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 py-8 px-4 text-center text-xs text-slate-400 space-y-4 mt-auto">
      <div className="font-bold text-slate-200 text-sm">
        BIKA — Eswatini Integrated Real-Time Incident, Transport & Trade Reporting
      </div>
      <div className="max-w-2xl mx-auto leading-relaxed">
        Kingdom of Eswatini · Ministry of Public Works · National Road Transport Council · Royal
        Eswatini Police Service · Fire & Emergency Services
      </div>
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-semibold">
        <Link href="/report" className="text-yellow-400/90 hover:text-yellow-300 transition">
          File a report
        </Link>
        <span className="text-slate-700" aria-hidden="true">
          ·
        </span>
        <Link href="/track" className="text-yellow-400/90 hover:text-yellow-300 transition">
          Track a case
        </Link>
        <span className="text-slate-700" aria-hidden="true">
          ·
        </span>
        <Link href="/login" className="text-slate-400 hover:text-white transition">
          Official login
        </Link>
      </nav>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span>Emergency: 999 · 800-BIKA</span>
        <span aria-hidden="true">·</span>
        <span>See something, say something</span>
        <span aria-hidden="true">·</span>
        <span>Bona lokutsite, yisho lokutsite</span>
      </div>
    </footer>
  );
}
