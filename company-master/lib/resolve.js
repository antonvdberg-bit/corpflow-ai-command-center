/**
 * Deterministic Company Master resolver.
 *
 * Resolves governed fields and canonical asset aliases for a single company.
 * Only approved, effective, non-expired values resolve for current use.
 * Restricted assets require an explicitly authorised caller context.
 * Storage-provider URLs are never the durable downstream contract.
 *
 * @module company-master/lib/resolve
 */

/** Sensitivities that require authorised restricted access. */
export const RESTRICTED_SENSITIVITIES = Object.freeze([
  'CONFIDENTIAL',
  'HIGHLY_RESTRICTED',
]);

/** Publication statuses that are restricted / not public-downstream by default. */
export const RESTRICTED_PUBLICATION = Object.freeze(['RESTRICTED', 'WITHDRAWN', 'NOT_ASSESSED']);

/**
 * @typedef {object} ResolverCallerContext
 * @property {string} [purpose]
 * @property {boolean} [authorised_for_restricted]
 * @property {string} [consumer_system]
 */

/**
 * @typedef {object} ResolvedAsset
 * @property {string} company_id
 * @property {string} asset_id
 * @property {string} logical_alias
 * @property {number} version_number
 * @property {string} lifecycle_status
 * @property {string} content_hash
 * @property {string} storage_object_id
 * @property {string} storage_provider
 * @property {string} mime_type
 * @property {string} sensitivity_classification
 * @property {string} publication_status
 * @property {string} approval_status
 * @property {string} verification_status
 * @property {string} effective_from
 * @property {string|null} effective_to
 * @property {false} durable_contract_is_provider_url
 */

/**
 * @typedef {{ ok: true, value: any, field: object, company_id: string } | { ok: false, code: string, message: string }} FieldResolveResult
 * @typedef {{ ok: true, asset: ResolvedAsset } | { ok: false, code: string, message: string }} AssetResolveResult
 * @typedef {{ ok: true, snapshot: object } | { ok: false, code: string, message: string }} SnapshotResult
 */

/**
 * @param {string} iso
 * @param {Date} at
 */
function isOnOrBefore(iso, at) {
  if (!iso) return false;
  return new Date(iso).getTime() <= at.getTime();
}

/**
 * @param {string|null|undefined} iso
 * @param {Date} at
 */
function isAfterOrOpen(iso, at) {
  if (iso == null || iso === '') return true;
  return new Date(iso).getTime() > at.getTime();
}

/**
 * @param {string|null|undefined} dateOnly
 * @param {Date} at
 */
function isNotExpired(dateOnly, at) {
  if (dateOnly == null || dateOnly === '') return true;
  const end = new Date(`${dateOnly}T23:59:59.999Z`);
  return end.getTime() >= at.getTime();
}

/**
 * @param {object} asset
 * @param {Date} at
 */
export function isAssetCurrentlyResolvable(asset, at = new Date()) {
  if (!asset || typeof asset !== 'object') return false;
  if (asset.approval_status !== 'APPROVED') return false;
  if (asset.lifecycle_status !== 'ACTIVE') return false;
  if (asset.verification_status !== 'VERIFIED') return false;
  if (!isOnOrBefore(asset.effective_from, at)) return false;
  if (!isAfterOrOpen(asset.effective_to, at)) return false;
  if (!isNotExpired(asset.expiry_date, at)) return false;
  return true;
}

/**
 * @param {object} field
 * @param {Date} at
 */
export function isFieldCurrentlyResolvable(field, at = new Date()) {
  if (!field || typeof field !== 'object') return false;
  if (field.approval_status !== 'APPROVED') return false;
  if (field.verification_status !== 'VERIFIED') return false;
  if (field.verification_status === 'CONFLICTING') return false;
  if (!isOnOrBefore(field.effective_from, at)) return false;
  if (!isAfterOrOpen(field.effective_to, at)) return false;
  return true;
}

/**
 * @param {object} asset
 * @param {ResolverCallerContext} [caller]
 */
function callerMayAccessAsset(asset, caller = {}) {
  const restricted =
    RESTRICTED_SENSITIVITIES.includes(asset.sensitivity_classification) ||
    asset.publication_status === 'RESTRICTED';
  if (!restricted) return true;
  return caller.authorised_for_restricted === true;
}

/**
 * Map an asset row to the durable downstream contract (no provider URL).
 * @param {string} companyId
 * @param {object} asset
 * @returns {ResolvedAsset}
 */
