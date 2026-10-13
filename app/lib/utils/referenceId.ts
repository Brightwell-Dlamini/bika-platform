/**
 * BIKA v2 — Collision-safe reference ID generator.
 *
 * Format:  BIKA-YYMMDD-XXXXXX
 *   YYMMDD  →  compact date
 *   XXXXXX  →  6 chars from Crockford Base32 (excludes I, L, O, U)
 *              = 32^6 = ~1.07 billion combinations per day
 *
 * With 1000 reports/day, collision probability is ~1e-9 per submission.
 * Even at 100k reports/day, it's ~1.4e-4 — small enough that a unique
 * constraint + retry loop handles it cleanly.
 *
 * Crockford Base32 is human-friendly: no confusing characters, easy to read
 * aloud over the phone (crucial for USSD and call-in reference numbers).
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // 32 chars, no I/L/O/U

function randomChars(count: number): string {
  const bytes = new Uint8Array(count);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    // Fallback for extremely old runtimes — not expected in Node 20+ or modern browsers
    for (let i = 0; i < count; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (let i = 0; i < count; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

export function generateReferenceId(now = new Date()): string {
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `BIKA-${yy}${mm}${dd}-${randomChars(6)}`;
}

/** Normalize a user-typed reference (uppercase, strip spaces). */
export function normalizeReferenceId(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

/** Loose validation — legacy v1 IDs still accepted during transition. */
export function isPlausibleReferenceId(input: string): boolean {
  const id = normalizeReferenceId(input);
  // New format
  if (/^BIKA-\d{6}-[0-9A-HJKMNP-TV-Z]{6}$/.test(id)) return true;
  // Legacy format (v1): BIKA-DD-MM-YYYY-HHMMSS-RAND4
  if (/^BIKA-\d{2}-\d{2}-\d{4}-\d{6}-\d{4}$/.test(id)) return true;
  return false;
}
