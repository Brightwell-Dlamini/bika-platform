'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

/** Idle timeout for official workspaces (ms). */
const IDLE_MS = 30 * 60 * 1000;
/** Warn this many ms before logout. */
const WARN_BEFORE_MS = 2 * 60 * 1000;

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'visibilitychange',
];

/**
 * Signs the official out after IDLE_MS of no activity.
 * Mount only inside authenticated officer/admin shells.
 */
export function SessionIdleGuard() {
  const router = useRouter();
  const lastActivity = useRef(Date.now());
  const warned = useRef(false);
  const loggingOut = useRef(false);

  const logout = useCallback(async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    toast.message('Session ended due to inactivity.');
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    const bump = () => {
      lastActivity.current = Date.now();
      warned.current = false;
    };

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, bump, { passive: true });
    }

    const timer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      const idle = Date.now() - lastActivity.current;
      if (idle >= IDLE_MS) {
        void logout();
        return;
      }
      if (idle >= IDLE_MS - WARN_BEFORE_MS && !warned.current) {
        warned.current = true;
        toast.warning('You will be signed out soon due to inactivity.', {
          duration: 8000,
        });
      }
    }, 15_000);

    return () => {
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, bump);
      }
      window.clearInterval(timer);
    };
  }, [logout]);

  return null;
}
