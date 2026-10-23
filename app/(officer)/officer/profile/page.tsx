'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft, User as UserIcon, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import { apiFetch } from '@/app/lib/api/fetcher';
import { qk } from '@/app/lib/api/queryKeys';
import { ROLE_LABELS } from '@/app/lib/rbac';

export default function OfficerProfilePage() {
  const me = useOfficerMe();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!me.data?.user) return;
    setName(me.data.user.name ?? '');
    setPhone(me.data.user.phone ?? '');
    setAvatarUrl(me.data.user.avatarUrl ?? '');
  }, [me.data?.user]);

  if (me.isLoading || !me.data) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading profile…
      </div>
    );
  }

  const user = me.data.user;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/officer/me', {
        method: 'PATCH',
        body: {
          name: name.trim(),
          phone: phone.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
        },
      });
      toast.success('Profile updated.');
      qc.invalidateQueries({ queryKey: qk.users.me() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <Link
          href="/officer"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white">Your profile</h1>
          <p className="text-xs text-slate-500">
            {ROLE_LABELS[user.role]} · {user.agencyCode ?? 'Agency'} · {user.region}
          </p>
        </div>
      </div>

      <form
        onSubmit={save}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-700 flex items-center justify-center overflow-hidden text-yellow-400">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-7 h-7" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">{name || user.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Display name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={120}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Phone
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+268…"
            maxLength={40}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-yellow-500"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Avatar URL
          </span>
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-yellow-500"
          />
          <span className="text-[10px] text-slate-600">
            Paste a public image URL for now. File upload can be added next.
          </span>
        </label>

        <div className="pt-2 flex items-center justify-between gap-3">
          <p className="text-[10px] text-slate-600">
            Role, agency, and region are managed by administrators.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
