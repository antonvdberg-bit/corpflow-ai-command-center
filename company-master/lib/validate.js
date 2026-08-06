/**
 * Deterministic Company Master validator.
 *
 * Validates records against the JSON Schema, controlled vocabularies, and
 * fail-closed governance rules. Distinguishes evidence receipt from
 * verification. No production services or credentials.
 *
 * @module company-master/lib/validate
 */

import Ajv from 'ajv';
import { loadCompanyMasterSchema, loadVocabularies } from './load.js';

/** Material identity keys that block activation when CONFLICTING. */
export const MATERIAL_IDENTITY_FIELD_KEYS = Object.freeze([
  'identity.legal_name',
  'identity.trading_name',
  'identity.registration_number',
]);

const EVIDENCE_RECEIVED_BUT_NOT_VERIFIED = new Set(['RECEIVED', 'UNDER_REVIEW']);

/**
 * @typedef {{ path: string, code: string, message: string }} CompanyMasterValidationError
 * @typedef {{ ok: true, errors: [] } | { ok: false, errors: CompanyMasterValidationError[] }} CompanyMasterValidationResult
 */

/**
 * @param {string} path
 * @param {string} code
 * @param {string} message
 * @returns {CompanyMasterValidationError}
 */
function err(path, code, message) {
  return { path, code, message };
}

/**
 * @param {unknown} value
 * @param {readonly string[]} allowed
 * @param {string} path
 * @param {string} code
 * @param {CompanyMasterValidationError[]} errors
 */
function requireVocab(value, allowed, path, code, errors) {
  if (value == null || value === '') {
    errors.push(err(path, code, `missing required vocabulary value`));
    return;
  }
  if (typeof value !== 'string' || !allowed.includes(value)) {
    errors.push(
      err(path, code, `invalid value ${JSON.stringify(value)}; expected one of ${allowed.join(', ')}`),
    );
  }
}

/**
 * Build a compiled Ajv validator for the Company Master record schema.
 * Format keywords are not required for structural checks (ajv-formats not used).
 */
export function createSchemaValidator(schema = loadCompanyMasterSchema()) {
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    validateSchema: false,
    // Formats (date-time/date) are accepted as strings; ajv-formats is not a repo dependency.
    validateFormats: false,
  });
  return ajv.compile(schema);
}

/**
 * Validate a Company Master record structurally + against vocabularies/governance.
 *
 * @param {object} record
 * @param {{ vocabularies?: object, schemaValidate?: Function }} [options]
 * @returns {CompanyMasterValidationResult}
 */
