'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useSystemConfig } from '@/app/lib/api/hooks/useReference';
import { useUpdateConfig } from '@/app/lib/api/mutations/useSystemActions';

export function ConfigTab() {
  const cfg = useSystemConfig();
  const update = useUpdateConfig();

  const [appName, setAppName] = useState('');
  const [subTitle, setSubTitle] = useState('');
  const [sessionTimeoutMins, setSessionTimeoutMins] = useState(30);
  const [offlineSync, setOfflineSync] = useState(true);

  useEffect(() => {
    if (cfg.data) {
      setAppName(cfg.data.appName);
      setSubTitle(cfg.data.subTitle);
      setSessionTimeoutMins(30); // not in public schema yet
      setOfflineSync(true);
    }
  }, [cfg.data]);

  const handleSave = () => {
    update.mutate(
      { appName, subTitle },
      {
        onSuccess: () => toast.success('Configuration saved.'),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  if (cfg.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading config…
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
      <h2 className="text-sm font-extrabold text-white">Platform configuration</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-slate-400 mb-1 font-semibold">Application name</label>
          <input
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1 font-semibold">Subtitle</label>
          <input
            value={subTitle}
            onChange={(e) => setSubTitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1 font-semibold">Session timeout (mins)</label>
          <input
            type="number"
            min={5}
            max={480}
            value={sessionTimeoutMins}
            onChange={(e) => setSessionTimeoutMins(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
          />
        </div>
        <div>
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer mt-6">
            <input
              type="checkbox"
              checked={offlineSync}
              onChange={(e) => setOfflineSync(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-yellow-500"
            />
            <span>Offline sync enabled</span>
          </label>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800 flex justify-end">
        <button
          onClick={handleSave}
          disabled={update.isPending}
          className="inline-flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-extrabold text-xs px-5 py-2.5 rounded-xl disabled:opacity-50"
        >
          {update.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          Save configuration
        </button>
      </div>
    </div>
  );
}
