#!/usr/bin/env node
/**
 * Vercel `ignoreCommand`:
 * - exit 1 → do NOT ignore (build/deploy)
 * - exit 0 → ignore (skip deploy)
 *
 * Doctrine (PR #635): automatic previews for every Cursor branch are off.
 * Production / `main` always builds. Narrow allowlists live in
 * `lib/server/vercel-preview-deploy-policy.js`.
 */
import { resolveVercelPreviewDeployDecision } from '../lib/server/vercel-preview-deploy-policy.js';

const ref = process.env.VERCEL_GIT_COMMIT_REF || '';
const target = process.env.VERCEL_ENV || '';
const commitMessage = process.env.VERCEL_GIT_COMMIT_MESSAGE || '';

const decision = resolveVercelPreviewDeployDecision({
  vercelEnv: target,
  gitRef: ref,
  commitMessage,
});

if (decision.build) {
  console.log(`Vercel deploy allowed (${decision.reason}) for ref=${ref || 'unknown'} env=${target || 'unknown'}`);
  process.exit(1);
}

console.log(`Vercel deploy skipped (${decision.reason}) for non-production ref: ${ref || 'unknown'}`);
process.exit(0);
