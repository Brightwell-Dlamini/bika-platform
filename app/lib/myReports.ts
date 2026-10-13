'use client';

/**
 * BIKA v2 — Device-local report history.
 *
 * Citizens don't log in. We keep their submitted reference IDs in
 * localStorage so "My reports" works without an account.
 *
 * Privacy: this never leaves the device. If the user clears browser
 * data, the list is gone but the reports still exist server-side.
 */

const KEY = 'bika:my-reports:v2';
const MAX_ENTRIES = 50;

export interface MyReportEntry {
  id: string;
  category: string;
  location: string;
  status: string;
  reportType: string;
  createdAt: string;
  region?: string;
}

function safeRead(): MyReportEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(list: MyReportEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
    window.dispatchEvent(new Event('bika-my-reports'));
  } catch {
    // Quota exceeded or private mode — silently degrade
  }
}

export function getMyReports(): MyReportEntry[] {
  return safeRead();
}

export function rememberReport(entry: MyReportEntry): void {
  const list = safeRead().filter((e) => e.id !== entry.id);
  list.unshift(entry);
  safeWrite(list);
}

export function updateMyReportStatus(id: string, status: string): void {
  const list = safeRead().map((e) => (e.id === id ? { ...e, status } : e));
  safeWrite(list);
}

export function removeMyReport(id: string): void {
  safeWrite(safeRead().filter((e) => e.id !== id));
}

export function clearMyReports(): void {
  safeWrite([]);
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Soft duplicate / nearby check against device history only.
 * Does not query the server (public cannot list open cases).
 */
export function findSimilarLocalReports(opts: {
  location?: string;
  region?: string;
  category?: string;
  excludeId?: string;
  max?: number;
}): MyReportEntry[] {
  const loc = opts.location ? normalize(opts.location) : '';
  if (loc.length < 4) return [];

  const closed = new Set(['closed', 'resolved', 'rejected']);
  const list = safeRead().filter((e) => {
    if (opts.excludeId && e.id === opts.excludeId) return false;
    if (closed.has(String(e.status).toLowerCase())) return false;
    const el = normalize(e.location || '');
    if (!el) return false;
    const locationMatch =
      el.includes(loc) || loc.includes(el) || tokenOverlap(loc, el) >= 2;
    const regionMatch =
      !opts.region || !e.region || normalize(e.region) === normalize(opts.region);
    return locationMatch && regionMatch;
  });

  return list.slice(0, opts.max ?? 3);
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(a.split(' ').filter((t) => t.length > 2));
  const tb = b.split(' ').filter((t) => t.length > 2);
  let n = 0;
  for (const t of tb) if (ta.has(t)) n += 1;
  return n;
}
