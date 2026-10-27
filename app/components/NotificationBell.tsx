'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Loader2, Radio } from 'lucide-react';
import { NotificationListSkeleton } from '@/app/components/ui/Skeleton';
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
  const { data, isLoading, error } = useNotifications(true);
  const markRead = useMarkNotificationsRead();
  const [open, setOpen] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevUnread = useRef<number | null>(null);

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  useEffect(() => {
    if (prevUnread.current === null) {
      prevUnread.current = unread;
      return;
    }
    if (unread > prevUnread.current) {
      const latest = items.find((n) => !n.readAt);
      toast.message(latest?.title ?? 'New BIKA alert', {
        description: latest?.body?.slice(0, 120) ?? `${unread - prevUnread.current} new notification(s)`,
        duration: 5000,
      });
    }
    prevUnread.current = unread;
  }, [unread, items]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const onOpenItem = (id: string) => {
    markRead.mutate({ ids: [id] });
  };

  const enablePush = async () => {
    setPushBusy(true);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        toast.error('Push not supported on this device.');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        toast.error('Notification permission denied.');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await apiFetch<{ publicKey: string }>('/api/notifications/push');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await apiFetch('/api/notifications/push', {
        method: 'POST',
        body: { subscription: sub.toJSON() },
      });
      toast.success('Push enabled.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not enable push.');
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-yellow-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
        aria-label="Notifications"
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
            <span className="text-[11px] font-black text-white uppercase tracking-wider">Alerts</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void enablePush()}
                disabled={pushBusy}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-300 hover:text-yellow-400 hover:bg-slate-900 disabled:opacity-50"
                title="Enable push"
              >
                {pushBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Radio className="w-3 h-3" />}
                Push
              </button>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => markRead.mutate({ all: true })}
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
            {isLoading && <NotificationListSkeleton rows={5} />}
            {!isLoading && error && (
              <div className="p-6 text-center text-xs text-red-300">
                {error instanceof Error ? error.message : 'Could not load notifications.'}
              </div>
            )}
            {!isLoading && !error && items.length === 0 && (
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
