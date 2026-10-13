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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-500"
            aria-label="Back to sector selection"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">
              Selected sector
            </span>
            <div className="text-lg font-black text-white flex items-center space-x-2">
              {mode === 'Road Transport' ? (
                <>
                  <Bus className="w-5 h-5 text-yellow-400" />
                  <span>Road & Public Transport</span>
                </>
              ) : (
                <>
                  <Utensils className="w-5 h-5 text-emerald-400" />
                  <span>Restaurants, Food & Trade</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => onChangeMode('Road Transport')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'Road Transport'
                ? 'bg-yellow-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Transport
          </button>
          <button
            type="button"
            onClick={() => onChangeMode('Restaurant/Food')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'Restaurant/Food'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Trade & Food
          </button>
        </div>
      </div>

      <div className="text-center max-w-xl mx-auto space-y-1">
        <h2 className="text-2xl font-black text-white">What would you like to do?</h2>
        <p className="text-xs text-slate-400">
          Pick an action below. You can review everything before submitting.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.type}
              type="button"
              onClick={() => onSelect(card.type)}
              className="group bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-yellow-500/60 p-6 rounded-2xl text-left transition-all duration-200 shadow-xl hover:-translate-y-0.5 hover:shadow-yellow-500/5 flex flex-col justify-between focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500"
            >
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white group-hover:text-yellow-400 transition-colors">
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
          className="group bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 p-6 rounded-2xl text-left transition-all duration-200 shadow-xl hover:-translate-y-0.5 flex flex-col justify-between focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white group-hover:text-sky-400 transition-colors">
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
          className="group bg-gradient-to-br from-red-950 via-slate-900 to-slate-900 hover:from-red-900 border border-red-600/70 p-6 rounded-2xl text-left transition-all duration-200 shadow-2xl hover:-translate-y-0.5 flex flex-col justify-between sm:col-span-2 lg:col-span-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
        >
          <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-red-600/30">
            <Siren className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white">Emergency / Urgent</h3>
            <p className="text-xs text-red-200 mt-1.5 leading-relaxed">{copy.emergency}</p>
          </div>
        </button>
      </div>
    </div>
  );
}
