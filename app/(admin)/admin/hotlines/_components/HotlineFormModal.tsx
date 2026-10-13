'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUpsertHotline } from '@/app/lib/api/mutations/useHotlineActions';
import { AGENCY_CODES, type AgencyCode, type Hotline } from '@/app/types';

type Mode = 'create' | 'edit';

interface HotlineFormModalProps {
  mode: Mode;
  hotline?: Hotline;
  onClose: () => void;
}

const CATEGORIES: Hotline['category'][] = [
  'emergency',
  'police',
  'fire',
  'medical',
  'transport',
  'anti_corruption',
  'general',
];

export function HotlineFormModal({ mode, hotline, onClose }: HotlineFormModalProps) {
  const [name, setName] = useState(hotline?.name ?? '');
  const [number, setNumber] = useState(hotline?.number ?? '');
  const [category, setCategory] = useState<Hotline['category']>(hotline?.category ?? 'police');
  const [description, setDescription] = useState(hotline?.description ?? '');
  const [agencyCode, setAgencyCode] = useState<AgencyCode | ''>(hotline?.agencyCode ?? '');
  const [availableHours, setAvailableHours] = useState(hotline?.availableHours ?? '24/7');
  const [isTollFree, setIsTollFree] = useState(hotline?.isTollFree ?? false);
  const [priority, setPriority] = useState(hotline?.priority ?? 10);
  const [active, setActive] = useState(hotline?.active ?? true);

  const upsert = useUpsertHotline();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !number.trim()) {
      toast.error('Name and number are required.');
      return;
    }
    upsert.mutate(
      {
        id: hotline?.id,
        name: name.trim(),
        number: number.trim(),
        category,
        description: description.trim() || null,
        agencyCode: agencyCode || null,
        availableHours: availableHours.trim() || '24/7',
        isTollFree,
        priority,
        active,
      },
      {
        onSuccess: () => {
          toast.success(mode === 'create' ? 'Hotline created.' : 'Hotline updated.');
          onClose();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 my-8">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white">
            {mode === 'create' ? 'Add hotline' : 'Edit hotline'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1 font-semibold">Name *</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Police Emergency Response"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Number *</label>
              <input
                required
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="999"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Hotline['category'])}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Agency</label>
              <select
                value={agencyCode}
                onChange={(e) => setAgencyCode(e.target.value as AgencyCode | '')}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
              >
                <option value="">— None —</option>
                {AGENCY_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Hours</label>
              <input
                value={availableHours}
                onChange={(e) => setAvailableHours(e.target.value)}
                placeholder="24/7"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Priority</label>
              <input
                type="number"
                min={1}
                max={100}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1 font-semibold">Description</label>
              <textarea
                rows={2}
                value={description ?? ''}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-500 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isTollFree}
                onChange={(e) => setIsTollFree(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-yellow-500"
              />
              <span>Toll-free</span>
            </label>
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-yellow-500"
              />
              <span>Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={upsert.isPending}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-yellow-500 text-slate-950 font-extrabold disabled:opacity-50"
            >
              {upsert.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
