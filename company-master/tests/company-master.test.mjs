/**
 * Company Master v1 — deterministic validation, resolution and security proofs (#765 / #770).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildCompanyCatalogue,
  loadClientOnboardingSyntheticRecord,
  loadCorpflowaiSyntheticRecord,
  loadVocabularies,
} from '../lib/load.js';
import {
  evaluateActivationReadiness,
  isReceivedNotVerifiedEvidence,
  validateCompanyMasterRecord,
} from '../lib/validate.js';
import {
  assertSnapshotUnchanged,
  createIssuedDocumentSnapshot,
  resolveAssetByAlias,
  resolveAssetById,
  resolveForFutureRender,
  resolveGovernedField,
} from '../lib/resolve.js';
import { auditCompanyMasterFixturesForSecretsAndBinaries } from '../lib/security.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const AT = new Date('2026-08-06T12:00:00Z');

function catalogue() {
  return buildCompanyCatalogue([
    loadCorpflowaiSyntheticRecord(),
    loadClientOnboardingSyntheticRecord(),
  ]);
}

describe('Company Master synthetic fixtures', () => {
  it('CorpFlowAI synthetic record validates against schema and vocabularies', () => {
    const record = loadCorpflowaiSyntheticRecord();
    const result = validateCompanyMasterRecord(record);
    assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
    assert.equal(record.company_id, 'cmp_corpflowai_synthetic');
    assert.equal(record.tenant_id, 'corpflowai-core');
    assert.equal(record.lifecycle_status, 'ACTIVE');
  });

  it('client onboarding synthetic demonstrates provisional, conflict, incomplete evidence, receipt, unapproved logo', () => {
    const record = loadClientOnboardingSyntheticRecord();
    const result = validateCompanyMasterRecord(record);
    assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
    assert.equal(record.company_id, 'cmp_pilot_client_synthetic');
    assert.equal(record.tenant_id, null);
    assert.equal(record.lifecycle_status, 'EVIDENCE_INCOMPLETE');

    const legal = record.governed_fields.find((f) => f.field_key === 'identity.legal_name');
    const trading = record.governed_fields.find((f) => f.field_key === 'identity.trading_name');
    assert.ok(legal);
    assert.ok(trading);
    assert.equal(legal.verification_status, 'CONFLICTING');
    assert.equal(trading.verification_status, 'CONFLICTING');
    assert.notEqual(legal.field_value, trading.field_value);

    const regEvidence = record.evidence_requirements.find(
      (e) => e.requirement_key === 'company.registration_certificate',
    );
    assert.equal(regEvidence.evidence_status, 'RECEIVED');
    assert.equal(regEvidence.verified_at, null);
    assert.equal(isReceivedNotVerifiedEvidence(regEvidence.evidence_status), true);

    const bank = record.evidence_requirements.find(
      (e) => e.requirement_key === 'company.bank_confirmation',
    );
    assert.equal(bank.evidence_status, 'AWAITING_CLIENT');

    const logo = record.assets.find((a) => a.logical_alias === 'brand.logo.primary');
    assert.equal(logo.lifecycle_status, 'UPLOADED');
    assert.notEqual(logo.approval_status, 'APPROVED');
  });

  it('client company_id is isolated from CorpFlowAI company_id', () => {
    const a = loadCorpflowaiSyntheticRecord();
    const b = loadClientOnboardingSyntheticRecord();
    assert.notEqual(a.company_id, b.company_id);
    const cat = catalogue();
    assert.equal(cat.has(a.company_id), true);
    assert.equal(cat.has(b.company_id), true);
  });
});

describe('Company Master validator fail-closed behaviour', () => {
  it('rejects missing sensitivity / publication / approval / verification governance metadata', () => {
    const record = structuredClone(loadCorpflowaiSyntheticRecord());
    delete record.governed_fields[0].sensitivity_classification;
    delete record.governed_fields[0].publication_status;
    delete record.assets[0].approval_status;
    delete record.assets[0].verification_status;

    const result = validateCompanyMasterRecord(record);
    assert.equal(result.ok, false);
    const codes = result.errors.map((e) => e.code);
    assert.ok(codes.includes('MISSING_OR_INVALID_SENSITIVITY'));
    assert.ok(codes.includes('MISSING_OR_INVALID_PUBLICATION'));
    assert.ok(codes.includes('MISSING_OR_INVALID_APPROVAL'));
    assert.ok(codes.includes('MISSING_OR_INVALID_VERIFICATION'));
  });

  it('rejects invalid controlled vocabulary values', () => {
    const record = structuredClone(loadCorpflowaiSyntheticRecord());
    record.lifecycle_status = 'NOT_A_REAL_STATUS';
    record.assets[0].asset_type = 'NOT_A_TYPE';
    const result = validateCompanyMasterRecord(record);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.code === 'VOCAB_LIFECYCLE'));
    assert.ok(result.errors.some((e) => e.code === 'VOCAB_ASSET_TYPE'));
  });

  it('treats receipt as distinct from verification (RECEIVED cannot carry verified_* )', () => {
    const record = structuredClone(loadClientOnboardingSyntheticRecord());
    const req = record.evidence_requirements.find(
      (e) => e.requirement_key === 'company.registration_certificate',
    );
    req.evidence_status = 'RECEIVED';
    req.verified_by = 'role:should-not-be-set';
    req.verified_at = '2026-08-06T01:10:00Z';
    const result = validateCompanyMasterRecord(record);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.code === 'RECEIPT_IS_NOT_VERIFICATION'));
  });

  it('conflicting material identity blocks activation / approved downstream use', () => {
    const record = loadClientOnboardingSyntheticRecord();
    const readiness = evaluateActivationReadiness(record);
    assert.equal(readiness.ok, false);
    assert.ok(readiness.blockers.some((b) => /material identity conflict/i.test(b)));
    assert.ok(readiness.blockers.some((b) => /received is not verified/i.test(b)));
  });

  it('vocabularies expose required controlled classes', () => {
    const v = loadVocabularies();
    assert.ok(v.sensitivity_classifications.includes('PUBLIC'));
    assert.ok(v.sensitivity_classifications.includes('HIGHLY_RESTRICTED'));
    assert.ok(v.evidence_statuses.includes('RECEIVED'));
    assert.ok(v.evidence_statuses.includes('VERIFIED'));
    assert.ok(v.company_lifecycle_statuses.includes('EVIDENCE_INCOMPLETE'));
    assert.ok(v.asset_lifecycle_statuses.includes('SUPERSEDED'));
    assert.ok(v.asset_lifecycle_statuses.includes('UPLOADED'));
  });
});

describe('Company Master resolver — logo versions and aliases', () => {
  it('approved active logo v2 resolves via brand.logo.primary', () => {
    const cat = catalogue();
    const result = resolveAssetByAlias(cat, 'cmp_corpflowai_synthetic', 'brand.logo.primary', {
      at: AT,
    });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.asset.asset_id, 'ast_logo_primary_v2');
    assert.equal(result.asset.version_number, 2);
    assert.equal(result.asset.lifecycle_status, 'ACTIVE');
    assert.equal(result.asset.durable_contract_is_provider_url, false);
  });

  it('superseded logo v1 remains historically addressable but is not current', () => {
    const cat = catalogue();
    const current = resolveAssetByAlias(cat, 'cmp_corpflowai_synthetic', 'brand.logo.primary', {
      at: AT,
    });
    assert.equal(current.asset.asset_id, 'ast_logo_primary_v2');

    const historical = resolveAssetById(cat, 'cmp_corpflowai_synthetic', 'ast_logo_primary_v1');
    assert.equal(historical.ok, true);
    assert.equal(historical.asset.asset_id, 'ast_logo_primary_v1');
    assert.equal(historical.asset.lifecycle_status, 'SUPERSEDED');
    assert.equal(historical.asset.version_number, 1);
    assert.notEqual(historical.asset.asset_id, current.asset.asset_id);
  });

  it('uploaded / unapproved logo v3 does not resolve as current', () => {
    const cat = catalogue();
    const corp = loadCorpflowaiSyntheticRecord();
    const v3 = corp.assets.find((a) => a.asset_id === 'ast_logo_primary_v3');
    assert.ok(v3);
    assert.equal(v3.lifecycle_status, 'UPLOADED');

    const current = resolveAssetByAlias(cat, 'cmp_corpflowai_synthetic', 'brand.logo.primary', {
      at: AT,
    });
    assert.equal(current.ok, true);
    assert.notEqual(current.asset.asset_id, 'ast_logo_primary_v3');

    // Client unapproved logo also fails closed.
    const clientLogo = resolveAssetByAlias(
      cat,
      'cmp_pilot_client_synthetic',
      'brand.logo.primary',
      { at: AT },
    );
    assert.equal(clientLogo.ok, false);
    assert.equal(clientLogo.code, 'ASSET_NOT_APPROVED');
  });

  it('storage-provider-specific URLs are not the durable downstream contract', () => {
    const cat = catalogue();
    const result = resolveAssetByAlias(cat, 'cmp_corpflowai_synthetic', 'brand.logo.primary', {
      at: AT,
    });
    assert.equal(result.ok, true);
    assert.equal(result.asset.durable_contract_is_provider_url, false);
    assert.ok(result.asset.storage_object_id);
    assert.ok(result.asset.content_hash.startsWith('sha256:'));
    assert.equal(Object.prototype.hasOwnProperty.call(result.asset, 'storage_location_reference'), false);
    assert.doesNotMatch(JSON.stringify(result.asset), /drive:\/\//);
  });
});

describe('Company Master resolver — restricted access and isolation', () => {
  it('restricted registration documents fail closed for unauthorised consumers', () => {
    const cat = catalogue();
    const denied = resolveAssetByAlias(
      cat,
      'cmp_corpflowai_synthetic',
      'legal.registration_certificate.current',
      { at: AT, caller: { purpose: 'website_render', authorised_for_restricted: false } },
    );
    assert.equal(denied.ok, false);
    assert.equal(denied.code, 'RESTRICTED_ASSET_DENIED');

    const allowed = resolveAssetByAlias(
      cat,
      'cmp_corpflowai_synthetic',
      'legal.registration_certificate.current',
      {
        at: AT,
        caller: {
          purpose: 'compliance_review',
          authorised_for_restricted: true,
          consumer_system: 'company-master-operator',
        },
      },
    );
    assert.equal(allowed.ok, true);
    assert.equal(allowed.asset.asset_id, 'ast_registration_certificate_v1');
  });

  it('one company cannot resolve another company\'s assets', () => {
    const cat = catalogue();
    const cross = resolveAssetById(
      cat,
      'cmp_pilot_client_synthetic',
      'ast_logo_primary_v2',
    );
    assert.equal(cross.ok, false);
    assert.equal(cross.code, 'ASSET_NOT_FOUND');

    const aliasCross = resolveAssetByAlias(
      cat,
      'cmp_pilot_client_synthetic',
      'brand.logo.primary',
      { at: AT },
    );
    // Client has an uploaded logo but it must not resolve CorpFlowAI's v2.
    assert.equal(aliasCross.ok, false);
    if (aliasCross.ok) {
      assert.notEqual(aliasCross.asset.company_id, 'cmp_corpflowai_synthetic');
    }
  });

  it('conflicting identity fields fail closed for approved downstream field resolution', () => {
    const cat = catalogue();
    const result = resolveGovernedField(
      cat,
      'cmp_pilot_client_synthetic',
      'identity.legal_name',
      { at: AT },
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, 'IDENTITY_CONFLICT');
  });

  it('CorpFlowAI approved public legal name resolves', () => {
    const cat = catalogue();
    const result = resolveGovernedField(
      cat,
      'cmp_corpflowai_synthetic',
      'identity.legal_name',
      { at: AT },
    );
    assert.equal(result.ok, true);
    assert.equal(result.value, 'CorpFlowAI Synthetic Ltd');
  });
});

describe('Company Master issued-document snapshot vs future render', () => {
  it('historical issued-document snapshot remains unchanged after Company Master update', () => {
    // Simulate issue-time when v1 was still the current approved logo.
    const historicalRecord = structuredClone(loadCorpflowaiSyntheticRecord());
    historicalRecord.assets = historicalRecord.assets
      .filter((a) => a.asset_id !== 'ast_logo_primary_v3')
      .map((a) => {
        if (a.asset_id === 'ast_logo_primary_v1') {
          return {
            ...a,
            lifecycle_status: 'ACTIVE',
            effective_to: null,
          };
        }
        if (a.asset_id === 'ast_logo_primary_v2') {
          return {
            ...a,
            lifecycle_status: 'UPLOADED',
            approval_status: 'NOT_REQUESTED',
            verification_status: 'RECEIVED_NOT_VERIFIED',
            approved_by: null,
            approved_at: null,
          };
        }
        return a;
      });

    const pastCatalogue = buildCompanyCatalogue([
      historicalRecord,
      loadClientOnboardingSyntheticRecord(),
    ]);

    const issuedAt = '2025-06-01T00:00:00Z';
    const snap = createIssuedDocumentSnapshot(pastCatalogue, {
      company_id: 'cmp_corpflowai_synthetic',
      logical_alias: 'brand.logo.primary',
      document_id: 'doc_synthetic_quotation_2025_001',
      issued_at: issuedAt,
      purpose: 'quotation',
      caller: { authorised_for_restricted: false },
    });
    assert.equal(snap.ok, true, JSON.stringify(snap));
    assert.equal(snap.snapshot.resolved_asset_id, 'ast_logo_primary_v1');
    assert.equal(snap.snapshot.resolved_version_number, 1);

    // Retain the snapshot object after Company Master advances to v2.
    const retained = structuredClone(snap.snapshot);
    const present = catalogue();
    const future = resolveForFutureRender(
      present,
      'cmp_corpflowai_synthetic',
      'brand.logo.primary',
      { at: AT },
    );
    assert.equal(future.ok, true);
    assert.equal(future.asset.asset_id, 'ast_logo_primary_v2');

    const unchanged = assertSnapshotUnchanged(snap.snapshot, retained);
    assert.equal(unchanged.ok, true);
    assert.equal(retained.resolved_asset_id, 'ast_logo_primary_v1');
    assert.notEqual(retained.resolved_asset_id, future.asset.asset_id);
  });

  it('future renders use the newly approved asset after Company Master update', () => {
    const cat = catalogue();
    const future = resolveForFutureRender(
      cat,
      'cmp_corpflowai_synthetic',
      'brand.logo.primary',
      { at: AT },
    );
    assert.equal(future.ok, true);
    assert.equal(future.asset.asset_id, 'ast_logo_primary_v2');
    assert.equal(future.asset.content_hash, 'sha256:2222222222222222222222222222222222222222222222222222222222222222');
  });
});

describe('Company Master security — no binaries, secrets or real restricted contents', () => {
  it('company-master tree has no binary files, secret-like strings or embedded restricted PDFs', () => {
    const audit = auditCompanyMasterFixturesForSecretsAndBinaries();
    assert.equal(audit.ok, true, JSON.stringify(audit.findings, null, 2));
  });

  it('synthetic fixtures avoid real credential patterns and real restricted document bodies', () => {
    const files = [
      'company-master/examples/corpflowai.synthetic.json',
      'company-master/examples/client-onboarding.synthetic.json',
    ];
    for (const rel of files) {
      const text = readFileSync(path.join(REPO_ROOT, rel), 'utf8');
      assert.doesNotMatch(text, /sk_live|BEGIN (RSA |OPENSSH )?PRIVATE KEY|password\s*[:=]\s*\S+/i);
      assert.doesNotMatch(text, /data:application\/pdf;base64,/);
      assert.match(text, /No (certificate|document) contents/i);
    }
  });
});
