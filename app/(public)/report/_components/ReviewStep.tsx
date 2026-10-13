'use client';

import React from 'react';
import { CheckCircle2, Pencil, Loader2 } from 'lucide-react';
import type { Attachment } from '@/app/types';
import { NearbyReportsHint } from './NearbyReportsHint';

interface ReviewStepProps {
  sector: string;
  reportType: string;
  region: string;
  category: string;
  location: string;
  description: string;
  severity: string;
  attachments: Attachment[];
  isAnonymous: boolean;
  submitting: boolean;
  onEdit: () => void;
  onConfirm: () => void;
}

export function ReviewStep({
  sector,
  reportType,
  region,
  category,
  location,
  description,
  severity,
  attachments,
  isAnonymous,
  submitting,
  onEdit,
  onConfirm,
}: ReviewStepProps) {
  return (
    <div className="max-w-3xl mx-auto bg-slate-900 border border-yellow-500/30 rounded-[1.5rem] p-5 sm:p-7 space-y-5 shadow-2xl animate-fadeIn relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_rgba(234,179,8,0.08),_transparent_50%)]" />

      <div className="relative flex items-start space-x-3">
        <div className="w-11 h-11 rounded-2xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center shrink-0 ring-2 ring-yellow-500/20">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-white">Review before sending</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Confirm the details. You will receive a BIKA reference ID after submission.
          </p>
        </div>
      </div>

      <div className="relative">
        <NearbyReportsHint location={location} region={region} category={category} />
      </div>

      <dl className="relative grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {[
          ['Sector', sector],
          ['Type', reportType],
          ['Region', region],
          ['Category', category || '—'],
          ['Severity', severity],
          ['Photos', String(attachments.length)],
          ['Reporter', isAnonymous ? 'Anonymous' : 'Named'],
        ].map(([k, v]) => (
          <div
            key={k}
            className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 hover:border-slate-700 transition"
          >
            <dt className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{k}</dt>
            <dd className="text-slate-100 font-semibold mt-1">{v}</dd>
          </div>
        ))}
        <div className="sm:col-span-2 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
          <dt className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Location</dt>
          <dd className="text-slate-100 font-semibold mt-1">{location || '—'}</dd>
        </div>
        <div className="sm:col-span-2 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
          <dt className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Description</dt>
          <dd className="text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap line-clamp-6">
            {description || '—'}
          </dd>
        </div>
      </dl>

      {attachments.length > 0 && (
        <div className="relative space-y-2">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Evidence preview</p>
          <div className="flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="w-16 h-16 rounded-xl overflow-hidden border border-slate-700"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
        <button
          type="button"
          onClick={onEdit}
          disabled={submitting}
          className="inline-flex items-center justify-center space-x-1.5 px-4 py-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 disabled:opacity-50 transition touch-manipulation"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>Edit details</span>
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-yellow-500 text-slate-950 text-xs font-extrabold hover:brightness-110 disabled:opacity-60 shadow-lg shadow-yellow-500/25 transition touch-manipulation"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{submitting ? 'Submitting…' : 'Confirm & submit'}</span>
        </button>
      </div>
    </div>
  );
}
