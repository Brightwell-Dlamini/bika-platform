'use client';

import React, { useState } from 'react';
import { Loader2, Image as ImageIcon, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useLogos } from '@/app/lib/api/hooks/useReference';
import { useUpsertLogo } from '@/app/lib/api/mutations/useSystemActions';

export function BrandingTab() {
  const logos = useLogos();
  const upsert = useUpsertLogo();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: '',
    acronym: '',
    subtitle: '',
    role: '',
    customImageUrl: '',
    badgeColor: '',
  });

  const startEdit = (id: string) => {
    const logo = (logos.data ?? []).find((l) => l.id === id);
    if (!logo) return;
    setEditingId(id);
    setDraft({
      name: logo.name,
      acronym: logo.acronym,
      subtitle: logo.subtitle ?? '',
      role: logo.role ?? '',
      customImageUrl: logo.customImageUrl ?? '',
      badgeColor: logo.badgeColor ?? '',
    });
  };

  const save = () => {
    if (!editingId) return;
    upsert.mutate(
      {
        id: editingId,
        name: draft.name,
        acronym: draft.acronym,
        subtitle: draft.subtitle || null,
        role: draft.role || null,
        customImageUrl: draft.customImageUrl || null,
        badgeColor: draft.badgeColor || null,
      },
      {
        onSuccess: () => {
          toast.success('Logo saved.');
          setEditingId(null);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  if (logos.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading logos…
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-5 h-5 text-yellow-400" />
        <h2 className="text-sm font-extrabold text-white">Agency logos</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(logos.data ?? []).map((logo) => (
          <div
            key={logo.id}
            className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 p-1 flex items-center justify-center overflow-hidden shrink-0">
                  {logo.customImageUrl ? (
                    <img
                      src={logo.customImageUrl}
                      alt={logo.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-yellow-400 font-black text-xs font-mono">
                      {logo.acronym}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{logo.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {logo.acronym} · {logo.role ?? '—'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => startEdit(logo.id)}
                className="text-[10px] font-bold text-yellow-400 hover:underline shrink-0"
              >
                {editingId === logo.id ? 'Editing' : 'Edit'}
              </button>
            </div>

            {editingId === logo.id && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Display name"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-500"
                />
                <input
                  value={draft.acronym}
                  onChange={(e) => setDraft({ ...draft, acronym: e.target.value.toUpperCase() })}
                  placeholder="Acronym"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-500"
                />
                <input
                  value={draft.subtitle}
                  onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                  placeholder="Subtitle"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-500"
                />
                <input
                  value={draft.customImageUrl}
                  onChange={(e) => setDraft({ ...draft, customImageUrl: e.target.value })}
                  placeholder="Image URL (https://…)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={save}
                    disabled={upsert.isPending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-500 text-slate-950 text-xs font-bold disabled:opacity-50"
                  >
                    {upsert.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
