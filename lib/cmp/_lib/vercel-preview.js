/**
 * Optional: resolve latest READY Vercel preview URL for a CMP sandbox branch.
 * Requires VERCEL_TOKEN and VERCEL_PROJECT_ID (team scope: VERCEL_TEAM_ID optional).
 */

import { cfg } from '../../server/runtime-config.js';

function cmpSandboxBranchName(ticketId) {
  const safeTicket = String(ticketId || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
  if (!safeTicket) return '';
  return `cmp/${safeTicket}`;
}

function vercelTeamQueryParam() {
  return String(cfg('VERCEL_TEAM_ID', '') || cfg('VERCEL_ORG_ID', '')).trim();
}

/**
 * Latest preview deployment(s) for `cmp/{ticketId}` — used by Technical Lead evidence (status, not only URL).
 *
 * @param {string} ticketId
 * @returns {Promise<{
 *   skipped: true,
 *   reason: string,
 * } | {
 *   skipped: false,
 *   branch: string,
 *   fetch_ok: boolean,
 *   fetch_status?: number,
 *   error?: string,
 *   deployments_for_branch: number,
 *   latest: null | {
 *     uid: string,
 *     readyState: string,
 *     url: string | null,
 *     createdAt: string | null,
 *     githubCommitSha: string | null,
 *   },
 * }>}
 */
export async function fetchVercelCmpBranchDeploymentEvidence(ticketId) {
  const token = String(cfg('VERCEL_TOKEN', '') || cfg('VERCEL_AUTH_TOKEN', '')).trim();
  const projectId = String(cfg('VERCEL_PROJECT_ID', '')).trim();
  if (!token || !projectId) {
    return { skipped: true, reason: 'vercel_token_or_project_id_missing' };
  }

  const branch = cmpSandboxBranchName(ticketId);
  if (!branch) return { skipped: true, reason: 'missing_ticket' };

  const teamId = vercelTeamQueryParam();
  const q = new URLSearchParams({ projectId, limit: '40', target: 'preview' });
  if (teamId) q.set('teamId', teamId);
  const url = `https://api.vercel.com/v6/deployments?${q.toString()}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        skipped: false,
        branch,
        fetch_ok: false,
        fetch_status: res.status,
        error: text.slice(0, 300),
        deployments_for_branch: 0,
        latest: null,
      };
    }
    const data = await res.json();
    const list = Array.isArray(data.deployments) ? data.deployments : [];
    const forBranch = list.filter(
      (d) =>
        d &&
        typeof d.meta?.githubCommitRef === 'string' &&
        d.meta.githubCommitRef === branch,
    );
    forBranch.sort((a, b) => {
      const ta = typeof a.createdAt === 'number' ? a.createdAt : Date.parse(String(a.createdAt || 0)) || 0;
      const tb = typeof b.createdAt === 'number' ? b.createdAt : Date.parse(String(b.createdAt || 0)) || 0;
      return tb - ta;
    });
    const top = forBranch[0];
    const latest = top
      ? {
          uid: typeof top.uid === 'string' ? top.uid : String(top.uid || ''),
          readyState: typeof top.readyState === 'string' ? top.readyState : String(top.readyState || ''),
          url:
            typeof top.url === 'string' && top.url.trim()
              ? top.url.trim().startsWith('http')
                ? top.url.trim()
                : `https://${top.url.trim()}`
              : null,
          createdAt: top.createdAt != null ? String(top.createdAt) : null,
          githubCommitSha:
            typeof top.meta?.githubCommitSha === 'string'
              ? top.meta.githubCommitSha
              : typeof top.meta?.githubCommitId === 'string'
                ? top.meta.githubCommitId
                : null,
        }
      : null;

    return {
      skipped: false,
      branch,
      fetch_ok: true,
      fetch_status: res.status,
      deployments_for_branch: forBranch.length,
      latest,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      skipped: false,
      branch,
      fetch_ok: false,
      error: msg,
      deployments_for_branch: 0,
      latest: null,
    };
  }
}

/**
 * Latest READY preview URL for `cmp/{ticketId}`.
 *
 * @param {string} ticketId
 * @returns {Promise<{ ok: boolean, preview_url?: string, error?: string }>}
 */
export async function fetchVercelPreviewUrlForCmpBranch(ticketId) {
  const token = String(cfg('VERCEL_TOKEN', '') || cfg('VERCEL_AUTH_TOKEN', '')).trim();
  const projectId = String(cfg('VERCEL_PROJECT_ID', '')).trim();
  if (!token || !projectId) {
    return { ok: false, error: 'not_configured' };
  }

  const safeTicket = String(ticketId || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
  if (!safeTicket) return { ok: false, error: 'missing_ticket' };

  const branch = `cmp/${safeTicket}`;
  const teamId = vercelTeamQueryParam();
  const q = new URLSearchParams({ projectId, limit: '25', target: 'preview' });
  if (teamId) q.set('teamId', teamId);
  const url = `https://api.vercel.com/v6/deployments?${q.toString()}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `vercel_${res.status}:${text.slice(0, 200)}` };
    }
    const data = await res.json();
    const list = Array.isArray(data.deployments) ? data.deployments : [];
    const match = list.find(
      (d) =>
        d &&
        d.readyState === 'READY' &&
        typeof d.meta?.githubCommitRef === 'string' &&
        d.meta.githubCommitRef === branch,
    );
    if (!match) {
      return { ok: false, error: 'no_ready_deployment_for_branch' };
    }
    const host = typeof match.url === 'string' ? match.url.trim() : '';
    if (!host) return { ok: false, error: 'deployment_missing_url' };
    const preview_url = host.startsWith('http') ? host : `https://${host}`;
    return { ok: true, preview_url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
