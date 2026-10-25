'use client';

import React, { useMemo, useState } from 'react';
import { Plus, Search, Loader2, X } from 'lucide-react';
import { useUsers, type UserFilters } from '@/app/lib/api/hooks/useUsers';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import { canManageUsers, ROLE_LABELS } from '@/app/lib/rbac';
import { AGENCY_CODES, type User } from '@/app/types';
import { UserTable } from './_components/UserTable';
import { UserFormModal } from './_components/UserFormModal';

export default function UsersPage() {
  const me = useOfficerMe();
  const [filters, setFilters] = useState<UserFilters>({});
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);

  const users = useUsers(filters);
  const canManage = me.data ? canManageUsers(me.data.user.role) : false;

  const filtered = useMemo(() => {
    const list = users.data ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department ?? '').toLowerCase().includes(q)
    );
  }, [users.data, search]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Users</h1>
          <p className="text-xs text-slate-400 mt-1">
            {users.data?.length ?? 0} account{users.data?.length === 1 ? '' : 's'}
            {canManage
              ? ' · you can create and edit staff accounts'
              : ' · read-only'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg"
          >
            <Plus className="w-4 h-4" />
            New user
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, department…"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
          />
        </div>
        <select
          value={filters.role ?? ''}
          onChange={(e) => setFilters({ ...filters, role: e.target.value || undefined })}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
        >
          <option value="">All roles</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={filters.agencyCode ?? ''}
          onChange={(e) => setFilters({ ...filters, agencyCode: e.target.value || undefined })}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
        >
          <option value="">All agencies</option>
          {AGENCY_CODES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filters.active === undefined ? '' : String(filters.active)}
          onChange={(e) =>
            setFilters({
              ...filters,
              active: e.target.value === '' ? undefined : e.target.value === 'true',
            })
          }
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
        >
          <option value="">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        {activeFilterCount > 0 && (
          <button
            onClick={() => setFilters({})}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-yellow-400 px-2"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {users.isLoading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading users…
        </div>
      ) : users.isError ? (
        <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-6 text-center text-red-300 text-sm">
          {users.error.message}
        </div>
      ) : (
        <UserTable users={filtered} canEdit={canManage} onEdit={(u) => setEditTarget(u)} />
      )}

      {showCreate && canManage && (
        <UserFormModal mode="create" onClose={() => setShowCreate(false)} />
      )}
      {editTarget && canManage && (
        <UserFormModal mode="edit" user={editTarget} onClose={() => setEditTarget(null)} />
      )}
    </div>
  );
}
