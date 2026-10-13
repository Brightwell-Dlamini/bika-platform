'use client';

import React, { useState } from 'react';
import { Search, Loader2, FileText } from 'lucide-react';
import { useAuditLogs } from '@/app/lib/api/hooks/useAuditLogs';

export function AuditTab() {
  const [search, setSearch] = useState('');
  const logs = useAuditLogs({ limit: 500 });

  const filtered = (logs.data ?? []).filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.userName.toLowerCase().includes(q) ||
      (l.details ?? '').toLowerCase().includes(q) ||
      (l.targetId ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-yellow-400" />
          Audit log
          <span className="text-[10px] font-mono text-slate-500">({filtered.length})</span>
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, user, details…"
            className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white w-64 focus:outline-none focus:border-yellow-500"
          />
        </div>
      </div>

      {logs.isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading…
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[600px] rounded-xl border border-slate-800">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
              <tr>
                <th className="p-2 font-bold">Time</th>
                <th className="p-2 font-bold">Actor</th>
                <th className="p-2 font-bold">Action</th>
                <th className="p-2 font-bold">Target</th>
                <th className="p-2 font-bold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40">
                  <td className="p-2 text-slate-400 whitespace-nowrap font-mono">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="p-2 text-white">
                    {l.userName}
                    {l.userRole && (
                      <span className="text-slate-500 text-[10px] ml-1">({l.userRole})</span>
                    )}
                  </td>
                  <td className="p-2">
                    <span className="text-yellow-300 font-bold">{l.action}</span>
                  </td>
                  <td className="p-2 text-slate-300 font-mono text-[10px]">{l.targetId ?? '—'}</td>
                  <td className="p-2 text-slate-300">{l.details ?? '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No audit entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
