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
      className="max-w-3xl mx-auto mb-6 px-1"
      role="navigation"
      aria-label="Report progress"
    >
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
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                      : active
                        ? 'bg-yellow-500 border-yellow-300 text-slate-950 scale-110 shadow-lg shadow-yellow-500/30'
                        : 'bg-slate-800 border-slate-700 text-slate-500'
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
                  className={`h-1 flex-1 mb-5 rounded-full transition-colors duration-500 ${
                    i < idx ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
