'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Keyboard, X } from 'lucide-react';
import type { Incident } from '@/app/types';

interface QueueKeyboardNavProps {
  incidents: Incident[];
  /** Optional — the URL param used to sync selection. We use a data attribute
   *  on the rows to highlight the selected row visually. */
  onSelectIndex?: (index: number) => void;
}

const HINT_KEY = 'bika:queue:kbd-hint-dismissed';

export function QueueKeyboardNav({ incidents }: QueueKeyboardNavProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(0);
  const [showHint, setShowHint] = useState(false);

  // Show hint the first time only
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = localStorage.getItem(HINT_KEY);
    setShowHint(!dismissed);
  }, []);

  // Reset selection when list changes
  useEffect(() => {
    if (selected >= incidents.length) setSelected(0);
  }, [incidents.length, selected]);

  // Attach keyboard listeners
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      if (key === 'j' || key === 'arrowdown') {
        e.preventDefault();
        setSelected((i) => Math.min(i + 1, incidents.length - 1));
      } else if (key === 'k' || key === 'arrowup') {
        e.preventDefault();
        setSelected((i) => Math.max(i - 1, 0));
      } else if (key === 'enter' || key === 'o') {
        e.preventDefault();
        const inc = incidents[selected];
        if (inc) router.push(`/officer/case/${inc.id}`);
      } else if (key === 'escape') {
        setSelected(0);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [incidents, selected, router]);

  // Highlight selected row
  useEffect(() => {
    // Clear any existing highlight
    document.querySelectorAll('[data-kbd-selected]').forEach((el) => {
      el.removeAttribute('data-kbd-selected');
    });
    const rows = document.querySelectorAll('[data-kbd-row]');
    const row = rows[selected] as HTMLElement | undefined;
    if (row) {
      row.setAttribute('data-kbd-selected', 'true');
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selected, incidents]);

  const dismiss = () => {
    setShowHint(false);
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  if (!showHint) return null;

  return (
    <div className="flex items-center justify-between bg-slate-900 border border-yellow-500/30 rounded-xl px-3 py-2 text-[11px]">
      <div className="flex items-center gap-3 text-slate-300">
        <Keyboard className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
        <span className="font-bold text-yellow-400">Keyboard:</span>
        <span>
          <kbd className="font-mono bg-slate-950 border border-slate-700 px-1.5 py-0.5 rounded text-[10px]">J</kbd>
          <kbd className="font-mono bg-slate-950 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] ml-0.5">K</kbd>
          {' '}navigate
        </span>
        <span>
          <kbd className="font-mono bg-slate-950 border border-slate-700 px-1.5 py-0.5 rounded text-[10px]">Enter</kbd>
          {' '}open
        </span>
      </div>
      <button
        onClick={dismiss}
        className="text-slate-500 hover:text-white p-1"
        aria-label="Dismiss hint"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
