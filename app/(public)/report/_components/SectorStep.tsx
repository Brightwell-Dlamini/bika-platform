'use client';

import React, { useState } from 'react';
import {
  Bus,
  Utensils,
  ArrowRight,
  Search,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Phone,
  Sparkles,
} from 'lucide-react';
import type { Mode } from '@/app/types';

interface SectorStepProps {
  onSelect: (mode: Mode) => void;
  onTrack: () => void;
}

export function SectorStep({ onSelect, onTrack }: SectorStepProps) {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="space-y-8 animate-fadeIn">
      <a
        href="tel:999"
        className="group flex items-center gap-3.5 rounded-2xl border border-red-500/35 bg-gradient-to-r from-red-950/70 via-red-950/50 to-slate-950/80 px-4 py-3.5 text-left shadow-lg shadow-red-950/30 hover:border-red-400/50 hover:shadow-red-900/40 active:scale-[0.99] transition-all duration-200 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg shadow-red-600/40 group-hover:scale-105 transition-transform">
          <Phone className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-red-50 tracking-tight">
            Life-threatening emergency?
          </span>
          <span className="block text-[11px] text-red-200/85 mt-0.5 leading-relaxed">
            Call <strong className="text-white font-bold">999</strong> now — do not wait for an online report.
          </span>
        </span>
        <span className="hidden sm:inline-flex items-center justify-center min-w-[3rem] h-9 rounded-lg bg-red-600/90 text-xs font-black text-white tabular-nums shadow-inner">
          999
        </span>
      </a>

      <div className="relative rounded-[1.85rem] p-7 sm:p-12 border border-slate-700/50 shadow-2xl overflow-hidden text-center bika-glass-strong bika-noise">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_rgba(234,179,8,0.18),_transparent_55%)] pointer-events-none" />
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 top-0 w-56 h-56 bg-blue-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent" />

        <div className="max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 bg-yellow-500/12 text-yellow-200 border border-yellow-500/25 text-[11px] px-3.5 py-1.5 rounded-full font-bold uppercase tracking-[0.14em] mb-5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            Kingdom of Eswatini · National Platform
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-[3.25rem] font-black text-white tracking-tight leading-[1.08]">
            See something.
            <br className="hidden sm:block" />
            <span className="bika-text-gradient">Say something.</span>
          </h1>
          <p className="text-slate-300/95 text-sm sm:text-lg mt-5 leading-relaxed max-w-2xl mx-auto font-medium">
            Report an incident, file a complaint, commend outstanding service, or rate quality.
            <span className="text-white font-semibold"> No account required.</span>
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold">
            {['Anonymous OK', 'Photo evidence', 'Track with ID', 'Live dispatch'].map((t) => (
              <span
                key={t}
                className="px-3.5 py-1.5 rounded-full bg-slate-950/50 border border-slate-600/50 text-slate-300 backdrop-blur-sm shadow-sm"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div id="sector-picker" className="scroll-mt-24 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5 tracking-tight">
            Select a sector
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-400">
              <ArrowRight className="w-4 h-4" />
            </span>
          </h2>
          <button
            type="button"
            onClick={onTrack}
            className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800/95 border border-slate-700/80 hover:border-yellow-500/45 px-4 py-2.5 rounded-xl text-xs font-bold text-yellow-400 transition-all shadow-lg shadow-black/20 active:scale-95 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-500"
          >
            <Search className="w-4 h-4" />
            Track existing report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6" role="list">
          <SectorCard
            mode="Road Transport"
            title="Transport Sector"
            badge="Public & Freight Transport"
            badgeIcon={Bus}
            badgeClass="bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950"
            accentBorder="group-hover:border-yellow-500/70"
            accentShadow="hover:shadow-yellow-500/12"
            titleHover="group-hover:text-yellow-300"
            arrowBg="bg-yellow-500/20 text-yellow-400 group-hover:bg-yellow-500 group-hover:text-slate-950"
            imageUrl="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80"
            description="Report speeding kombis, overloading, fare overcharging, rank congestion, unsafe vehicles, driver conduct — or commend outstanding drivers."
            tags={['Kombis & Buses', 'Taxis & Hired', 'Bus Ranks & Stops', 'Freight Trucks']}
            onSelect={() => onSelect('Road Transport')}
          />
          <SectorCard
            mode="Restaurant/Food"
            title="Trade & Outlets Sector"
            badge="Food Trade & Services"
            badgeIcon={Utensils}
            badgeClass="bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950"
            accentBorder="group-hover:border-emerald-500/70"
            accentShadow="hover:shadow-emerald-500/12"
            titleHover="group-hover:text-emerald-300"
            arrowBg="bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950"
            imageUrl="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80"
            description="Report food safety issues, unhygienic kitchens, expired produce, price gouging, market hygiene — or compliment clean establishments."
            tags={['Restaurants', 'Food Stalls', 'Bakeries', 'Trade Hubs']}
            onSelect={() => onSelect('Restaurant/Food')}
          />
        </div>
      </div>

      <div className="pt-1 pb-2">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          aria-expanded={showGuide}
          className="w-full bika-glass hover:border-yellow-500/40 rounded-2xl p-4 sm:p-5 flex items-center justify-between text-left transition-all duration-200 shadow-xl group active:scale-[0.995] touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-500"
        >
          <div className="flex items-center space-x-3.5 sm:space-x-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-600/10 border border-yellow-500/30 text-yellow-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-sm sm:text-base font-black text-white group-hover:text-yellow-300 transition-colors tracking-tight">
                  How it works — zero login friction
                </span>
                <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  No account needed
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tap to see how citizens report and track without passwords.
              </p>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/80 text-slate-300 group-hover:text-yellow-400 group-hover:bg-slate-700/80 transition shrink-0 ml-2">
            {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showGuide && (
          <div className="mt-3 bika-glass-strong border-yellow-500/30 rounded-2xl p-6 shadow-2xl space-y-4 animate-fadeIn">
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
  badge: string;
  badgeIcon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  accentBorder: string;
  accentShadow: string;
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
  badge,
  badgeIcon: BadgeIcon,
  badgeClass,
  accentBorder,
  accentShadow,
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
      className={`group relative rounded-[1.6rem] overflow-hidden border border-slate-700/70 ${accentBorder} ${accentShadow} cursor-pointer shadow-2xl shadow-black/40 transition-all duration-300 hover:scale-[1.015] active:scale-[0.985] bg-slate-900 text-left w-full touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500`}
    >
      <div className="h-52 sm:h-56 relative overflow-hidden pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out brightness-[0.72]"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-transparent" />
        <div
          className={`absolute top-4 left-4 ${badgeClass} px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center space-x-1.5 shadow-lg`}
        >
          <BadgeIcon className="w-3.5 h-3.5" />
          <span>{badge}</span>
        </div>
      </div>
      <div className="p-6 space-y-3 pointer-events-none relative">
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent" />
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <h3 className={`text-xl sm:text-2xl font-black text-white ${titleHover} transition-colors tracking-tight`}>
            {title}
          </h3>
          <div
            className={`w-10 h-10 rounded-full ${arrowBg} flex items-center justify-center transition-all duration-200 shrink-0 group-hover:scale-110 shadow-md`}
          >
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-slate-300/95 leading-relaxed">{description}</p>
        <div className="pt-1 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-400">
          {tags.map((t) => (
            <span
              key={t}
              className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/70 backdrop-blur-sm"
            >
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
    <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 space-y-2 backdrop-blur-sm">
      <div className={`flex items-center space-x-2 font-bold text-xs ${color}`}>
        <ShieldCheck className="w-4 h-4 shrink-0" />
        <span>{title}</span>
      </div>
      <p className="text-slate-300 leading-relaxed text-[11px]">{body}</p>
    </div>
  );
}
