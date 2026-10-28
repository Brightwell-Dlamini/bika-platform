'use client';

import React from 'react';

const STEPS = ['sector', 'type', 'details', 'review', 'success'] as const;
export type ReportStep = (typeof STEPS)[number] | 'track';

const LABELS: Record<string, string> = {
  sector: 'Sector',
  type: 'Action',
  details: 'Details',
  review: 'Review',
  success: 'Done',
};

export function ProgressBar({ step }: { step: ReportStep }) {
  if (step === 'track') {
    return (
      <div className="max-w-3xl mx-auto mb-4 px-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
        <span className="text-yellow-400">Track existing report</span>
        <span className="text-slate-500">Reference lookup</span>
      </div>
    );
  }

  const idx = STEPS.indexOf(step);

  return (
    <div
      className="max-w-3xl mx-auto mb-7 px-1"
      role="navigation"
      aria-label="Report progress"
    >
      <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 backdrop-blur-sm px-3 sm:px-4 py-3.5 shadow-lg shadow-black/20">
        <div className="flex items-center gap-1 sm:gap-2">
          {STEPS.map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center min-w-0 flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black border-2 transition-all duration-300 ${
                      done
                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-slate-950 shadow-lg shadow-emerald-500/30'
                        : active
                          ? 'bg-gradient-to-br from-yellow-300 to-amber-500 border-yellow-200 text-slate-950 scale-110 shadow-lg shadow-yellow-500/35'
                          : 'bg-slate-800/80 border-slate-700 text-slate-500'
                    }`}
                    aria-current={active ? 'step' : undefined}
                  >
                    {done ? '✓' : i + 1}
                  </div>
                  <span
                    className={`mt-1.5 text-[10px] font-bold truncate w-full text-center transition-colors ${
                      active
                        ? 'text-yellow-400'
                        : done
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                    }`}
                  >
                    {LABELS[s]}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-1 flex-1 mb-5 rounded-full transition-all duration-500 ${
                      i < idx
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-sm shadow-emerald-500/20'
                        : 'bg-slate-800'
                    }`}
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