export function validateCompanyMasterRecord(record, options = {}) {
  const errors = /** @type {CompanyMasterValidationError[]} */ ([]);
  const vocabularies = options.vocabularies || loadVocabularies();
  const schemaValidate = options.schemaValidate || createSchemaValidator();

  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return {
      ok: false,
      errors: [err('', 'RECORD_INVALID', 'record must be a non-null object')],
    };
  }

  const schemaOk = schemaValidate(record);
  if (!schemaOk) {
    for (const e of schemaValidate.errors || []) {
      errors.push(
        err(
          e.instancePath || '/',
          'SCHEMA_VALIDATION',
          `${e.message || 'schema validation failed'}${e.params ? ` (${JSON.stringify(e.params)})` : ''}`,
        ),
      );
    }
  }

  requireVocab(
    record.lifecycle_status,
    vocabularies.company_lifecycle_statuses,
    '/lifecycle_status',
    'VOCAB_LIFECYCLE',
    errors,
  );

  const fields = Array.isArray(record.governed_fields) ? record.governed_fields : [];
  fields.forEach((field, index) => {
    const base = `/governed_fields/${index}`;
    if (!field || typeof field !== 'object') {
      errors.push(err(base, 'FIELD_INVALID', 'governed field must be an object'));
      return;
    }

    requireVocab(
      field.sensitivity_classification,
      vocabularies.sensitivity_classifications,
      `${base}/sensitivity_classification`,
      'MISSING_OR_INVALID_SENSITIVITY',
      errors,
    );
    requireVocab(
      field.publication_status,
      vocabularies.publication_statuses,
      `${base}/publication_status`,
      'MISSING_OR_INVALID_PUBLICATION',
      errors,
    );
    requireVocab(
      field.verification_status,
      vocabularies.verification_statuses,
      `${base}/verification_status`,
      'MISSING_OR_INVALID_VERIFICATION',
      errors,
    );
    requireVocab(
      field.approval_status,
      vocabularies.approval_statuses,
      `${base}/approval_status`,
      'MISSING_OR_INVALID_APPROVAL',
      errors,
    );

    if (field.approval_status === 'APPROVED') {
      if (!field.approved_by) {
        errors.push(err(`${base}/approved_by`, 'APPROVAL_METADATA', 'approved fields require approved_by'));
      }
      if (!field.approved_at) {
        errors.push(err(`${base}/approved_at`, 'APPROVAL_METADATA', 'approved fields require approved_at'));
      }
    }

    if (field.verification_status === 'VERIFIED') {
      if (!field.verified_by) {
        errors.push(err(`${base}/verified_by`, 'VERIFICATION_METADATA', 'verified fields require verified_by'));
      }
      if (!field.verified_at) {
        errors.push(err(`${base}/verified_at`, 'VERIFICATION_METADATA', 'verified fields require verified_at'));
      }
    }
  });

  const assets = Array.isArray(record.assets) ? record.assets : [];
  assets.forEach((asset, index) => {
    const base = `/assets/${index}`;
    if (!asset || typeof asset !== 'object') {
      errors.push(err(base, 'ASSET_INVALID', 'asset must be an object'));
      return;
    }

    requireVocab(
      asset.asset_type,
      vocabularies.asset_types,
      `${base}/asset_type`,
      'VOCAB_ASSET_TYPE',
      errors,
    );
    requireVocab(
      asset.storage_provider,
      vocabularies.storage_providers,
      `${base}/storage_provider`,
      'VOCAB_STORAGE_PROVIDER',
      errors,
    );
    requireVocab(
      asset.sensitivity_classification,
      vocabularies.sensitivity_classifications,
      `${base}/sensitivity_classification`,
      'MISSING_OR_INVALID_SENSITIVITY',
      errors,
    );
    requireVocab(
      asset.publication_status,
      vocabularies.publication_statuses,
      `${base}/publication_status`,
      'MISSING_OR_INVALID_PUBLICATION',
      errors,
    );
    requireVocab(
      asset.verification_status,
      vocabularies.verification_statuses,
      `${base}/verification_status`,
      'MISSING_OR_INVALID_VERIFICATION',
      errors,
    );
    requireVocab(
      asset.approval_status,
      vocabularies.approval_statuses,
      `${base}/approval_status`,
      'MISSING_OR_INVALID_APPROVAL',
      errors,
    );
    requireVocab(
      asset.lifecycle_status,
      vocabularies.asset_lifecycle_statuses,
      `${base}/lifecycle_status`,
      'VOCAB_ASSET_LIFECYCLE',
      errors,
    );

    if (asset.approval_status === 'APPROVED' && asset.lifecycle_status === 'ACTIVE') {
      if (!asset.approved_by || !asset.approved_at) {
        errors.push(
          err(base, 'APPROVAL_METADATA', 'active approved assets require approved_by and approved_at'),
        );
      }
    }
  });

  const evidence = Array.isArray(record.evidence_requirements) ? record.evidence_requirements : [];
  evidence.forEach((req, index) => {
    const base = `/evidence_requirements/${index}`;
    if (!req || typeof req !== 'object') {
      errors.push(err(base, 'EVIDENCE_INVALID', 'evidence requirement must be an object'));
      return;
    }

    requireVocab(
      req.evidence_status,
      vocabularies.evidence_statuses,
      `${base}/evidence_status`,
      'VOCAB_EVIDENCE_STATUS',
      errors,
    );

    // Receipt is not verification: RECEIVED/UNDER_REVIEW must not carry verified_* metadata.
    if (EVIDENCE_RECEIVED_BUT_NOT_VERIFIED.has(req.evidence_status)) {
      if (req.verified_at || req.verified_by) {
        errors.push(
          err(
            base,
            'RECEIPT_IS_NOT_VERIFICATION',
            `evidence_status ${req.evidence_status} must not set verified_by/verified_at`,
          ),
        );
      }
    }

    if (req.evidence_status === 'VERIFIED') {
      if (!req.verified_at || !req.verified_by) {
        errors.push(
          err(base, 'VERIFICATION_METADATA', 'VERIFIED evidence requires verified_by and verified_at'),
        );
      }
    }
  });

  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors };
}

/**
 * Material identity conflicts block activation / approved downstream use.
 *
 * @param {object} record
 * @returns {{ ok: boolean, blockers: string[] }}
 */
export function evaluateActivationReadiness(record) {
  const blockers = [];
  if (!record || typeof record !== 'object') {
    return { ok: false, blockers: ['record missing'] };
  }

  if (record.lifecycle_status !== 'ACTIVE' && record.lifecycle_status !== 'READY_FOR_APPROVAL') {
    if (
      ['DRAFT', 'ONBOARDING', 'EVIDENCE_INCOMPLETE', 'UNDER_VERIFICATION'].includes(
        record.lifecycle_status,
      )
    ) {
      blockers.push(`lifecycle_status ${record.lifecycle_status} is not activation-ready`);
    }
  }

  const fields = Array.isArray(record.governed_fields) ? record.governed_fields : [];
  for (const field of fields) {
    if (!field) continue;
    if (
      MATERIAL_IDENTITY_FIELD_KEYS.includes(field.field_key) &&
      field.verification_status === 'CONFLICTING'
    ) {
      blockers.push(
        `material identity conflict on ${field.field_key} (field_id=${field.field_id})`,
      );
    }
    if (
      MATERIAL_IDENTITY_FIELD_KEYS.includes(field.field_key) &&
      field.approval_status !== 'APPROVED'
    ) {
      blockers.push(`material identity field ${field.field_key} is not APPROVED`);
    }
  }

  const evidence = Array.isArray(record.evidence_requirements) ? record.evidence_requirements : [];
  for (const req of evidence) {
    if (!req) continue;
    if (EVIDENCE_RECEIVED_BUT_NOT_VERIFIED.has(req.evidence_status)) {
      blockers.push(
        `evidence ${req.requirement_key} is ${req.evidence_status} (received is not verified)`,
      );
    }
    if (['REQUESTED', 'AWAITING_CLIENT'].includes(req.evidence_status)) {
      blockers.push(`evidence ${req.requirement_key} is incomplete (${req.evidence_status})`);
    }
  }

  return { ok: blockers.length === 0, blockers };
}

/**
 * True when evidence status means "received" but not "verified".
 * @param {string} evidenceStatus
 */
export function isReceivedNotVerifiedEvidence(evidenceStatus) {
  return EVIDENCE_RECEIVED_BUT_NOT_VERIFIED.has(evidenceStatus);
}
