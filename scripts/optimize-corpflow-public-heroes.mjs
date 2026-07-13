/**
 * Generate responsive AVIF/WebP/JPG derivatives for CorpFlowAI public heroes.
 *
 * Sources (chat-supplied background-only masters, 1024px wide — below the
 * preferred 2400px target; no upscaling per asset governance):
 *   artifacts/visual-sources/corpflow-public/<slot>-source.jpg
 *
 * Runtime derivatives land at:
 *   public/assets/visuals/corpflow-<slot>-hero.{avif,webp,jpg}
 *   public/assets/visuals/corpflow-<slot>-hero-768.{avif,webp,jpg}
 *   public/assets/visuals/corpflow-trust-band.{avif,webp,jpg}
 *   public/assets/visuals/corpflow-trust-band-768.{avif,webp,jpg}
 *
 * Naming follows PublicMarketingPhotoGlassShell (base + optional -768).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'artifacts', 'visual-sources', 'corpflow-public');
const outDir = path.join(root, 'public', 'assets', 'visuals');

const SLOTS = [
  { id: 'corpflow-home-hero', source: 'corpflow-home-hero-source.jpg' },
  { id: 'corpflow-contact-hero', source: 'corpflow-contact-hero-source.jpg' },
  { id: 'corpflow-about-hero', source: 'corpflow-about-hero-source.jpg' },
  { id: 'corpflow-process-hero', source: 'corpflow-process-hero-source.jpg' },
  { id: 'corpflow-trust-band', source: 'corpflow-trust-band-source.jpg' },
  { id: 'corpflow-services-hero', source: 'corpflow-services-hero-source.jpg' },
  { id: 'corpflow-standards-hero', source: 'corpflow-standards-hero-source.jpg' },
  { id: 'corpflow-onboarding-hero', source: 'corpflow-onboarding-hero-source.jpg' },
];

const widths = [
  { suffix: '', width: 2400 },
  { suffix: '-768', width: 768 },
];

const formats = [
  { ext: 'avif', run: (p, o) => p.avif({ quality: 50, effort: 5 }).toFile(o) },
  { ext: 'webp', run: (p, o) => p.webp({ quality: 78, effort: 5 }).toFile(o) },
  { ext: 'jpg', run: (p, o) => p.jpeg({ quality: 80, mozjpeg: true }).toFile(o) },
];

await fs.mkdir(outDir, { recursive: true });

for (const slot of SLOTS) {
  const src = path.join(srcDir, slot.source);
  const meta = await sharp(src).metadata();
  console.log(`${slot.id}: source ${meta.width}x${meta.height} ${meta.format}`);
  for (const w of widths) {
    for (const f of formats) {
      const out = path.join(outDir, `${slot.id}${w.suffix}.${f.ext}`);
      const pipeline = sharp(src).resize({ width: w.width, withoutEnlargement: true });
      await f.run(pipeline, out);
      const stat = await fs.stat(out);
      console.log(`  -> ${path.basename(out)} ${(stat.size / 1024).toFixed(0)} KB`);
    }
  }
}
