/**
 * One-shot helper: process the public-domain NASA Mauritius satellite
 * image into responsive web-ready variants for the
 * `/lead-rescue/property-mauritius` Service area panel.
 *
 * Source: `public/assets/visuals/_mauritius-source.jpg`
 *   (Mauritius_OnEarth_WMS.jpg by user "Hautala", 25 April 2006,
 *   downloaded from Wikimedia Commons:
 *   https://commons.wikimedia.org/wiki/File:Mauritius_OnEarth_WMS.jpg
 *   Source attribution on Commons: NASA World Wind, OnEarth WMS global
 *   mosaic pseudocolor layer. Public domain because it is a screenshot
 *   from NASA's globe software using a public-domain layer.)
 *
 * Why NASA + not AI-generated: an AI-generated "Mauritius map" produces
 * a generic island shape that is not recognisably Mauritius. The user
 * (Anton) reviewed the previous abstract / hand-drawn approach as not
 * working ("we may need to forgo the hand-drawn concept, get a detailed
 * and colourful map or portion of the map"). NASA imagery is the
 * highest-credibility, lowest-licensing-risk source for a real
 * cartographic anchor.
 *
 * Output (all written under `public/assets/visuals/`):
 *  - `lead-rescue-property-map-1600.webp` — desktop retina
 *  - `lead-rescue-property-map-1024.webp` — desktop standard
 *  - `lead-rescue-property-map-640.webp`  — mobile
 *  - `lead-rescue-property-map-1024.jpg`  — JPEG fallback
 *
 * Usage: `node scripts/optimize-property-map.mjs`. The original source
 * file is removed afterwards (3.6 MB raw imagery is not committed; only
 * the optimised variants ship).
 *
 * Light grading is applied: a small saturation lift (1.05) and gentle
 * gamma (1.02) to make the lagoon turquoise read more clearly without
 * pushing the image into "edited / fake" territory. The geographic
 * content is unchanged.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dir = path.join(root, 'public', 'assets', 'visuals');
const src = path.join(dir, '_mauritius-source.jpg');

const variants = [
  { name: 'lead-rescue-property-map-1600.webp', width: 1600, format: 'webp', options: { quality: 82, effort: 5 } },
  { name: 'lead-rescue-property-map-1024.webp', width: 1024, format: 'webp', options: { quality: 80, effort: 5 } },
  { name: 'lead-rescue-property-map-640.webp',  width: 640,  format: 'webp', options: { quality: 78, effort: 5 } },
  { name: 'lead-rescue-property-map-1024.jpg',  width: 1024, format: 'jpeg', options: { quality: 84, mozjpeg: true } },
];

const meta = await sharp(src).metadata();
console.log(`source: ${path.basename(src)} ${meta.width}x${meta.height} ${meta.format}`);

for (const v of variants) {
  const out = path.join(dir, v.name);
  const pipeline = sharp(src)
    .resize({ width: v.width, withoutEnlargement: true })
    .modulate({ saturation: 1.05 })
    .gamma(1.02);
  if (v.format === 'webp') await pipeline.webp(v.options).toFile(out);
  else await pipeline.jpeg(v.options).toFile(out);
  const stat = await fs.stat(out);
  console.log(`  -> ${v.name} ${(stat.size / 1024).toFixed(0)} KB`);
}

await fs.unlink(src);
console.log(`removed source: ${path.basename(src)}`);
