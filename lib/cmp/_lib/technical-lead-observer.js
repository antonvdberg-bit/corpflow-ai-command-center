/**
 * Technical Lead Phase A (Lead Observer): gather deterministic evidence from CMP tickets
 * (console_json + optional GitHub + optional Vercel preview deployments + factory health),
 * compare to embedded checklist v1, return gaps + summary.
 */

import fs from 'node:fs';
import path from 'node:path';

import { parseGithubRepo } from './github-dispatch.js';
import { normalizeConsoleJson } from './cmp-stuck-self-repair.js';
import { maybeRephraseTechnicalLeadSummary } from './technical-lead-llm-summary.js';
import { fetchVercelCmpBranchDeploymentEvidence } from './vercel-preview.js';
import { cfg } from '../../server/runtime-config.js';

export const TECHNICAL_LEAD_CHECKLIST_VERSION = 'v1';

/** @type {Record<string, unknown> | null | undefined} */
let _checklistFileCache;

/**
 * Optional JSON overrides: `config/technical-lead-checklist.v1.json` or `CORPFLOW_TECHNICAL_LEAD_CHECKLIST_PATH`.
 *
 * @returns {Record<string, unknown> | null}
 */
export function loadTechnicalLeadChecklistConfig() {
  if (_checklistFileCache !== undefined) return _checklistFileCache;
  const override = String(cfg('CORPFLOW_TECHNICAL_LEAD_CHECKLIST_PATH', '') || '').trim();
  const p = override || path.join(process.cwd(), 'config', 'technical-lead-checklist.v1.json');
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const j = JSON.parse(raw);
    _checklistFileCache = j && typeof j === 'object' ? /** @type {Record<string, unknown>} */ (j) : null;
  } catch {
    _checklistFileCache = null;
  }
  return _checklistFileCache;
}

/** @param {Array<{ severity: string }>} gaps
 * @param {boolean | null} dispatchOk
 * @param {number | null | undefined} prNum
 */
export function buildTechnicalLeadSummaryFromGaps(gaps, dispatchOk, prNum) {
  const parts = [];
  if (gaps.length === 0) parts.push('No checklist gaps.');
  else {
    const err = gaps.filter((g) => g.severity === 'error').length;
    const warn = gaps.filter((g) => g.severity === 'warning').length;
    parts.push(`${gaps.length} gap(s) (${err} error, ${warn} warning).`);
  }
  const n = typeof prNum === 'number' && prNum > 0 ? prNum : null;
  parts.push(`PR #${n || '—'}; dispatch ${dispatchOk === true ? 'ok' : dispatchOk === false ? 'failed' : 'unknown'}.`);
  let summary = parts.join(' ');
  if (summary.length > 500) summary = summary.slice(0, 497) + '...';
  return summary;
}

const SANDBOX_COMMIT_RE = /chore\s*\(\s*cmp\s*\)\s*:\s*sandbox/i;

/**
 * @param {string} path
 * @param {string} token
 * @returns {Promise<{ ok: boolean, status: number, json: unknown }>}
 */
async function githubJson(path, token) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json };
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function str(v) {
  return v == null ? '' : String(v).trim();
}

/**
 * Site origin (`https://host`) or already-suffixed `.../api/factory/health` (matches GitHub health-ping secret).
 *
 * @param {string} raw
 * @returns {string} URL to GET for JSON health, or '' if empty
 */
function resolveFactoryHealthFetchUrl(raw) {
  const s = str(raw).replace(/\/+$/, '');
  if (!s) return '';
  if (s.toLowerCase().endsWith('/api/factory/health')) return s;
  return `${s}/api/factory/health`;
}

/**
 * @param {{ owner: string, repo: string, token: string, prNumber: number, baseRef: string, headRef: string }} p
 */
