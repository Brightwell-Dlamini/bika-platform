'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Loader2,
  ArrowLeft,
  User as UserIcon,
  Save,
  Camera,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import { apiFetch } from '@/app/lib/api/fetcher';
import { qk } from '@/app/lib/api/queryKeys';
import { ROLE_LABELS } from '@/app/lib/rbac';
import { uploadAvatar } from '@/app/lib/uploads';

export default function ProfilePage() {
  const me = useOfficerMe();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const persistAvatar = async (url: string | null) => {
    await apiFetch('/api/officer/me', {
      method: 'PATCH',
      body: { avatarUrl: url },
    });
    setAvatarUrl(url ?? '');
    qc.invalidateQueries({ queryKey: qk.users.me() });
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadAvatar(file, user.id);
      if (!result.success || !result.url) {
        toast.error(result.error ?? 'Upload failed.');
        return;
      }
      await persistAvatar(result.url);
      toast.success('Photo updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload photo.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeAvatar = async () => {
    setUploading(true);
    try {
      await persistAvatar(null);
      toast.success('Photo removed.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove photo.');
    } finally {
      setUploading(false);
    }
  };

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
        className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl shadow-black/40"
      >
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-slate-700 flex items-center justify-center overflow-hidden text-yellow-400">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-8 h-8" />
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 rounded-2xl bg-slate-950/70 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="text-sm font-bold text-white truncate">{name || user.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
            <div className="flex flex-wrap gap-2 pt-0.5">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="sr-only"
                onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                {avatarUrl ? 'Change photo' : 'Upload photo'}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void removeAvatar()}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 hover:text-rose-300 hover:border-rose-500/40 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-600">JPG, PNG or WEBP · max ~1MB (auto-compressed)</p>
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
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+268…"
            maxLength={40}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-yellow-500"
          />
        </label>

        <div className="pt-2 flex items-center justify-between gap-3">
          <p className="text-[10px] text-slate-600">
            Role, agency, and region are managed by administrators.
          </p>
          <button
            type="submit"
            disabled={saving || uploading}
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
