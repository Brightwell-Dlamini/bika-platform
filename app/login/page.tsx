'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Mail,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { signInWithPassword } from '@/app/lib/auth';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();
        if (!cancelled && data.user) {
          router.replace('/officer');
          return;
        }
      } catch {
        /* not configured */
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      const result = await signInWithPassword(email, password);
      if (!result.ok) {
        setErrorMessage(result.error ?? 'Sign-in failed.');
        return;
      }
      toast.success('Signed in.');
      router.replace('/officer');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Checking session…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(234,179,8,0.12),_transparent_50%)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-4 relative z-10 animate-fadeIn">
        <Link
          href="/report"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-yellow-400 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to public portal
        </Link>

        <div className="bg-slate-900/95 border border-slate-800 rounded-[1.5rem] p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400 shadow-lg shadow-yellow-500/10">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">Official sign in</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Kingdom of Eswatini · BIKA OPS
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-3 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Official email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@bika.gov.sz"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm text-white font-mono focus:outline-none focus:border-yellow-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 disabled:opacity-60 transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-[10px] text-slate-500 text-center leading-relaxed">
            Access is restricted to authorised officials.
            <br />
            Contact your Super Admin if you need an account.
          </p>
        </div>
      </div>
    </div>
  );
}
