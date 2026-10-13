'use client';

import React, { useState } from 'react';
import { Bus, Utensils, ArrowRight, Search, ShieldCheck, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import type { Mode } from '@/app/types';

interface SectorStepProps {
  onSelect: (mode: Mode) => void;
  onTrack: () => void;
}

export function SectorStep({ onSelect, onTrack }: SectorStepProps) {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero — UX 5.0 */}
      <div className="relative rounded-[1.75rem] p-6 sm:p-12 border border-slate-800/80 shadow-2xl overflow-hidden text-center bg-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(234,179,8,0.14),_transparent_55%)] pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 top-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 text-[11px] px-3.5 py-1.5 rounded-full font-bold uppercase tracking-widest mb-4">
            <Zap className="w-3.5 h-3.5" />
            Kingdom of Eswatini · National Platform
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.1]">
            See something.
            <br className="hidden sm:block" />
            <span className="text-yellow-400"> Say something.</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-lg mt-4 leading-relaxed max-w-2xl mx-auto">
            Report an incident, file a complaint, commend outstanding service, or rate quality.
            <span className="text-white font-semibold"> No account required.</span>
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold">
            {['Anonymous OK', 'Photo evidence', 'Track with ID', 'Live dispatch'].map((t) => (
              <span
                key={t}
                className="px-3 py-1 rounded-full bg-slate-950/60 border border-slate-700/80 text-slate-300 backdrop-blur"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          Select a sector
          <ArrowRight className="w-5 h-5 text-yellow-400" />
        </h2>
        <button
          type="button"
          onClick={onTrack}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-yellow-500/40 px-4 py-2.5 rounded-xl text-xs font-bold text-yellow-400 transition-all shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-500"
        >
          <Search className="w-4 h-4" />
          Track existing report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" role="list">
        <SectorCard
          mode="Road Transport"
          title="Transport Sector"
          emoji="🚌"
          badge="Public & Freight Transport"
          badgeIcon={Bus}
          badgeClass="bg-yellow-500 text-slate-950"
          accentColor="hover:border-yellow-500/80 hover:shadow-yellow-500/10"
          titleHover="group-hover:text-yellow-400"
          arrowBg="bg-yellow-500/20 text-yellow-400 group-hover:bg-yellow-500 group-hover:text-slate-950"
          imageUrl="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80"
          description="Report speeding kombis, overloading, fare overcharging, rank congestion, unsafe vehicles, driver conduct — or commend outstanding drivers."
          tags={['Kombis & Buses', 'Taxis & Hired', 'Bus Ranks & Stops', 'Freight Trucks']}
          onSelect={() => onSelect('Road Transport')}
        />
        <SectorCard
          mode="Restaurant/Food"
          title="Trade & Outlets Sector"
          emoji="🍽️"
          badge="Food Trade & Services"
          badgeIcon={Utensils}
          badgeClass="bg-emerald-500 text-slate-950"
          accentColor="hover:border-emerald-500/80 hover:shadow-emerald-500/10"
          titleHover="group-hover:text-emerald-400"
          arrowBg="bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950"
          imageUrl="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80"
          description="Report food safety issues, unhygienic kitchens, expired produce, price gouging, market hygiene — or compliment clean establishments."
          tags={['Restaurants', 'Food Stalls', 'Bakeries', 'Trade Hubs']}
          onSelect={() => onSelect('Restaurant/Food')}
        />
      </div>

      <div className="pt-2 pb-2">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          aria-expanded={showGuide}
          className="w-full bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-yellow-500/50 rounded-2xl p-4 sm:p-5 flex items-center justify-between text-left transition-all shadow-xl group focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-500"
        >
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-sm sm:text-base font-black text-white group-hover:text-yellow-400 transition-colors">
                  How it works — zero login friction
                </span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  No account needed
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tap to see how citizens report and track without passwords.
              </p>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-800 text-slate-300 group-hover:text-yellow-400 group-hover:bg-slate-700 transition shrink-0 ml-2">
            {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showGuide && (
          <div className="mt-3 bg-slate-900/95 border border-yellow-500/40 rounded-2xl p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <InfoCard
                title="1. No login needed"
                body="No passwords, accounts, or app install. Submit from any device immediately."
                color="text-yellow-400"
              />
              <InfoCard
                title="2. Anonymous or named"
                body="Stay anonymous, or share contact details for SMS follow-up from officers."
                color="text-emerald-400"
              />
              <InfoCard
                title="3. Track with reference ID"
                body="Every report gets a BIKA ID. Use it or My Reports on this device to track."
                color="text-blue-400"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface SectorCardProps {
  mode: Mode;
  title: string;
  emoji: string;
  badge: string;
  badgeIcon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  accentColor: string;
  titleHover: string;
  arrowBg: string;
  imageUrl: string;
  description: string;
  tags: string[];
  onSelect: () => void;
}

function SectorCard({
  mode,
  title,
  emoji,
  badge,
  badgeIcon: BadgeIcon,
  badgeClass,
  accentColor,
  titleHover,
  arrowBg,
  imageUrl,
  description,
  tags,
  onSelect,
}: SectorCardProps) {
  return (
    <button
      type="button"
      role="listitem"
      onClick={onSelect}
      aria-label={`Select ${title} sector`}
      className={`group relative rounded-[1.5rem] overflow-hidden border-2 border-slate-800 ${accentColor} cursor-pointer shadow-2xl transition-all duration-300 hover:scale-[1.015] hover:shadow-2xl bg-slate-900 text-left w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500`}
    >
      <div className="h-52 sm:h-56 relative overflow-hidden">
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
        <div
          className={`absolute top-4 left-4 ${badgeClass} px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center space-x-1 shadow-lg`}
        >
          <BadgeIcon className="w-3.5 h-3.5" />
          <span>{badge}</span>
        </div>
      </div>
      <div className="p-6 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className={`text-xl sm:text-2xl font-black text-white ${titleHover} transition-colors`}>
            {emoji} {title}
          </h3>
          <div
            className={`w-10 h-10 rounded-full ${arrowBg} flex items-center justify-center transition-all shrink-0 group-hover:scale-110`}
          >
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
        <div className="pt-1 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-400">
          {tags.map((t) => (
            <span key={t} className="bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700/80">
              {t}
            </span>
          ))}
        </div>
        <span className="sr-only">Mode: {mode}</span>
      </div>
    </button>
  );
}

function InfoCard({ title, body, color }: { title: string; body: string; color: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-2">
      <div className={`flex items-center space-x-2 font-bold text-xs ${color}`}>
        <ShieldCheck className="w-4 h-4 shrink-0" />
        <span>{title}</span>
      </div>
      <p className="text-slate-300 leading-relaxed text-[11px]">{body}</p>
    </div>
  );
}
