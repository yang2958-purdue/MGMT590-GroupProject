/**
 * Rasterize `src/sidepanel/icons/billiards-fill.svg` to manifest PNG sizes.
 * Uses explicit fill so toolbar icons are visible (not white/invisible).
 */
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgPath = resolve(root, 'src/sidepanel/icons/billiards-fill.svg');
const iconsDir = resolve(root, 'icons');

let svg = readFileSync(svgPath, 'utf8');
svg = svg.replace(/fill="currentColor"/g, 'fill="#ffffff"');
//old color = #6366f1
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

const buf = Buffer.from(svg, 'utf8');
for (const size of [16, 48, 128]) {
  await sharp(buf).resize(size, size).png().toFile(resolve(iconsDir, `icon${size}.png`));
}

console.log('Generated icons/icon16.png, icon48.png, icon128.png from billiards-fill.svg');
