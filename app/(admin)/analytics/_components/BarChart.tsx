'use client';

import React from 'react';

function Bar({
  label,
  value,
  max,
  suffix = '',
  barClass = 'bg-yellow-500',
  valueClass = 'text-slate-200',
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  barClass?: string;
  valueClass?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-slate-300 truncate pr-2">{label}</span>
        <span className={`font-mono shrink-0 ${valueClass}`}>
          {value}
          {suffix}
        </span>
      </div>
      <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export const BarChart = {
  Bar,
};