export function toResolvedAssetContract(companyId, asset) {
  return {
    company_id: companyId,
    asset_id: asset.asset_id,
    logical_alias: asset.logical_alias,
    version_number: asset.version_number,
    lifecycle_status: asset.lifecycle_status,
    content_hash: asset.content_hash,
    storage_object_id: asset.storage_object_id,
    storage_provider: asset.storage_provider,
    mime_type: asset.mime_type,
    sensitivity_classification: asset.sensitivity_classification,
    publication_status: asset.publication_status,
    approval_status: asset.approval_status,
    verification_status: asset.verification_status,
    effective_from: asset.effective_from,
    effective_to: asset.effective_to ?? null,
    durable_contract_is_provider_url: false,
  };
}

/**
 * Resolve a company record from a catalogue (enforces company isolation).
 * @param {Map<string, object>|object} catalogue
 * @param {string} companyId
 */
export function getCompanyRecord(catalogue, companyId) {
  if (!companyId || typeof companyId !== 'string') {
    return { ok: false, code: 'COMPANY_ID_REQUIRED', message: 'company_id is required' };
  }
  if (catalogue instanceof Map) {
    if (!catalogue.has(companyId)) {
      return { ok: false, code: 'COMPANY_NOT_FOUND', message: `unknown company_id ${companyId}` };
    }
    return { ok: true, record: catalogue.get(companyId) };
  }
  if (catalogue && typeof catalogue === 'object' && catalogue.company_id === companyId) {
    return { ok: true, record: catalogue };
  }
  if (catalogue && typeof catalogue === 'object' && catalogue[companyId]) {
    return { ok: true, record: catalogue[companyId] };
  }
  return { ok: false, code: 'COMPANY_NOT_FOUND', message: `unknown company_id ${companyId}` };
}

/**
 * Resolve the current approved governed field value for a company.
 *
 * @param {Map<string, object>|object} catalogue
 * @param {string} companyId
 * @param {string} fieldKey
 * @param {{ at?: Date, caller?: ResolverCallerContext }} [options]
 * @returns {FieldResolveResult}
 */
export function resolveGovernedField(catalogue, companyId, fieldKey, options = {}) {
  const at = options.at || new Date();
  const found = getCompanyRecord(catalogue, companyId);
  if (!found.ok) return found;

  const fields = Array.isArray(found.record.governed_fields) ? found.record.governed_fields : [];
  const candidates = fields.filter((f) => f && f.field_key === fieldKey);

  if (candidates.some((f) => f.verification_status === 'CONFLICTING')) {
    return {
      ok: false,
      code: 'IDENTITY_CONFLICT',
      message: `field ${fieldKey} has CONFLICTING verification; approved downstream use blocked`,
    };
  }

  const current = candidates
    .filter((f) => isFieldCurrentlyResolvable(f, at))
    .sort((a, b) => new Date(b.effective_from) - new Date(a.effective_from));

  if (current.length === 0) {
    return {
      ok: false,
      code: 'FIELD_NOT_RESOLVABLE',
      message: `no approved effective verified value for ${fieldKey} on ${companyId}`,
    };
  }

  const field = current[0];
  const restricted = RESTRICTED_SENSITIVITIES.includes(field.sensitivity_classification);
  if (restricted && options.caller?.authorised_for_restricted !== true) {
    return {
      ok: false,
      code: 'RESTRICTED_FIELD_DENIED',
      message: `field ${fieldKey} is restricted; caller not authorised`,
    };
  }

  return {
    ok: true,
    company_id: companyId,
    value: field.field_value,
    field,
  };
}

/**
 * Resolve the current approved asset for a canonical logical alias.
 *
 * @param {Map<string, object>|object} catalogue
 * @param {string} companyId
 * @param {string} logicalAlias
 * @param {{ at?: Date, caller?: ResolverCallerContext }} [options]
 * @returns {AssetResolveResult}
 */
export function resolveAssetByAlias(catalogue, companyId, logicalAlias, options = {}) {
  const at = options.at || new Date();
  const caller = options.caller || {};
  const found = getCompanyRecord(catalogue, companyId);
  if (!found.ok) return found;

  const assets = Array.isArray(found.record.assets) ? found.record.assets : [];
  const candidates = assets.filter((a) => a && a.logical_alias === logicalAlias);

  // Prefer currently resolvable ACTIVE assets.
  const current = candidates
    .filter((a) => isAssetCurrentlyResolvable(a, at))
    .sort((a, b) => b.version_number - a.version_number);

  if (current.length === 0) {
    const uploaded = candidates.find((a) =>
      ['UPLOADED', 'DRAFT', 'UNDER_REVIEW'].includes(a.lifecycle_status),
    );
    if (uploaded) {
      return {
        ok: false,
        code: 'ASSET_NOT_APPROVED',
        message: `alias ${logicalAlias} has candidate ${uploaded.asset_id} in lifecycle ${uploaded.lifecycle_status}; not resolvable`,
      };
    }
    return {
      ok: false,
      code: 'ASSET_NOT_RESOLVABLE',
      message: `no approved effective asset for alias ${logicalAlias} on ${companyId}`,
    };
  }

  const asset = current[0];
  if (!callerMayAccessAsset(asset, caller)) {
    return {
      ok: false,
      code: 'RESTRICTED_ASSET_DENIED',
      message: `asset ${asset.asset_id} is restricted; caller not authorised`,
    };
  }

  return { ok: true, asset: toResolvedAssetContract(companyId, asset) };
}

