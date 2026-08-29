import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = 'C:\\Users\\mdash\\.gemini\\antigravity\\brain\\6b38dfa8-ef78-489b-a3b2-61d96f278760\\extension_icon_1788040925603.png';
const outDir = resolve(__dirname, '..', 'public', 'icons');

const sizes = [16, 48, 128];

for (const size of sizes) {
  await sharp(source)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(resolve(outDir, `icon${size}.png`));
  console.log(`✔ Generated icon${size}.png`);
}

console.log('\n✅ All icons created in public/icons/');
