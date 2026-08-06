/**
 * Company Master service — CRUD, upload, approve, resolve, cleanup (#776).
 * Inject prisma for tests; defaults to a module-level PrismaClient.
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';

import {
  isAssetCurrentlyResolvable,
  toResolvedAssetContract,
} from '../../company-master/lib/resolve.js';
import {
  CM_ALLOWED_MIME_TYPES,
  CM_ARTIFACT_TYPES,
  CM_DEFAULT_MAX_UPLOAD_BYTES,
  CM_HARD_MAX_UPLOAD_BYTES,
  CM_LOGICAL_ALIASES,
  CM_MAX_ARTIFACTS_PER_COMPANY,
  CM_STORAGE_ADAPTER_ID,
  CM_STORAGE_PROVIDER,
  COMPANY_ID_RE,
  defaultAliasForArtifactType,
  defaultClassificationForArtifactType,
  derivePublicationStatus,
  isPendingArtifact,
  jurisdictionDisplayLabel,
  normalizeJurisdiction,
} from './company-master-constants.js';
import { cfg } from './runtime-config.js';
import {
  hashContentSha256,
  toArtifactMetadataPublic,
  writeCompanyMasterArtifactBytes,
} from './company-master-storage.js';

const defaultPrisma = new PrismaClient();

function prismaOf(deps) {
  return deps?.prisma || defaultPrisma;
}

function slugPart(s) {
  return String(s || 'company')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'company';
}

/**
 * @param {{ legalName?: string, synthetic?: boolean, explicitId?: string }} args
 */
export function generateCompanyId(args = {}) {
  if (args.explicitId && COMPANY_ID_RE.test(args.explicitId)) return args.explicitId;
  const prefix = args.synthetic ? 'cmp_synthetic_' : 'cmp_';
  const base = slugPart(args.legalName);
  const suffix = randomBytes(3).toString('hex');
  const id = `${prefix}${base}_${suffix}`.replace(/__+/g, '_').slice(0, 64);
  if (!COMPANY_ID_RE.test(id)) {
    return `cmp_co_${suffix}${randomBytes(2).toString('hex')}`;
  }
  return id;
}

export function toCompanyPublic(row) {
  if (!row) return null;
  return {
    id: row.id,
    company_id: row.companyId,
    tenant_id: row.tenantId ?? null,
    company_type: row.companyType,
    jurisdiction: row.jurisdiction,
    jurisdiction_label: jurisdictionDisplayLabel(row.jurisdiction),
    lifecycle_status: row.lifecycleStatus,
    verification_status: row.verificationStatus,
    approval_status: row.approvalStatus,
    legal_name: row.legalName,
    trading_name: row.tradingName ?? null,
    registration_number: row.registrationNumber ?? null,
    tax_number: row.taxNumber ?? null,
    public_email: row.publicEmail ?? null,
    public_phone: row.publicPhone ?? null,
    website: row.website ?? null,
    physical_address: row.physicalAddress ?? null,
    registered_address: row.registeredAddress ?? null,
    record_owner: row.recordOwner,
    is_synthetic: row.isSynthetic === true,
    next_review_date: row.nextReviewDate
      ? row.nextReviewDate instanceof Date
        ? row.nextReviewDate.toISOString().slice(0, 10)
        : String(row.nextReviewDate).slice(0, 10)
      : null,
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updated_at: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    created_by: row.createdBy ?? null,
    updated_by: row.updatedBy ?? null,
  };
}

/**
 * Map DB artifact row → Company Master foundation asset shape for resolver reuse.
 */
export function artifactRowToResolverAsset(row) {
  return {
    asset_id: row.id,
    asset_type: row.artifactType,
    logical_alias: row.logicalAlias,
    title: row.title,
    storage_provider: row.storageProvider,
    storage_object_id: row.storageObjectId,
    mime_type: row.mimeType,
    content_hash: row.contentHash,
    sensitivity_classification: row.sensitivityClassification,
    publication_status: row.publicationStatus,
    verification_status: row.verificationStatus,
    approval_status: row.approvalStatus,
    lifecycle_status: row.lifecycleStatus,
    version_number: row.versionNumber,
    supersedes_asset_id: row.supersedesArtifactId ?? null,
    effective_from:
      row.effectiveFrom instanceof Date ? row.effectiveFrom.toISOString() : row.effectiveFrom,
    effective_to:
      row.effectiveTo instanceof Date
        ? row.effectiveTo.toISOString()
        : row.effectiveTo ?? null,
    expiry_date: row.expiryDate
      ? row.expiryDate instanceof Date
        ? row.expiryDate.toISOString().slice(0, 10)
        : String(row.expiryDate).slice(0, 10)
      : null,
    record_owner: row.recordOwner,
  };
}

