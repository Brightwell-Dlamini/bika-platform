'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Loader2, Radio } from 'lucide-react';
import { useNotifications, useMarkNotificationsRead } from '@/app/lib/api/hooks/useNotifications';
import { apiFetch } from '@/app/lib/api/fetcher';
import { toast } from 'sonner';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function NotificationBell() {
  const { data, isLoading } = useNotifications(true);
  const markRead = useMarkNotificationsRead();
  const [open, setOpen] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const enablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Push is not supported in this browser.');
      return;
    }
    setPushBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        toast.error('Notification permission denied.');
        return;
      }
      const vapid = await apiFetch<{ publicKey: string; configured: boolean }>(
        '/api/notifications/vapid'
      );
      if (!vapid.configured || !vapid.publicKey) {
        toast.error('Push is not configured on the server yet (VAPID keys).');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
      });
      const json = sub.toJSON();
      await apiFetch('/api/notifications/push', {
        method: 'POST',
        body: {
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        },
      });
      toast.success('Push notifications enabled on this device.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not enable push.');
    } finally {
      setPushBusy(false);
    }
  };

  const onMarkAll = () => {
    markRead.mutate({ all: true });
  };

  const onOpenItem = (id: string) => {
    markRead.mutate({ ids: [id] });
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-yellow-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
        aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(100vw-1.5rem,22rem)] rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2">
            <span className="text-xs font-black text-white">Notifications</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={enablePush}
                disabled={pushBusy}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-300 hover:text-yellow-400 hover:bg-slate-900 disabled:opacity-50"
                title="Enable push on this device"
              >
                {pushBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Radio className="w-3 h-3" />}
                Push
              </button>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={onMarkAll}
                  disabled={markRead.isPending}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-300 hover:text-emerald-400 hover:bg-slate-900"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading && (
              <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            )}
            {!isLoading && items.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">No notifications yet.</div>
            )}
            {items.map((n) => {
              const unreadItem = !n.readAt;
              const inner = (
                <div
                  className={`px-3 py-2.5 border-b border-slate-900/80 hover:bg-slate-900/80 transition ${
                    unreadItem ? 'bg-yellow-500/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {unreadItem && (
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-white leading-snug">{n.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[9px] text-slate-600 mt-1 font-mono">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );

              if (n.href) {
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => {
                      onOpenItem(n.id);
                      setOpen(false);
                    }}
                  >
                    {inner}
                  </Link>
                );
              }
              return (
                <button
                  key={n.id}
                  type="button"
                  className="w-full text-left"
                  onClick={() => onOpenItem(n.id)}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
