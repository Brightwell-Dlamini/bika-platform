'use client';

import React, { useState } from 'react';
import { Palette, Settings, FileText, Database } from 'lucide-react';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import { isSuperAdmin } from '@/app/lib/rbac';
import { BrandingTab } from './_components/BrandingTab';
import { ConfigTab } from './_components/ConfigTab';
import { AuditTab } from './_components/AuditTab';
import { BackupTab } from './_components/BackupTab';

type Tab = 'branding' | 'config' | 'audit' | 'backup';

export default function SystemPage() {
  const me = useOfficerMe();
  const [tab, setTab] = useState<Tab>('branding');

  if (me.data && !isSuperAdmin(me.data.user.role)) {
    return (
      <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-12 text-center">
        <h2 className="text-lg font-bold text-white">Super Admin access required</h2>
        <p className="text-xs text-slate-400 mt-2">
          System configuration is restricted to the platform owner.
        </p>
      </div>
    );
  }

  const TABS: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'config', label: 'Configuration', icon: Settings },
    { id: 'audit', label: 'Audit log', icon: FileText },
    { id: 'backup', label: 'Backup & restore', icon: Database },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">System settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Super Admin controls for branding, configuration, audit, and backups.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-1.5 inline-flex flex-wrap gap-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                active
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'branding' && <BrandingTab />}
      {tab === 'config' && <ConfigTab />}
      {tab === 'audit' && <AuditTab />}
      {tab === 'backup' && <BackupTab />}
    </div>
  );
}