function maxUploadBytes() {
  const n = Number(cfg('CORPFLOW_CHANGE_UPLOAD_MAX_BYTES', String(CM_DEFAULT_MAX_UPLOAD_BYTES)));
  const base = Number.isFinite(n) && n > 0 ? n : CM_DEFAULT_MAX_UPLOAD_BYTES;
  return Math.min(Math.max(base, 65_536), CM_HARD_MAX_UPLOAD_BYTES);
}

function mimeAllowed(contentType) {
  const ct = String(contentType || '').trim().toLowerCase();
  return CM_ALLOWED_MIME_TYPES.includes(ct);
}

/**
 * @param {object} [deps]
 */
export async function listCompanies(deps = {}, opts = {}) {
  const prisma = prismaOf(deps);
  const where = {};
  if (opts.tenantId) where.tenantId = String(opts.tenantId);
  if (opts.syntheticOnly === true) where.isSynthetic = true;
  if (opts.excludeSynthetic === true) where.isSynthetic = false;
  const rows = await prisma.companyMasterCompany.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: Math.min(Number(opts.limit) || 100, 200),
  });
  return { ok: true, companies: rows.map(toCompanyPublic) };
}

/**
 * Ordinary create: ignores client-supplied tenant_id and governance fields.
 * Tenant ownership is derived from authenticated scope (admin → null unless
 * scope.tenantId is set by platform context).
 *
 * @param {object} input
 * @param {object} [deps]
 * @param {{ admin?: boolean, tenantId?: string|null, username?: string|null }} [scope]
 */
export async function createCompany(input, deps = {}, scope = { admin: true }) {
  const prisma = prismaOf(deps);
  const legalName = String(input.legal_name || '').trim();
  if (!legalName) return { ok: false, code: 'LEGAL_NAME_REQUIRED', status: 400 };

  const isSynthetic = input.is_synthetic === true || Boolean(input.synthetic);
  const companyId = generateCompanyId({
    legalName,
    synthetic: isSynthetic,
    explicitId: input.company_id != null ? String(input.company_id).trim() : undefined,
  });
  if (!COMPANY_ID_RE.test(companyId)) {
    return { ok: false, code: 'INVALID_COMPANY_ID', status: 400 };
  }

  const existing = await prisma.companyMasterCompany.findUnique({ where: { companyId } });
  if (existing) return { ok: false, code: 'COMPANY_ID_EXISTS', status: 409 };

  const jur = normalizeJurisdiction(input.jurisdiction || 'MU');
  if (!jur.ok) return { ok: false, code: jur.code, status: 400 };

  // Ignore client tenant_id / governance — derive tenant from authenticated scope only.
  const derivedTenantId =
    scope?.tenantId != null && String(scope.tenantId).trim()
      ? String(scope.tenantId).trim()
      : null;

  const row = await prisma.companyMasterCompany.create({
    data: {
      companyId,
      tenantId: derivedTenantId,
      companyType: 'PRIVATE_COMPANY',
      jurisdiction: jur.code,
      lifecycleStatus: 'DRAFT',
      verificationStatus: 'UNVERIFIED',
      approvalStatus: 'NOT_REQUESTED',
      legalName,
      tradingName: emptyToNull(input.trading_name),
      registrationNumber: emptyToNull(input.registration_number),
      taxNumber: emptyToNull(input.tax_number),
      publicEmail: emptyToNull(input.public_email),
      publicPhone: emptyToNull(input.public_phone),
      website: emptyToNull(input.website),
      physicalAddress: emptyToNull(input.physical_address),
      registeredAddress: emptyToNull(input.registered_address),
      recordOwner: 'role:company-master-operator',
      isSynthetic,
      createdBy: input.actor || scope?.username || null,
      updatedBy: input.actor || scope?.username || null,
    },
  });
  return {
    ok: true,
    company: toCompanyPublic(row),
    ignored_client_fields: [
      'tenant_id',
      'lifecycle_status',
      'verification_status',
      'approval_status',
      'company_type',
    ].filter((k) => Object.prototype.hasOwnProperty.call(input, k)),
  };
}

function emptyToNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/**
 * Enforce company/tenant isolation for a scope.
 */
export function assertCompanyAccess(companyRow, scope) {
  if (!companyRow) return { ok: false, status: 404, code: 'COMPANY_NOT_FOUND' };
  if (scope?.admin === true) return { ok: true };
  const need = scope?.tenantId != null ? String(scope.tenantId).trim() : '';
  const have = companyRow.tenantId != null ? String(companyRow.tenantId).trim() : '';
  if (!need || !have || need !== have) {
    return { ok: false, status: 404, code: 'COMPANY_NOT_FOUND' };
  }
  return { ok: true };
}

export async function getCompany(companyId, deps = {}, scope = { admin: true }) {
  const prisma = prismaOf(deps);
  const cid = String(companyId || '').trim();
  if (!cid) return { ok: false, code: 'COMPANY_ID_REQUIRED', status: 400 };
  const row = await prisma.companyMasterCompany.findUnique({ where: { companyId: cid } });
  const access = assertCompanyAccess(row, scope);
  if (!access.ok) return access;
  const artifacts = await prisma.companyMasterArtifact.findMany({
    where: { companyId: cid },
    orderBy: [{ logicalAlias: 'asc' }, { versionNumber: 'desc' }],
    select: {
      id: true,
      companyId: true,
      tenantId: true,
      logicalAlias: true,
      artifactType: true,
      title: true,
      originalFilename: true,
      mimeType: true,
      byteSize: true,
      contentHash: true,
      storageProvider: true,
      storageObjectId: true,
      retrievalReference: true,
      sensitivityClassification: true,
      publicationStatus: true,
      verificationStatus: true,
      approvalStatus: true,
      lifecycleStatus: true,
      versionNumber: true,
      supersedesArtifactId: true,
      isCurrent: true,
      effectiveFrom: true,
      effectiveTo: true,
      expiryDate: true,
      uploadedBy: true,
      uploadedAt: true,
      verifiedBy: true,
      verifiedAt: true,
      approvedBy: true,
      approvedAt: true,
      recordOwner: true,
    },
  });
  return {
    ok: true,
    company: toCompanyPublic(row),
    artifacts: artifacts.map(toArtifactMetadataPublic),
  };
}

export async function updateCompany(companyId, input, deps = {}, scope = { admin: true }) {
  const prisma = prismaOf(deps);
  const cid = String(companyId || '').trim();
  const existing = await prisma.companyMasterCompany.findUnique({ where: { companyId: cid } });
  const access = assertCompanyAccess(existing, scope);
  if (!access.ok) return access;

  const blocked = [];
  for (const k of [
    'tenant_id',
    'lifecycle_status',
    'verification_status',
    'approval_status',
    'company_type',
  ]) {
    if (Object.prototype.hasOwnProperty.call(input, k)) blocked.push(k);
  }
  // Ordinary updates ignore (do not apply) tenant/governance fields.
  // Explicit rejection when a non-admin tenant session tries to move tenant ownership.
  if (
    Object.prototype.hasOwnProperty.call(input, 'tenant_id') &&
    scope?.admin !== true
  ) {
    return { ok: false, code: 'TENANT_ID_NOT_EDITABLE', status: 403 };
  }

  const data = { updatedBy: input.actor || scope?.username || null };
  if (Object.prototype.hasOwnProperty.call(input, 'legal_name')) {
    const v = String(input.legal_name || '').trim();
    if (!v) return { ok: false, code: 'LEGAL_NAME_REQUIRED', status: 400 };
    data.legalName = v;
  }
  const optionalStrings = {
    trading_name: 'tradingName',
    registration_number: 'registrationNumber',
    tax_number: 'taxNumber',
    public_email: 'publicEmail',
    public_phone: 'publicPhone',
    website: 'website',
    physical_address: 'physicalAddress',
    registered_address: 'registeredAddress',
  };
  for (const [from, to] of Object.entries(optionalStrings)) {
    if (Object.prototype.hasOwnProperty.call(input, from)) {
      const raw = input[from];
      data[to] = raw == null || String(raw).trim() === '' ? null : String(raw).trim();
    }
  }
  if (Object.prototype.hasOwnProperty.call(input, 'jurisdiction')) {
    const jur = normalizeJurisdiction(input.jurisdiction);
    if (!jur.ok) return { ok: false, code: jur.code, status: 400 };
    data.jurisdiction = jur.code;
  }

  const row = await prisma.companyMasterCompany.update({
    where: { companyId: cid },
    data,
  });
  return {
    ok: true,
    company: toCompanyPublic(row),
    ignored_client_fields: blocked,
  };
}

