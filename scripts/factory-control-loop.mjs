#!/usr/bin/env node
/**
 * Closed-loop control check: local Git ↔ GitHub tip ↔ Vercel production ↔ factory health.
 *
 * Usage (repo root):
 *   npm run control:loop
 *   npm run control:loop -- --fetch              # git fetch before comparing
 *   npm run control:loop -- --url https://yoursite.com/api/factory/health
 *   npm run control:loop -- --execute-hook       # POST VERCEL_DEPLOY_HOOK_URL (if set)
 *
 * Env (typical):
 *   Loaded from repo-root `.env` / `.env.local` automatically (see `scripts/bootstrap-repo-env.mjs`).
 *   FACTORY_HEALTH_URL or CORPFLOW_FACTORY_HEALTH_URL — production factory health GET
 *   (If both unset, CORPFLOW_PUBLIC_BASE_URL is used as the health base URL.)
 *   VERCEL_TOKEN + VERCEL_PROJECT_ID (+ VERCEL_TEAM_ID if team project) — latest prod deployment SHA
 *   (VERCEL_AUTH_TOKEN aliases to VERCEL_TOKEN when TOKEN is unset.)
 *   VERCEL_DEPLOY_HOOK_URL — optional; used with --execute-hook
 *
 * Does not print secret values.
 */

import './bootstrap-repo-env.mjs';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateVercelJsonCronsForHobby } from './lib/vercel-cron-hobby.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function box(title) {
  console.log('');
  console.log('═'.repeat(Math.min(76, title.length + 4)));
  console.log(`  ${title}`);
  console.log('═'.repeat(Math.min(76, title.length + 4)));
}

function sh(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: 'utf8',
    cwd: REPO_ROOT,
    stdio: opts.silent ? 'pipe' : ['pipe', 'pipe', 'pipe'],
    ...opts,
  }).trim();
}

function parseArgs(argv) {
  const out = { fetch: false, url: '', executeHook: false, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fetch') out.fetch = true;
    else if (a === '--execute-hook') out.executeHook = true;
    else if (a === '--json') out.json = true;
    else if (a === '--url' && argv[i + 1]) out.url = String(argv[++i]).trim();
  }
  return out;
}

