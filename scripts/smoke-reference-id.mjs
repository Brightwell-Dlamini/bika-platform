/** Smoke tests for BIKA reference ID helpers (no build required). */
import assert from 'node:assert/strict';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function randomChars(count) {
  const bytes = new Uint8Array(count);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < count; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function generateReferenceId(now = new Date()) {
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `BIKA-${yy}${mm}${dd}-${randomChars(6)}`;
}

function normalizeReferenceId(input) {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

function isPlausibleReferenceId(input) {
  const id = normalizeReferenceId(input);
  if (/^BIKA-\d{6}-[0-9A-HJKMNP-TV-Z]{6}$/.test(id)) return true;
  if (/^BIKA-\d{2}-\d{2}-\d{4}-\d{6}-\d{4}$/.test(id)) return true;
  return false;
}

const id = generateReferenceId();
assert.match(id, /^BIKA-\d{6}-[0-9A-HJKMNP-TV-Z]{6}$/);
assert.equal(normalizeReferenceId('  bika-260101-abc123  '), 'BIKA-260101-ABC123');
assert.equal(isPlausibleReferenceId(id), true);
assert.equal(isPlausibleReferenceId('not-an-id'), false);

console.log('smoke-reference-id: OK');