/**
 * Upload artifact (JSON base64 → Postgres BYTEA).
 */
export async function uploadArtifact(input, deps = {}, scope = { admin: true }) {
  const prisma = prismaOf(deps);
  const companyId = String(input.company_id || '').trim();
  if (!companyId) return { ok: false, code: 'COMPANY_ID_REQUIRED', status: 400 };

  const company = await prisma.companyMasterCompany.findUnique({ where: { companyId } });
  const access = assertCompanyAccess(company, scope);
  if (!access.ok) return access;

  const artifactType = String(input.artifact_type || '').trim().toUpperCase();
  if (!Object.values(CM_ARTIFACT_TYPES).includes(artifactType)) {
    return { ok: false, code: 'INVALID_ARTIFACT_TYPE', status: 400 };
  }

  const logicalAlias = String(input.logical_alias || defaultAliasForArtifactType(artifactType)).trim();
  if (!logicalAlias || !/^[a-z0-9]+(?:[._-][a-z0-9]+)+$/.test(logicalAlias)) {
    return { ok: false, code: 'INVALID_LOGICAL_ALIAS', status: 400 };
  }

  const sensitivity =
    String(input.sensitivity_classification || '').trim() ||
    defaultClassificationForArtifactType(artifactType).sensitivity_classification;

  // Publication is never uploader-controlled.
  const publication = derivePublicationStatus({
    artifactType,
    sensitivity,
  });

  if (!sensitivity || !publication) {
    return { ok: false, code: 'CLASSIFICATION_REQUIRED', status: 400 };
  }

  if (Object.prototype.hasOwnProperty.call(input, 'publication_status')) {
    // Explicitly ignore; do not apply client value.
  }

  const fileName = String(input.file_name || 'upload.bin').trim().slice(0, 240);
  const contentType = String(input.content_type || '').trim().slice(0, 160);
  if (!mimeAllowed(contentType)) {
    return { ok: false, code: 'MIME_TYPE_NOT_ALLOWED', status: 400, content_type: contentType };
  }

  const dataB64 = String(input.data_base64 || '').trim();
  if (!dataB64) return { ok: false, code: 'DATA_BASE64_REQUIRED', status: 400 };

  let buf;
  try {
    const raw = dataB64.includes('base64,') ? dataB64.split('base64,').pop() || '' : dataB64;
    buf = Buffer.from(raw.replace(/\s/g, ''), 'base64');
  } catch {
    return { ok: false, code: 'INVALID_BASE64', status: 400 };
  }
  const maxBytes = maxUploadBytes();
  if (!buf.length || buf.length > maxBytes) {
    return { ok: false, code: 'FILE_TOO_LARGE', status: 400, max_bytes: maxBytes };
  }

  const count = await prisma.companyMasterArtifact.count({ where: { companyId } });
  if (count >= CM_MAX_ARTIFACTS_PER_COMPANY) {
    return { ok: false, code: 'TOO_MANY_ARTIFACTS', status: 400, max: CM_MAX_ARTIFACTS_PER_COMPANY };
  }

  const prior = await prisma.companyMasterArtifact.findMany({
    where: { companyId, logicalAlias },
    orderBy: { versionNumber: 'desc' },
    take: 1,
  });
  const versionNumber = prior.length ? prior[0].versionNumber + 1 : 1;
  const supersedesArtifactId = prior.length && prior[0].isCurrent ? prior[0].id : prior[0]?.id || null;

  // Duplicate content for same alias+company → reject as repeated upload.
  const contentHash = hashContentSha256(buf);
  const dup = await prisma.companyMasterArtifact.findFirst({
    where: { companyId, logicalAlias, contentHash },
  });
  if (dup) {
    return {
      ok: false,
      code: 'DUPLICATE_CONTENT',
      status: 409,
      existing_artifact_id: dup.id,
    };
  }

  const written = await writeCompanyMasterArtifactBytes(prisma, {
    bytes: buf,
    meta: {
      companyId,
      tenantId: company.tenantId,
      logicalAlias,
      artifactType,
      title: String(input.title || fileName),
      originalFilename: fileName,
      mimeType: contentType,
      sensitivityClassification: sensitivity,
      publicationStatus: publication,
      verificationStatus: 'RECEIVED_NOT_VERIFIED',
      approvalStatus: 'NOT_REQUESTED',
      lifecycleStatus: 'UPLOADED',
      versionNumber,
      supersedesArtifactId,
      isCurrent: false,
      uploadedBy: input.actor || scope.username || null,
      recordOwner: 'role:company-master-operator',
    },
  });

  return {
    ok: true,
    artifact: toArtifactMetadataPublic(written.artifact),
    storage_adapter: written.adapter_id,
  };
}

