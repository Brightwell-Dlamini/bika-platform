import 'server-only';
import { createServiceSupabase } from '@/app/lib/supabase/server';
import type { AgencyCode } from '@/app/types';

type ServiceClient = ReturnType<typeof createServiceSupabase>;

/** Unique, non-empty profile ids. */
export function uniqueIds(...groups: Array<string | null | undefined | Array<string | null | undefined>>): string[] {
  const out = new Set<string>();
  for (const g of groups) {
    if (Array.isArray(g)) {
      for (const id of g) if (id) out.add(id);
    } else if (g) {
      out.add(g);
    }
  }
  return [...out];
}

export function excludeIds(ids: string[], ...exclude: Array<string | null | undefined>): string[] {
  const ban = new Set(exclude.filter(Boolean) as string[]);
  return ids.filter((id) => !ban.has(id));
}

/**
 * On-duty officers for an agency, preferring same region then Nationwide then any active.
 */
export async function loadOnDutyOfficerIds(
  supabase: ServiceClient,
  agency: AgencyCode | string | null | undefined,
  region: string | null | undefined
): Promise<string[]> {
  if (!agency) return [];
  const reg = region || '';

  const sameRegion = await supabase
    .from('profiles')
    .select('id')
    .eq('agency_code', agency)
    .eq('active', true)
    .eq('on_duty', true)
    .eq('region', reg)
    .limit(40);

  if (!sameRegion.error && sameRegion.data && sameRegion.data.length > 0) {
    return sameRegion.data.map((r) => r.id as string);
  }

  const nationwide = await supabase
    .from('profiles')
    .select('id')
    .eq('agency_code', agency)
    .eq('active', true)
    .eq('on_duty', true)
    .eq('region', 'Nationwide')
    .limit(40);

  if (!nationwide.error && nationwide.data && nationwide.data.length > 0) {
    return nationwide.data.map((r) => r.id as string);
  }

  const anyActive = await supabase
    .from('profiles')
    .select('id')
    .eq('agency_code', agency)
    .eq('active', true)
    .eq('on_duty', true)
    .limit(40);

  if (!anyActive.error && anyActive.data) {
    return anyActive.data.map((r) => r.id as string);
  }
  return [];
}

/**
 * Supervisors: active super_admin (and admin if present in schema).
 * Used for SLA / escalation oversight — not every routine update.
 */
export async function loadSupervisorIds(supabase: ServiceClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('active', true)
    .in('role', ['super_admin', 'admin'])
    .limit(50);

  if (error || !data) return [];
  return data.map((r) => r.id as string);
}
