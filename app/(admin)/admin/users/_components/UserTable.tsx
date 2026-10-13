'use client';

import React from 'react';
import { Edit2 } from 'lucide-react';
import { ROLE_LABELS } from '@/app/lib/rbac';
import type { User } from '@/app/types';

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  admin: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  police: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  health_inspector: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  rank_marshal: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  public: 'bg-slate-700 text-slate-300 border-slate-600',
};

export function UserTable({
  users,
  canEdit,
  onEdit,
}: {
  users: User[];
  canEdit: boolean;
  onEdit: (u: User) => void;
}) {
  if (users.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
        No users match the current filters.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Agency / Region</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-white">
                  {u.name}
                  {u.badgeNumber && (
                    <span className="text-[10px] text-slate-500 font-mono ml-1.5">
                      {u.badgeNumber}
                    </span>
                  )}
                </td>
                <td className="p-3 font-mono text-slate-300">{u.email}</td>
                <td className="p-3">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${
                      ROLE_BADGE[u.role] ?? ROLE_BADGE.public
                    }`}
                  >
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="p-3 text-slate-300">
                  {u.agencyCode ?? '—'}
                  <span className="text-slate-500"> · {u.region}</span>
                </td>
                <td className="p-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-black border ${
                      u.active
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-red-500/15 text-red-300 border-red-500/30'
                    }`}
                  >
                    {u.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  {u.onDuty && u.active && (
                    <span className="ml-1.5 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/30">
                      ON DUTY
                    </span>
                  )}
                </td>
                <td className="p-3 text-right">
                  {canEdit && (
                    <button
                      onClick={() => onEdit(u)}
                      className="inline-flex p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-slate-700"
                      title="Edit user"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
