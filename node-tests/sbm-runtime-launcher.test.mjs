import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ingestCli = readFileSync(path.join(repoRoot, 'scripts/finance/sbm-statement-ingest.mjs'), 'utf8');
const secretCheck = readFileSync(path.join(repoRoot, 'scripts/finance/verify-sbm-runtime-secrets.mjs'), 'utf8');
const launcher = readFileSync(path.join(repoRoot, 'scripts/finance/run-sbm-statement-ingest-with-infisical.sh'), 'utf8');

test('SBM CLI emits redacted processing receipts and can bound supervised acceptance to one statement', () => {
  assert.match(ingestCli, /--max-statements/);
  assert.match(ingestCli, /selectedAttachments = maxStatementsArg/);
  assert.match(ingestCli, /extracted_transaction_count/);
  assert.match(ingestCli, /validated_transaction_count/);
  assert.match(ingestCli, /preview_count/);
  assert.doesNotMatch(ingestCli, /JSON\.stringify\(\{\s*query:\s*SBM_GMAIL_QUERY,\s*results/);
  assert.doesNotMatch(ingestCli, /JSON\.stringify\(\{\s*query:\s*SBM_GMAIL_QUERY,\s*lookbackDays,\s*attachments/);
});

test('runtime secret availability check never serializes a secret value', () => {
  assert.match(secretCheck, /SBM_STATEMENT_PASSWORD: status\(process\.env\.SBM_STATEMENT_PASSWORD\)/);
  assert.match(secretCheck, /SBM_GMAIL_ACCESS_TOKEN: status\(process\.env\.SBM_GMAIL_ACCESS_TOKEN\)/);
  assert.doesNotMatch(secretCheck, /console\.log\(process\.env/);
});

test('systemd launcher uses protected credentials and does not place client secret or token in arguments', () => {
  assert.match(launcher, /CREDENTIALS_DIRECTORY/);
  assert.match(launcher, /infisical-client-secret/);
  assert.ok(launcher.includes('export INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET="$(<"${credential_path}")"'));
  assert.match(launcher, /login --method=universal-auth --plain --silent/);
  assert.ok(launcher.includes('run --projectId="${INFISICAL_PROJECT_ID}" --env="${INFISICAL_ENVIRONMENT}"'));
  assert.match(launcher, /--verify-secrets\|--accept-one\|--process-batch/);
  assert.doesNotMatch(launcher, /--client-secret=/);
  assert.doesNotMatch(launcher, /--token=/);
});
