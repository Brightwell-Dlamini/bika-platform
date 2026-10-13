'use client';

import { useEffect } from 'react';

export interface ShortcutMap {
  [key: string]: (e: KeyboardEvent) => void;
}

/**
 * Register keyboard shortcuts for a page.
 *
 * Shortcuts are automatically disabled when focus is inside an input,
 * textarea, select, or contenteditable element — so typing "J" in a note
 * doesn't navigate away.
 *
 * Keys are case-insensitive. Use 'escape', 'enter', 'arrowup' etc for
 * special keys.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Skip when typing
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
      ) {
        // Allow Escape to always fire
        if (e.key === 'Escape') {
          const fn = shortcuts['escape'];
          if (fn) fn(e);
        }
        return;
      }

      // Skip with modifiers except shift (for '?')
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      const fn = shortcuts[key];
      if (fn) {
        fn(e);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, enabled]);
}