function loadVercelProjectJson() {
  const p = path.join(REPO_ROOT, '.vercel', 'project.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

async function fetchJson(url, { headers = {}, method = 'GET' } = {}) {
  const res = await fetch(url, { method, headers });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.length > 500 ? text.slice(0, 500) : text;
  }
  return { ok: res.ok, status: res.status, body };
}

function gitSection(args) {
  const result = {
    head: null,
    originMain: null,
    branch: null,
    dirty: false,
    ahead: 0,
    behind: 0,
    error: null,
  };
  try {
    if (args.fetch) {
      try {
        sh('git fetch origin', { silent: true });
      } catch (e) {
        result.fetchWarning = (e.stderr || e.message || 'fetch failed').toString().slice(0, 200);
      }
    }
    result.head = sh('git rev-parse HEAD', { silent: true });
    result.branch = sh('git rev-parse --abbrev-ref HEAD', { silent: true });
    try {
      result.originMain = sh('git rev-parse origin/main', { silent: true });
    } catch {
      result.originMain = null;
    }
    const st = sh('git status --porcelain', { silent: true });
    result.dirty = Boolean(st && st.trim());
    if (result.originMain) {
      try {
        result.behind = parseInt(
          sh(`git rev-list --count HEAD..origin/main`, { silent: true }),
          10,
        );
        result.ahead = parseInt(
          sh(`git rev-list --count origin/main..HEAD`, { silent: true }),
          10,
        );
      } catch {
        result.behind = result.ahead = 0;
      }
    }
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
  }
  return result;
}

async function factorySection(url) {
  if (!url) {
    return {
      skipped: true,
      reason:
        'Set FACTORY_HEALTH_URL or CORPFLOW_FACTORY_HEALTH_URL, or pass --url https://…/api/factory/health',
    };
  }
  const u = url.replace(/\/?$/, '');
  const healthUrl = u.endsWith('/factory/health') ? u : `${u}/api/factory/health`;
  const { ok, status, body } = await fetchJson(healthUrl, {});
  return {
    skipped: false,
    url: healthUrl,
    httpOk: ok,
    httpStatus: status,
    factoryOk: body && body.ok === true,
    hint: typeof body?.hint === 'string' ? body.hint : '',
    authHint: typeof body?.auth_hint === 'string' ? body.auth_hint : '',
    runtimeParseOk: body?.runtime_config?.parse_ok !== false,
    presentKeysSample: body?.present ? Object.keys(body.present).filter((k) => !body.present[k]) : [],
    automation: body?.automation || null,
    tenancy_boundary: body?.tenancy_boundary || null,
  };
}

async function vercelSection() {
  const token = String(process.env.VERCEL_TOKEN || '').trim();
  let projectId = String(process.env.VERCEL_PROJECT_ID || '').trim();
  const teamId = String(process.env.VERCEL_TEAM_ID || process.env.VERCEL_ORG_ID || '').trim();
  if (!projectId) {
    const linked = loadVercelProjectJson();
    if (linked?.projectId) projectId = linked.projectId;
  }
  if (!token || !projectId) {
    return {
      skipped: true,
      reason:
        'Set VERCEL_TOKEN and VERCEL_PROJECT_ID (or run `npx vercel link` so .vercel/project.json exists). Optional: VERCEL_TEAM_ID.',
    };
  }
  const q = new URLSearchParams({ projectId, limit: '5', target: 'production' });
  if (teamId) q.set('teamId', teamId);
  const { ok, status, body } = await fetchJson(`https://api.vercel.com/v6/deployments?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!ok) {
    return {
      skipped: false,
      error: `Vercel API ${status}: ${JSON.stringify(body).slice(0, 300)}`,
    };
  }
  const list = Array.isArray(body.deployments) ? body.deployments : [];
  const top = list[0];
  const sha =
    top?.meta?.githubCommitSha ||
    top?.meta?.githubCommitId ||
    top?.gitSource?.revision ||
    null;
  return {
    skipped: false,
    readyState: top?.readyState || null,
    deploymentUrl: top?.url ? (top.url.startsWith('http') ? top.url : `https://${top.url}`) : null,
    createdAt: top?.createdAt || null,
    githubCommitSha: sha,
    githubCommitMessage: top?.meta?.githubCommitMessage || null,
    deploymentId: top?.uid || null,
  };
}

function actionsFromState(git, factory, vercel) {
  const actions = [];
  if (git.error) {
    actions.push({ level: 'fix', text: 'Fix Git: not a repository or git missing.' });
    return actions;
  }
  if (git.dirty) {
    actions.push({
      level: 'fix',
      text: 'Working tree has uncommitted changes — commit or stash before you rely on "what is on main".',
    });
  }
  if (git.originMain && git.behind > 0) {
    actions.push({
      level: 'fix',
      text: `You are ${git.behind} commit(s) behind origin/main — run: git pull origin main`,
    });
  }
  if (git.originMain && git.ahead > 0) {
    actions.push({
      level: 'fix',
      text: `You are ${git.ahead} commit(s) ahead of origin/main — run: git push origin main`,
    });
  }
  if (!factory.skipped && !factory.factoryOk) {
    actions.push({
      level: 'fix',
      text:
        factory.hint ||
        'Factory health reports not OK — open Vercel env for this project and fix missing/invalid config (see hint above).',
    });
  }
  const deployRefSha = git.originMain || git.head;
  const deployRefLabel = git.originMain ? 'origin/main' : 'HEAD';
  if (!vercel.skipped && !vercel.error && vercel.githubCommitSha && deployRefSha) {
    if (vercel.githubCommitSha !== deployRefSha) {
      actions.push({
        level: 'fix',
        text:
          `Production Vercel deployment does not match ${deployRefLabel} — push main, trigger a production deploy, or run: npm run control:loop -- --execute-hook (if VERCEL_DEPLOY_HOOK_URL is set).`,
      });
      actions.push({
        level: 'info',
        text: `${deployRefLabel} ${deployRefSha.slice(0, 7)} vs Vercel prod ${vercel.githubCommitSha.slice(0, 7)}`,
      });
    } else {
      actions.push({
        level: 'ok',
        text: `Vercel production commit matches ${deployRefLabel}.`,
      });
    }
  }
  if (!factory.skipped && factory.httpOk && factory.factoryOk) {
    actions.push({ level: 'ok', text: 'Factory health: required checks report OK.' });
  }
  if (git.originMain && git.head === git.originMain && !git.dirty) {
    actions.push({ level: 'ok', text: 'Local main matches origin/main.' });
  }
  actions.push({ level: 'info', text: 'GitHub Actions summary: npm run ci:report' });
  return actions;
}

async function maybeExecuteHook() {
  const hook = String(process.env.VERCEL_DEPLOY_HOOK_URL || '').trim();
  if (!hook) {
    console.log('\n(No VERCEL_DEPLOY_HOOK_URL — cannot POST deploy hook.)');
    return;
  }
  const { ok, status, body } = await fetchJson(hook, { method: 'POST' });
  console.log(`\nDeploy hook POST → HTTP ${status} ${ok ? 'OK' : ''}`);
  if (!ok) console.log(typeof body === 'object' ? JSON.stringify(body).slice(0, 400) : body);
}

function healthUrlFromEnvOrArgs(args) {
  return (
    String(args.url || '').trim() ||
    String(process.env.FACTORY_HEALTH_URL || '').trim() ||
    String(process.env.CORPFLOW_FACTORY_HEALTH_URL || '').trim()
  );
}

function vercelCronGuardSection() {
  if (String(process.env.VERCEL_ALLOW_SUBDAILY_CRONS || '').trim() === '1') {
    return { skipped: true, reason: 'VERCEL_ALLOW_SUBDAILY_CRONS=1 (Pro / external crons)' };
  }
  const p = path.join(REPO_ROOT, 'vercel.json');
  if (!existsSync(p)) return { skipped: true, reason: 'vercel.json missing' };
  try {
    const j = JSON.parse(readFileSync(p, 'utf8'));
    const r = validateVercelJsonCronsForHobby(j);
    if (r.ok) return { ok: true };
    return { ok: false, errors: r.errors };
  } catch (e) {
    return { ok: false, errors: [e instanceof Error ? e.message : String(e)] };
  }
}

function cronActionsFromState(cron) {
  const actions = [];
  if (cron.skipped) return actions;
  if (cron.ok) {
    actions.push({
      level: 'ok',
      text: 'vercel.json crons: Hobby-safe (≤ once/day per job). See docs/VERCEL_DEPLOYMENT.md',
    });
    return actions;
  }
  for (const err of cron.errors || []) {
    actions.push({
      level: 'fix',
      text: `Cron guard: ${err} — Vercel Hobby deploys will fail until fixed or set VERCEL_ALLOW_SUBDAILY_CRONS=1 on Pro.`,
    });
  }
  actions.push({ level: 'info', text: 'Run: npm run verify:vercel-hobby-crons' });
  return actions;
}

function shouldFailExit(git, factory, vercel, cron) {
  if (git.error) return true;
  if (!factory.skipped && !factory.httpOk) return true;
  if (!factory.skipped && factory.httpOk && !factory.factoryOk) return true;
  if (!vercel.skipped && vercel.error) return true;
  if (cron && !cron.skipped && cron.ok === false) return true;
  return false;
}

async function main() {
  const args = parseArgs(process.argv);
  const git = gitSection(args);
  const cron = vercelCronGuardSection();
  const healthBase = healthUrlFromEnvOrArgs(args);
  const [factory, vercel] = await Promise.all([
    factorySection(healthBase),
    vercelSection(),
  ]);
  const actions = [...cronActionsFromState(cron), ...actionsFromState(git, factory, vercel)];

  const report = { git, factory, vercel, cron, actions };

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    box('Local Git');
    if (git.error) console.log('  Error:', git.error);
    else {
      console.log('  Branch:', git.branch);
      console.log('  HEAD:  ', git.head?.slice(0, 7), git.head);
      console.log('  Dirty: ', git.dirty ? 'yes' : 'no');
      if (git.fetchWarning) console.log('  Fetch: ', git.fetchWarning);
      if (git.originMain) {
        console.log('  origin/main:', git.originMain.slice(0, 7), `(ahead ${git.ahead}, behind ${git.behind})`);
      } else console.log('  origin/main: (not available — fetch remote or add origin)');
    }

    box('Factory health (production)');
    if (factory.skipped) console.log('  Skipped:', factory.reason);
    else {
      console.log('  URL:    ', factory.url);
      console.log('  HTTP:   ', factory.httpStatus, factory.httpOk ? 'OK' : 'FAIL');
      console.log('  ok:     ', factory.factoryOk);
      if (factory.hint) console.log('  hint:   ', factory.hint);
      if (factory.authHint) console.log('  auth:   ', factory.authHint);
      if (factory.presentKeysSample?.length)
        console.log('  missing present.*:', factory.presentKeysSample.slice(0, 8).join(', '));
      if (factory.automation) console.log('  automation:', JSON.stringify(factory.automation));
    }

    box('vercel.json crons (Hobby guard)');
    if (cron.skipped) console.log('  Skipped:', cron.reason);
    else if (cron.ok) console.log('  OK — schedules are at most once per UTC day per job.');
    else {
      console.log('  FAIL — production deploy will be rejected on Vercel Hobby:');
      for (const err of cron.errors || []) console.log('   •', err);
    }

    box('Vercel production (latest)');
    if (vercel.skipped) console.log('  Skipped:', vercel.reason);
    else if (vercel.error) console.log('  Error:', vercel.error);
    else {
      const ref = git.originMain || git.head;
      const refLabel = git.originMain ? 'origin/main' : 'local HEAD';
      console.log('  readyState:', vercel.readyState);
      console.log('  commit SHA:', vercel.githubCommitSha || '(none)');
      if (ref && vercel.githubCommitSha) {
        const match = vercel.githubCommitSha === ref;
        console.log('  vs', refLabel + ':', match ? 'match' : 'MISMATCH', ref.slice(0, 7));
      }
      if (vercel.githubCommitMessage) console.log('  message:   ', vercel.githubCommitMessage.slice(0, 80));
      console.log('  URL:       ', vercel.deploymentUrl || '—');
      console.log('  created:   ', vercel.createdAt || '—');
    }

    box('Actions & control');
    for (const a of actions) {
      const tag = a.level === 'fix' ? '!' : a.level === 'ok' ? '✓' : '·';
      console.log(`  [${tag}] ${a.text}`);
    }
    console.log('');
    console.log('  Vercel dashboard: https://vercel.com/dashboard');
    console.log('  Redeploy: Project → Deployments → … → Redeploy (or --execute-hook with hook URL)');
  }

  if (args.executeHook) await maybeExecuteHook();

  process.exitCode = shouldFailExit(git, factory, vercel, cron) ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
