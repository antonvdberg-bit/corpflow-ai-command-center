/**
 * Vercel environment automation (repo root).
 *
 * Execution contexts:
 * - Local: `VERCEL_TOKEN` + `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID`, or linked `.vercel/project.json` for id/org.
 * - CI: same vars as GitHub Actions secrets (see .github/workflows/vercel-env-check.yml).
 * - Backend: `--backend api` (REST + upsert), `cli` (npx vercel), `auto` (api if VERCEL_TOKEN set).
 *
 * Commands:
 *   allowlist              Union of .env.template keys, secrets-manifest, policy.additional_allowlist_keys
 *   check                  Policy required_keys + required_any; add --comprehensive for important set
 *   list                   Remote keys (API or CLI)
 *   diff                   Local .env.local vs remote keys (no secret values)
 *   pull [file]            `vercel env pull` → .env.local (CLI only)
 *   push                   Dry-run; with --force, upsert from .env.local (API) or `vercel env add` (CLI)
 *
 * Flags:
 *   --backend=auto|api|cli
 *   --file=<path>          Default .env.local (under repo root)
 *   --targets=a,b,c        Default from policy default_push_targets
 *   --force                Apply push (otherwise dry-run)
 *   --comprehensive        check: also require comprehensive_important_keys
 */
import './bootstrap-repo-env.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'vanguard', 'secrets-manifest.json');
const POLICY_PATH = path.join(ROOT, 'vanguard', 'vercel-env-policy.json');
const TEMPLATE = path.join(ROOT, '.env.template');

function loadPolicy() {
  if (!fs.existsSync(POLICY_PATH)) {
    return {
      additional_allowlist_keys: [],
      required_keys: [],
      required_any: [],
      comprehensive_important_keys: [],
      push_excluded_keys: [],
      default_push_targets: ['production', 'preview', 'development'],
      default_env_type: 'encrypted',
    };
  }
  return JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
}

function readManifestKeys() {
  const raw = fs.readFileSync(MANIFEST, 'utf8');
  const j = JSON.parse(raw);
  const keys = new Set();
  const optional = new Set();
  const ra = j.root_access || {};
  for (const row of ra.secrets || []) {
    if (row.env) {
      keys.add(row.env);
      if (row.type === 'secret_optional') optional.add(row.env);
    }
  }
  for (const row of ra.database_ids || []) {
    if (row.env) keys.add(row.env);
  }
  return { keys: [...keys].sort(), optional };
}

function parseEnvTemplateKeys() {
  const text = fs.readFileSync(TEMPLATE, 'utf8');
  const keys = new Set();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Z][A-Z0-9_]*)=/);
    if (m) keys.add(m[1]);
  }
  return [...keys].sort();
}

function mergeAllowlist(policy) {
  const { keys: mk, optional: manifestOpt } = readManifestKeys();
  const templateKeys = parseEnvTemplateKeys();
  const set = new Set([...templateKeys, ...mk, ...(policy.additional_allowlist_keys || [])]);
  return { keys: [...set].sort(), manifestOptional: manifestOpt };
}

function parseEnvFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function parseArgv(argv) {
  const flags = {};
  const pos = [];
  for (const a of argv) {
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else flags[a.slice(2)] = true;
    } else pos.push(a);
  }
  return { flags, pos };
}

function resolveBackend(flags) {
  const v = (flags.backend || 'auto').toLowerCase();
  if (v === 'api') return 'api';
  if (v === 'cli') return 'cli';
  return process.env.VERCEL_TOKEN ? 'api' : 'cli';
}

function readLinkedProject() {
  const p = path.join(ROOT, '.vercel', 'project.json');
  if (!fs.existsSync(p)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    return {
      projectId: j.projectId || j.project_id,
      teamId: j.orgId || j.teamId || j.org_id,
    };
  } catch {
    return null;
  }
}

function resolveProjectContext() {
  const linked = readLinkedProject();
  const projectId = process.env.VERCEL_PROJECT_ID || linked?.projectId;
  const teamId =
    process.env.VERCEL_ORG_ID ||
    process.env.VERCEL_TEAM_ID ||
    linked?.teamId ||
    '';
  if (!projectId) {
    throw new Error(
      'Missing VERCEL_PROJECT_ID (or run `npx vercel link` so .vercel/project.json exists).'
    );
  }
  return { projectId, teamId };
}

function apiUrl(pathname, searchParams) {
  const u = new URL(`https://api.vercel.com${pathname}`);
  for (const [k, v] of Object.entries(searchParams || {})) {
    if (v != null && v !== '') u.searchParams.set(k, String(v));
  }
  return u;
}

