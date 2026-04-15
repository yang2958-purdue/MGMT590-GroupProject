/**
 * Resize the brand PNG into manifest icon sizes (Chrome requires PNG for toolbar icons).
 * Run: npm run icons
 */
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pngPath = join(root, 'src/sidepanel/icons/billiards-fill.png');

for (const size of [16, 48, 128]) {
  const outPath = join(root, 'icons', `icon${size}.png`);
  await sharp(pngPath).resize(size, size).png().toFile(outPath);
  console.log('Wrote', outPath);
}
