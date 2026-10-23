'use client';

import React, { useState } from 'react';
import { Flame, UserCheck, Loader2, ChevronRight, CheckCircle2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import type { Incident, IncidentStatus, User } from '@/app/types';
import {
  useTransitionIncident,
  useAssignIncident,
  useAcknowledgeIncident,
} from '@/app/lib/api/mutations/useIncidentActions';
import { canRunWork } from '@/app/lib/rbac';
import { statusLabel } from '@/app/lib/statusLabels';
import { PRIMARY_NEXT, canAcknowledge } from '@/app/lib/statusTransitions';
import { AssignDialog } from './AssignDialog';

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

  const suggestions = PRIMARY_NEXT[incident.status] ?? [];
  const assignedToMe = incident.assignedOfficerId === currentUser.id;
  const canReassign = canRunWork(currentUser.role);
  const showAck =
    canAcknowledge(incident.status) &&
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
    <div className="relative overflow-hidden rounded-3xl border border-slate-800/70 bg-[#0a0e16] shadow-2xl shadow-black/40">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_bottom_left,_rgba(234,179,8,0.06),_transparent_55%)]" />
      <div className="relative p-5 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-tight">Workflow</h3>
              <p className="text-[10px] text-slate-500">Advance · claim · escalate</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showAck && (
              <button
                type="button"
                onClick={handleAcknowledge}
                disabled={busy}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl disabled:opacity-50 shadow-lg shadow-emerald-900/30"
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
                className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl disabled:opacity-50 shadow-lg shadow-yellow-500/25"
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
                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-yellow-300 text-xs font-bold px-3.5 py-2 rounded-xl border border-white/10 disabled:opacity-50"
              >
                {assignedToMe ? 'Reassign' : 'Assign'}
              </button>
            )}
          </div>
        </div>

        {suggestions.length > 0 && (
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.14em] mb-2.5">
              Advance status
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleTransition(s)}
                  disabled={busy}
                  className="group inline-flex items-center gap-1.5 bg-white/[0.04] hover:bg-yellow-500 text-slate-200 hover:text-slate-950 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-white/10 hover:border-yellow-400 transition-all disabled:opacity-50 touch-manipulation"
                >
                  {transition.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{statusLabel(s)}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        )}

        {!['resolved', 'closed', 'rejected'].includes(incident.status) && (
          <div className="border-t border-white/5 pt-4">
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
              <div className="space-y-3 rounded-2xl border border-rose-500/25 bg-rose-950/20 p-4">
                <textarea
                  rows={2}
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="Why is this being escalated? (min 10 chars)"
                  className="w-full bg-slate-950/80 border border-rose-800/50 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEscalate(false);
                      setEscalateReason('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-300 text-xs font-bold border border-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleEscalate}
                    disabled={transition.isPending}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50 shadow-lg shadow-rose-900/40"
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
    </div>
  );
}
