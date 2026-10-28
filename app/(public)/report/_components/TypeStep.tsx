'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertTriangle,
  MessageSquarePlus,
  ThumbsUp,
  Star,
  Search,
  Siren,
  Bus,
  Utensils,
  Check,
} from 'lucide-react';
import type { Mode, ReportType } from '@/app/types';

interface TypeStepProps {
  mode: Mode;
  onChangeMode: (mode: Mode) => void;
  onBack: () => void;
  onSelect: (type: ReportType) => void;
}

const COPY: Record<
  Mode,
  Record<'incident' | 'complaint' | 'compliment' | 'rating' | 'emergency', string>
> = {
  'Road Transport': {
    incident: 'Speeding kombis, rank congestion, unsafe road or vehicle conditions.',
    complaint: 'Fare overcharging, driver misconduct, refusal of service, long wait times.',
    compliment: 'Recognize honest drivers, helpful rank marshals, or traffic police.',
    rating: 'Rate safety, cleanliness, pricing, punctuality and service quality.',
    emergency: 'Major collision, vehicle fire, hazardous chemical leak, active threat.',
  },
  'Restaurant/Food': {
    incident: 'Food safety hazards, unhygienic kitchens, spoiled produce, sanitation issues.',
    complaint: 'Expired food sales, price gouging, abusive trader conduct, unhandled complaints.',
    compliment: 'Commend clean restaurants, honest market traders, and friendly staff.',
    rating: 'Rate hygiene, freshness, pricing, customer service and waiting time.',
    emergency: 'Severe mass food poisoning outbreak, active hazard, chemical contamination.',
  },
};

const CARDS: Array<{
  type: ReportType;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}> = [
  { type: 'incident', icon: AlertTriangle, title: 'Report an Incident' },
  { type: 'complaint', icon: MessageSquarePlus, title: 'Report a Complaint' },
  { type: 'compliment', icon: ThumbsUp, title: 'Give a Compliment' },
  { type: 'rating', icon: Star, title: 'Rate a Service' },
];

export function TypeStep({ mode, onChangeMode, onBack, onSelect }: TypeStepProps) {
  const router = useRouter();
  const copy = COPY[mode];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/70 hover:bg-slate-800 text-slate-300 transition-colors touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-500 shadow-md"
          aria-label="Back to sector overview"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
            File a report
          </p>
          <h1 className="text-lg sm:text-xl font-black text-white leading-tight tracking-tight">
            Choose sector, then action
          </h1>
        </div>
      </div>

      <section aria-labelledby="sector-heading" className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <h2 id="sector-heading" className="text-sm font-black text-white">
            1. Which sector?
          </h2>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Required</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Sector">
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'Road Transport'}
            onClick={() => onChangeMode('Road Transport')}
            className={`relative text-left rounded-2xl border-2 p-4 sm:p-5 transition-all touch-manipulation active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500 ${
              mode === 'Road Transport'
                ? 'border-yellow-400/90 bg-gradient-to-br from-yellow-500/15 to-slate-900 shadow-lg shadow-yellow-500/15'
                : 'border-slate-700/70 bg-slate-900/90 hover:border-slate-500'
            }`}
          >
            {mode === 'Road Transport' && (
              <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-slate-950 shadow-md">
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </span>
            )}
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl mb-3 ${
              mode === 'Road Transport'
                ? 'bg-gradient-to-br from-yellow-300 to-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-yellow-400'
            }`}>
              <Bus className="w-5 h-5" />
            </span>
            <span className="block text-base font-black text-white">Transport</span>
            <span className="block text-[11px] text-slate-400 mt-1 leading-snug">
              Kombis, taxis, buses, ranks, freight roads
            </span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={mode === 'Restaurant/Food'}
            onClick={() => onChangeMode('Restaurant/Food')}
            className={`relative text-left rounded-2xl border-2 p-4 sm:p-5 transition-all touch-manipulation active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
              mode === 'Restaurant/Food'
                ? 'border-emerald-400/90 bg-gradient-to-br from-emerald-500/15 to-slate-900 shadow-lg shadow-emerald-500/15'
                : 'border-slate-700/70 bg-slate-900/90 hover:border-slate-500'
            }`}
          >
            {mode === 'Restaurant/Food' && (
              <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-teal-500 text-slate-950 shadow-md">
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </span>
            )}
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl mb-3 ${
              mode === 'Restaurant/Food'
                ? 'bg-gradient-to-br from-emerald-300 to-teal-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-emerald-400'
            }`}>
              <Utensils className="w-5 h-5" />
            </span>
            <span className="block text-base font-black text-white">Trade & Food</span>
            <span className="block text-[11px] text-slate-400 mt-1 leading-snug">
              Restaurants, stalls, markets, bakeries
            </span>
          </button>
        </div>
      </section>

      <section aria-labelledby="action-heading" className="space-y-3">
        <div className="text-center sm:text-left space-y-1">
          <h2 id="action-heading" className="text-sm font-black text-white">
            2. What would you like to do?
          </h2>
          <p className="text-xs text-slate-400">You can review everything before submitting.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.type}
                type="button"
                onClick={() => onSelect(card.type)}
                className="group relative overflow-hidden bg-slate-900/95 hover:bg-slate-800/95 border border-slate-700/70 hover:border-yellow-500/55 p-6 rounded-2xl text-left transition-all duration-200 shadow-xl hover:-translate-y-0.5 hover:shadow-yellow-500/10 flex flex-col justify-between touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500"
              >
                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(ellipse_at_top_left,_rgba(234,179,8,0.08),_transparent_55%)]" />
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/25 to-amber-600/10 text-yellow-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-yellow-500/20">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="relative">
                  <h3 className="font-extrabold text-lg text-white group-hover:text-yellow-300 transition-colors tracking-tight">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {copy[card.type as keyof typeof copy]}
                  </p>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => router.push('/track')}
            className="group relative overflow-hidden bg-slate-900/95 hover:bg-slate-800 border border-slate-700/70 hover:border-sky-500/50 p-6 rounded-2xl text-left transition-all duration-200 shadow-xl hover:-translate-y-0.5 flex flex-col justify-between touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          >
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-sky-500/20">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white group-hover:text-sky-300 transition-colors tracking-tight">
                Track a report
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Already have a BIKA reference ID? Check status and officer updates.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelect('emergency')}
            className="group relative overflow-hidden bg-gradient-to-br from-red-950 via-slate-900 to-slate-950 hover:from-red-900 border border-red-500/60 p-6 rounded-2xl text-left transition-all duration-200 shadow-2xl shadow-red-950/30 hover:-translate-y-0.5 flex flex-col justify-between sm:col-span-2 lg:col-span-2 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
          >
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_rgba(239,68,68,0.15),_transparent_50%)]" />
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-red-600/40">
              <Siren className="w-6 h-6 animate-pulse" />
            </div>
            <div className="relative">
              <h3 className="font-extrabold text-lg text-white tracking-tight">Emergency / Urgent</h3>
              <p className="text-xs text-red-200/90 mt-1.5 leading-relaxed">{copy.emergency}</p>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
