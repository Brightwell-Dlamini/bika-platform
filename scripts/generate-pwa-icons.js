#!/usr/bin/env node
/**
 * Writes real PNG PWA icons into public/icons before next build.
 * Android WebAPK requires static PNG files at stable URLs.
 */
const fs = require('fs');
const path = require('path');

const icons = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'pwa-icons.json'), 'utf8')
);
const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const [name, b64] of Object.entries(icons)) {
  const buf = Buffer.from(b64, 'base64');
  if (buf[0] !== 0x89 || buf[1] !== 0x50) {
    console.error('Invalid PNG', name);
    process.exit(1);
  }
  fs.writeFileSync(path.join(outDir, name), buf);
  console.log('wrote', name, buf.length);
}
console.log('PWA icons ready.');
