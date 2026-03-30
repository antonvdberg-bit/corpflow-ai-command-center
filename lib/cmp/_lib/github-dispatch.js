/**
 * Trigger GitHub Actions via repository_dispatch for CMP sandbox branches.
 * Requires a PAT with `contents: write` (or classic repo scope) stored in Vercel secrets.
 */

import { cfg } from '../../server/runtime-config.js';

/**
 * @param {string} raw
 * @returns {{ owner: string, repo: string } | null}
 */
export function parseGithubRepo(raw) {
  const s = String(raw || '')
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '');
  const parts = s.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
}

/**
 * Fire `repository_dispatch` event_type `cmp_sandbox_start`.
 *
 * @param {{ ticketId: string, baseRef?: string }} opts
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function dispatchCmpSandboxStart(opts) {
  const token = String(
    cfg('CMP_GITHUB_TOKEN', '') || cfg('GH_WORKFLOW_TOKEN', ''),
  ).trim();
  const repoRaw = String(
    cfg('GITHUB_REPO', '') || cfg('CMP_GITHUB_REPOSITORY', ''),
  ).trim();
  const { owner, repo } = parseGithubRepo(repoRaw) || { owner: '', repo: '' };

  if (!token || !owner || !repo) {
    return {
      ok: false,
      error:
        'Missing CMP_GITHUB_TOKEN (or GH_WORKFLOW_TOKEN) and GITHUB_REPO (owner/repo).',
    };
  }

  const ticketId = String(opts.ticketId || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
  if (!ticketId) {
    return { ok: false, error: 'ticketId is required' };
  }

  const baseRef = String(opts.baseRef || cfg('CMP_SANDBOX_BASE_REF', '') || 'main')
    .trim()
    .replace(/[^a-zA-Z0-9._/-]/g, '')
    .slice(0, 200) || 'main';

  const url = `https://api.github.com/repos/${owner}/${repo}/dispatches`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: 'cmp_sandbox_start',
        client_payload: {
          ticket_id: ticketId,
          base_ref: baseRef,
        },
      }),
    });

    if (res.status === 204) {
      return { ok: true };
    }
    const text = await res.text();
    return {
      ok: false,
      error: `GitHub API ${res.status}: ${text.slice(0, 500)}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/**
 * Optional n8n (or other) webhook after sandbox dispatch — for operator visibility.
 *
 * @param {Record<string, unknown>} payload
 * @returns {Promise<void>}
 */
export async function notifyCmpAutomationWebhook(payload) {
  const url = String(cfg('N8N_CMP_WEBHOOK_URL', '')).trim();
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'cmp_sandbox_dispatch',
        ...payload,
      }),
    });
  } catch {
    /* non-fatal */
  }
}
