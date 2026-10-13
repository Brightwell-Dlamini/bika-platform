'use client';

import React, { useState } from 'react';
import { Flame, UserCheck, Loader2, ChevronRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Incident, IncidentStatus, User } from '@/app/types';
import {
  useTransitionIncident,
  useAssignIncident,
  useAcknowledgeIncident,
} from '@/app/lib/api/mutations/useIncidentActions';
import { canRunWork } from '@/app/lib/rbac';
import { statusLabel } from '@/app/lib/statusLabels';
import { AssignDialog } from './AssignDialog';

const NEXT_HINTS: Partial<Record<IncidentStatus, IncidentStatus[]>> = {
  submitted: ['triaged', 'assigned', 'rejected'],
  triaged: ['assigned', 'in_progress', 'awaiting_info', 'rejected'],
  assigned: ['in_progress', 'awaiting_info', 'resolved'],
  in_progress: ['resolved', 'awaiting_info'],
  awaiting_info: ['in_progress', 'resolved', 'rejected'],
  escalated: ['in_progress', 'resolved'],
  resolved: ['closed'],
};

export function CaseActions({
  incident,
  currentUser,
}: {
  incident: Incident;
  currentUser: User;
}) {
  const transition = useTransitionIncident(incident.id);
  const assign = useAssignIncident(incident.id);
  const acknowledge = useAcknowledgeIncident(incident.id);
  const [showAssign, setShowAssign] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [showEscalate, setShowEscalate] = useState(false);

  const suggestions = NEXT_HINTS[incident.status] ?? [];
  const assignedToMe = incident.assignedOfficerId === currentUser.id;
  const canReassign = canRunWork(currentUser.role);
  const canAcknowledge =
    ['submitted', 'triaged', 'assigned'].includes(incident.status) &&
    (!incident.assignedOfficerId || assignedToMe);

  const busy = transition.isPending || assign.isPending || acknowledge.isPending;

  const handleTransition = (to: IncidentStatus) => {
    transition.mutate(
      { to },
      {
        onSuccess: () => toast.success(`Moved to ${statusLabel(to)}.`),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleClaim = () => {
    assign.mutate(
      {
        officerId: currentUser.id,
        agencyCode: currentUser.agencyCode ?? 'BIKA',
        reason: 'Self-claimed from case view',
      },
      {
        onSuccess: () => toast.success('Case claimed.'),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleAcknowledge = () => {
    acknowledge.mutate(undefined, {
      onSuccess: () => toast.success('Case acknowledged and in progress.'),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleEscalate = () => {
    if (escalateReason.trim().length < 10) {
      toast.error('Please provide a reason (at least 10 characters).');
      return;
    }
    transition.mutate(
      { to: 'escalated', note: escalateReason.trim() },
      {
        onSuccess: () => {
          toast.warning('Case escalated to supervisory channels.');
          setShowEscalate(false);
          setEscalateReason('');
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-white">Workflow actions</h3>
        <div className="flex flex-wrap items-center gap-2">
          {canAcknowledge && (
            <button
              type="button"
              onClick={handleAcknowledge}
              disabled={busy}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {acknowledge.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Acknowledge
            </button>
          )}
          {!incident.assignedOfficerId && (
            <button
              type="button"
              onClick={handleClaim}
              disabled={busy}
              className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              <UserCheck className="w-3.5 h-3.5" />
              {assign.isPending ? 'Claiming…' : 'Claim case'}
            </button>
          )}
          {canReassign && (
            <button
              type="button"
              onClick={() => setShowAssign(true)}
              disabled={busy}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-yellow-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 disabled:opacity-50"
            >
              {assignedToMe ? 'Reassign' : 'Assign to officer'}
            </button>
          )}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">Advance to</div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleTransition(s)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-yellow-500 hover:text-slate-950 text-slate-200 font-bold text-xs px-3 py-2 rounded-lg border border-slate-700 transition-colors disabled:opacity-50 touch-manipulation"
              >
                {transition.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>{statusLabel(s)}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {!['resolved', 'closed', 'rejected'].includes(incident.status) && (
        <div className="border-t border-slate-800 pt-4">
          {!showEscalate ? (
            <button
              type="button"
              onClick={() => setShowEscalate(true)}
              className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 font-bold text-xs"
            >
              <Flame className="w-3.5 h-3.5" />
              Escalate to supervisory channels
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                rows={2}
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                placeholder="Why is this being escalated? (min 10 chars)"
                className="w-full bg-slate-950 border border-rose-800/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEscalate(false);
                    setEscalateReason('');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEscalate}
                  disabled={transition.isPending}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  {transition.isPending ? 'Escalating…' : 'Confirm escalate'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <AssignDialog
        open={showAssign}
        incidentId={incident.id}
        currentAgencyCode={incident.assignedAgencyCode}
        onClose={() => setShowAssign(false)}
      />
    </div>
  );
}