/**
 * Approve artifact → ACTIVE + is_current; supersede previous current for alias.
 */
export async function approveArtifact(artifactId, deps = {}, scope = { admin: true }, actor = null) {
  const prisma = prismaOf(deps);
  const id = String(artifactId || '').trim();
  const row = await prisma.companyMasterArtifact.findUnique({ where: { id } });
  if (!row) return { ok: false, code: 'ARTIFACT_NOT_FOUND', status: 404 };

  const company = await prisma.companyMasterCompany.findUnique({
    where: { companyId: row.companyId },
  });
  const access = assertCompanyAccess(company, scope);
  if (!access.ok) return access;

  if (!row.sensitivityClassification || !row.publicationStatus) {
    return { ok: false, code: 'CLASSIFICATION_MISSING', status: 400 };
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const currents = await tx.companyMasterArtifact.findMany({
      where: {
        companyId: row.companyId,
        logicalAlias: row.logicalAlias,
        isCurrent: true,
        NOT: { id: row.id },
      },
    });
    for (const cur of currents) {
      await tx.companyMasterArtifact.update({
        where: { id: cur.id },
        data: {
          isCurrent: false,
          lifecycleStatus: 'SUPERSEDED',
          effectiveTo: now,
        },
      });
    }
    await tx.companyMasterArtifact.update({
      where: { id: row.id },
      data: {
        approvalStatus: 'APPROVED',
        verificationStatus: 'VERIFIED',
        lifecycleStatus: 'ACTIVE',
        isCurrent: true,
        approvedBy: actor || scope.username || 'role:company-master-approver',
        approvedAt: now,
        verifiedBy: actor || scope.username || 'role:company-master-verifier',
        verifiedAt: now,
        effectiveFrom: row.effectiveFrom || now,
        effectiveTo: null,
        supersedesArtifactId: currents[0]?.id || row.supersedesArtifactId,
      },
    });
  });

  const updated = await prisma.companyMasterArtifact.findUnique({ where: { id: row.id } });
  return { ok: true, artifact: toArtifactMetadataPublic(updated) };
}

/**
 * Resolve current artifact by company_id + logical alias (fail closed).
 */
