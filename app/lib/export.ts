'use client';

/**
 * BIKA v2 — Export helpers.
 *
 * CSV export is intentionally simple: build the string, trigger a download.
 * No libraries. No server round trip. Works offline.
 */

export function downloadCsv(
  filename: string,
  header: string,
  rows: string[][]
): void {
  const csv = [header, ...rows.map((r) => r.map(quoteCsv).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function quoteCsv(value: string): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function formatDateForFilename(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
