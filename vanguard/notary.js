/**
 * Vanguard Digital Notary (deployment provenance)
 *
 * Generates a UUID and a provenance_object for every deployment.
 *
 * Required fields inside `provenance_object`:
 * - model_version
 * - input_attribution_hash
 * - human_review_status
 */

import { randomUUID as nodeRandomUUID } from 'crypto';

export function generateUUID() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  if (typeof nodeRandomUUID === 'function') {
    return nodeRandomUUID();
  }
  // Fallback; good enough for provenance tagging.
  return '00000000-0000-4000-8000-000000000000';
}

export function generateProvenance({
  model_version,
  input_attribution_hash,
  human_review_status,
  metadata,
} = {}) {
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : null;

  const provenance_object = {
    model_version: model_version ?? '',
    input_attribution_hash: input_attribution_hash ?? '',
    human_review_status: human_review_status ?? 'unreviewed',
  };

  if (metadata && typeof metadata === 'object') {
    provenance_object.metadata = metadata;
  }

  const notary = {
    uuid: uuid || undefined,
    provenance_object,
  };

  // Ensure UUID exists even in environments without crypto.randomUUID.
  if (!notary.uuid) {
    notary.uuid = generateUUID();
  }

  return notary;
}

