/**
 * Company Master artifact storage adapter.
 *
 * Selected store: existing Postgres BYTEA (same approved store class as
 * `cmp_ticket_attachments`), in dedicated `company_master_artifacts.data`.
 *
 * Why: no Vercel Blob / S3 / R2 / Drive upload SDK exists in this repository.
 * Inventing new storage env vars or a paid product is forbidden. This reuses
 * the only working binary write path already used by the app.
 *
 * @module company-master-storage
 */

import { createHash, randomBytes } from 'node:crypto';

import { CM_STORAGE_ADAPTER_ID, CM_STORAGE_PROVIDER, humanArtifactState } from './company-master-constants.js';

export { CM_STORAGE_ADAPTER_ID };

/**
 * @param {Buffer} buf
 * @returns {string}
 */
export function hashContentSha256(buf) {
  return `sha256:${createHash('sha256').update(buf).digest('hex')}`;
}

/**
 * Allocate a stable storage object id (not a provider URL).
 * @param {{ companyId: string, logicalAlias: string, versionNumber: number }} args
 */
export function allocateStorageObjectId(args) {
  const suffix = randomBytes(6).toString('hex');
  const aliasSafe = String(args.logicalAlias || 'asset').replace(/[^a-z0-9._-]+/gi, '-');
  return `cmobj_${args.companyId}_${aliasSafe}_v${args.versionNumber}_${suffix}`;
}

/**
 * Controlled retrieval reference (auth-gated API path — never a public CDN URL).
 * @param {string} artifactId
 */
export function buildRetrievalReference(artifactId) {
  return `/api/company-master/artifacts/download?id=${encodeURIComponent(artifactId)}`;
}

/**
 * Persist binary via Prisma into company_master_artifacts.
 * Caller supplies the full metadata row; this adapter owns content_hash /
 * storage_object_id / retrieval_reference / data assignment when missing.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{
 *   meta: Record<string, unknown>,
 *   bytes: Buffer,
 * }} args
 */
export async function writeCompanyMasterArtifactBytes(prisma, args) {
  const bytes = args.bytes;
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    throw new Error('EMPTY_BYTES');
  }
  const meta = { ...(args.meta || {}) };
  const contentHash = meta.contentHash || hashContentSha256(bytes);
  const versionNumber = Number(meta.versionNumber) || 1;
  const storageObjectId =
    meta.storageObjectId ||
    allocateStorageObjectId({
      companyId: String(meta.companyId),
      logicalAlias: String(meta.logicalAlias),
      versionNumber,
    });

  // Create without retrieval_reference first if id unknown — Prisma generates id.
  const created = await prisma.companyMasterArtifact.create({
    data: {
      companyId: String(meta.companyId),
      tenantId: meta.tenantId != null ? String(meta.tenantId) : null,
      logicalAlias: String(meta.logicalAlias),
      artifactType: String(meta.artifactType),
      title: String(meta.title || meta.originalFilename || 'artifact'),
      originalFilename: String(meta.originalFilename || 'upload.bin'),
      mimeType: String(meta.mimeType || 'application/octet-stream'),
      byteSize: bytes.length,
      contentHash,
      storageProvider: String(meta.storageProvider || CM_STORAGE_PROVIDER),
      storageObjectId,
      // Temporary placeholder; updated immediately with real id-based path.
      retrievalReference: 'pending',
      sensitivityClassification: String(meta.sensitivityClassification),
      publicationStatus: String(meta.publicationStatus),
      verificationStatus: String(meta.verificationStatus || 'RECEIVED_NOT_VERIFIED'),
      approvalStatus: String(meta.approvalStatus || 'NOT_REQUESTED'),
      lifecycleStatus: String(meta.lifecycleStatus || 'UPLOADED'),
      versionNumber,
      supersedesArtifactId: meta.supersedesArtifactId != null ? String(meta.supersedesArtifactId) : null,
      isCurrent: meta.isCurrent === true,
      effectiveFrom: meta.effectiveFrom instanceof Date ? meta.effectiveFrom : new Date(),
      effectiveTo: meta.effectiveTo instanceof Date ? meta.effectiveTo : null,
      expiryDate: meta.expiryDate instanceof Date ? meta.expiryDate : null,
      uploadedBy: meta.uploadedBy != null ? String(meta.uploadedBy) : null,
      uploadedAt: meta.uploadedAt instanceof Date ? meta.uploadedAt : new Date(),
      recordOwner: String(meta.recordOwner || 'role:company-master-operator'),
      data: bytes,
    },
  });

  const retrievalReference = buildRetrievalReference(created.id);
  const updated = await prisma.companyMasterArtifact.update({
    where: { id: created.id },
    data: { retrievalReference },
  });

  return {
    adapter_id: CM_STORAGE_ADAPTER_ID,
    artifact: updated,
  };
}

/**
 * Read artifact bytes by id (company-scoped caller must already authorize).
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} artifactId
 */
export async function readCompanyMasterArtifactBytes(prisma, artifactId) {
  const row = await prisma.companyMasterArtifact.findUnique({
    where: { id: artifactId },
  });
  if (!row) return { ok: false, code: 'NOT_FOUND' };
  return {
    ok: true,
    adapter_id: CM_STORAGE_ADAPTER_ID,
    artifact: row,
    bytes: Buffer.from(row.data),
  };
}

/**
 * Public metadata projection — never includes binary or provider URLs as durable contract.
 * @param {Record<string, unknown>} row
 */
export function toArtifactMetadataPublic(row) {
  if (!row) return null;
  const base = {
    id: row.id,
    company_id: row.companyId,
    tenant_id: row.tenantId ?? null,
    logical_alias: row.logicalAlias,
    artifact_type: row.artifactType,
    title: row.title,
    original_filename: row.originalFilename,
    mime_type: row.mimeType,
    byte_size: row.byteSize,
    content_hash: row.contentHash,
    // Vocabulary class (MANAGED_OBJECT_STORAGE) — not a provider URL.
    storage_provider: row.storageProvider || CM_STORAGE_PROVIDER,
    // Concrete adapter implementing that class.
    storage_adapter: CM_STORAGE_ADAPTER_ID,
    storage_object_id: row.storageObjectId,
    retrieval_reference: row.retrievalReference,
    sensitivity_classification: row.sensitivityClassification,
    publication_status: row.publicationStatus,
    verification_status: row.verificationStatus,
    approval_status: row.approvalStatus,
    lifecycle_status: row.lifecycleStatus,
    version_number: row.versionNumber,
    supersedes_artifact_id: row.supersedesArtifactId ?? null,
    is_current: row.isCurrent === true,
    effective_from: row.effectiveFrom instanceof Date ? row.effectiveFrom.toISOString() : row.effectiveFrom,
    effective_to:
      row.effectiveTo instanceof Date
        ? row.effectiveTo.toISOString()
        : row.effectiveTo ?? null,
    uploaded_by: row.uploadedBy ?? null,
    uploaded_at: row.uploadedAt instanceof Date ? row.uploadedAt.toISOString() : row.uploadedAt,
    verified_by: row.verifiedBy ?? null,
    verified_at: row.verifiedAt instanceof Date ? row.verifiedAt.toISOString() : row.verifiedAt,
    approved_by: row.approvedBy ?? null,
    approved_at: row.approvedAt instanceof Date ? row.approvedAt.toISOString() : row.approvedAt,
    durable_contract_is_provider_url: false,
  };
  base.human_state = humanArtifactState(base);
  return base;
}
