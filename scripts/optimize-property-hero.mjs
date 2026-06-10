/**
 * One-shot helper: generate responsive WebP variants of the
 * Mauritius property hero photo plus a small JPEG fallback.
 *
 * Used during the `style/lead-rescue-property-photos` PR to ship the
 * AI-generated hero (`lead-rescue-property-hero.jpg`) at sensible
 * mobile + desktop sizes. Run manually after dropping a new source
 * JPEG into `public/assets/visuals/lead-rescue-property-hero.jpg`:
 *
 *     node scripts/optimize-property-hero.mjs
 *
 * Reads the source from `public/assets/visuals/lead-rescue-property-hero.jpg`
 * and writes:
 *   - lead-rescue-property-hero-1600.webp   (desktop retina)
 *   - lead-rescue-property-hero-1024.webp   (desktop standard)
 *   - lead-rescue-property-hero-640.webp    (mobile)
 *   - lead-rescue-property-hero-1024.jpg    (fallback for browsers without WebP)
 *
 * The original 3 MB JPEG is intentionally not committed — only the
 * optimised variants ship.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dir = path.join(root, 'public', 'assets', 'visuals');
const src = path.join(dir, 'lead-rescue-property-hero.jpg');

const variants = [
  { name: 'lead-rescue-property-hero-1600.webp', width: 1600, format: 'webp', options: { quality: 80, effort: 5 } },
  { name: 'lead-rescue-property-hero-1024.webp', width: 1024, format: 'webp', options: { quality: 80, effort: 5 } },
  { name: 'lead-rescue-property-hero-640.webp',  width: 640,  format: 'webp', options: { quality: 78, effort: 5 } },
  { name: 'lead-rescue-property-hero-1024.jpg',  width: 1024, format: 'jpeg', options: { quality: 82, mozjpeg: true } },
];

const meta = await sharp(src).metadata();
console.log(`source: ${path.basename(src)} ${meta.width}x${meta.height} ${meta.format}`);

for (const v of variants) {
  const out = path.join(dir, v.name);
  const pipeline = sharp(src).resize({ width: v.width, withoutEnlargement: true });
  if (v.format === 'webp') await pipeline.webp(v.options).toFile(out);
  else await pipeline.jpeg(v.options).toFile(out);
  const stat = await import('node:fs').then((m) => m.promises.stat(out));
  console.log(`  -> ${v.name} ${(stat.size / 1024).toFixed(0)} KB`);
}