export async function resolveCurrentArtifact(
  companyId,
  logicalAlias,
  deps = {},
  scope = { admin: true },
  caller = {},
) {
  const prisma = prismaOf(deps);
  const cid = String(companyId || '').trim();
  const alias = String(logicalAlias || '').trim();
  if (!cid || !alias) {
    return { ok: false, code: 'COMPANY_AND_ALIAS_REQUIRED', status: 400 };
  }

  const company = await prisma.companyMasterCompany.findUnique({ where: { companyId: cid } });
  const access = assertCompanyAccess(company, scope);
  if (!access.ok) return access;

  const rows = await prisma.companyMasterArtifact.findMany({
    where: { companyId: cid, logicalAlias: alias },
    orderBy: { versionNumber: 'desc' },
  });

  const at = caller.at instanceof Date ? caller.at : new Date();
  const candidates = rows
    .map(artifactRowToResolverAsset)
    .filter((a) => isAssetCurrentlyResolvable(a, at));

  if (candidates.length === 0) {
    const pending = rows.find((r) =>
      ['UPLOADED', 'DRAFT', 'UNDER_REVIEW'].includes(r.lifecycleStatus),
    );
    if (pending) {
      return {
        ok: false,
        code: 'ASSET_NOT_APPROVED',
        status: 404,
        message: `candidate ${pending.id} is ${pending.lifecycleStatus}`,
      };
    }
    return { ok: false, code: 'ASSET_NOT_RESOLVABLE', status: 404 };
  }

  const best = candidates.sort((a, b) => b.version_number - a.version_number)[0];
  const restricted =
    ['CONFIDENTIAL', 'HIGHLY_RESTRICTED'].includes(best.sensitivity_classification) ||
    best.publication_status === 'RESTRICTED';
  if (restricted && caller.authorised_for_restricted !== true) {
    return { ok: false, code: 'RESTRICTED_ASSET_DENIED', status: 403 };
  }

  const row = rows.find((r) => r.id === best.asset_id);
  return {
    ok: true,
    asset: {
      ...toResolvedAssetContract(cid, best),
      title: row?.title || best.title || null,
      original_filename: row?.originalFilename || null,
      is_current: row?.isCurrent === true,
      uploaded_at:
        row?.uploadedAt instanceof Date ? row.uploadedAt.toISOString() : row?.uploadedAt || null,
      retrieval_reference: row?.retrievalReference || null,
      human_state: 'Current',
      storage_provider: CM_STORAGE_PROVIDER,
      storage_adapter: CM_STORAGE_ADAPTER_ID,
    },
  };
}

/**
 * Historical get by artifact id (company-scoped).
 */
export async function getArtifactMeta(artifactId, deps = {}, scope = { admin: true }, caller = {}) {
  const prisma = prismaOf(deps);
  const row = await prisma.companyMasterArtifact.findUnique({
    where: { id: String(artifactId || '').trim() },
  });
  if (!row) return { ok: false, code: 'ARTIFACT_NOT_FOUND', status: 404 };
  const company = await prisma.companyMasterCompany.findUnique({
    where: { companyId: row.companyId },
  });
  const access = assertCompanyAccess(company, scope);
  if (!access.ok) return access;

  const restricted =
    ['CONFIDENTIAL', 'HIGHLY_RESTRICTED'].includes(row.sensitivityClassification) ||
    row.publicationStatus === 'RESTRICTED';
  if (restricted && caller.authorised_for_restricted !== true && scope.admin !== true) {
    return { ok: false, code: 'RESTRICTED_ASSET_DENIED', status: 403 };
  }

  return { ok: true, artifact: toArtifactMetadataPublic(row) };
}

/**
 * Remove a pending (unapproved) upload — deletes binary + metadata.
 * Fails for approved / current / superseded protected history.
 */
export async function removePendingArtifact(artifactId, deps = {}, scope = { admin: true }) {
  const prisma = prismaOf(deps);
  const id = String(artifactId || '').trim();
  const row = await prisma.companyMasterArtifact.findUnique({ where: { id } });
  if (!row) return { ok: false, code: 'ARTIFACT_NOT_FOUND', status: 404 };

  const company = await prisma.companyMasterCompany.findUnique({
    where: { companyId: row.companyId },
  });
  const access = assertCompanyAccess(company, scope);
  if (!access.ok) return access;

  const pub = toArtifactMetadataPublic(row);
  if (!isPendingArtifact(pub)) {
    return {
      ok: false,
      code: 'ARTIFACT_NOT_PENDING',
      status: 409,
      message: 'Only pending uploads can be removed. Use withdraw/archive for approved artifacts.',
    };
  }
  if (row.isCurrent === true || row.approvalStatus === 'APPROVED') {
    return { ok: false, code: 'ARTIFACT_PROTECTED', status: 409 };
  }

  await prisma.companyMasterArtifact.delete({ where: { id } });
  return { ok: true, deleted_artifact_id: id, company_id: row.companyId };
}

/**
 * Withdraw an approved/current artifact (history retained, no longer current).
 */
