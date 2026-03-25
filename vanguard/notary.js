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

function sha256Hex(input) {
  try {
    // eslint-disable-next-line no-undef
    const cryptoMod = typeof crypto !== 'undefined' ? crypto : null;
    if (cryptoMod && cryptoMod.createHash) {
      return cryptoMod.createHash('sha256').update(String(input)).digest('hex');
    }
  } catch (_) {}
  try {
    // Node fallback
    // eslint-disable-next-line no-undef
    const { createHash } = require('crypto');
    return createHash('sha256').update(String(input)).digest('hex');
  } catch (_) {}
  // Last-resort: non-cryptographic hash
  let h = 0;
  const s = String(input);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return String(h).padStart(8, '0');
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

/**
 * AI Provenance Protocol (APP)
 * Output format is designed to be embedded as `_ai_provenance` on audit records.
 */
export function generateAiProvenanceSignature({
  model_version,
  input_attribution_hash,
  human_review_status,
  metadata,
} = {}) {
  const prov = generateProvenance({
    model_version,
    input_attribution_hash,
    human_review_status,
    metadata,
  });

  // Signature formula is deterministic and intended to be mirrored in
  // Python warranty checks.
  const obj = prov?.provenance_object || {};
  const signature = sha256Hex(
    String(obj.model_version || "") +
      "|" +
      String(obj.input_attribution_hash || "") +
      "|" +
      String(obj.human_review_status || "")
  );

  return {
    _ai_provenance: {
      uuid: prov.uuid,
      provenance_object: prov.provenance_object,
      signature,
    },
  };
}