async function fetchPrEvidence(p) {
  const { owner, repo, token, prNumber, baseRef, headRef } = p;
  const repoPath = `/repos/${owner}/${repo}`;

  const prRes = await githubJson(`${repoPath}/pulls/${prNumber}`, token);
  /** @type {Record<string, unknown>} */
  const pr = prRes.ok && prRes.json && typeof prRes.json === 'object' ? /** @type {Record<string, unknown>} */ (prRes.json) : {};
  const mergedAt = typeof pr.merged_at === 'string' && pr.merged_at.trim() ? pr.merged_at.trim() : null;

  const headObj = pr.head && typeof pr.head === 'object' ? /** @type {Record<string, unknown>} */ (pr.head) : {};
  const headSha = typeof headObj.sha === 'string' ? headObj.sha : '';
  const headLabel = typeof headObj.ref === 'string' ? headObj.ref : headRef;

  let compare = null;
  if (baseRef) {
    const decodeCompareJson = (cRes) => {
      if (!cRes?.ok || !cRes.json || typeof cRes.json !== 'object') {
        return { ok: false, status: cRes?.status, error: 'compare_failed' };
      }
      const cj = /** @type {Record<string, unknown>} */ (cRes.json);
      const files = Array.isArray(cj.files) ? cj.files : [];
      const commits = Array.isArray(cj.commits) ? cj.commits : [];
      const totalCommits = typeof cj.total_commits === 'number' ? cj.total_commits : commits.length;
      return {
        ok: true,
        status: cRes.status,
        ahead_by: typeof cj.ahead_by === 'number' ? cj.ahead_by : null,
        behind_by: typeof cj.behind_by === 'number' ? cj.behind_by : null,
        total_commits: totalCommits,
        files_changed: files.length,
        commit_messages: commits
          .map((co) => {
            const o = co && typeof co === 'object' ? /** @type {Record<string, unknown>} */ (co) : {};
            const c = o.commit && typeof o.commit === 'object' ? /** @type {Record<string, unknown>} */ (o.commit) : {};
            return typeof c.message === 'string' ? c.message.split('\n')[0].slice(0, 200) : '';
          })
          .filter(Boolean),
      };
    };

    // Prefer comparing baseRef...headLabel (branch ref) for active PRs.
    if (headLabel) {
      const q = `${encodeURIComponent(baseRef)}...${encodeURIComponent(headLabel)}`;
      const cRes = await githubJson(`${repoPath}/compare/${q}`, token);
      compare = decodeCompareJson(cRes);
    }

    // Fallback: baseRef...headSha (still valid after branch deletion / ref moves).
    if ((!compare || compare.ok !== true) && headSha) {
      const q = `${encodeURIComponent(baseRef)}...${encodeURIComponent(headSha)}`;
      const cRes = await githubJson(`${repoPath}/compare/${q}`, token);
      compare = decodeCompareJson(cRes);
    }
  }

  let checkRuns = null;
  if (headSha) {
    const crPath = `${repoPath}/commits/${headSha}/check-runs?per_page=100`;
    const crRes = await githubJson(crPath, token);
    if (crRes.ok && crRes.json && typeof crRes.json === 'object') {
      const cj = /** @type {Record<string, unknown>} */ (crRes.json);
      const runs = Array.isArray(cj.check_runs) ? cj.check_runs : [];
      let failed = 0;
      let pending = 0;
      for (const r of runs) {
        const o = r && typeof r === 'object' ? /** @type {Record<string, unknown>} */ (r) : {};
        const concl = o.conclusion;
        if (concl === 'failure' || concl === 'timed_out' || concl === 'action_required') failed += 1;
        else if (concl == null || concl === 'stale') pending += 1;
      }
      checkRuns = {
        ok: true,
        status: crRes.status,
        count: runs.length,
        failed,
        pending,
        names: runs
          .map((r) => {
            const o = r && typeof r === 'object' ? /** @type {Record<string, unknown>} */ (r) : {};
            return typeof o.name === 'string' ? o.name : '';
          })
          .filter(Boolean)
          .slice(0, 20),
      };
    } else {
      checkRuns = { ok: false, status: crRes.status, error: 'check_runs_failed' };
    }
  }

  return {
    pr_fetch: { ok: prRes.ok, status: prRes.status },
    pr_state: typeof pr.state === 'string' ? pr.state : null,
    pr_merged: Boolean(mergedAt),
    pr_merged_at: mergedAt,
    head_sha: headSha || null,
    mergeable: pr.mergeable === null ? null : Boolean(pr.mergeable),
    compare,
    check_runs: checkRuns,
  };
}

