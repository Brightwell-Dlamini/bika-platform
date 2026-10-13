'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

const REGIONS = ['Hhohho', 'Manzini', 'Shiselweni', 'Lubombo'];
const MODES = ['Road Transport', 'Restaurant/Food'];
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const STATUSES = [
  'submitted',
  'triaged',
  'assigned',
  'in_progress',
  'awaiting_info',
  'escalated',
  'resolved',
  'closed',
];

export function FilterBar() {
  const router = useRouter();
  const sp = useSearchParams();

  const get = (key: string) => sp.get(key) ?? '';

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    router.replace(`/command?${next.toString()}`);
  };

  const clearAll = () => router.replace('/command');

  const hasFilters =
    Boolean(get('region')) ||
    Boolean(get('mode')) ||
    Boolean(get('severity')) ||
    Boolean(get('status')) ||
    Boolean(get('q')) ||
    get('overdue') === '1';

  return (
    <div className="bg-slate-900 px-4 py-3 flex items-center gap-3 flex-wrap shrink-0">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-500" />
        <input
          value={get('q')}
          onChange={(e) => setParam('q', e.target.value || null)}
          placeholder="Search ID, vehicle, location…"
          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-500"
        />
      </div>

      <Select value={get('region')} onChange={(v) => setParam('region', v)} label="Region" options={REGIONS} />
      <Select value={get('mode')} onChange={(v) => setParam('mode', v)} label="Mode" options={MODES} />
      <Select value={get('severity')} onChange={(v) => setParam('severity', v)} label="Severity" options={SEVERITIES} />
      <Select value={get('status')} onChange={(v) => setParam('status', v)} label="Status" options={STATUSES} />

      <button
        onClick={() => setParam('overdue', get('overdue') === '1' ? null : '1')}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
          get('overdue') === '1'
            ? 'bg-rose-600 text-white'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`}
      >
        SLA overdue
      </button>

      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-yellow-400"
        >
          <X className="w-3 h-3" /> Clear
        </button>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string | null) => void;
  label: string;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value || null)}
      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-yellow-500"
    >
      <option value="">{label}: all</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
