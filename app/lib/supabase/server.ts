import 'server-only';

/**
 * BIKA v2 — Server Supabase clients.
 *
 * Two distinct clients, two distinct purposes:
 *
 *   createServerSupabase()   → respects the caller's session, RLS applies.
 *                              Use in API routes that act on behalf of a user.
 *
 *   createServiceSupabase()  → uses the service role, bypasses RLS.
 *                              Use ONLY for trusted server-side writes
 *                              (user provisioning, automation, admin ops).
 *
 * If you ever find yourself reaching for the service client in a route that
 * returns data to a citizen, stop — you almost certainly want the user client.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { env, publicEnv, hasServiceRole } from '@/app/lib/env';

// -----------------------------------------------------------------------------
// User-scoped client (RLS applies)
// -----------------------------------------------------------------------------

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.SUPABASE_URL, publicEnv.SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Server Component — safe to ignore.
        }
      },
      remove(name: string, options) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Server Component — safe to ignore.
        }
      },
    },
  });
}

// -----------------------------------------------------------------------------
// Service-role client (RLS bypassed) — DANGER ZONE
// -----------------------------------------------------------------------------

export function createServiceSupabase(): SupabaseClient {
  if (!hasServiceRole()) {
    throw new Error(
      '[BIKA] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
        'Service-role operations are unavailable.'
    );
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// -----------------------------------------------------------------------------
// Auth helpers — used by routes to identify the caller
// -----------------------------------------------------------------------------

export interface CallerProfile {
  id: string;
  authUserId: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'police' | 'health_inspector' | 'rank_marshal' | 'public';
  region: string;
  agencyCode: string | null;
  active: boolean;
  onDuty: boolean;
}

/**
 * Resolves the current authenticated user to their profile row.
 * Returns null if unauthenticated, inactive, or no matching profile exists.
 * Uses the service client internally so it works even with tight RLS.
 */
export async function getCallerProfile(): Promise<CallerProfile | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const admin = createServiceSupabase();
  const { data, error } = await admin
    .from('profiles')
    .select('id, auth_user_id, email, name, role, region, agency_code, active, on_duty')
    .ilike('email', user.email)
    .maybeSingle();

  if (error || !data) return null;

  // Deactivated officials must not access ops APIs or workspaces
  if (!data.active) return null;

  // Backfill auth_user_id if it drifted
  if (!data.auth_user_id) {
    await admin.from('profiles').update({ auth_user_id: user.id }).eq('id', data.id);
  }

  return {
    id: data.id,
    authUserId: user.id,
    email: data.email,
    name: data.name,
    role: data.role,
    region: data.region,
    agencyCode: data.agency_code,
    active: data.active,
    onDuty: data.on_duty,
  };
}