/**
 * @param {Record<string, unknown>} evidence
 * @returns {{ gaps: Array<{ id: string, severity: string, detail: string }>, summary: string }}
 */
export function evaluateTechnicalLeadChecklistV1(evidence) {
  /** @type {Array<{ id: string, severity: string, detail: string }>} */
  const gaps = [];

  const dispatchOk = evidence.dispatch_ok;
  if (dispatchOk !== true && dispatchOk !== false) {
    gaps.push({
      id: 'dispatch_recorded',
      severity: 'warning',
      detail: 'client_view.automation.dispatch_ok is missing; sandbox dispatch state is unknown.',
    });
  } else if (dispatchOk === false) {
    gaps.push({
      id: 'dispatch_succeeded',
      severity: 'error',
      detail: 'Sandbox GitHub dispatch did not succeed (dispatch_ok is false).',
    });
  }

  const prn = evidence.pr_number;
  const prNum = typeof prn === 'number' && prn > 0 ? prn : null;
  if (!prNum) {
    gaps.push({
      id: 'pr_linked',
      severity: 'warning',
      detail: 'No promotion.pr_number in console_json; cannot verify PR, compare, or CI from GitHub.',
    });
  }

  const gh = evidence.github && typeof evidence.github === 'object' ? /** @type {Record<string, unknown>} */ (evidence.github) : {};
  if (gh.configured === false) {
    gaps.push({
      id: 'github_config',
      severity: 'warning',
      detail: String(gh.hint || 'GitHub token or repository env not configured; live PR/CI evidence skipped.'),
    });
  } else if (prNum && gh.pr_fetch && gh.pr_fetch.ok === false) {
    gaps.push({
      id: 'github_pr_fetch',
      severity: 'error',
      detail: `GitHub PR fetch failed (HTTP ${gh.pr_fetch.status}).`,
    });
  }

  if (prNum && gh.pr_state && gh.pr_state !== 'open' && gh.pr_merged !== true) {
    gaps.push({
      id: 'pr_open',
      severity: 'warning',
      detail: `PR state is "${gh.pr_state}" (expected open for active build).`,
    });
  }

  const expectedBranch = str(evidence.expected_branch_name);
  const autoBranch = str(evidence.automation_branch_name);
  if (expectedBranch && autoBranch && autoBranch !== expectedBranch) {
    gaps.push({
      id: 'branch_name_matches',
      severity: 'warning',
      detail: `Automation branch_name "${autoBranch}" does not match expected "${expectedBranch}".`,
    });
  }

  const cmp = gh.compare && typeof gh.compare === 'object' ? /** @type {Record<string, unknown>} */ (gh.compare) : null;
  if (cmp && cmp.ok === true) {
    const fc = typeof cmp.files_changed === 'number' ? cmp.files_changed : 0;
    const tc = typeof cmp.total_commits === 'number' ? cmp.total_commits : 0;
    const messages = Array.isArray(cmp.commit_messages) ? cmp.commit_messages.map((m) => String(m)) : [];
    const onlySandbox =
      tc <= 1 && messages.length > 0 && messages.every((m) => SANDBOX_COMMIT_RE.test(m) || m.toLowerCase().includes('empty'));
    if (fc === 0 && tc <= 1) {
      gaps.push({
        id: 'meaningful_pr_diff',
        severity: 'warning',
        detail: 'PR has no file changes (or empty compare); likely sandbox-only / no implementation yet.',
      });
    } else if (onlySandbox && fc < 2) {
      gaps.push({
        id: 'implementation_commits',
        severity: 'warning',
        detail: 'Commits look like sandbox scaffolding only; no substantive implementation signal in messages.',
      });
    }
  } else if (prNum && gh.configured !== false && cmp && cmp.ok === false) {
    gaps.push({
      id: 'github_compare',
      severity: 'warning',
      detail: 'Could not load compare (base...head) for this PR.',
    });
  }

  const cr = gh.check_runs && typeof gh.check_runs === 'object' ? /** @type {Record<string, unknown>} */ (gh.check_runs) : null;
  if (cr && cr.ok === true) {
    const failed = typeof cr.failed === 'number' ? cr.failed : 0;
    const pending = typeof cr.pending === 'number' ? cr.pending : 0;
    if (failed > 0) {
      gaps.push({
        id: 'ci_status',
        severity: 'error',
        detail: `GitHub check runs report ${failed} failed/timed_out/action_required.`,
      });
    } else if (pending > 0 && typeof cr.count === 'number' && cr.count > 0) {
      gaps.push({
        id: 'ci_pending',
        severity: 'warning',
        detail: 'Some check runs are still pending or stale.',
      });
    }
  } else if (prNum && gh.configured !== false && cr && cr.ok === false) {
    gaps.push({
      id: 'ci_fetch',
      severity: 'warning',
      detail: 'Could not load check runs for PR head SHA.',
    });
  }

  const ve = evidence.vercel && typeof evidence.vercel === 'object' ? /** @type {Record<string, unknown>} */ (evidence.vercel) : {};
  if (ve.skipped === true) {
    /* VERCEL_TOKEN / VERCEL_PROJECT_ID not set — optional */
  } else if (ve.fetch_ok === false) {
    gaps.push({
      id: 'vercel_api',
      severity: 'warning',
      detail: `Vercel deployments API failed (${ve.fetch_status != null ? `HTTP ${ve.fetch_status}` : String(ve.error || 'error').slice(0, 120)}).`,
    });
  } else {
    const dfb = typeof ve.deployments_for_branch === 'number' ? ve.deployments_for_branch : 0;
    const latest = ve.latest && typeof ve.latest === 'object' ? /** @type {Record<string, unknown>} */ (ve.latest) : null;
    if (prNum && dispatchOk === true && dfb === 0) {
      gaps.push({
        id: 'vercel_preview_missing',
        severity: 'warning',
        detail: `No preview deployment found for branch ${String(ve.branch || 'cmp/…')} (Vercel project may not have built this ref yet).`,
      });
    }
    const rs = latest && typeof latest.readyState === 'string' ? latest.readyState.toUpperCase() : '';
    if (rs === 'ERROR' || rs === 'CANCELED') {
      gaps.push({
        id: 'vercel_deploy_failed',
        severity: 'error',
        detail: `Latest Vercel preview for this branch is ${rs}.`,
      });
    } else if (rs && rs !== 'READY' && ['BUILDING', 'QUEUED', 'INITIALIZING', 'PENDING'].includes(rs)) {
      gaps.push({
        id: 'vercel_deploy_pending',
        severity: 'warning',
        detail: `Vercel preview deployment is still ${rs}.`,
      });
    }
  }

  const fh = evidence.factory_health && typeof evidence.factory_health === 'object' ? /** @type {Record<string, unknown>} */ (evidence.factory_health) : {};
  if (fh.attempted === true && fh.ok === false) {
    gaps.push({
      id: 'factory_health',
      severity: 'warning',
      detail: String(fh.detail || 'Factory health URL did not return success.'),
    });
  }

  const cmpSt = str(evidence.ticket_cmp_status).toLowerCase();
  const wfv = str(evidence.client_view_workflow_state).toLowerCase();
  const clk = str(evidence.closure_kind).toLowerCase();
  if (cmpSt === 'closed' && wfv && clk !== 'hard_close') {
    const terminal = new Set(['published', 'closed']);
    if (!terminal.has(wfv)) {
      gaps.push({
        id: 'change_console_terminal_mismatch',
        severity: 'error',
        detail: `cmp_tickets is Closed but persisted client_view.workflow_state is "${wfv}" (Change Console should show a terminal state; reconcile console_json or rely on server-side derivation).`,
      });
    }
  }

  const summary = buildTechnicalLeadSummaryFromGaps(gaps, dispatchOk, prNum);
  return { gaps, summary };
}

