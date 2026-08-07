/**
 * Company Master runtime constants (#776).
 * Reuses Change Console upload size limits from existing env — no new env var names.
 */

/** Reuse existing Change Console max upload bytes (default 3 MiB, hard cap 20 MiB). */
export const CM_DEFAULT_MAX_UPLOAD_BYTES = 3_145_728;
export const CM_HARD_MAX_UPLOAD_BYTES = 20_971_520;
export const CM_MAX_ARTIFACTS_PER_COMPANY = 40;

/** Allowed MIME types for Company Master uploads (PNG, JPEG, SVG, PDF). */
export const CM_ALLOWED_MIME_TYPES = Object.freeze([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'application/pdf',
]);

export const CM_ARTIFACT_TYPES = Object.freeze({
  LOGO: 'LOGO',
  BRAND_IMAGE: 'BRAND_IMAGE',
  REGISTRATION_CERTIFICATE: 'REGISTRATION_CERTIFICATE',
  TAX_CERTIFICATE: 'TAX_CERTIFICATE',
  COMPLIANCE_DOCUMENT: 'COMPLIANCE_DOCUMENT',
  OTHER_COMPANY_DOCUMENT: 'OTHER_COMPANY_DOCUMENT',
});

export const CM_LOGICAL_ALIASES = Object.freeze({
  PRIMARY_LOGO: 'brand.logo.primary',
  REGISTRATION_CERT: 'legal.registration_certificate.current',
  TAX_CERT: 'legal.tax_certificate.current',
});

/**
 * Vocabulary-class storage provider (company-master/config/vocabularies.json).
 * Concrete adapter id is separate: {@link CM_STORAGE_ADAPTER_ID}.
 */
export const CM_STORAGE_PROVIDER = 'MANAGED_OBJECT_STORAGE';

/** Concrete binary adapter used by Company Master (Postgres BYTEA). */
export const CM_STORAGE_ADAPTER_ID = 'postgres_company_master_bytes';

export const COMPANY_ID_RE = /^cmp_[a-z0-9][a-z0-9_-]{2,63}$/;

/**
 * Curated jurisdictions for the operator dropdown (ISO 3166-1 alpha-2 + Other).
 * No external dependency — CorpFlow-relevant set plus common trading partners.
 */
export const CM_JURISDICTIONS = Object.freeze([
  { code: 'MU', label: 'Mauritius' },
  { code: 'ZA', label: 'South Africa' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'US', label: 'United States' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'SG', label: 'Singapore' },
  { code: 'IN', label: 'India' },
  { code: 'FR', label: 'France' },
  { code: 'DE', label: 'Germany' },
  { code: 'AU', label: 'Australia' },
  { code: 'CA', label: 'Canada' },
  { code: 'IE', label: 'Ireland' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'CH', label: 'Switzerland' },
  { code: 'HK', label: 'Hong Kong' },
  { code: 'OTHER', label: 'Other / custom jurisdiction' },
]);

/**
 * Normalize jurisdiction input to a stored code.
 * Accepts code or label; custom text becomes OTHER:<text>.
 * @param {unknown} raw
 * @returns {{ ok: true, code: string, label: string } | { ok: false, code: string }}
 */
export function normalizeJurisdiction(raw) {
  const s = String(raw || '').trim();
  if (!s) return { ok: false, code: 'JURISDICTION_REQUIRED' };
  const upper = s.toUpperCase();
  const byCode = CM_JURISDICTIONS.find((j) => j.code === upper);
  if (byCode && byCode.code !== 'OTHER') {
    return { ok: true, code: byCode.code, label: byCode.label };
  }
  const byLabel = CM_JURISDICTIONS.find(
    (j) => j.label.toLowerCase() === s.toLowerCase() && j.code !== 'OTHER',
  );
  if (byLabel) return { ok: true, code: byLabel.code, label: byLabel.label };

  if (upper === 'OTHER' || s.toLowerCase().startsWith('other')) {
    const custom = s.replace(/^other(\s*\/\s*custom jurisdiction)?[:\s-]*/i, '').trim();
    if (!custom || custom.toLowerCase() === 'other') {
      return { ok: false, code: 'CUSTOM_JURISDICTION_REQUIRED' };
    }
    return { ok: true, code: `OTHER:${custom.slice(0, 80)}`, label: custom.slice(0, 80) };
  }

  if (upper.startsWith('OTHER:')) {
    const custom = s.slice(6).trim().slice(0, 80);
    if (!custom) return { ok: false, code: 'CUSTOM_JURISDICTION_REQUIRED' };
    return { ok: true, code: `OTHER:${custom}`, label: custom };
  }

  // Unknown free text → treat as custom Other
  return { ok: true, code: `OTHER:${s.slice(0, 80)}`, label: s.slice(0, 80) };
}

