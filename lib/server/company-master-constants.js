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

export const CM_STORAGE_PROVIDER = 'MANAGED_OBJECT_STORAGE';

export const COMPANY_ID_RE = /^cmp_[a-z0-9][a-z0-9_-]{2,63}$/;

/**
 * Default classification hints by artifact type.
 * Restricted types never get public publication.
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
