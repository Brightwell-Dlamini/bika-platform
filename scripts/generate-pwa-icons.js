#!/usr/bin/env node
/**
 * Generate static PWA icons into public/icons before `next build`.
 * Android WebAPK (app drawer) needs real PNG files at stable URLs —
 * not API routes, rewrites, or corrupt base64-text placeholders.
 */
const fs = require('fs');
const path = require('path');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error(
      '[pwa-icons] sharp is not installed. Run: npm install sharp --save'
    );
    process.exit(1);
  }

  const root = path.join(__dirname, '..');
  const srcPath = path.join(root, 'public', 'Bika.png');
  const outDir = path.join(root, 'public', 'icons');

  if (!fs.existsSync(srcPath)) {
    console.error('[pwa-icons] missing public/Bika.png');
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  async function make(size, pad, name) {
    const margin = Math.round(size * pad);
    const box = size - margin * 2;

    const logoBuf = await sharp(srcPath)
      .resize(box, box, { fit: 'inside', withoutEnlargement: false })
      .png()
      .toBuffer();

    const meta = await sharp(logoBuf).metadata();
    const left = Math.max(0, Math.floor((size - (meta.width || box)) / 2));
    const top = Math.max(0, Math.floor((size - (meta.height || box)) / 2));

    const outPath = path.join(outDir, name);
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 2, g: 6, b: 23, alpha: 1 },
      },
    })
      .composite([{ input: logoBuf, left, top }])
      .png()
      .toFile(outPath);

    const stat = fs.statSync(outPath);
    const head = Buffer.alloc(8);
    const fd = fs.openSync(outPath, 'r');
    fs.readSync(fd, head, 0, 8, 0);
    fs.closeSync(fd);
    if (head[0] !== 0x89 || head[1] !== 0x50) {
      throw new Error(`Invalid PNG written for ${name}`);
    }
    console.log(`[pwa-icons] wrote ${name} (${stat.size} bytes, ${size}x${size})`);
  }

  // purpose: any — tighter padding
  await make(192, 0.1, 'icon-192.png');
  await make(512, 0.1, 'icon-512.png');
  // purpose: maskable — ~20% safe zone for Android adaptive icons
  await make(192, 0.22, 'icon-maskable-192.png');
  await make(512, 0.22, 'icon-maskable-512.png');
  await make(180, 0.1, 'apple-touch-icon.png');

  console.log('[pwa-icons] done');
}

main().catch((err) => {
  console.error('[pwa-icons] failed', err);
  process.exit(1);
});
