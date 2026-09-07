import AiLeadRescueLanding from '../components/AiLeadRescueLanding.js';
import ElevenLabsWebsiteVoiceChat from '../components/ElevenLabsWebsiteVoiceChat.js';
import { listVisualAssetManifests } from '../lib/visualAssets/loadManifest.js';
import { selectLeadRescueAssets } from '../lib/visualAssets/selectLeadRescueAssets.js';

/**
 * `/lead-rescue` remains a live alias of the Enquiry Recovery Sprint campaign
 * so historic WhatsApp and Google links do not 404 or show USD 150 pricing.
 */

export default function LeadRescuePage({ leadRescueAssets }) {
  return (
    <>
      <AiLeadRescueLanding host="corpflowai.com" leadRescueAssets={leadRescueAssets || null} />
      <ElevenLabsWebsiteVoiceChat surface="lead_rescue" />
    </>
  );
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
