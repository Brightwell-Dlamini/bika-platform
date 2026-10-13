'use client';

import React, { useState } from 'react';
import { Download, Upload, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function BackupTab() {
  const [restoring, setRestoring] = useState(false);

  const handleExport = async () => {
    try {
      toast.info('Preparing backup…');
      const res = await fetch('/api/reports?limit=500');
      if (!res.ok) throw new Error('Could not fetch data');
      const body = await res.json();
      const blob = new Blob([JSON.stringify(body.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bika-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleImport = async (file: File) => {
    if (!confirm('Importing this backup will overwrite matching incidents. Continue?')) return;
    setRestoring(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      // Minimal: just report shape for now
      toast.info(
        `Backup contains ${parsed?.incidents?.length ?? 0} incidents. ` +
        'Full restore coming in a later session.'
      );
    } catch (err) {
      toast.error('Could not parse backup file.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
      <h2 className="text-sm font-extrabold text-white">Backup & restore</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-extrabold text-white">Export data</h3>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Download a snapshot of incidents and reference data as JSON. Use before any schema change
            or for periodic archival.
          </p>
          <button
            onClick={handleExport}
            className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl"
          >
            <Download className="w-3.5 h-3.5" />
            Download JSON backup
          </button>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-yellow-400" />
            <h3 className="text-xs font-extrabold text-white">Restore data</h3>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Import a previously exported backup file. Restore operations are audited and cannot be
            undone.
          </p>
          <label className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-yellow-400 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer">
            {restoring ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {restoring ? 'Restoring…' : 'Select backup file'}
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      <div className="flex items-start gap-2 bg-amber-950/30 border border-amber-500/40 rounded-xl p-3 text-[11px] text-amber-200">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Full restore functionality is under development. For now, exported backups are for archival
          and inspection. Use Supabase Dashboard for authoritative restore operations.
        </span>
      </div>
    </div>
  );
}
