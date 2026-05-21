import AiLeadRescueLanding from '../components/AiLeadRescueLanding.js';
import { listVisualAssetManifests } from '../lib/visualAssets/loadManifest.js';
import { selectLeadRescueAssets } from '../lib/visualAssets/selectLeadRescueAssets.js';

/**
 * `/lead-rescue` on the apex host renders the same component as the
 * `aileadrescue.corpflowai.com` host (see `pages/index.js`). Both
 * routes load their visuals from the same governed manifest pool —
 * see `data/visual-assets/lead-rescue-*.manifest.json`.
 *
 * The manifests do not change between requests, so we resolve them
 * at build time via `getStaticProps`. If a manifest fails to load or
 * validate, we render the page without that asset rather than
 * breaking the customer-facing route — per
 * `.cursor/rules/delivery-reality.mdc` a content-only failure must
 * never take down the conversion-critical surface.
 */

export default function LeadRescuePage({ leadRescueAssets }) {
  return <AiLeadRescueLanding host="corpflowai.com" leadRescueAssets={leadRescueAssets || null} />;
}

function buildLeadRescueAssetsSafe() {
  try {
    const pool = listVisualAssetManifests('lead-rescue').concat(listVisualAssetManifests('shared'));
    const seen = new Set();
    const deduped = [];
    for (const m of pool) {
      if (!m || typeof m.id !== 'string') continue;
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      deduped.push(m);
    }
    return selectLeadRescueAssets(deduped);
  } catch (err) {
    try {
      console.warn('[ai-lead-rescue] /lead-rescue asset selection failed; rendering without manifests', err && err.message ? err.message : err);
    } catch {}
    return null;
  }
}

export async function getStaticProps() {
  return {
    props: {
      leadRescueAssets: buildLeadRescueAssetsSafe(),
    },
  };
}
