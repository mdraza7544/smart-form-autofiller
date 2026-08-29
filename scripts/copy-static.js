/**
 * copy-static.js
 * Post-build script:
 *   1. Moves popup.html and options.html from dist/public/ → dist/
 *   2. Copies manifest.json from public/ → dist/
 *   3. Copies icons/ from public/ → dist/icons/
 */

import { cpSync, mkdirSync, existsSync, renameSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');

mkdirSync(dist, { recursive: true });

// ── Move HTML files from dist/public/ → dist/ ─────────────────────────────
const distPublic = resolve(dist, 'public');
for (const htmlFile of ['popup.html', 'options.html']) {
  const src  = resolve(distPublic, htmlFile);
  const dest = resolve(dist, htmlFile);
  if (existsSync(src)) {
    renameSync(src, dest);
    console.log(`✔ Moved ${htmlFile} → dist/`);
  }
}
// Remove the now-empty dist/public/ folder
if (existsSync(distPublic)) {
  rmSync(distPublic, { recursive: true, force: true });
}

// ── Copy manifest.json ─────────────────────────────────────────────────────
cpSync(resolve(root, 'public', 'manifest.json'), resolve(dist, 'manifest.json'));
console.log('✔ Copied manifest.json');

// ── Copy icons/ ───────────────────────────────────────────────────────────
const iconsSource = resolve(root, 'public', 'icons');
const iconsDest   = resolve(dist, 'icons');
if (existsSync(iconsSource)) {
  cpSync(iconsSource, iconsDest, { recursive: true });
  console.log('✔ Copied icons/');
} else {
  console.warn('⚠ No icons/ folder found in public/icons — add icon16.png, icon48.png, icon128.png before publishing.');
}

console.log('\n✅ dist/ is ready to load as an unpacked Chrome Extension.\n');