export function jurisdictionDisplayLabel(stored) {
  const s = String(stored || '').trim();
  if (!s) return '';
  if (s.toUpperCase().startsWith('OTHER:')) return s.slice(6).trim() || 'Other';
  const hit = CM_JURISDICTIONS.find((j) => j.code === s.toUpperCase());
  return hit ? hit.label : s;
}

/**
 * Default classification hints by artifact type.
 * Restricted types never get public publication.
 * Publication is always derived — never taken from uploader input.
 */
export function defaultClassificationForArtifactType(artifactType) {
  if (
    artifactType === CM_ARTIFACT_TYPES.REGISTRATION_CERTIFICATE ||
    artifactType === CM_ARTIFACT_TYPES.TAX_CERTIFICATE ||
    artifactType === CM_ARTIFACT_TYPES.COMPLIANCE_DOCUMENT
  ) {
    return {
      sensitivity_classification: 'CONFIDENTIAL',
      publication_status: 'RESTRICTED',
    };
  }
  if (artifactType === CM_ARTIFACT_TYPES.LOGO || artifactType === CM_ARTIFACT_TYPES.BRAND_IMAGE) {
    return {
      sensitivity_classification: 'PUBLIC',
      publication_status: 'NOT_ASSESSED',
    };
  }
  return {
    sensitivity_classification: 'INTERNAL',
    publication_status: 'INTERNAL_ONLY',
  };
}

/**
 * Derive publication status from sensitivity + type (uploader cannot self-publish).
 * @param {{ artifactType: string, sensitivity: string }} args
 */
export function derivePublicationStatus(args) {
  const artifactType = String(args.artifactType || '').toUpperCase();
  const sensitivity = String(args.sensitivity || '').toUpperCase();
  const defaults = defaultClassificationForArtifactType(artifactType);
  if (
    artifactType === CM_ARTIFACT_TYPES.REGISTRATION_CERTIFICATE ||
    artifactType === CM_ARTIFACT_TYPES.TAX_CERTIFICATE ||
    artifactType === CM_ARTIFACT_TYPES.COMPLIANCE_DOCUMENT ||
    sensitivity === 'CONFIDENTIAL' ||
    sensitivity === 'HIGHLY_RESTRICTED'
  ) {
    return 'RESTRICTED';
  }
  if (sensitivity === 'INTERNAL') return 'INTERNAL_ONLY';
  if (sensitivity === 'PUBLIC') return 'NOT_ASSESSED';
  return defaults.publication_status;
}

/**
 * Suggest logical alias from artifact type when caller omits one.
 */
export function defaultAliasForArtifactType(artifactType) {
  if (artifactType === CM_ARTIFACT_TYPES.LOGO) return CM_LOGICAL_ALIASES.PRIMARY_LOGO;
  if (artifactType === CM_ARTIFACT_TYPES.REGISTRATION_CERTIFICATE) {
    return CM_LOGICAL_ALIASES.REGISTRATION_CERT;
  }
  if (artifactType === CM_ARTIFACT_TYPES.TAX_CERTIFICATE) return CM_LOGICAL_ALIASES.TAX_CERT;
  return `document.${String(artifactType || 'other').toLowerCase()}.current`;
}

/**
 * Human-readable artifact lifecycle label for ordinary UI.
 * @param {{ lifecycle_status?: string, approval_status?: string, is_current?: boolean }} a
 */
export function humanArtifactState(a) {
  const life = String(a?.lifecycle_status || '');
  const approval = String(a?.approval_status || '');
  if (life === 'WITHDRAWN') return 'Withdrawn';
  if (life === 'ARCHIVED') return 'Archived';
  if (a?.is_current === true && life === 'ACTIVE' && approval === 'APPROVED') return 'Current';
  if (life === 'SUPERSEDED') return 'Superseded';
  if (
    ['UPLOADED', 'DRAFT', 'UNDER_REVIEW'].includes(life) ||
    approval === 'NOT_REQUESTED' ||
    approval === 'PENDING'
  ) {
    return 'Pending approval';
  }
  if (life === 'ACTIVE' && approval === 'APPROVED') return 'Current';
  return life || 'Unknown';
}

export function isPendingArtifact(a) {
  const life = String(a?.lifecycle_status || '');
  const approval = String(a?.approval_status || '');
  return (
    ['UPLOADED', 'DRAFT', 'UNDER_REVIEW'].includes(life) &&
    approval !== 'APPROVED'
  );
}
