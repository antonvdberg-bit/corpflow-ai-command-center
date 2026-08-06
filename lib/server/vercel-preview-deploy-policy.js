/**
 * Policy for Vercel Git deployments after PR #635 (stop automatic branch previews).
 *
 * Default: only Production / `main` builds.
 * Narrow exceptions: explicit workstream branches or commit-message opt-in.
 *
 * Used by `scripts/vercel-ignore-preview-deploys.mjs` (Vercel ignoreCommand).
 * Exit semantics for ignoreCommand: build when this returns true.
 */

/**
 * @param {{
 *   vercelEnv?: string | null,
 *   gitRef?: string | null,
 *   commitMessage?: string | null,
 * }} args
 * @returns {{ build: boolean, reason: string }}
 */
export function resolveVercelPreviewDeployDecision(args = {}) {
  const vercelEnv = String(args.vercelEnv || '').trim().toLowerCase();
  const gitRef = String(args.gitRef || '').trim();
  const commitMessage = String(args.commitMessage || '');

  if (vercelEnv === 'production' || gitRef === 'main') {
    return { build: true, reason: 'production_or_main' };
  }

  // CIPC Desk private preview workstream (issue #640 / PR #643).
  if (/^cursor\/cipc-desk(-|$)/i.test(gitRef)) {
    return { build: true, reason: 'cipc_desk_preview_allowlist' };
  }

  // Company Master runtime workstream (issue #776 / PR #781).
  if (/^cursor\/company-master(-|$)/i.test(gitRef)) {
    return { build: true, reason: 'company_master_preview_allowlist' };
  }

  // Explicit opt-in for a single commit without widening the default allowlist.
  if (/\[allow-vercel-preview\]/i.test(commitMessage)) {
    return { build: true, reason: 'commit_message_opt_in' };
  }

  return { build: false, reason: 'non_production_preview_skipped' };
}
