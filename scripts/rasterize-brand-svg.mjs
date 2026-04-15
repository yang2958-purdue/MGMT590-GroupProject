/**
 * One-off / optional: write `src/sidepanel/icons/billiards-fill.png` from `billiards-fill.svg`
 * (white fill, 512×512). Replace the PNG manually if you use a custom asset.
 * Run: node scripts/rasterize-brand-svg.mjs
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'src/sidepanel/icons/billiards-fill.svg');
const outPath = join(root, 'src/sidepanel/icons/billiards-fill.png');
let svg = readFileSync(svgPath, 'utf8');
svg = svg.replace(/fill="currentColor"/g, 'fill="#ffffff"');
await sharp(Buffer.from(svg)).resize(512, 512).png().toFile(outPath);
console.log('Wrote', outPath);
