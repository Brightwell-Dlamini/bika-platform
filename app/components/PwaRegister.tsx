'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'bika_pwa_install_dismissed_until';
const DISMISS_DAYS = 14;

/**
 * Registers the service worker and surfaces install UI when the browser
 * fires beforeinstallprompt (Chrome/Edge/Android).
 */
export function PwaRegister() {
  const [deferred, setDeferred] = useState<Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone) {
      setInstalled(true);
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('[BIKA PWA] service worker registration failed', err);
        });
    }

    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedUntil && Date.now() < dismissedUntil) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> });
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setVisible(false);
      setDeferred(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
    };
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
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    setVisible(false);
    try {
      localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000)
      );
    } catch {
      /* ignore */
    }
  };

  if (installed || !visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install BIKA"
      style={{
        position: 'fixed',
        bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
        left: 12,
        right: 12,
        zIndex: 30,
        maxWidth: 420,
        margin: '0 auto',
        background: '#0f172a',
        color: '#f8fafc',
        border: '1px solid #334155',
        borderRadius: 16,
        padding: '12px 14px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, marginBottom: 2 }}>Install BIKA</div>
        <div style={{ color: '#94a3b8', fontSize: 12 }}>
          Home screen · one-tap reporting · works offline for the shell
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: '10px 8px',
          minHeight: 44,
          fontWeight: 600,
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
          padding: '10px 14px',
          minHeight: 44,
          cursor: 'pointer',
        }}
      >
        Install
      </button>
    </div>
  );
}
