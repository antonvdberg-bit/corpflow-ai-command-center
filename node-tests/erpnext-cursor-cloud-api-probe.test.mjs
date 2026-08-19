/**
 * Least-privilege / fail-closed checks for scripts/erpnext/cursor-cloud-api-probe.sh (#899).
 * Does not call live ERPNext. Never prints secret values.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PROBE = path.join(REPO_ROOT, 'scripts', 'erpnext', 'cursor-cloud-api-probe.sh');

const GIT_BASH_CANDIDATES = [
  process.env.CORPFLOW_GIT_BASH,
  'C:\\Program Files\\Git\\bin\\bash.exe',
  'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
  'bash',
].filter(Boolean);

function resolveBash() {
  for (const candidate of GIT_BASH_CANDIDATES) {
    if (candidate === 'bash') return candidate;
    if (fs.existsSync(candidate)) return candidate;
  }
  return 'bash';
}

function runProbe(envExtra = {}) {
  const env = { ...process.env, ...envExtra };
  for (const k of ['ERPNEXT_BASE_URL', 'ERPNEXT_API_KEY', 'ERPNEXT_API_SECRET']) {
    if (!(k in envExtra)) delete env[k];
  }
  // Avoid WindowsApps bash shim hanging / WSL prompt.
  delete env.WSL_DISTRO_NAME;
  return spawnSync(resolveBash(), [PROBE.replace(/\\/g, '/')], {
    cwd: REPO_ROOT,
    env,
    encoding: 'utf8',
    timeout: 20000,
  });
}

test('probe script exists and forbids MASTER_ADMIN_KEY / SSH / Infisical runtime deps', () => {
  const src = fs.readFileSync(PROBE, 'utf8');
  assert.match(src, /ERPNEXT_BASE_URL/);
  assert.match(src, /ERPNEXT_API_KEY/);
  assert.match(src, /ERPNEXT_API_SECRET/);
  assert.match(src, /Do NOT require MASTER_ADMIN_KEY/);
  assert.match(src, /Customer Group/);
  assert.match(src, /Territory/);
  assert.match(src, /auth_fallback_master_admin_key: forbidden/);
  assert.match(src, /runtime_bridge_ssh: no/);
  assert.match(src, /runtime_bridge_infisical: no/);
  assert.doesNotMatch(src, /\binfisical\s+(run|export|get)\b/i);
  assert.doesNotMatch(src, /\bssh\s+-[A-Za-z]/);
  assert.match(src, /Authorization: token \$\{ERPNEXT_API_KEY\}:\$\{ERPNEXT_API_SECRET\}/);
  assert.doesNotMatch(src, /Authorization:.*MASTER_ADMIN_KEY/);
});

test('missing ERPNext secrets fail closed even when MASTER_ADMIN_KEY is present (regression E)', () => {
  const result = runProbe({
    MASTER_ADMIN_KEY: 'should-never-be-used-as-erpnext-auth',
    ADMIN_PIN: 'also-not-an-erpnext-fallback',
  });
  assert.equal(
    result.status,
    1,
    `expected exit 1, got ${result.status}; error=${result.error}; stdout=${result.stdout}; stderr=${result.stderr}`,
  );
  const out = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.match(out, /ERPNext access: FAIL/);
  assert.match(out, /missing injected secrets/);
  assert.match(out, /ERPNEXT_BASE_URL/);
  assert.match(out, /ERPNEXT_API_KEY/);
  assert.match(out, /ERPNEXT_API_SECRET/);
  assert.match(out, /auth_fallback_master_admin_key: forbidden/);
  assert.match(out, /Do not use MASTER_ADMIN_KEY as a substitute/);
  assert.doesNotMatch(out, /should-never-be-used-as-erpnext-auth/);
  assert.doesNotMatch(out, /also-not-an-erpnext-fallback/);
  assert.match(out, /MASTER_ADMIN_KEY: present/);
  assert.match(out, /#880_#881_can_proceed: NO/);
});

test('partial ERPNext secret set fails closed without MASTER_ADMIN_KEY fallback', () => {
  const result = runProbe({
    ERPNEXT_BASE_URL: 'https://example.invalid',
    ERPNEXT_API_KEY: 'key-only',
    MASTER_ADMIN_KEY: 'still-forbidden',
  });
  assert.equal(
    result.status,
    1,
    `expected exit 1, got ${result.status}; error=${result.error}; stdout=${result.stdout}; stderr=${result.stderr}`,
  );
  const out = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.match(out, /missing injected secrets: ERPNEXT_API_SECRET/);
  assert.doesNotMatch(out, /still-forbidden/);
  assert.match(out, /auth_fallback_master_admin_key: forbidden/);
});

test('#899 2026-08-19 evidence records Factory Automation re-probe as INCOMPLETE', () => {
  const evidence = fs.readFileSync(
    path.join(REPO_ROOT, 'docs', 'erpnext', 'ERPNEXT_CURSOR_CLOUD_SECURITY_CORRECTION_899.md'),
    'utf8',
  );
  const artifact = fs.readFileSync(
    path.join(REPO_ROOT, 'artifacts', 'erpnext', 'security-correction-899-2026-08-19.md'),
    'utf8',
  );
  const runbook = fs.readFileSync(
    path.join(REPO_ROOT, 'docs', 'runbooks', 'ERPNEXT_CURSOR_CLOUD_SECRETS_LEAST_PRIVILEGE_V1.md'),
    'utf8',
  );
  assert.match(evidence, /bc-c67a9751-28cb-47e6-918a-29a13c213561/);
  assert.match(evidence, /security_correction_#899: INCOMPLETE — MASTER_ADMIN_KEY still injected into this ordinary Factory Automation Cursor Cloud run/);
  assert.match(evidence, /authenticated user: integrations@corpflowai.com/);
  assert.match(artifact, /MASTER_ADMIN_KEY: present/);
  assert.match(artifact, /security_correction_#899: INCOMPLETE/);
  assert.match(runbook, /CorpFlowAI Factory Wake Proof v2/);
  assert.match(runbook, /still PRESENT on ordinary Factory Automation wakes/);
});
