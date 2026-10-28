'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'bika_pwa_install_dismissed_until';
const DISMISS_DAYS = 7;

declare global {
  interface Window {
    __BIKA_DEFERRED_PROMPT?: Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
  }
}

/**
 * Install UI only. SW is registered early from layout <head> script.
 */
export function PwaRegister() {
  const [deferred, setDeferred] = useState<
    | (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> })
    | null
  >(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone) {
      setInstalled(true);
      return;
    }

    // Ensure SW is registered even if head script was blocked
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(async (reg) => {
          setSwReady(true);
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          await reg.update().catch(() => {});
          // Wait until active controller when possible
          if (navigator.serviceWorker.controller) setSwReady(true);
        })
        .catch((err) => {
          console.warn('[BIKA PWA] SW register failed', err);
        });

      navigator.serviceWorker.ready.then(() => setSwReady(true)).catch(() => {});
    }

    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const dismissed = dismissedUntil && Date.now() < dismissedUntil;

    const onBip = (e: Event) => {
      e.preventDefault();
      const ev = e as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: string }>;
      };
      window.__BIKA_DEFERRED_PROMPT = ev;
      setDeferred(ev);
      if (!dismissed) setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);

    // Prompt may have fired before React mounted
    if (window.__BIKA_DEFERRED_PROMPT && !dismissed) {
      setDeferred(window.__BIKA_DEFERRED_PROMPT);
      setVisible(true);
    }

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setVisible(false);
      setDeferred(null);
      window.__BIKA_DEFERRED_PROMPT = undefined;
    });

    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000)
      );
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const onInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    setVisible(false);
    window.__BIKA_DEFERRED_PROMPT = undefined;
  };

  if (installed) return null;

  // Show banner when Chrome offers real install
  if (visible && deferred) {
    return (
      <div
        role="dialog"
        aria-label="Install BIKA"
        style={{
          position: 'fixed',
          bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
          left: 12,
          right: 12,
          zIndex: 40,
          maxWidth: 420,
          margin: '0 auto',
          background: '#0f172a',
          color: '#f8fafc',
          border: '1px solid #eab308',
          borderRadius: 16,
          padding: '14px 14px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 4 }}>Install BIKA as an app</div>
        <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 10 }}>
          This adds BIKA to your app drawer — not just a home screen shortcut.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={dismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontWeight: 600,
              padding: '10px 12px',
              minHeight: 44,
            }}
          >
            Later
          </button>
          <button
            type="button"
            onClick={() => void onInstall()}
            style={{
              background: '#eab308',
              color: '#020617',
              border: 'none',
              borderRadius: 10,
              fontWeight: 800,
              padding: '10px 16px',
              minHeight: 44,
            }}
          >
            Install app
          </button>
        </div>
      </div>
    );
  }

  // Debug strip only in non-standalone when SW not ready after a while — keep silent for users
  void swReady;
  return null;
}
