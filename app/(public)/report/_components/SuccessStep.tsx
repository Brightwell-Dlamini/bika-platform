'use client';

import React, { useState } from 'react';
import { CheckCircle2, ArrowRight, Copy, Check, AlertTriangle, Share2 } from 'lucide-react';

interface SuccessStepProps {
  referenceId: string;
  onTrack: () => void;
}

export function SuccessStep({ referenceId, onTrack }: SuccessStepProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referenceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShare = async () => {
    const text = `BIKA reference: ${referenceId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'BIKA report', text });
      } else {
        await handleCopy();
      }
    } catch {
      // user cancelled share
    }
  };

  const handleAnother = () => {
    // Full navigation clears wizard state + draft reliably
    window.location.href = '/report';
  };

  return (
    <div className="max-w-md mx-auto bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 text-center shadow-2xl animate-fadeIn space-y-5 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_55%)]" />

      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-4 ring-emerald-500/20 animate-scaleIn">
          <CheckCircle2 className="w-11 h-11" />
        </div>
      </div>

      <div className="relative space-y-2">
        <h2 className="text-2xl font-black text-white">Report submitted</h2>
        <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
          Your report is in the National BIKA Dispatch System. Save the reference ID — it is your
          key to tracking this case.
        </p>
      </div>

      <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-5 text-left space-y-3 shadow-inner">
        <div className="text-[11px] text-slate-400 uppercase tracking-widest font-extrabold text-center">
          Your BIKA reference ID
        </div>
        <div className="text-2xl sm:text-3xl font-black text-yellow-400 font-mono tracking-wider text-center select-all">
          {referenceId}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-yellow-300 border border-slate-700 flex items-center justify-center gap-1.5 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 text-[11px] text-amber-200 leading-snug flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Save this now.</strong> You will need it to track the case later on any device.
          </span>
        </div>
      </div>

      <div className="relative space-y-2 pt-1">
        <button
          type="button"
          onClick={onTrack}
          className="w-full py-3.5 rounded-xl bg-yellow-500 text-slate-950 font-black text-xs hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20"
        >
          <span>Track this report</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleAnother}
          className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition"
        >
          Submit another report
        </button>
      </div>
    </div>
  );
}
