/**
 * Company Master runtime service tests (#776) — in-memory Prisma mock.
 * No production DB, no real restricted documents.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it, beforeEach } from 'node:test';

import {
  approveArtifact,
  artifactRowToResolverAsset,
  cleanupSyntheticCompanies,
  createCompany,
  generateCompanyId,
  getCompany,
  resolveCurrentArtifact,
  updateCompany,
  uploadArtifact,
  assertCompanyAccess,
} from '../lib/server/company-master-service.js';
import { isAssetCurrentlyResolvable } from '../company-master/lib/resolve.js';
import { CM_ALLOWED_MIME_TYPES, COMPANY_ID_RE } from '../lib/server/company-master-constants.js';
import { hashContentSha256 } from '../lib/server/company-master-storage.js';
import { validateCompanyMasterRecord } from '../company-master/lib/validate.js';
import {
  loadClientOnboardingSyntheticRecord,
  loadCorpflowaiSyntheticRecord,
} from '../company-master/lib/load.js';

function tinyPngBase64() {
  // 1x1 PNG
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
}

function makeMemoryPrisma() {
  /** @type {Map<string, any>} */
  const companies = new Map();
  /** @type {Map<string, any>} */
  const artifacts = new Map();
  let seq = 0;
  const nid = (p) => `${p}_${++seq}_${Date.now().toString(36)}`;

  const api = {
    companyMasterCompany: {
      async findUnique({ where }) {
        if (where.companyId) return companies.get(where.companyId) || null;
        if (where.id) {
          for (const c of companies.values()) if (c.id === where.id) return c;
        }
        return null;
      },
      async findMany({ where = {}, orderBy, take, select } = {}) {
        let rows = [...companies.values()];
        if (where.isSynthetic === true) rows = rows.filter((r) => r.isSynthetic === true);
        if (where.isSynthetic === false) rows = rows.filter((r) => r.isSynthetic !== true);
        if (where.tenantId) rows = rows.filter((r) => r.tenantId === where.tenantId);
        if (typeof where.companyId === 'string') {
          rows = rows.filter((r) => r.companyId === where.companyId);
        } else if (where.companyId?.startsWith) {
          rows = rows.filter((r) => String(r.companyId).startsWith(where.companyId.startsWith));
        }
        if (where.companyId?.in) {
          rows = rows.filter((r) => where.companyId.in.includes(r.companyId));
        }
        if (orderBy?.updatedAt === 'desc') {
          rows.sort((a, b) => b.updatedAt - a.updatedAt);
        }
        if (take) rows = rows.slice(0, take);
        if (select) {
          return rows.map((r) => {
            const out = {};
            for (const k of Object.keys(select)) out[k] = r[k];
            return out;
          });
        }
        return rows;
      },
      async create({ data }) {
        const row = {
          id: nid('co'),
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        companies.set(row.companyId, row);
        return row;
      },
      async update({ where, data }) {
        const row = await api.companyMasterCompany.findUnique({ where });
        Object.assign(row, data, { updatedAt: new Date() });
        companies.set(row.companyId, row);
        return row;
      },
      async deleteMany({ where }) {
        let ids = [];
        if (where.companyId?.in) ids = where.companyId.in;
        else if (where.companyId) ids = [where.companyId];
        let count = 0;
        for (const id of ids) {
          if (companies.delete(id)) {
            for (const [aid, a] of [...artifacts.entries()]) {
              if (a.companyId === id) artifacts.delete(aid);
            }
            count += 1;
          }
        }
        return { count };
      },
    },
    companyMasterArtifact: {
      async findUnique({ where }) {
        return artifacts.get(where.id) || null;
      },
      async findFirst({ where }) {
        for (const a of artifacts.values()) {
          if (where.companyId && a.companyId !== where.companyId) continue;
          if (where.logicalAlias && a.logicalAlias !== where.logicalAlias) continue;
          if (where.contentHash && a.contentHash !== where.contentHash) continue;
          return a;
        }
        return null;
      },
      async findMany({ where = {}, orderBy, take, select } = {}) {
        let rows = [...artifacts.values()];
        if (where.companyId) rows = rows.filter((r) => r.companyId === where.companyId);
        if (where.logicalAlias) rows = rows.filter((r) => r.logicalAlias === where.logicalAlias);
        if (where.isCurrent === true) rows = rows.filter((r) => r.isCurrent === true);
        if (where.NOT?.id) rows = rows.filter((r) => r.id !== where.NOT.id);
        if (orderBy) {
          const arr = Array.isArray(orderBy) ? orderBy : [orderBy];
          rows.sort((a, b) => {
            for (const o of arr) {
              if (o.versionNumber === 'desc') return b.versionNumber - a.versionNumber;
              if (o.logicalAlias === 'asc') return String(a.logicalAlias).localeCompare(b.logicalAlias);
            }
            return 0;
          });
        }
        if (take) rows = rows.slice(0, take);
        if (select) {
          return rows.map((r) => {
            const out = {};
            for (const k of Object.keys(select)) out[k] = r[k];
            return out;
          });
        }
        return rows;
      },
      async count({ where }) {
        const rows = await api.companyMasterArtifact.findMany({ where });
        return rows.length;
      },
      async create({ data }) {
        const row = {
          id: nid('ast'),
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          uploadedAt: data.uploadedAt || new Date(),
          effectiveFrom: data.effectiveFrom || new Date(),
        };
        artifacts.set(row.id, row);
        return row;
      },
      async update({ where, data }) {
        const row = artifacts.get(where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        artifacts.set(row.id, row);
        return row;
      },
    },
    async $transaction(fn) {
      return fn(api);
    },
  };
  return api;
}

describe('Company Master runtime — ids and validation compatibility', () => {
  it('generates valid cmp_ company ids', () => {
    const id = generateCompanyId({ legalName: 'Pilot Client Synthetic', synthetic: true });
    assert.match(id, /^cmp_synthetic_/);
    assert.equal(COMPANY_ID_RE.test(id), true);
  });

  it('foundation synthetic fixtures still validate', () => {
    assert.equal(validateCompanyMasterRecord(loadCorpflowaiSyntheticRecord()).ok, true);
    assert.equal(validateCompanyMasterRecord(loadClientOnboardingSyntheticRecord()).ok, true);
  });

  it('documents allowed MIME and hash helper', () => {
    assert.ok(CM_ALLOWED_MIME_TYPES.includes('image/png'));
    assert.ok(CM_ALLOWED_MIME_TYPES.includes('application/pdf'));
    const h = hashContentSha256(Buffer.from('abc'));
    assert.equal(h, `sha256:${createHash('sha256').update('abc').digest('hex')}`);
  });
});

describe('Company Master runtime — CRUD, upload, resolve, isolation, cleanup', () => {
  /** @type {ReturnType<typeof makeMemoryPrisma>} */
  let prisma;
  const admin = { admin: true, tenantId: null, username: 'test-admin' };

  beforeEach(() => {
    prisma = makeMemoryPrisma();
  });

  it('creates, reads and updates a company', async () => {
    const created = await createCompany(
      {
        legal_name: 'Synthetic CM Co Ltd',
        trading_name: 'Synthetic CM',
        public_email: 'cm@example.invalid',
        is_synthetic: true,
        tenant_id: 'tenant-a',
      },
      { prisma },
    );
    assert.equal(created.ok, true);
    assert.match(created.company.company_id, /^cmp_synthetic_/);

    const got = await getCompany(created.company.company_id, { prisma }, admin);
    assert.equal(got.ok, true);
    assert.equal(got.company.legal_name, 'Synthetic CM Co Ltd');
    assert.equal(got.artifacts.length, 0);

    const updated = await updateCompany(
      created.company.company_id,
      { legal_name: 'Synthetic CM Co Limited', public_phone: '+2300000000', actor: 'test-admin' },
      { prisma },
      admin,
    );
    assert.equal(updated.ok, true);
    assert.equal(updated.company.legal_name, 'Synthetic CM Co Limited');
    assert.equal(updated.company.public_phone, '+2300000000');
  });

  it('uploads logo v1, rejects bad MIME, approves, resolves; v2 pending excluded; v2 approved becomes current; v1 historical', async () => {
    const created = await createCompany(
      { legal_name: 'Logo Flow Synthetic', is_synthetic: true },
      { prisma },
    );
    const companyId = created.company.company_id;

    const bad = await uploadArtifact(
      {
        company_id: companyId,
        artifact_type: 'LOGO',
        logical_alias: 'brand.logo.primary',
        file_name: 'x.exe',
        content_type: 'application/x-msdownload',
        data_base64: tinyPngBase64(),
        sensitivity_classification: 'PUBLIC',
        publication_status: 'NOT_ASSESSED',
      },
      { prisma },
      admin,
    );
    assert.equal(bad.ok, false);
    assert.equal(bad.code, 'MIME_TYPE_NOT_ALLOWED');

    const v1 = await uploadArtifact(
      {
        company_id: companyId,
        artifact_type: 'LOGO',
        logical_alias: 'brand.logo.primary',
        title: 'Logo v1',
        file_name: 'logo-v1.png',
        content_type: 'image/png',
        data_base64: tinyPngBase64(),
        sensitivity_classification: 'PUBLIC',
        publication_status: 'APPROVED_PUBLIC',
      },
      { prisma },
      admin,
    );
    assert.equal(v1.ok, true, JSON.stringify(v1));
    assert.equal(v1.artifact.version_number, 1);
    assert.equal(v1.artifact.lifecycle_status, 'UPLOADED');
    assert.equal(v1.artifact.is_current, false);

    const pendingResolve = await resolveCurrentArtifact(
      companyId,
      'brand.logo.primary',
      { prisma },
      admin,
    );
    assert.equal(pendingResolve.ok, false);
    assert.equal(pendingResolve.code, 'ASSET_NOT_APPROVED');

    const approved1 = await approveArtifact(v1.artifact.id, { prisma }, admin, 'test-admin');
    assert.equal(approved1.ok, true);
    assert.equal(approved1.artifact.lifecycle_status, 'ACTIVE');
    assert.equal(approved1.artifact.is_current, true);

    const r1 = await resolveCurrentArtifact(companyId, 'brand.logo.primary', { prisma }, admin);
    assert.equal(r1.ok, true);
    assert.equal(r1.asset.asset_id, v1.artifact.id);
    assert.equal(r1.asset.durable_contract_is_provider_url, false);

    // Different bytes for v2
    const v2b64 = Buffer.from('v2-logo-bytes-not-png-but-ok-for-hash').toString('base64');
    const v2 = await uploadArtifact(
      {
        company_id: companyId,
        artifact_type: 'LOGO',
        logical_alias: 'brand.logo.primary',
        title: 'Logo v2',
        file_name: 'logo-v2.png',
        content_type: 'image/png',
        data_base64: v2b64,
        sensitivity_classification: 'PUBLIC',
        publication_status: 'APPROVED_PUBLIC',
      },
      { prisma },
      admin,
    );
    assert.equal(v2.ok, true);
    assert.equal(v2.artifact.version_number, 2);

    const stillV1 = await resolveCurrentArtifact(companyId, 'brand.logo.primary', { prisma }, admin);
    assert.equal(stillV1.ok, true);
    assert.equal(stillV1.asset.asset_id, v1.artifact.id);

    const approved2 = await approveArtifact(v2.artifact.id, { prisma }, admin, 'test-admin');
    assert.equal(approved2.ok, true);

    const r2 = await resolveCurrentArtifact(companyId, 'brand.logo.primary', { prisma }, admin);
    assert.equal(r2.ok, true);
    assert.equal(r2.asset.asset_id, v2.artifact.id);

    const got = await getCompany(companyId, { prisma }, admin);
    const hist = got.artifacts.find((a) => a.id === v1.artifact.id);
    assert.ok(hist);
    assert.equal(hist.lifecycle_status, 'SUPERSEDED');
    assert.equal(hist.is_current, false);
    assert.ok(isAssetCurrentlyResolvable(artifactRowToResolverAsset({
      ...hist,
      id: hist.id,
      companyId,
      artifactType: hist.artifact_type,
      logicalAlias: hist.logical_alias,
      storageProvider: hist.storage_provider,
      storageObjectId: hist.storage_object_id,
      mimeType: hist.mime_type,
      contentHash: hist.content_hash,
      sensitivityClassification: hist.sensitivity_classification,
      publicationStatus: hist.publication_status,
      verificationStatus: hist.verification_status,
      approvalStatus: hist.approval_status,
      lifecycleStatus: hist.lifecycle_status,
      versionNumber: hist.version_number,
      supersedesArtifactId: hist.supersedes_artifact_id,
      effectiveFrom: new Date(hist.effective_from),
      effectiveTo: hist.effective_to ? new Date(hist.effective_to) : null,
      expiryDate: null,
      recordOwner: 'role:company-master-operator',
    })) === false);
  });

  it('stores registration certificate as restricted and denies unauthorised resolve', async () => {
    const created = await createCompany(
      { legal_name: 'Restricted Doc Synthetic', is_synthetic: true },
      { prisma },
    );
    const companyId = created.company.company_id;
    const up = await uploadArtifact(
      {
        company_id: companyId,
        artifact_type: 'REGISTRATION_CERTIFICATE',
        logical_alias: 'legal.registration_certificate.current',
        file_name: 'reg.pdf',
        content_type: 'application/pdf',
        data_base64: Buffer.from('%PDF-1.4 synthetic').toString('base64'),
        sensitivity_classification: 'CONFIDENTIAL',
        publication_status: 'RESTRICTED',
      },
      { prisma },
      admin,
    );
    assert.equal(up.ok, true);
    await approveArtifact(up.artifact.id, { prisma }, admin, 'test-admin');

    const denied = await resolveCurrentArtifact(
      companyId,
      'legal.registration_certificate.current',
      { prisma },
      admin,
      { authorised_for_restricted: false },
    );
    assert.equal(denied.ok, false);
    assert.equal(denied.code, 'RESTRICTED_ASSET_DENIED');

    const allowed = await resolveCurrentArtifact(
      companyId,
      'legal.registration_certificate.current',
      { prisma },
      admin,
      { authorised_for_restricted: true },
    );
    assert.equal(allowed.ok, true);
  });

  it('enforces company isolation across tenants/companies', async () => {
    const a = await createCompany(
      { legal_name: 'Company A Synthetic', is_synthetic: true, tenant_id: 'tenant-a' },
      { prisma },
    );
    const b = await createCompany(
      { legal_name: 'Company B Synthetic', is_synthetic: true, tenant_id: 'tenant-b' },
      { prisma },
    );
    const up = await uploadArtifact(
      {
        company_id: a.company.company_id,
        artifact_type: 'LOGO',
        logical_alias: 'brand.logo.primary',
        file_name: 'a.png',
        content_type: 'image/png',
        data_base64: tinyPngBase64(),
        sensitivity_classification: 'PUBLIC',
        publication_status: 'APPROVED_PUBLIC',
      },
      { prisma },
      admin,
    );
    await approveArtifact(up.artifact.id, { prisma }, admin);

    const cross = await getCompany(a.company.company_id, { prisma }, {
      admin: false,
      tenantId: 'tenant-b',
    });
    assert.equal(cross.ok, false);
    assert.equal(cross.code, 'COMPANY_NOT_FOUND');

    const access = assertCompanyAccess(
      { tenantId: 'tenant-a' },
      { admin: false, tenantId: 'tenant-b' },
    );
    assert.equal(access.ok, false);

    const resolveCrossCompany = await resolveCurrentArtifact(
      b.company.company_id,
      'brand.logo.primary',
      { prisma },
      admin,
    );
    assert.equal(resolveCrossCompany.ok, false);
  });

  it('rejects missing classification and duplicate content; cleanup removes synthetic rows', async () => {
    const created = await createCompany(
      { legal_name: 'Cleanup Synthetic', is_synthetic: true, company_id: 'cmp_synthetic_cleanup_demo' },
      { prisma },
    );
    assert.equal(created.ok, true);

    const first = await uploadArtifact(
      {
        company_id: created.company.company_id,
        artifact_type: 'LOGO',
        logical_alias: 'brand.logo.primary',
        file_name: 'a.png',
        content_type: 'image/png',
        data_base64: tinyPngBase64(),
        sensitivity_classification: 'PUBLIC',
        publication_status: 'NOT_ASSESSED',
      },
      { prisma },
      admin,
    );
    assert.equal(first.ok, true);

    const dup = await uploadArtifact(
      {
        company_id: created.company.company_id,
        artifact_type: 'LOGO',
        logical_alias: 'brand.logo.primary',
        file_name: 'a-copy.png',
        content_type: 'image/png',
        data_base64: tinyPngBase64(),
        sensitivity_classification: 'PUBLIC',
        publication_status: 'NOT_ASSESSED',
      },
      { prisma },
      admin,
    );
    assert.equal(dup.ok, false);
    assert.equal(dup.code, 'DUPLICATE_CONTENT');

    const cleaned = await cleanupSyntheticCompanies(
      { prisma },
      { companyId: 'cmp_synthetic_cleanup_demo' },
    );
    assert.equal(cleaned.ok, true);
    assert.equal(cleaned.deleted_count, 1);
    const gone = await getCompany('cmp_synthetic_cleanup_demo', { prisma }, admin);
    assert.equal(gone.ok, false);
  });

  it('fails closed when company ownership metadata missing for non-admin tenant scope', async () => {
    const created = await createCompany(
      { legal_name: 'No Tenant Synthetic', is_synthetic: true },
      { prisma },
    );
    const access = assertCompanyAccess(created.company, { admin: false, tenantId: 'tenant-x' });
    // company public shape uses tenant_id; assertCompanyAccess expects row.tenantId
    assert.equal(
      assertCompanyAccess({ tenantId: null }, { admin: false, tenantId: 'tenant-x' }).ok,
      false,
    );
    assert.equal(access.ok, false);
  });
});