/**
 * Historically address a specific asset_id within a company (including SUPERSEDED).
 * Does not promote superseded assets to "current". Still enforces company scope
 * and restricted access.
 *
 * @param {Map<string, object>|object} catalogue
 * @param {string} companyId
 * @param {string} assetId
 * @param {{ caller?: ResolverCallerContext }} [options]
 * @returns {AssetResolveResult}
 */
export function resolveAssetById(catalogue, companyId, assetId, options = {}) {
  const caller = options.caller || {};
  const found = getCompanyRecord(catalogue, companyId);
  if (!found.ok) return found;

  const assets = Array.isArray(found.record.assets) ? found.record.assets : [];
  const asset = assets.find((a) => a && a.asset_id === assetId);
  if (!asset) {
    return {
      ok: false,
      code: 'ASSET_NOT_FOUND',
      message: `asset_id ${assetId} not found on company ${companyId}`,
    };
  }

  if (!callerMayAccessAsset(asset, caller)) {
    return {
      ok: false,
      code: 'RESTRICTED_ASSET_DENIED',
      message: `asset ${asset.asset_id} is restricted; caller not authorised`,
    };
  }

  return { ok: true, asset: toResolvedAssetContract(companyId, asset) };
}

/**
 * Capture an immutable issued-document snapshot at render/issue time.
 * Downstream issued documents must retain this snapshot even if Company Master changes.
 *
 * @param {Map<string, object>|object} catalogue
 * @param {{ company_id: string, logical_alias: string, document_id: string, issued_at?: string, purpose?: string, caller?: ResolverCallerContext }} args
 * @returns {SnapshotResult}
 */
export function createIssuedDocumentSnapshot(catalogue, args) {
  const companyId = args.company_id;
  const alias = args.logical_alias;
  const resolved = resolveAssetByAlias(catalogue, companyId, alias, {
    at: args.issued_at ? new Date(args.issued_at) : new Date(),
    caller: args.caller || { authorised_for_restricted: false, purpose: args.purpose },
  });
  if (!resolved.ok) return resolved;

  return {
    ok: true,
    snapshot: {
      document_id: args.document_id,
      company_id: companyId,
      logical_alias: alias,
      issued_at: args.issued_at || new Date().toISOString(),
      purpose: args.purpose || null,
      resolved_asset_id: resolved.asset.asset_id,
      resolved_version_number: resolved.asset.version_number,
      resolved_content_hash: resolved.asset.content_hash,
      resolved_storage_object_id: resolved.asset.storage_object_id,
      // Explicit: provider URL is not part of the durable issued-document contract.
      durable_contract: {
        asset_id: resolved.asset.asset_id,
        content_hash: resolved.asset.content_hash,
        storage_object_id: resolved.asset.storage_object_id,
        logical_alias: alias,
      },
    },
  };
}

/**
 * Future render: resolve the current approved asset (may differ from an old snapshot).
 *
 * @param {Map<string, object>|object} catalogue
 * @param {string} companyId
 * @param {string} logicalAlias
 * @param {{ at?: Date, caller?: ResolverCallerContext }} [options]
 */
export function resolveForFutureRender(catalogue, companyId, logicalAlias, options = {}) {
  return resolveAssetByAlias(catalogue, companyId, logicalAlias, options);
}

/**
 * Assert a historical snapshot is unchanged relative to a frozen copy.
 * @param {object} originalSnapshot
 * @param {object} retainedSnapshot
 */
export function assertSnapshotUnchanged(originalSnapshot, retainedSnapshot) {
  const keys = [
    'document_id',
    'company_id',
    'logical_alias',
    'resolved_asset_id',
    'resolved_version_number',
    'resolved_content_hash',
    'resolved_storage_object_id',
  ];
  for (const key of keys) {
    if (originalSnapshot[key] !== retainedSnapshot[key]) {
      return {
        ok: false,
        code: 'SNAPSHOT_MUTATED',
        message: `snapshot field ${key} changed`,
      };
    }
  }
  return { ok: true };
}
