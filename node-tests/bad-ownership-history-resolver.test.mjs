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
  evaluateExecutionGuard,
  evaluatePostflight,
  evaluatePreflight,
  hashMigrationSql,
  inspectResolverWorkflow,
  publicConnectionReport,
  readApprovedMigrationChecksum,
  redactSecrets,
  selectNonPooledConnection,
  summarizeHistoryRows,
} from '../scripts/bad-ownership-history-resolver-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRECT =
  'postgresql://neondb_owner:secret@ep-example.c-6.us-east-1.aws.neon.tech:5432/neondb?sslmode=require';
const POOLED =
  'postgresql://neondb_owner:secret@ep-example-pooler.c-6.us-east-1.aws.neon.tech:5432/neondb?sslmode=require';

function validEvidence(overrides = {}) {
  const identity = {
    database: 'neondb',
    role: 'neondb_owner',
    in_recovery: false,
    ...overrides.identity,
  };
  const schema = {
    tables: [
      'bad_purchase_ownership',
      'bad_purchase_unbound_reversals',
      'bad_purchase_webhook_events',
    ],
    indexes: [
      'bad_purchase_ownership_checkout_intent_id_key',
      'bad_purchase_ownership_order_confirmation_ref_key',
      'bad_purchase_ownership_paddle_transaction_id_key',
      'bad_purchase_unbound_reversals_paddle_transaction_id_key',
      'bad_purchase_webhook_events_event_id_key',
    ],
    fk: {
      name: 'bad_purchase_ownership_auth_user_id_fkey',
      table_name: 'bad_purchase_ownership',
      column_name: 'auth_user_id',
      referenced_table: 'auth_users',
      referenced_column: 'id',
      on_update: 'c',
      on_delete: 'r',
    },
    trigger: {
      name: 'bad_purchase_ownership_terminal_guard',
      tgenabled: 'O',
      table_name: 'bad_purchase_ownership',
      function_name: 'bad_purchase_ownership_keep_terminal',
    },
    ...overrides.schema,
  };
  return {
    identity,
    schema,
    target: overrides.target || summarizeHistoryRows([]),
    luxe:
      overrides.luxe ||
      summarizeHistoryRows([{ finished_at: null, rolled_back_at: null, applied_steps_count: 0 }]),
  };
}

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

  it('does not put username, hostname, URL, or fingerprint in logged connection diagnostics', () => {
    const selected = selectNonPooledConnection({ DIRECT_URL: DIRECT });
    const report = JSON.stringify(publicConnectionReport(selected));
    const classified = JSON.stringify(classifyConnectionUrl(DIRECT));
    for (const leak of ['ep-example', 'neondb_owner', 'secret', 'fingerprint', DIRECT]) {
      assert.equal(report.includes(leak), false, leak);
      assert.equal(classified.includes(leak), false, leak);
    }
    assert.equal(publicConnectionReport(selected).classified.DIRECT_URL.database_matches_expected, true);
    assert.equal(publicConnectionReport(selected).classified.DIRECT_URL.has_pooler, false);
  });

  it('rejects execute without main ref, confirmation, or a recognised mode before any database use', () => {
    assert.equal(evaluateExecutionGuard({ mode: 'dry_run' }).ok, true);
    assert.deepEqual(evaluateExecutionGuard({ mode: 'explode' }).failures, ['invalid_mode']);
    assert.ok(
      evaluateExecutionGuard({
        mode: 'execute',
        confirm: TARGET_MIGRATION,
      }).failures.includes('missing_github_ref'),
    );
    assert.ok(
      evaluateExecutionGuard({
        mode: 'execute',
        confirm: TARGET_MIGRATION,
        githubRef: 'refs/heads/cursor/issue-1517-history-resolver-802e',
        githubRepository: 'antonvdberg-bit/corpflow-ai-command-center',
      }).failures.includes('ref_not_main'),
    );
    assert.ok(
      evaluateExecutionGuard({
        mode: 'execute',
        confirm: 'some_other_migration',
        githubRef: 'refs/heads/main',
        githubRepository: 'antonvdberg-bit/corpflow-ai-command-center',
      }).failures.includes('confirm_mismatch'),
    );
    assert.equal(
      evaluateExecutionGuard({
        mode: 'execute',
        confirm: TARGET_MIGRATION,
        githubRef: 'refs/heads/main',
        githubRepository: 'antonvdberg-bit/corpflow-ai-command-center',
      }).ok,
      true,
    );
  });

  it('fails preflight when FK target/actions or the terminal trigger are wrong', () => {
    assert.equal(evaluatePreflight(validEvidence()).ok, true);

    const wrongTable = evaluatePreflight(
      validEvidence({
        schema: {
          ...validEvidence().schema,
          fk: {
            ...validEvidence().schema.fk,
            referenced_table: 'tenants',
          },
        },
      }),
    );
    assert.equal(wrongTable.ok, false);
    assert.ok(wrongTable.failures.includes('fk_referenced_table_mismatch'));

    const disabled = evaluatePreflight(
      validEvidence({
        schema: {
          ...validEvidence().schema,
          trigger: {
            ...validEvidence().schema.trigger,
            tgenabled: 'D',
          },
        },
      }),
    );
    assert.equal(disabled.ok, false);
    assert.ok(disabled.failures.includes('trigger_not_enabled'));

    const replica = evaluatePreflight(validEvidence({ identity: { in_recovery: true } }));
    assert.ok(replica.failures.includes('replica_not_primary'));
  });

  it('fails closed on ambiguous history rows and on a changed Luxe fingerprint after resolve', () => {
    const ambiguous = evaluatePreflight(
      validEvidence({
        target: summarizeHistoryRows([
          { finished_at: null, rolled_back_at: null },
          { finished_at: new Date(), rolled_back_at: null },
        ]),
      }),
    );
    assert.equal(ambiguous.ok, false);
    assert.ok(ambiguous.failures.includes('target_history_ambiguous'));

    const pre = evaluatePreflight(validEvidence());
    const postOk = evaluatePreflight(
      validEvidence({
        target: summarizeHistoryRows([
          { finished_at: new Date('2026-10-26T08:00:00Z'), rolled_back_at: null, applied_steps_count: 1 },
        ]),
      }),
    );
    assert.equal(evaluatePostflight(pre, postOk).ok, true);

    const postChangedLuxe = evaluatePreflight(
      validEvidence({
        target: summarizeHistoryRows([
          { finished_at: new Date('2026-10-26T08:00:00Z'), rolled_back_at: null, applied_steps_count: 1 },
        ]),
        luxe: summarizeHistoryRows([
          { finished_at: new Date('2026-10-26T08:00:00Z'), rolled_back_at: null, applied_steps_count: 1 },
        ]),
      }),
    );
    const luxeChanged = evaluatePostflight(pre, postChangedLuxe);
    assert.equal(luxeChanged.ok, false);
    assert.ok(luxeChanged.failures.includes('luxe_history_changed'));
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
    assert.match(yaml, /github\.ref == 'refs\/heads\/main'/);
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
    assert.equal(redactSecrets(`connected with ${DIRECT}`).includes('secret'), false);
  });
});
