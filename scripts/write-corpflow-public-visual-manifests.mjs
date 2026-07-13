import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const visuals = path.join(root, 'public', 'assets', 'visuals');
const outDir = path.join(root, 'data', 'visual-assets');

const slots = [
  {
    id: 'corpflow-home-hero',
    title: 'CorpFlowAI homepage hero background',
    route: '/',
    purpose: 'Full-bleed photo+glass hero behind live HTML market entrance',
    alt: 'Coastal city and waterfront at sunset with a subtle digital network overlay.',
    sourceFilename: 'Home__2 (chat upload) → corpflow-home-hero-source.jpg',
    expectedCanon: 'futuristic_waterfront_cityscape_at_sunset.png',
    width: 1024,
    height: 576,
    objectPosition: '68% center',
  },
  {
    id: 'corpflow-contact-hero',
    title: 'CorpFlowAI contact hero background',
    route: '/contact',
    purpose: 'Full-bleed photo+glass hero behind live HTML contact actions',
    alt: 'Warm coastal skyline at sunset with a restrained technology network motif.',
    sourceFilename: 'Contact__2 (chat upload) → corpflow-contact-hero-source.jpg',
    expectedCanon: 'sunset_skyline_with_tech_overlays.png',
    width: 1024,
    height: 576,
    objectPosition: '72% center',
  },
  {
    id: 'corpflow-about-hero',
    title: 'CorpFlowAI about hero background',
    route: '/about',
    purpose: 'Full-bleed photo+glass hero behind live HTML about content',
    alt: 'Elevated coastal city view at sunset with a subtle connected-network overlay.',
    sourceFilename: 'About__2 (chat upload) → corpflow-about-hero-source.jpg',
    expectedCanon: 'coastal_city_at_sunset_with_tech_overlay.png',
    width: 1024,
    height: 576,
    objectPosition: '70% center',
  },
  {
    id: 'corpflow-process-hero',
    title: 'CorpFlowAI process hero background',
    route: '/process',
    purpose: 'Full-bleed photo+glass hero behind live HTML five-stage process (not 7-step infographic)',
    alt: 'Modern waterfront terrace and skyline with directional digital light trails.',
    sourceFilename: 'Process__2 (chat upload) → corpflow-process-hero-source.jpg',
    expectedCanon: 'futuristic_terrace_at_sunset.png',
    width: 1024,
    height: 576,
    objectPosition: '72% center',
  },
  {
    id: 'corpflow-trust-band',
    title: 'CorpFlowAI public trust band background',
    route: '/',
    purpose: 'Section band only behind homepage operating-posture copy — never a full-page hero',
    alt: 'Abstract blue waterfront horizon with a subtle connected-network pattern.',
    sourceFilename: 'Trust (chat upload) → corpflow-trust-band-source.jpg',
    expectedCanon: 'futuristic_tech_ocean_with_glowing_patterns.png',
    width: 1024,
    height: 438,
    objectPosition: '75% center',
  },
];

function sha256File(relPath) {
  const buf = fs.readFileSync(path.join(root, relPath.replace(/^\//, 'public/')));
  return `sha256:${crypto.createHash('sha256').update(buf).digest('hex')}`;
}

for (const s of slots) {
  const primary = `/assets/visuals/${s.id}.jpg`;
  const derivatives = [
    `/assets/visuals/${s.id}.avif`,
    `/assets/visuals/${s.id}.webp`,
    `/assets/visuals/${s.id}.jpg`,
    `/assets/visuals/${s.id}-768.avif`,
    `/assets/visuals/${s.id}-768.webp`,
    `/assets/visuals/${s.id}-768.jpg`,
  ];
  const hash = sha256File(primary);
  const manifest = {
    schema_version: '1.0.0',
    id: s.id,
    surface: 'core',
    kind: 'image',
    title: s.title,
    description: `${s.purpose}. Decorative background only — no baked-in text, logos, buttons, or contact details. Desktop master is currently ${s.width}x${s.height} (below preferred 2400px; no upscaling). NEEDS_ANTON: replace with ≥2400px clean master before lifecycle published.`,
    source: {
      type: 'repo',
      path: primary,
      content_hash: hash,
      width: s.width,
      height: s.height,
    },
    provenance: {
      source_filename: s.sourceFilename,
      expected_canonical_filename: s.expectedCanon,
      source_dimensions: `${s.width}x${s.height}`,
      supplied_by: 'Anton (operator) — AI-generated background-only visuals supplied via Cursor chat after rejected text-baked mockups',
      optimised_with: 'sharp (jpeg mozjpeg q80, webp q78, avif q50) via scripts/optimize-corpflow-public-heroes.mjs',
      derivatives,
      object_position: s.objectPosition,
      verification_status:
        'DRAFT. Background-only acceptance criteria verified by visual inspection (no text/logo/controls). Source width 1024 < preferred 2400 — ship as draft; regenerate from higher-resolution master before production COMPLETE.',
    },
    licence: {
      tier: 'ai_generated',
      owner: 'CorpFlowAI',
      terms:
        'AI-generated decorative background for CorpFlowAI public marketing. Free for CorpFlowAI marketing surfaces. No third-party stock licence retained. Do not use on LuxeMaurice or Core operator UIs.',
    },
    prompt_provenance: {
      prompt_id: s.id,
      model: 'unspecified-image-model',
      model_version: '2026-07',
      generated_at: '2026-07-13T00:00:00.000Z',
      reviewed_by: 'anton@corpflowai.com',
      notes:
        'Background-only revision after text-baked mockups were rejected. Prohibited use: full-page mockup with baked copy; LuxeMaurice tenant branding; Core admin surfaces.',
    },
    accessibility: {
      alt: s.alt,
      lang: 'en',
      decorative: true,
    },
    usage: {
      allowed_surfaces: ['core', 'shared'],
      notes: `Public route ${s.route}. Rendered decoratively (alt="") under PublicMarketingPhotoGlassShell or PublicTrustBand; live HTML carries meaning. Prohibited: baked-in CTAs, contact details, offer prices, or 7-step process infographic.`,
    },
    lifecycle: {
      state: 'draft',
      created_at: '2026-07-14',
    },
  };
  const out = path.join(outDir, `${s.id}.manifest.json`);
  fs.writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('wrote', path.basename(out));
}