export async function withdrawArtifact(artifactId, deps = {}, scope = { admin: true }, actor = null) {
  const prisma = prismaOf(deps);
  const id = String(artifactId || '').trim();
  const row = await prisma.companyMasterArtifact.findUnique({ where: { id } });
  if (!row) return { ok: false, code: 'ARTIFACT_NOT_FOUND', status: 404 };

  const company = await prisma.companyMasterCompany.findUnique({
    where: { companyId: row.companyId },
  });
  const access = assertCompanyAccess(company, scope);
  if (!access.ok) return access;

  if (isPendingArtifact(toArtifactMetadataPublic(row))) {
    return { ok: false, code: 'USE_REMOVE_PENDING', status: 409 };
  }

  const now = new Date();
  const updated = await prisma.companyMasterArtifact.update({
    where: { id },
    data: {
      lifecycleStatus: 'WITHDRAWN',
      isCurrent: false,
      approvalStatus: row.approvalStatus === 'APPROVED' ? 'WITHDRAWN' : row.approvalStatus,
      effectiveTo: row.effectiveTo || now,
    },
  });
  return { ok: true, artifact: toArtifactMetadataPublic(updated), actor: actor || scope.username };
}

/**
 * Archive a superseded or withdrawn artifact (history retained).
 */
export async function archiveArtifact(artifactId, deps = {}, scope = { admin: true }, actor = null) {
  const prisma = prismaOf(deps);
  const id = String(artifactId || '').trim();
  const row = await prisma.companyMasterArtifact.findUnique({ where: { id } });
  if (!row) return { ok: false, code: 'ARTIFACT_NOT_FOUND', status: 404 };

  const company = await prisma.companyMasterCompany.findUnique({
    where: { companyId: row.companyId },
  });
  const access = assertCompanyAccess(company, scope);
  if (!access.ok) return access;

  if (isPendingArtifact(toArtifactMetadataPublic(row))) {
    return { ok: false, code: 'USE_REMOVE_PENDING', status: 409 };
  }

  const now = new Date();
  const updated = await prisma.companyMasterArtifact.update({
    where: { id },
    data: {
      lifecycleStatus: 'ARCHIVED',
      isCurrent: false,
      effectiveTo: row.effectiveTo || now,
    },
  });
  return { ok: true, artifact: toArtifactMetadataPublic(updated), actor: actor || scope.username };
}

/**
 * Ordinary hard-delete is not allowed for approved artifacts.
 */
export async function hardDeleteArtifact(artifactId, deps = {}, scope = { admin: true }) {
  const prisma = prismaOf(deps);
  const id = String(artifactId || '').trim();
  const row = await prisma.companyMasterArtifact.findUnique({ where: { id } });
  if (!row) return { ok: false, code: 'ARTIFACT_NOT_FOUND', status: 404 };
  const company = await prisma.companyMasterCompany.findUnique({
    where: { companyId: row.companyId },
  });
  const access = assertCompanyAccess(company, scope);
  if (!access.ok) return access;

  if (!isPendingArtifact(toArtifactMetadataPublic(row))) {
    return {
      ok: false,
      code: 'HARD_DELETE_FORBIDDEN',
      status: 403,
      message: 'Approved or historical artifacts cannot be hard-deleted through ordinary actions.',
    };
  }
  return removePendingArtifact(id, deps, scope);
}

/**
 * Delete synthetic companies (and cascaded artifacts).
 */
export async function cleanupSyntheticCompanies(deps = {}, opts = {}) {
  const prisma = prismaOf(deps);
  const prefix = String(opts.companyIdPrefix || 'cmp_synthetic_');
  const where = opts.companyId
    ? { companyId: String(opts.companyId), isSynthetic: true }
    : { isSynthetic: true, companyId: { startsWith: prefix } };

  const found = await prisma.companyMasterCompany.findMany({
    where,
    select: { companyId: true },
  });
  if (!found.length) return { ok: true, deleted_companies: [], deleted_count: 0 };

  const ids = found.map((f) => f.companyId);
  await prisma.companyMasterCompany.deleteMany({ where: { companyId: { in: ids } } });
  return { ok: true, deleted_companies: ids, deleted_count: ids.length };
}

export { CM_LOGICAL_ALIASES, CM_ARTIFACT_TYPES, CM_STORAGE_ADAPTER_ID, CM_STORAGE_PROVIDER };
