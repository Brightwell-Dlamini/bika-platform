'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/app/lib/api/fetcher';
import { qk } from '@/app/lib/api/queryKeys';
import { useAssignIncident } from '@/app/lib/api/mutations/useIncidentActions';
import { AGENCY_CODES, type AgencyCode, type User } from '@/app/types';

interface AssignDialogProps {
  open: boolean;
  incidentId: string;
  currentAgencyCode: AgencyCode | null;
  onClose: () => void;
}

export function AssignDialog({
  open,
  incidentId,
  currentAgencyCode,
  onClose,
}: AssignDialogProps) {
  const [agencyCode, setAgencyCode] = useState<AgencyCode>(currentAgencyCode ?? 'REPS');
  const [officerId, setOfficerId] = useState('');
  const [reason, setReason] = useState('');

  const officers = useQuery({
    queryKey: [...qk.users.list({ agencyCode }), 'assignable'],
    queryFn: () =>
      apiFetch<{ users: User[] }>(`/api/admin/users?agencyCode=${agencyCode}&active=true`).then(
        (r) => r.users
      ),
    enabled: open,
    staleTime: 60_000,
  });

  const assign = useAssignIncident(incidentId);

  if (!open) return null;

  // Prefer on-duty officers at the top of the list
  const sorted = [...(officers.data ?? [])].sort((a, b) => {
    if (a.onDuty === b.onDuty) return a.name.localeCompare(b.name);
    return a.onDuty ? -1 : 1;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerId) {
      toast.error('Select an officer.');
      return;
    }
    assign.mutate(
      { officerId, agencyCode, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Case assigned.');
          onClose();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white">Assign case</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Agency</label>
            <select
              value={agencyCode}
              onChange={(e) => {
                setAgencyCode(e.target.value as AgencyCode);
                setOfficerId('');
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
            >
              {AGENCY_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Officer</label>
            <select
              value={officerId}
              onChange={(e) => setOfficerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              disabled={officers.isLoading}
            >
              <option value="">
                {officers.isLoading ? 'Loading…' : 'Select an officer'}
              </option>
              {sorted.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.region}){o.onDuty ? ' · on duty' : ' · off duty'}
                </option>
              ))}
            </select>
            {officers.isError && (
              <p className="text-rose-400 mt-1">{(officers.error as Error).message}</p>
            )}
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Reason (optional)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this being assigned?"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assign.isPending || !officerId}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-yellow-500 text-slate-950 font-extrabold disabled:opacity-50"
            >
              {assign.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
