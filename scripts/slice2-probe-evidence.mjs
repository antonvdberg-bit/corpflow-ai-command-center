/**
 * Probe Slice 2 local auth server and write runtime evidence JSON.
 */
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.SLICE2_AUTH_PORT || 4790);
const base = `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.resolve('artifacts/slice2-screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function getJson(urlPath) {
  const res = await fetch(base + urlPath);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function getStatus(urlPath) {
  const res = await fetch(base + urlPath);
  return res.status;
}

const evidence = {
  captured_at: new Date().toISOString(),
  issue: 877,
  parent_issue: 773,
  prerequisite_pr: 875,
  branch: 'cursor/dispatcher-issue-877-3578',
  auth_base: base,
  http: {
    '/app': await getStatus('/app'),
    '/app/core': await getStatus('/app/core'),
    '/app/tenant': await getStatus('/app/tenant'),
    '/app/core?proof=1': await getStatus('/app/core?proof=1'),
    '/app/tenant?proof=1': await getStatus('/app/tenant?proof=1'),
  },
};

const coreShell = await getJson('/api/app/shell?env=core');
const tenantShell = await getJson('/api/app/shell?env=tenant&tenant_id=corpflowai');
const coreList = await getJson('/api/app/requests?env=core&view=global');
const tenantList = await getJson('/api/app/requests?env=tenant&tenant_id=corpflowai');
const proofCore = await getJson('/api/app/shell?proof=1&env=core');

evidence.core_shell = {
  status: coreShell.status,
  ok: coreShell.body.ok === true,
  auth_mode: coreShell.body.auth_mode,
  proof_mode: coreShell.body.proof_mode,
  environment: coreShell.body.environment,
  data_source: coreShell.body.data_source,
  actor: coreShell.body.actor,
};
evidence.tenant_shell = {
  status: tenantShell.status,
  ok: tenantShell.body.ok === true,
  auth_mode: tenantShell.body.auth_mode,
  proof_mode: tenantShell.body.proof_mode,
  environment: tenantShell.body.environment,
  data_source: tenantShell.body.data_source,
  selected: tenantShell.body.selected,
  actor: tenantShell.body.actor,
};
evidence.core_request_count = Array.isArray(coreList.body.requests)
  ? coreList.body.requests.length
  : 0;
evidence.tenant_request_count = Array.isArray(tenantList.body.requests)
  ? tenantList.body.requests.length
  : 0;
evidence.tenant_list_keys = Array.isArray(tenantList.body.requests) && tenantList.body.requests[0]
  ? Object.keys(tenantList.body.requests[0]).sort()
  : [];
const tenantBlob = JSON.stringify(tenantList.body.requests || []);
evidence.tenant_forbidden_fields_absent = [
  'github',
  'commit_sha',
  'internal_note',
  'internal_blocker',
  'technical_lead',
].filter((k) => !tenantBlob.includes(`"${k}"`));
evidence.proof_still_works = proofCore.body.proof_mode === true;
evidence.separate_auth_preserved =
  evidence.core_shell.actor?.can_core === true &&
  evidence.tenant_shell.actor?.can_core === false &&
  Array.isArray(evidence.core_shell.actor?.can_tenant_ids) &&
  evidence.core_shell.actor.can_tenant_ids.length === 0;
evidence.notes = [
  'Session paths probed without ?proof=1',
  'Local server injects __testSessionPayload for evidence only',
  'Production corpflow_test still requires real Core/Tenant login cookies after merge',
];

const out = path.join(OUT_DIR, 'runtime-evidence-877.json');
fs.writeFileSync(out, JSON.stringify(evidence, null, 2) + '\n');
console.log('wrote', out);
console.log(JSON.stringify({ ok: evidence.core_shell.ok && evidence.tenant_shell.ok, evidence }, null, 2));
