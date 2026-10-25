'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useHotlines } from '@/app/lib/api/hooks/useReference';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import { canManageHotlines } from '@/app/lib/rbac';
import { useDeleteHotline } from '@/app/lib/api/mutations/useHotlineActions';
import type { Hotline } from '@/app/types';
import { HotlineFormModal } from './_components/HotlineFormModal';

export default function HotlinesPage() {
  const hotlines = useHotlines();
  const me = useOfficerMe();
  const del = useDeleteHotline();
  const [editing, setEditing] = useState<Hotline | null>(null);
  const [creating, setCreating] = useState(false);

  const canManage = me.data ? canManageHotlines(me.data.user.role) : false;

  const handleDelete = (h: Hotline) => {
    if (!confirm(`Delete hotline "${h.name}"?`)) return;
    del.mutate(h.id, {
      onSuccess: () => toast.success('Hotline deleted.'),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Emergency hotlines</h1>
          <p className="text-xs text-slate-400 mt-1">
            Shown on the citizen portal.
            {canManage ? '' : ' Read-only for your role.'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Add hotline
          </button>
        )}
      </div>

      {hotlines.isLoading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(hotlines.data ?? []).map((h) => (
            <div
              key={h.id}
              className={`bg-slate-900 border rounded-2xl p-5 space-y-3 ${
                h.active ? 'border-slate-800' : 'border-red-900/40 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-white truncate">{h.name}</h3>
                  <div className="text-[11px] text-slate-400 truncate">
                    {h.agencyCode ?? '—'} · {h.availableHours}
                  </div>
                </div>
                <span className="font-mono text-xs font-black text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2 py-1 rounded shrink-0">
                  {h.number}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{h.description}</p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  {h.isTollFree && (
                    <span className="text-[9px] font-black uppercase text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Toll-free
                    </span>
                  )}
                  {!h.active && (
                    <span className="text-[9px] font-black uppercase text-red-400 border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 rounded">
                      Disabled
                    </span>
                  )}
                </div>
                {canManage && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditing(h)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-slate-700"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(h)}
                      disabled={del.isPending}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-red-400 border border-slate-700 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && canManage && (
        <HotlineFormModal mode="create" onClose={() => setCreating(false)} />
      )}
      {editing && canManage && (
        <HotlineFormModal mode="edit" hotline={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
