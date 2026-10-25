'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type { Incident, Severity } from '@/app/types';

const SEV_COLOR: Record<Severity, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#38bdf8',
};

export function useWallClock(tickMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);
  return now;
}

export function useIdleChrome(timeoutMs = 4000) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let timer: number | undefined;
    const bump = () => {
      setVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setVisible(false), timeoutMs);
    };
    bump();
    window.addEventListener('mousemove', bump);
    window.addEventListener('mousedown', bump);
    window.addEventListener('keydown', bump);
    window.addEventListener('touchstart', bump);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('mousemove', bump);
      window.removeEventListener('mousedown', bump);
      window.removeEventListener('keydown', bump);
      window.removeEventListener('touchstart', bump);
    };
  }, [timeoutMs]);
  return visible;
}

export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined') return;
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        if ('wakeLock' in navigator) {
          lock = await navigator.wakeLock.request('screen');
        }
      } catch {
        /* optional */
      }
    };
    void request();
    const onVis = () => {
      if (document.visibilityState === 'visible') void request();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      void lock?.release();
    };
  }, [enabled]);
}

export function WallTopBar({
  openCount,
  criticalCount,
  overdueCount,
  regionLabel,
  roleLabel,
  stale,
  online,
  audioEnabled,
  onToggleAudio,
  chromeVisible,
  layout,
  rotating,
}: {
  openCount: number;
  criticalCount: number;
  overdueCount: number;
  regionLabel: string;
  roleLabel: string;
  stale: boolean;
  online: boolean;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  chromeVisible: boolean;
  layout: string;
  rotating: boolean;
}) {
  const now = useWallClock();
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const sync = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggleFs = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* optional */
    }
  };

  return (
    <header className="shrink-0 border-b border-white/5 bg-black/50 backdrop-blur-md">
      <div className="h-12 flex items-center justify-between px-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/Bika.png" alt="" className="w-7 h-7 object-contain shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                online
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.85)]'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300 truncate">
              BIKA · National Command Wall
            </span>
          </div>
          <span className="hidden md:inline text-[11px] font-mono text-slate-400 tabular-nums">
            {now.toLocaleString('en-SZ', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
          {rotating && (
            <span className="hidden lg:inline text-[9px] font-bold uppercase tracking-wider text-yellow-500/80 border border-yellow-500/25 rounded-md px-1.5 py-0.5">
              Region rotate
            </span>
          )}
          <span className="hidden xl:inline text-[9px] font-mono text-slate-600">
            layout:{layout}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <KpiPill label="Open" value={openCount} tone="sky" />
          <KpiPill label="Critical" value={criticalCount} tone="red" pulse={criticalCount > 0} />
          <KpiPill label="SLA" value={overdueCount} tone="rose" pulse={overdueCount > 0} />

          <div
            className={`flex items-center gap-1.5 transition-opacity duration-300 ${
              chromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <button
              type="button"
              onClick={onToggleAudio}
              className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-400 hover:bg-white/5"
              title={audioEnabled ? 'Mute wall audio' : 'Enable wall audio'}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => void toggleFs()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-400 hover:bg-white/5"
              title={isFs ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFs ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <Link
              href="/command"
              className="text-[10px] font-bold text-slate-400 hover:text-yellow-400 px-2 py-1 rounded-lg hover:bg-white/5"
            >
              Exit wall
            </Link>
          </div>

          <span className="hidden sm:inline text-[10px] text-slate-500 truncate max-w-[10rem]">
            {regionLabel} · {roleLabel}
          </span>
          {online ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400/80" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          )}
        </div>
      </div>

      {/* SLA pressure bar */}
      <div className="h-1.5 w-full bg-white/5 relative overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-700 ${
            overdueCount > 0 ? 'bg-gradient-to-r from-rose-600 to-red-500' : 'bg-emerald-500/60'
          }`}
          style={{
            width:
              overdueCount > 0
                ? `${Math.min(100, 12 + overdueCount * 8)}%`
                : '100%',
          }}
        />
      </div>

      {stale && (
        <div className="bg-amber-500 text-amber-950 text-[11px] font-black uppercase tracking-[0.14em] text-center py-1">
          Feed delayed — reconnecting
        </div>
      )}
    </header>
  );
}

function KpiPill({
  label,
  value,
  tone,
  pulse,
}: {
  label: string;
  value: number;
  tone: 'sky' | 'red' | 'rose';
  pulse?: boolean;
}) {
  const tones = {
    sky: 'text-sky-300',
    red: 'text-red-400',
    rose: 'text-rose-400',
  } as const;
  return (
    <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1">
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`text-sm font-black font-mono tabular-nums ${tones[tone]}`}>
        {value}
        {pulse && value > 0 && (
          <span className="inline-block w-1.5 h-1.5 ml-1 rounded-full bg-current animate-pulse align-middle" />
        )}
      </span>
    </div>
  );
}

export function WallFlashBanner({
  incident,
  onDismiss,
}: {
  incident: Incident | null;
  onDismiss: () => void;
}) {
  if (!incident) return null;
  return (
    <div
      className="shrink-0 border-b border-red-500/40 bg-gradient-to-r from-red-950 via-red-900/90 to-orange-950 px-4 py-3 flex items-center gap-4 animate-[wallFlash_0.5s_ease-out]"
      role="alert"
    >
      <span
        className="text-[10px] font-black uppercase tracking-[0.16em] px-2 py-1 rounded-md text-white"
        style={{ backgroundColor: SEV_COLOR[incident.severity] }}
      >
        {incident.severity} · NEW
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mono font-black text-yellow-300">{incident.id}</span>
          <span className="font-bold text-white truncate">{incident.category}</span>
          <span className="text-red-100/70 truncate">
            {incident.location} · {incident.region}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1.5 rounded-lg text-red-200 hover:bg-white/10"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      <style jsx global>{`
        @keyframes wallFlash {
          0% {
            opacity: 0;
            transform: translateY(-8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

/** Quiet-hours: only CRITICAL alerts between 22:00–06:00 local. */
export function shouldPlayWallAudio(
  severity: Severity,
  audioEnabled: boolean,
  now = new Date()
): boolean {
  if (!audioEnabled) return false;
  const hour = now.getHours();
  const quiet = hour >= 22 || hour < 6;
  if (quiet) return severity === 'CRITICAL';
  return severity === 'CRITICAL' || severity === 'HIGH';
}

export function playWallTone(severity: Severity) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = severity === 'CRITICAL' ? 880 : 660;
    gain.gain.value = severity === 'CRITICAL' ? 0.06 : 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    window.setTimeout(() => {
      osc.stop();
      void ctx.close();
    }, severity === 'CRITICAL' ? 280 : 180);
  } catch {
    /* optional */
  }
}
