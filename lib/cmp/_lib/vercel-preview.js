/**
 * Optional: resolve latest READY Vercel preview URL for a CMP sandbox branch.
 * Requires VERCEL_TOKEN and VERCEL_PROJECT_ID (team scope: VERCEL_TEAM_ID optional).
 */

import { cfg } from '../../server/runtime-config.js';

/**
 * @param {string} ticketId - CMP ticket id (sanitized for branch name)
 * @returns {Promise<{ ok: boolean, preview_url?: string, error?: string }>}
 */
export async function fetchVercelPreviewUrlForCmpBranch(ticketId) {
  const token = String(cfg('VERCEL_TOKEN', '')).trim();
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
  const teamId = String(cfg('VERCEL_TEAM_ID', '')).trim();
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