async function vercelFetch(method, pathname, { teamId, body, searchParams } = {}) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('VERCEL_TOKEN is required for API backend.');
  const sp = { ...searchParams };
  if (teamId) sp.teamId = teamId;
  const url = apiUrl(pathname, sp);
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || text || res.statusText;
    throw new Error(`Vercel API ${method} ${pathname} → ${res.status}: ${msg}`);
  }
  return json;
}

async function fetchAllEnvs(ctx) {
  const { projectId, teamId } = ctx;
  const all = [];
  let until = null;
  for (;;) {
    const sp = {};
    if (until != null) sp.until = until;
    const data = await vercelFetch('GET', `/v10/projects/${encodeURIComponent(projectId)}/env`, {
      teamId,
      searchParams: sp,
    });
    const envs = data.envs || [];
    all.push(...envs);
    const next = data.pagination?.next;
    if (next == null || next === undefined) break;
    until = next;
  }
  return all;
}

function remoteKeySetFromEnvs(envs) {
  const set = new Set();
  for (const e of envs) {
    if (e.key && /^[A-Z][A-Z0-9_]*$/.test(e.key)) set.add(e.key);
  }
  return set;
}

function parseVercelEnvLs(stdout) {
  const found = new Set();
  for (const line of stdout.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s+/);
    if (!m) continue;
    const name = m[1];
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) continue;
    found.add(name);
  }
  return found;
}

function runVercelCli(args, opts = {}) {
  const bin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const fullArgs = ['vercel', ...args];
  return spawnSync(bin, fullArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: opts.pipeStdin ? ['pipe', 'pipe', 'pipe'] : ['inherit', 'pipe', 'pipe'],
    input: opts.input,
    maxBuffer: 10 * 1024 * 1024,
  });
}

async function getRemoteKeys(backend, ctx) {
  if (backend === 'api') {
    const envs = await fetchAllEnvs(ctx);
    return { keys: remoteKeySetFromEnvs(envs), envs };
  }
  const r = runVercelCli(['env', 'ls']);
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || 'vercel env ls failed');
  }
  return { keys: parseVercelEnvLs(r.stdout || ''), envs: null };
}

function runCheck(remoteKeys, policy, flags) {
  const missing = [];
  for (const k of policy.required_keys || []) {
    if (!remoteKeys.has(k)) missing.push(k);
  }
  const anyFails = [];
  for (const group of policy.required_any || []) {
    if (!group.some((k) => remoteKeys.has(k))) anyFails.push(group);
  }
  let compMissing = [];
  if (flags.comprehensive) {
    for (const k of policy.comprehensive_important_keys || []) {
      if (!remoteKeys.has(k)) compMissing.push(k);
    }
  }

  if (missing.length) {
    console.error('Missing required_keys on Vercel:');
    for (const k of missing) console.error(`  - ${k}`);
  }
  if (anyFails.length) {
    console.error('Missing required_any groups (need at least one key per group):');
    for (const g of anyFails) console.error(`  - one of: ${g.join(', ')}`);
  }
  if (compMissing.length) {
    console.error('Missing comprehensive_important_keys:');
    for (const k of compMissing) console.error(`  - ${k}`);
  }

  const fail = missing.length > 0 || anyFails.length > 0 || compMissing.length > 0;
  if (!fail) {
    console.log('vercel-env check: OK (policy gates satisfied).');
    if (flags.comprehensive) console.log('  (--comprehensive important set included.)');
  }
  process.exit(fail ? 1 : 0);
}

