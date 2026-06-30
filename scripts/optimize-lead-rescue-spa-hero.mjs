/**
 * One-shot helper: generate responsive AVIF/WebP/JPG derivatives of the
 * Mauritius spa-at-sunset hero used as the full-bleed photo+glass background
 * on the main AI Lead Rescue page (`/lead-rescue`).
 *
 * Mirrors the Product A / reception-hero pipeline and the naming the
 * PublicMarketingPhotoGlassShell expects:
 *   - <base>.{avif,webp,jpg}        (desktop)
 *   - <base>-768.{avif,webp,jpg}    (mobile)
 *
 * Drop the source at:
 *   public/assets/visuals/lead-rescue-spa-sunset-hero-source.jpg
 * then run:
 *   node scripts/optimize-lead-rescue-spa-hero.mjs
 *
 * The large source is intentionally NOT committed — only the optimised
 * derivatives ship. NOTE (draft asset): the current source is ~1024px wide
 * and carries a small "Mauritius" watermark; replace with a clean,
 * provenance-confirmed >=2400px master before lifecycle.state=published.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dir = path.join(root, 'public', 'assets', 'visuals');
const src = path.join(dir, 'lead-rescue-spa-sunset-hero-source.jpg');
const baseName = 'lead-rescue-spa-sunset-hero-v1';

const widths = [
  { suffix: '', width: 2400 }, // desktop (capped by withoutEnlargement to source width)
  { suffix: '-768', width: 768 }, // mobile
];

const formats = [
  { ext: 'avif', run: (p, o) => p.avif({ quality: 50, effort: 5 }).toFile(o) },
  { ext: 'webp', run: (p, o) => p.webp({ quality: 78, effort: 5 }).toFile(o) },
  { ext: 'jpg', run: (p, o) => p.jpeg({ quality: 80, mozjpeg: true }).toFile(o) },
];

const meta = await sharp(src).metadata();
console.log(`source: ${path.basename(src)} ${meta.width}x${meta.height} ${meta.format}`);

for (const w of widths) {
  for (const f of formats) {
    const out = path.join(dir, `${baseName}${w.suffix}.${f.ext}`);
    const pipeline = sharp(src).resize({ width: w.width, withoutEnlargement: true });
    await f.run(pipeline, out);
    const stat = await fs.stat(out);
    console.log(`  -> ${path.basename(out)} ${(stat.size / 1024).toFixed(0)} KB`);
  }
}
