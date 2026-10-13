'use client';

/**
 * BIKA v2 — Browser Supabase client.
 *
 * Rules:
 * - Singleton. One client per browser tab.
 * - Throws if unconfigured. We do NOT fabricate a placeholder client —
 *   that hides misconfiguration until a write fails at 3am.
 * - No runtime config fetch. If NEXT_PUBLIC_* isn't inlined at build time,
 *   that's a deployment error and should be caught immediately.
 */

import { createBrowserClient } from '@supabase/ssr';
import { publicEnv, isSupabaseConfigured } from '@/app/lib/env';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;

  if (!isSupabaseConfigured()) {
    throw new Error(
      '[BIKA] Supabase is not configured. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, ' +
      'then rebuild the app.'
    );
  }

  client = createBrowserClient(publicEnv.SUPABASE_URL, publicEnv.SUPABASE_ANON_KEY);
  return client;
}

/**
 * Soft check — use in components to render a config screen instead of crashing.
 */
export function tryGetSupabaseBrowserClient() {
  try {
    return { ok: true as const, client: getSupabaseBrowserClient() };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
