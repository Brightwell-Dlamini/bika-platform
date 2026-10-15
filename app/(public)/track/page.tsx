'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, ExternalLink, Inbox } from 'lucide-react';
import { getMyReports, type MyReportEntry } from '@/app/lib/myReports';
import { statusLabel } from '@/app/lib/statusLabels';
import {
  normalizeReferenceId,
  isPlausibleReferenceId,
} from '@/app/lib/utils/referenceId';
import { toast } from 'sonner';

export default function TrackPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [myReports, setMyReports] = useState<MyReportEntry[]>([]);

  useEffect(() => {
    const refresh = () => setMyReports(getMyReports());
    refresh();
    window.addEventListener('bika-my-reports', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('bika-my-reports', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const handleTrack = (id: string) => {
    const clean = normalizeReferenceId(id);
    if (!clean) {
      toast.error('Please enter a reference ID.');
      return;
    }
    if (!isPlausibleReferenceId(clean)) {
      toast.error('That does not look like a valid BIKA reference ID.');
      return;
    }
    router.push(`/r/${encodeURIComponent(clean)}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fadeIn">
      <div className="relative bg-slate-900 border border-slate-800 rounded-[1.5rem] p-6 sm:p-8 shadow-2xl space-y-5 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(234,179,8,0.08),_transparent_55%)]" />
        <div className="relative">
          <h1 className="text-2xl font-black text-white flex items-center space-x-2">
            <Search className="w-6 h-6 text-yellow-400" />
            <span>Track your report</span>
          </h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Enter your BIKA reference ID (e.g.{' '}
            <span className="font-mono text-slate-300">BIKA-260924-ABC123</span>) to see status and
            officer updates.
          </p>
        </div>

        <div className="relative flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTrack(input)}
            placeholder="BIKA-260924-ABC123"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-yellow-500 transition"
            autoFocus
            aria-label="BIKA reference ID"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => handleTrack(input)}
            className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-extrabold px-6 py-3.5 rounded-xl text-sm shadow-lg shadow-yellow-500/20 shrink-0 transition touch-manipulation"
          >
            Track
          </button>
        </div>

        <div className="relative flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => router.push('/report')}
            className="text-xs text-slate-400 hover:text-yellow-400 transition"
          >
            ← Submit a new report
          </button>
        </div>
      </div>

      {myReports.length > 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-[1.25rem] p-5 shadow-xl space-y-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-extrabold text-white">My reports on this device</h3>
            <span className="text-[10px] font-mono text-slate-500">({myReports.length})</span>
          </div>
          <div className="space-y-2">
            {myReports.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleTrack(r.id)}
                className="w-full flex items-center justify-between gap-3 p-3.5 bg-slate-950 border border-slate-800 hover:border-yellow-500/40 rounded-xl transition text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-500 touch-manipulation"
              >
                <div className="min-w-0">
                  <div className="font-mono text-xs font-bold text-yellow-400 truncate">{r.id}</div>
                  <div className="text-[11px] text-slate-300 truncate">{r.category} · {r.location}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {statusLabel(r.status)} · {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-dashed border-slate-700 rounded-[1.25rem] p-10 text-center space-y-3">
          <Inbox className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">No reports saved on this device yet</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            After you submit a report, it appears here automatically. You can also track any case with
            its BIKA reference ID above.
          </p>
          <button
            type="button"
            onClick={() => router.push('/report')}
            className="inline-flex mt-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-yellow-400 transition touch-manipulation"
          >
            File a report
          </button>
        </div>
      )}
    </div>
  );
}
