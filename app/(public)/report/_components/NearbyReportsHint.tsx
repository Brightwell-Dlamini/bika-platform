'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { findSimilarLocalReports } from '@/app/lib/myReports';
import { statusLabel } from '@/app/lib/statusLabels';

interface NearbyReportsHintProps {
  location: string;
  region?: string;
  category?: string;
}

/**
 * Soft gate: if this device already has open reports with a similar location,
 * suggest tracking those instead of (or before) filing another.
 */
export function NearbyReportsHint({ location, region, category }: NearbyReportsHintProps) {
  const router = useRouter();
  const similar = useMemo(
    () => findSimilarLocalReports({ location, region, category, max: 3 }),
    [location, region, category]
  );

  if (similar.length === 0) return null;

  return (
    <div
      role="status"
      className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 space-y-3"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-extrabold text-amber-200">
            Similar report{similar.length > 1 ? 's' : ''} already on this device
          </div>
          <p className="text-[11px] text-amber-100/80 mt-0.5 leading-relaxed">
            You may already be tracking a case at a similar location. Consider tracking it instead of
            submitting a duplicate — or continue if this is a new incident.
          </p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {similar.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => router.push(`/r/${encodeURIComponent(r.id)}`)}
              className="w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-xl bg-slate-950/60 border border-amber-500/20 hover:border-amber-500/50 transition text-[11px]"
            >
              <span className="min-w-0">
                <span className="font-mono font-bold text-yellow-400">{r.id}</span>
                <span className="text-slate-400"> · {statusLabel(r.status)}</span>
                <span className="block text-slate-500 truncate">
                  {r.category} · {r.location}
                </span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
