'use client';

import React, { useState } from 'react';
import { X, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
} from '@/app/lib/api/mutations/useUserActions';
import {
  AGENCY_CODES,
  REGIONS,
  USER_ROLES,
  type User,
  type UserRole,
  type Region,
  type AgencyCode,
} from '@/app/types';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/app/lib/rbac';

type Mode = 'create' | 'edit';

interface UserFormModalProps {
  mode: Mode;
  user?: User;
  onClose: () => void;
}

export function UserFormModal({ mode, user, onClose }: UserFormModalProps) {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>(user?.role ?? 'police');
  const [region, setRegion] = useState<Region | 'Nationwide'>(user?.region ?? 'Manzini');
  const [agencyCode, setAgencyCode] = useState<AgencyCode | ''>(user?.agencyCode ?? '');
  const [department, setDepartment] = useState(user?.department ?? '');
  const [badgeNumber, setBadgeNumber] = useState(user?.badgeNumber ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [active, setActive] = useState(user?.active ?? true);
  const [onDuty, setOnDuty] = useState(user?.onDuty ?? true);

  const create = useCreateUser();
  const update = useUpdateUser();
  const deactivate = useDeactivateUser();

  const busy = create.isPending || update.isPending || deactivate.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required.');
      return;
    }
    if (mode === 'create' && password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (mode === 'edit' && password && password.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      region,
      agencyCode: agencyCode || null,
      department: department.trim() || null,
      badgeNumber: badgeNumber.trim() || null,
      phone: phone.trim() || null,
      active,
      onDuty,
    };

    if (mode === 'create') {
      create.mutate(
        { ...payload, password },
        {
          onSuccess: () => {
            toast.success(`User ${name} created.`);
            onClose();
          },
          onError: (err) => toast.error(err.message),
        }
      );
    } else if (user) {
      update.mutate(
        { id: user.id, ...payload, ...(password ? { password } : {}) },
        {
          onSuccess: () => {
            toast.success(`User ${name} updated.`);
            onClose();
          },
          onError: (err) => toast.error(err.message),
        }
      );
    }
  };

  const handleDeactivate = () => {
    if (!user) return;
    if (!confirm(`Deactivate ${user.name}? They will lose access immediately.`)) return;
    deactivate.mutate(user.id, {
      onSuccess: () => {
        toast.success('User deactivated.');
        onClose();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 my-8">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white">
            {mode === 'create' ? 'Create user' : `Edit ${user?.name}`}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Full name *">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
              />
            </Field>
            <Field label="Email *">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
              />
            </Field>

            <Field
              label={mode === 'create' ? 'Password *' : 'Reset password (leave blank to keep)'}
            >
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={mode === 'create'}
                  minLength={mode === 'create' ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'edit' ? '••••••••' : ''}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 pr-9 text-white font-mono focus:outline-none focus:border-yellow-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

            <Field label="Role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
              >
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Region">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as Region | 'Nationwide')}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
              >
                <option value="Nationwide">Nationwide</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Agency">
              <select
                value={agencyCode}
                onChange={(e) => setAgencyCode(e.target.value as AgencyCode | '')}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
              >
                <option value="">— None —</option>
                {AGENCY_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Department">
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
              />
            </Field>

            <Field label="Badge number">
              <input
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-500"
              />
            </Field>

            <Field label="Phone">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+268 7611 2233"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-500"
              />
            </Field>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-slate-300">{ROLE_LABELS[role]}:</strong>{' '}
              {ROLE_DESCRIPTIONS[role]}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-yellow-500"
              />
              <span>Active</span>
            </label>
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={onDuty}
                onChange={(e) => setOnDuty(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-yellow-500"
              />
              <span>On duty</span>
            </label>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <div>
              {mode === 'edit' && user?.active && (
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={busy}
                  className="px-3 py-2 rounded-xl bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 text-xs font-bold disabled:opacity-50"
                >
                  Deactivate
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-yellow-500 text-slate-950 font-extrabold disabled:opacity-50"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {mode === 'create' ? 'Create user' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-slate-400 mb-1 text-[11px] font-semibold">{label}</label>
      {children}
    </div>
  );
}
