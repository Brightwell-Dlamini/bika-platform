#!/usr/bin/env node
/**
 * Writes real PNG PWA icons into public/icons before next build.
 * Android WebAPK requires static PNG files at stable URLs.
 */
const fs = require('fs');
const path = require('path');

const files = {
  'icon-192.png': 'icon-192.b64',
  'icon-512.png': 'icon-512.b64',
  'icon-maskable-192.png': 'icon-maskable-192.b64',
  'icon-maskable-512.png': 'icon-maskable-512.b64',
  'apple-touch-icon.png': 'apple-touch-icon.b64',
};

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const [name, part] of Object.entries(files)) {
  const b64 = fs.readFileSync(path.join(__dirname, 'icon-data', part), 'utf8').trim();
  const buf = Buffer.from(b64, 'base64');
  if (buf[0] !== 0x89 || buf[1] !== 0x50) {
    console.error('Invalid PNG', name);
    process.exit(1);
  }
  fs.writeFileSync(path.join(outDir, name), buf);
  console.log('wrote', name, buf.length);
}
console.log('PWA icons ready.');
