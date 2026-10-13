'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DRAFT_PREFIX = 'bika:draft:';
const AUTOSAVE_MS = 3000;

export interface DraftState<T> {
  data: T | null;
  savedAt: number | null;
  isRestored: boolean;
  clear: () => void;
}

/**
 * Auto-saves a value to localStorage every 3s while it's "dirty".
 * Restores on mount if a previous draft exists for the same key.
 *
 * Does NOT save on first render (avoids saving empty initial state).
 */
export function useDraft<T>(
  key: string,
  value: T,
  options: { enabled?: boolean } = {}
): DraftState<T> {
  const enabled = options.enabled ?? true;
  const storageKey = DRAFT_PREFIX + key;

  const [restored, setRestored] = useState<T | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const lastSavedRef = useRef<string>('');

  // Restore on mount
  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setIsRestored(true);
        return;
      }
      const parsed = JSON.parse(raw) as { data: T; savedAt: number };
      setRestored(parsed.data);
      setSavedAt(parsed.savedAt);
      setIsRestored(true);
    } catch {
      setIsRestored(true);
    }
  }, [storageKey, enabled]);

  // Autosave on change
  useEffect(() => {
    if (!enabled || !isRestored) return;

    const serialized = JSON.stringify(value);

    // Skip first save if unchanged
    if (serialized === lastSavedRef.current) return;

    const t = setTimeout(() => {
      try {
        const now = Date.now();
        localStorage.setItem(storageKey, JSON.stringify({ data: value, savedAt: now }));
        lastSavedRef.current = serialized;
        setSavedAt(now);
      } catch {
        // Quota or private mode — silently degrade
      }
    }, AUTOSAVE_MS);

    return () => clearTimeout(t);
  }, [value, storageKey, enabled, isRestored]);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    lastSavedRef.current = '';
    setRestored(null);
    setSavedAt(null);
  }, [storageKey]);

  return { data: restored, savedAt, isRestored, clear };
}
