'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'bika_pwa_install_dismissed_until';
const DISMISS_DAYS = 14;

/**
 * Registers the service worker and surfaces a minimal install prompt when available.
 * "Later" is remembered for two weeks so the banner does not interrupt every visit.
 */
export function PwaRegister() {
  const [deferred, setDeferred] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Force waiting worker to activate so v5 replaces stale v3/v4 shells
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        reg.update().catch(() => {});
      })
      .catch((err) => {
        console.warn('BIKA service worker registration failed', err);
      });

    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedUntil && Date.now() < dismissedUntil) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);
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

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install BIKA"
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 40,
        maxWidth: 420,
        margin: '0 auto',
        background: '#0f172a',
        color: '#f8fafc',
        border: '1px solid #334155',
        borderRadius: 16,
        padding: '12px 16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, marginBottom: 2 }}>Install BIKA</div>
        <div style={{ color: '#94a3b8' }}>
          Add to your home screen for one-tap reporting.
        </div>
      </div>
      <button type="button" onClick={dismiss} style={{
        background: 'transparent',
        border: 'none',
        color: '#94a3b8',
        cursor: 'pointer',
        padding: 8,
      }}>
        Later
      </button>
      <button type="button" onClick={onInstall} style={{
        background: '#eab308',
        color: '#020617',
        border: 'none',
        borderRadius: 10,
        fontWeight: 800,
        padding: '8px 14px',
        cursor: 'pointer',
      }}>
        Install
      </button>
    </div>
  );
}
