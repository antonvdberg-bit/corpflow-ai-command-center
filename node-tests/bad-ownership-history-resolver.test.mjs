/**
 * Static guards for the #1517 Prisma history-registration workflow.
 * No live database, no Infisical values, no production mutation.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  EXPECTED_MIGRATION_CHECKSUM,
  TARGET_MIGRATION,
  WORKFLOW_RELATIVE_PATH,
  classifyConnectionUrl,
  hashMigrationSql,
  inspectResolverWorkflow,
  readApprovedMigrationChecksum,
  redactSecrets,
  selectNonPooledConnection,
} from '../scripts/bad-ownership-history-resolver-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRECT =
  'postgresql://neondb_owner:secret@ep-example.c-6.us-east-1.aws.neon.tech:5432/neondb?sslmode=require';
const POOLED =
  'postgresql://neondb_owner:secret@ep-example-pooler.c-6.us-east-1.aws.neon.tech:5432/neondb?sslmode=require';

describe('BAD ownership Prisma history resolver', () => {
  it('fails closed when Infisical has no non-pooled URL, even if pooled POSTGRES_URL exists', () => {
    const selected = selectNonPooledConnection({ POSTGRES_URL: POOLED });
    assert.equal(selected.ok, false);
    assert.equal(selected.reason, 'missing_non_pooled_url');
    assert.equal(selected.url, null);
    assert.equal(selected.pooled_postgres_url_present, true);
  });

  it('rejects a pooler endpoint and does not treat it as DIRECT_URL', () => {
    const pooledShape = classifyConnectionUrl(POOLED);
    assert.equal(pooledShape.ok, false);
    assert.equal(pooledShape.reason, 'pooled_endpoint');
    const selected = selectNonPooledConnection({ DIRECT_URL: POOLED });
    assert.equal(selected.ok, false);
    assert.match(selected.reason, /pooled_endpoint/);
  });

  it('accepts matching non-pooled aliases and rejects disagreement or prisma.io hosts', () => {
    const ready = selectNonPooledConnection({
      DIRECT_URL: DIRECT,
      POSTGRES_URL_NON_POOLING: DIRECT,
    });
    assert.equal(ready.ok, true);
    assert.deepEqual(ready.source_keys, ['DIRECT_URL', 'POSTGRES_URL_NON_POOLING']);

    const disagree = selectNonPooledConnection({
      DIRECT_URL: DIRECT,
      POSTGRES_URL_NON_POOLING:
        'postgresql://neondb_owner:secret@ep-other.c-6.us-east-1.aws.neon.tech:5432/neondb?sslmode=require',
    });
    assert.equal(disagree.ok, false);
    assert.equal(disagree.reason, 'non_pooled_aliases_disagree');

    const prismaHost = classifyConnectionUrl(
      'postgresql://user:secret@db.prisma.io:5432/neondb',
    );
    assert.equal(prismaHost.ok, false);
    assert.equal(prismaHost.reason, 'prisma_postgres_host');
  });

  it('pins the workflow to manual dispatch, existing Infisical OIDC, and the approved checksum', () => {
    const yaml = readFileSync(path.join(ROOT, WORKFLOW_RELATIVE_PATH), 'utf8');
    const inspection = inspectResolverWorkflow(yaml);
    assert.equal(inspection.ok, true, inspection.failures.join(','));
    assert.match(yaml, /workflow_dispatch:/);
    assert.doesNotMatch(yaml, /^\s+push:/m);
    assert.doesNotMatch(yaml, /^\s+pull_request:/m);
    assert.doesNotMatch(yaml, /^\s+schedule:/m);
    assert.doesNotMatch(yaml, /prisma migrate deploy/);
    assert.doesNotMatch(yaml, /deriveNonPoolingUrlFromNeonPooler/);
    assert.match(yaml, new RegExp(TARGET_MIGRATION));

    const checksum = readApprovedMigrationChecksum(ROOT);
    assert.equal(checksum.ok, true);
    assert.equal(checksum.checksum, EXPECTED_MIGRATION_CHECKSUM);
    assert.equal(
      hashMigrationSql(
        readFileSync(
          path.join(ROOT, 'prisma/migrations/20261021140000_bad_purchase_ownership/migration.sql'),
          'utf8',
        ),
      ),
      EXPECTED_MIGRATION_CHECKSUM,
    );
    assert.equal(
      redactSecrets(`connected with ${DIRECT}`).includes('secret'),
      false,
    );
  });
});
