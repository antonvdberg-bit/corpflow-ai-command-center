import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'data', 'visual-assets');

const slots = [
  {
    id: 'corpflow-services-hero',
    title: 'CorpFlowAI services hero background',
    route: '/services',
    purpose: 'Full-bleed photo+glass hero behind live HTML services copy',
    alt: 'Coastal city waterfront at sunset with a subtle digital network overlay.',
    objectPosition: '70% center',
    width: 1536,
    height: 1024,
  },
  {
    id: 'corpflow-standards-hero',
    title: 'CorpFlowAI standards hero background',
    route: '/standards',
    purpose: 'Full-bleed photo+glass hero behind live HTML operational standards copy',
    alt: 'Nighttime modern terrace over dark coastal water with restrained cyan network light trails.',
    objectPosition: '72% center',
    width: 1536,
    height: 1024,
  },
  {
    id: 'corpflow-onboarding-hero',
    title: 'CorpFlowAI onboarding hero background',
    route: '/onboarding',
    purpose: 'Full-bleed photo+glass hero behind live HTML 14-day onboarding copy',
    alt: 'Modern glass walkway toward a coastal sunrise with subtle digital light trails.',
    objectPosition: '68% center',
    width: 1536,
    height: 1024,
  },
];

function sha256File(primary) {
  const buf = fs.readFileSync(path.join(root, 'public', primary.replace(/^\//, '')));
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
  const manifest = {
    schema_version: '1.0.0',
    id: s.id,
    surface: 'core',
    kind: 'image',
    title: s.title,
    description: `${s.purpose}. Decorative background only — no baked-in text, logos, buttons, or contact details. Desktop master currently ${s.width}x${s.height} (below preferred 2400px; no upscaling). Generated via Cursor image tool for CorpFlowAI secondary public pages.`,
    source: {
      type: 'repo',
      path: primary,
      content_hash: sha256File(primary),
      width: s.width,
      height: s.height,
    },
    provenance: {
      source_filename: `${s.id}-source.png (Cursor GenerateImage) → ${s.id}-source.jpg`,
      source_dimensions: `${s.width}x${s.height}`,
      supplied_by: 'Cursor GenerateImage — operator-directed secondary public heroes (2026-07-14)',
      optimised_with: 'sharp (jpeg mozjpeg q80, webp q78, avif q50)',
      derivatives,
      object_position: s.objectPosition,
      verification_status:
        'DRAFT. Background-only acceptance verified (no text/logo/controls). Width 1536 < preferred 2400.',
    },
    licence: {
      tier: 'ai_generated',
      owner: 'CorpFlowAI',
      terms:
        'AI-generated decorative background for CorpFlowAI public marketing. Free for CorpFlowAI marketing surfaces. Do not use on LuxeMaurice or Core operator UIs.',
    },
    prompt_provenance: {
      prompt_id: s.id,
      model: 'cursor-generate-image',
      model_version: '2026-07',
      generated_at: '2026-07-14T00:00:00.000Z',
      reviewed_by: 'anton@corpflowai.com',
      notes:
        'Secondary public page heroes after #591. Prohibited use: baked-in copy; LuxeMaurice; Core admin.',
    },
    accessibility: { alt: s.alt, lang: 'en', decorative: true },
    usage: {
      allowed_surfaces: ['core', 'shared'],
      notes: `Public route ${s.route}. Decorative under CorpFlowPublicPhotoShell; live HTML carries meaning.`,
    },
    lifecycle: { state: 'draft', created_at: '2026-07-14' },
  };
  fs.writeFileSync(path.join(outDir, `${s.id}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('wrote', s.id);
}