/**
 * @param {string} ticketId
 * @param {Record<string, unknown>} norm
 * @param {{ status?: string | null, stage?: string | null } | undefined} rowMeta
 * @returns {Promise<Record<string, unknown>>}
 */
async function buildEvidenceForTicket(ticketId, norm, rowMeta) {
  const cv = norm.client_view && typeof norm.client_view === 'object' ? /** @type {Record<string, unknown>} */ (norm.client_view) : {};
  const auto = cv.automation && typeof cv.automation === 'object' ? /** @type {Record<string, unknown>} */ (cv.automation) : {};
  const prom = norm.promotion && typeof norm.promotion === 'object' ? /** @type {Record<string, unknown>} */ (norm.promotion) : {};
  const closure = cv.closure && typeof cv.closure === 'object' ? /** @type {Record<string, unknown>} */ (cv.closure) : {};

  const dispatchOk = auto.dispatch_ok === true ? true : auto.dispatch_ok === false ? false : null;
  const automationBranch = str(auto.branch_name);
  const expectedBranch = `cmp/${ticketId}`;
  const prRaw = prom.pr_number;
  const prNumber = typeof prRaw === 'number' && prRaw > 0 ? prRaw : Number.parseInt(String(prRaw || ''), 10);
  const prNum = Number.isFinite(prNumber) && prNumber > 0 ? prNumber : null;
  const baseRef =
    str(prom.base_ref) ||
    String(cfg('CMP_SANDBOX_BASE_REF', '') || '')
      .trim()
      .replace(/[^a-zA-Z0-9._/-]/g, '')
      .slice(0, 200) || 'main';

  const token = String(
    cfg('CMP_GITHUB_TOKEN', '') || cfg('GH_WORKFLOW_TOKEN', '') || cfg('GITHUB_TOKEN', '') || cfg('GH_TOKEN', ''),
  ).trim();
  const repoRaw = String(
    cfg('CMP_GITHUB_REPOSITORY', '') || cfg('GITHUB_REPO', '') || cfg('GITHUB_REPOSITORY', ''),
  ).trim();
  const parsed = parseGithubRepo(repoRaw);

  /** @type {Record<string, unknown>} */
  const evidence = {
    ticket_id: ticketId,
    ticket_cmp_status: rowMeta?.status != null ? String(rowMeta.status) : null,
    ticket_cmp_stage: rowMeta?.stage != null ? String(rowMeta.stage) : null,
    client_view_workflow_state: cv.workflow_state != null ? String(cv.workflow_state) : null,
    closure_kind: closure.kind != null ? String(closure.kind) : null,
    dispatch_ok: dispatchOk,
    automation_branch_name: automationBranch || null,
    expected_branch_name: expectedBranch,
    pr_number: prNum,
    promotion_head_sha: typeof prom.head_sha === 'string' ? prom.head_sha : null,
    promotion_pr_state: typeof prom.pr_state === 'string' ? prom.pr_state : null,
    github: {},
    vercel: await fetchVercelCmpBranchDeploymentEvidence(ticketId),
    factory_health: { skipped: true },
  };

  if (!token || !parsed) {
    evidence.github = {
      configured: false,
      hint: !token ? 'Missing GitHub PAT env.' : 'Missing GITHUB_REPO / CMP_GITHUB_REPOSITORY (owner/repo).',
    };
  } else {
    const { owner, repo } = parsed;
    evidence.github = {
      configured: true,
      repo: `${owner}/${repo}`,
    };
    if (prNum) {
      const headRef = automationBranch || expectedBranch;
      const ghExtra = await fetchPrEvidence({
        owner,
        repo,
        token,
        prNumber: prNum,
        baseRef,
        headRef,
      });
      evidence.github = { ...evidence.github, ...ghExtra };
    }
  }

  const healthUrl = String(
    cfg('CORPFLOW_FACTORY_HEALTH_URL', '') || cfg('FACTORY_HEALTH_URL', '') || cfg('CORPFLOW_PUBLIC_BASE_URL', ''),
  ).trim();
  if (healthUrl) {
    try {
      const u = resolveFactoryHealthFetchUrl(healthUrl);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(u, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      clearTimeout(t);
      const ok = res.ok;
      let bodyOk = ok;
      try {
        const j = await res.json();
        if (j && typeof j === 'object' && 'ok' in j) bodyOk = Boolean(/** @type {Record<string, unknown>} */ (j).ok);
      } catch {
        /* ignore */
      }
      evidence.factory_health = {
        attempted: true,
        ok: ok && bodyOk,
        status: res.status,
        url: u,
        detail: ok && bodyOk ? null : `HTTP ${res.status}`,
      };
    } catch (e) {
      evidence.factory_health = {
        attempted: true,
        ok: false,
        detail: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return evidence;
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ limit?: number, ticketIds?: string[], dryRun?: boolean }} opts
 * @returns {Promise<{ ok: boolean, processed: number, results: Array<Record<string, unknown>>, error?: string }>}
 */
export async function runTechnicalLeadObserver(prisma, opts = {}) {
  const limit = Math.min(50, Math.max(1, Number(opts.limit) || 15));
  const dryRun = Boolean(opts.dryRun);
  const explicit = Array.isArray(opts.ticketIds)
    ? opts.ticketIds.map((s) => String(s).trim()).filter(Boolean)
    : [];

  /** @type {import('@prisma/client').CmpTicket[]} */
  let tickets = [];
  if (explicit.length) {
    tickets = await prisma.cmpTicket.findMany({
      where: { id: { in: explicit.slice(0, 50) } },
      select: { id: true, status: true, stage: true, title: true, consoleJson: true },
    });
  } else {
    tickets = await prisma.cmpTicket.findMany({
      where: { status: 'Approved', stage: 'Build' },
      select: { id: true, status: true, stage: true, title: true, consoleJson: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  /** @type {Array<Record<string, unknown>>} */
  const results = [];

  for (const row of tickets) {
    const ticketId = row.id;
    const st = str(row.status);
    const sg = str(row.stage);
    const allowAnyStatus = explicit.length > 0;
    if (!allowAnyStatus && (st !== 'Approved' || sg !== 'Build')) {
      results.push({
        ticket_id: ticketId,
        skipped: true,
        reason: 'not_approved_build',
        status: st,
        stage: sg,
      });
      continue;
    }

    const norm = normalizeConsoleJson(row.consoleJson);
    const evidence = await buildEvidenceForTicket(ticketId, norm, { status: row.status, stage: row.stage });
    const { gaps: allGaps } = evaluateTechnicalLeadChecklistV1(evidence);
    const checklistFile = loadTechnicalLeadChecklistConfig();
    const disabled = new Set(
      Array.isArray(checklistFile?.disabled_rule_ids)
        ? checklistFile.disabled_rule_ids.map((x) => String(x))
        : [],
    );
    const gaps = disabled.size ? allGaps.filter((g) => !disabled.has(g.id)) : allGaps;
    const summary = buildTechnicalLeadSummaryFromGaps(gaps, evidence.dispatch_ok, evidence.pr_number);

    if (checklistFile && typeof checklistFile === 'object') {
      evidence.checklist_file = {
        version: checklistFile.version ?? null,
        disabled_rule_ids: Array.isArray(checklistFile.disabled_rule_ids) ? checklistFile.disabled_rule_ids : [],
      };
    }

    const llmLine = await maybeRephraseTechnicalLeadSummary({ summary, gaps });
    if (llmLine) evidence.llm_summary_rephrase = llmLine;

    /** @type {Record<string, unknown>} */
    const rowOut = {
      ticket_id: ticketId,
      checklist_version: TECHNICAL_LEAD_CHECKLIST_VERSION,
      gaps,
      summary,
      gap_count: gaps.length,
    };

    if (!dryRun) {
      const created = await prisma.technicalLeadAudit.create({
        data: {
          ticketId,
          checklistVersion: TECHNICAL_LEAD_CHECKLIST_VERSION,
          evidenceJson: evidence,
          gapsJson: gaps,
          summaryText: summary,
        },
        select: { id: true },
      });
      rowOut.audit_id = created.id;
    }

    results.push(rowOut);
  }

  return { ok: true, processed: results.length, results };
}
