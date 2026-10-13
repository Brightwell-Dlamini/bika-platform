'use client';

import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

/**
 * BIKA v2 — Auth helpers.
 *
 * Only two operations: sign in and sign out. Everything else is done
 * through the officers API which resolves the caller's profile server-side.
 *
 * Public citizens NEVER authenticate. This is only for officials.
 */

export interface SignInResult {
  ok: boolean;
  error?: string;
}

export async function signInWithPassword(
  email: string,
  password: string
): Promise<SignInResult> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      // Friendly error messages
      const msg = error.message.toLowerCase();
      if (msg.includes('invalid login credentials')) {
        return { ok: false, error: 'Incorrect email or password.' };
      }
      if (msg.includes('email not confirmed')) {
        return { ok: false, error: 'Account not yet confirmed. Contact your Super Admin.' };
      }
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Sign-in failed.',
    };
  }
}

export async function signOut(): Promise<void> {
  try {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
  } catch {
    // Already signed out or misconfigured — safe to ignore
  }
}