function normalizeTargets(flags, policy) {
  const raw = flags.targets;
  if (typeof raw === 'string' && raw.length) {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return policy.default_push_targets || ['production', 'preview', 'development'];
}

async function cmdPush(flags, policy, backend) {
  const force = Boolean(flags.force);
  const envRel = typeof flags.file === 'string' ? flags.file : '.env.local';
  const envPath = path.isAbsolute(envRel) ? envRel : path.join(ROOT, envRel);
  if (!fs.existsSync(envPath)) {
    console.error(`Missing ${envPath}. Run: npm run vercel:env:pull`);
    process.exit(1);
  }
  const { keys: allowKeys } = mergeAllowlist(policy);
  const allow = new Set(allowKeys);
  const excluded = new Set(policy.push_excluded_keys || []);
  const local = parseEnvFile(envPath);
  const targets = normalizeTargets(flags, policy);
  const envType = policy.default_env_type || 'encrypted';

  const toSync = allowKeys.filter((k) => {
    if (excluded.has(k)) return false;
    const v = local[k];
    return v !== undefined && v !== '';
  });

  if (!force) {
    console.log('DRY RUN (no Vercel changes). Pass --force to apply.\n');
    for (const k of toSync) console.log(`  would upsert ${k} → targets [${targets.join(', ')}]`);
    const skipped = allowKeys.filter((k) => !toSync.includes(k) && !excluded.has(k));
    const skippedEmpty = skipped.filter((k) => !local[k]);
    if (skippedEmpty.length) {
      console.log('\nAllowlisted but empty / missing in local file (skipped):');
      for (const k of skippedEmpty.slice(0, 40)) console.log(`  - ${k}`);
      if (skippedEmpty.length > 40) console.log(`  ... and ${skippedEmpty.length - 40} more`);
    }
    if (excluded.size) {
      console.log('\nExcluded from push (policy):');
      for (const k of [...excluded].sort()) console.log(`  - ${k}`);
    }
    return;
  }

  if (backend === 'cli') {
    for (const k of toSync) {
      const val = local[k];
      for (const env of targets) {
        const add = runVercelCli(['env', 'add', k, env], { pipeStdin: true, input: val });
        if (add.status !== 0) {
          console.error(`CLI failed ${k} ${env}:`, add.stderr || add.stdout);
          process.exit(add.status ?? 1);
        }
      }
      console.log(`CLI set ${k} (${targets.join(', ')})`);
    }
    return;
  }

  const ctx = resolveProjectContext();
  for (const k of toSync) {
    const value = local[k];
    await vercelFetch('POST', `/v10/projects/${encodeURIComponent(ctx.projectId)}/env`, {
      teamId: ctx.teamId,
      searchParams: { upsert: 'true' },
      body: {
        key: k,
        value,
        type: envType,
        target: targets,
      },
    });
    console.log(`API upsert ${k} → [${targets.join(', ')}]`);
  }
}

async function cmdDiff(flags, backend) {
  const envRel = typeof flags.file === 'string' ? flags.file : '.env.local';
  const envPath = path.isAbsolute(envRel) ? envRel : path.join(ROOT, envRel);
  const policy = loadPolicy();
  const { keys: allowKeys } = mergeAllowlist(policy);
  const allow = new Set(allowKeys);
  if (!fs.existsSync(envPath)) {
    console.error(`Missing ${envPath}`);
    process.exit(1);
  }
  const local = parseEnvFile(envPath);
  const localKeys = new Set(Object.keys(local));

  const ctx = backend === 'api' ? resolveProjectContext() : null;
  const { keys: remoteKeys } = await getRemoteKeys(backend, ctx);

  const missingOnVercel = [...allow].filter((k) => localKeys.has(k) && local[k] && !remoteKeys.has(k));
  const missingLocally = [...remoteKeys].filter((k) => allow.has(k) && !localKeys.has(k));

  if (missingOnVercel.length) {
    console.log('In local file but not on Vercel (allowlist):');
    for (const k of missingOnVercel.sort()) console.log(`  + ${k}`);
  }
  if (missingLocally.length) {
    console.log('On Vercel but missing from local file (allowlist):');
    for (const k of missingLocally.sort()) console.log(`  - ${k}`);
  }
  if (!missingOnVercel.length && !missingLocally.length) {
    console.log('diff: allowlisted keys align between local file and Vercel (key names only).');
  }
}

async function main() {
  const { flags, pos } = parseArgv(process.argv.slice(2));
  const cmd = pos[0];
  const rest = pos.slice(1);
  const policy = loadPolicy();
  const backend = resolveBackend(flags);

  if (!cmd || cmd === 'help' || cmd === '-h') {
    console.error(`Usage: node scripts/vercel-env.mjs <command> [options]

Commands: allowlist | check | list | diff | pull | push
Options:  --backend=auto|api|cli  --file=.env.local  --targets=production,preview,development
          --force  --comprehensive (check)

Environment (API): VERCEL_TOKEN, VERCEL_ORG_ID or VERCEL_TEAM_ID, VERCEL_PROJECT_ID
Local link: npx vercel link  → .vercel/project.json
`);
    process.exit(cmd ? 0 : 1);
    return;
  }

  if (cmd === 'allowlist') {
    const { keys } = mergeAllowlist(policy);
    for (const k of keys) console.log(k);
    return;
  }

  if (cmd === 'check') {
    const ctx = backend === 'api' ? resolveProjectContext() : null;
    const { keys } = await getRemoteKeys(backend, ctx);
    runCheck(keys, policy, flags);
    return;
  }

  if (cmd === 'list') {
    const ctx = backend === 'api' ? resolveProjectContext() : null;
    const { keys } = await getRemoteKeys(backend, ctx);
    for (const k of [...keys].sort()) console.log(k);
    return;
  }

  if (cmd === 'diff') {
    await cmdDiff(flags, backend);
    return;
  }

  if (cmd === 'pull') {
    const file = rest[0] || '.env.local';
    const r = runVercelCli(['env', 'pull', file]);
    process.stdout.write(r.stdout || '');
    process.stderr.write(r.stderr || '');
    process.exit(r.status ?? 1);
    return;
  }

  if (cmd === 'push') {
    await cmdPush(flags, policy, backend);
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
