#!/usr/bin/env node
/**
 * Post-deploy smoke checks for BIKA production.
 *
 * Usage:
 *   node scripts/smoke-prod.mjs
 *   BASE_URL=https://bika.eca-sz.org node scripts/smoke-prod.mjs
 */

const BASE = (process.env.BASE_URL || 'https://bika.eca-sz.org').replace(/\/$/, '');

const checks = [];

async function check(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    checks.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`  ✓ ${name} (${Date.now() - t0}ms)`);
  } catch (err) {
    checks.push({ name, ok: false, ms: Date.now() - t0, error: String(err.message || err) });
    console.error(`  ✗ ${name}: ${err.message || err}`);
  }
}

async function main() {
  console.log(`BIKA smoke → ${BASE}\n`);

  await check('GET /api/health', async () => {
    const res = await fetch(`${BASE}/api/health`);
    const json = await res.json();
    if (res.status !== 200 && res.status !== 503) throw new Error(`HTTP ${res.status}`);
    if (!json.service) throw new Error('missing service field');
    if (json.status === 'degraded') {
      console.warn('    (degraded — inspect checks)');
    }
    if (json.checks?.notificationsTable && json.checks.notificationsTable.ok === false) {
      throw new Error(`notifications table: ${json.checks.notificationsTable.error || 'not ok'}`);
    }
  });

  await check('GET / (HTML)', async () => {
    const res = await fetch(`${BASE}/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html')) throw new Error(`unexpected content-type ${ct}`);
  });

  await check('GET /report', async () => {
    const res = await fetch(`${BASE}/report`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });

  await check('GET /track', async () => {
    const res = await fetch(`${BASE}/track`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });

  await check('GET /hotlines', async () => {
    const res = await fetch(`${BASE}/hotlines`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });

  await check('GET /manifest.json', async () => {
    const res = await fetch(`${BASE}/manifest.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.icons?.length) throw new Error('manifest missing icons');
  });

  await check('Security headers on /', async () => {
    const res = await fetch(`${BASE}/`);
    const nosniff = res.headers.get('x-content-type-options');
    if (nosniff !== 'nosniff') throw new Error(`X-Content-Type-Options=${nosniff}`);
  });

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
