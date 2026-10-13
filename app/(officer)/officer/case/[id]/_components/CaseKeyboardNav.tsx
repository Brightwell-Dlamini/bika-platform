'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Keyboard, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Incident, IncidentStatus, User } from '@/app/types';
import {
  useTransitionIncident,
  useAssignIncident,
} from '@/app/lib/api/mutations/useIncidentActions';

const HINT_KEY = 'bika:case:kbd-hint-dismissed';

interface CaseKeyboardNavProps {
  incident: Incident;
  currentUser: User;
  /** Called when the user should focus the note input. */
  onFocusNote?: () => void;
}

export function CaseKeyboardNav({
  incident,
  currentUser,
  onFocusNote,
}: CaseKeyboardNavProps) {
  const router = useRouter();
  const transition = useTransitionIncident(incident.id);
  const assign = useAssignIncident(incident.id);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setShowHint(!localStorage.getItem(HINT_KEY));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') (target as HTMLElement)?.blur();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      const canClaim =
        !incident.assignedOfficerId &&
        !['resolved', 'closed', 'rejected'].includes(incident.status);

      const transitionTo = (to: IncidentStatus) => {
        transition.mutate(
          { to },
          {
            onSuccess: () => toast.success(`Status: ${to}`),
            onError: (err) => toast.error(err.message),
          }
        );
      };

      switch (key) {
        case 'a':
          if (incident.status === 'submitted' || incident.status === 'triaged') {
            transitionTo('triaged');
          }
          break;
        case 'c':
          if (canClaim) {
            assign.mutate(
              {
                officerId: currentUser.id,
                agencyCode: currentUser.agencyCode ?? 'BIKA',
                reason: 'Claimed via keyboard',
              },
              {
                onSuccess: () => toast.success('Claimed'),
                onError: (err) => toast.error(err.message),
              }
            );
          }
          break;
        case 'r':
          transitionTo('resolved');
          break;
        case 'i':
          transitionTo('in_progress');
          break;
        case 'n':
          e.preventDefault();
          onFocusNote?.();
          break;
        case 'escape':
          router.push('/officer/queue');
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [incident, currentUser, transition, assign, router, onFocusNote]);

  if (!showHint) return null;

  const dismiss = () => {
    setShowHint(false);
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex items-center justify-between bg-slate-900 border border-yellow-500/30 rounded-xl px-3 py-2 text-[11px]">
      <div className="flex items-center gap-3 text-slate-300 flex-wrap">
        <Keyboard className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
        <span className="font-bold text-yellow-400">Shortcuts:</span>
        <Key k="A">acknowledge</Key>
        <Key k="C">claim</Key>
        <Key k="I">in progress</Key>
        <Key k="R">resolve</Key>
        <Key k="N">note</Key>
        <Key k="Esc">back</Key>
      </div>
      <button
        onClick={dismiss}
        className="text-slate-500 hover:text-white p-1 shrink-0"
        aria-label="Dismiss hint"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function Key({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1">
      <kbd className="font-mono bg-slate-950 border border-slate-700 px-1.5 py-0.5 rounded text-[10px]">
        {k}
      </kbd>
      <span className="text-slate-500">{children}</span>
    </span>
  );
}
