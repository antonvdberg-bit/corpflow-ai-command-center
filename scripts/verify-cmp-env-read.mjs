/**
 * Smoke-test: n8n URL and GitHub dispatch inputs resolve from CORPFLOW_RUNTIME_CONFIG_JSON
 * when individual env vars are unset (cfg() path).
 *
 * Run: node scripts/verify-cmp-env-read.mjs
 */
process.env.CORPFLOW_RUNTIME_CONFIG_JSON = JSON.stringify({
  N8N_WEBHOOK_URL: 'https://example.invalid/cmp-verify-n8n',
  GITHUB_REPO: 'acme/corpflow-verify',
  CMP_GITHUB_TOKEN: 'ghp_verify_token_placeholder',
  N8N_CMP_WEBHOOK_URL: 'https://example.invalid/cmp-verify-automation',
  CMP_SANDBOX_BASE_REF: 'develop',
});
delete process.env.N8N_WEBHOOK_URL;
delete process.env.GITHUB_REPO;
delete process.env.CMP_GITHUB_TOKEN;
delete process.env.N8N_CMP_WEBHOOK_URL;
delete process.env.CMP_SANDBOX_BASE_REF;

const { getN8nWebhookUrl } = await import('../lib/server/config.js');
const { parseGithubRepo, dispatchCmpSandboxStart } = await import(
  '../lib/cmp/_lib/github-dispatch.js'
);

const n8n = getN8nWebhookUrl();
if (n8n !== 'https://example.invalid/cmp-verify-n8n') {
  console.error('FAIL: getN8nWebhookUrl from JSON blob', n8n);
  process.exit(1);
}

const parsed = parseGithubRepo('acme/corpflow-verify');
if (!parsed || parsed.owner !== 'acme' || parsed.repo !== 'corpflow-verify') {
  console.error('FAIL: parseGithubRepo', parsed);
  process.exit(1);
}
const origFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (String(url).includes('/dispatches')) {
    return new Response(null, { status: 204 });
  }
  return new Response('unexpected', { status: 500 });
};
const d = await dispatchCmpSandboxStart({ ticketId: 'ticket-1', baseRef: 'develop' });
globalThis.fetch = origFetch;
if (!d.ok) {
  console.error('FAIL: dispatchCmpSandboxStart', d);
  process.exit(1);
}

console.log('verify-cmp-env-read: ok (cfg() + JSON blob + dispatch wiring)');
