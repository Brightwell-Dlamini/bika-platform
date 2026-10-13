'use client';

import React, { useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useIncident } from '@/app/lib/api/hooks/useIncident';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import { CaseHeader } from './_components/CaseHeader';
import { CaseActions } from './_components/CaseActions';
import { CaseTimeline } from './_components/CaseTimeline';
import { CaseNoteInput } from './_components/CaseNoteInput';
import { CaseKeyboardNav } from './_components/CaseKeyboardNav';

export default function CasePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = decodeURIComponent(params.id);
  const incident = useIncident(id);
  const me = useOfficerMe();
  const noteRef = useRef<HTMLTextAreaElement | null>(null);

  if (incident.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading case {id}…
      </div>
    );
  }

  if (incident.isError || !incident.data) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Link
          href="/officer/queue"
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-yellow-400"
        >
          <ArrowLeft className="w-4 h-4" /> Back to queue
        </Link>
        <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-8 text-center">
          <h2 className="text-lg font-bold text-white">Case not found</h2>
          <p className="text-xs text-slate-400 mt-2">
            {incident.error?.message ?? `No case exists with reference ${id}.`}
          </p>
        </div>
      </div>
    );
  }

  const { incident: inc, events } = incident.data;
  const currentUser = me.data?.user;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          href="/officer/queue"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-yellow-400"
        >
          <ArrowLeft className="w-4 h-4" /> Back to queue
        </Link>
      </div>

      {currentUser && (
        <CaseKeyboardNav
          incident={inc}
          currentUser={currentUser}
          onFocusNote={() => noteRef.current?.focus()}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7 space-y-5">
          <CaseHeader incident={inc} />
          {currentUser && <CaseActions incident={inc} currentUser={currentUser} />}
        </div>

        <div className="xl:col-span-5 space-y-5">
          <CaseTimeline events={events} />
          {currentUser && (
            <CaseNoteInput
              ref={noteRef}
              incidentId={inc.id}
              currentRole={currentUser.role}
            />
          )}
        </div>
      </div>
    </div>
  );
}
