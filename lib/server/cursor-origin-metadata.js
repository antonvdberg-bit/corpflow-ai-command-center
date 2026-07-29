/**
 * Durable Cursor origin metadata for CI↔agent repair loops.
 * Persisted via GitHub issue/PR comments (no second DB).
 *
 * Marker format (HTML comment, machine-readable):
 * <!-- corpflow.cursor_origin_metadata.v1 {"sourceIssue":653,...} -->
 */

import {
  extractCursorAgentIdFromText,
  extractCursorRunIdFromText,
} from './cursor-cloud-agent-client.js';

export const CURSOR_ORIGIN_METADATA_SCHEMA = 'corpflow.cursor_origin_metadata.v1';
export const CURSOR_ORIGIN_METADATA_MARKER = 'corpflow.cursor_origin_metadata.v1';

/**
 * @typedef {{
 *   schema: string,
 *   sourceIssue: number | null,
 *   activationWorkflowRunId: string | null,
 *   cursorRunId: string | null,
 *   cursorAgentId: string | null,
 *   cursorAgentUrl: string | null,
 *   branch: string | null,
 *   prNumber: number | null,
 *   headSha: string | null,
 *   followUpAttemptCount: number,
 *   lastFailureFingerprint: string | null,
 *   lastFollowUpAt: string | null,
 *   lastFollowUpRunId: string | null,
 * }} CursorOriginMetadata
 */

/**
 * @param {Partial<CursorOriginMetadata>} input
 * @returns {CursorOriginMetadata}
 */
export function buildCursorOriginMetadata(input = {}) {
  return {
    schema: CURSOR_ORIGIN_METADATA_SCHEMA,
    sourceIssue: toPositiveInt(input.sourceIssue),
    activationWorkflowRunId: emptyToNull(input.activationWorkflowRunId),
    cursorRunId: emptyToNull(input.cursorRunId),
    cursorAgentId: emptyToNull(input.cursorAgentId),
    cursorAgentUrl: emptyToNull(input.cursorAgentUrl),
    branch: emptyToNull(input.branch),
    prNumber: toPositiveInt(input.prNumber),
    headSha: emptyToNull(input.headSha),
    followUpAttemptCount: Number.isFinite(Number(input.followUpAttemptCount))
      ? Math.max(0, Math.floor(Number(input.followUpAttemptCount)))
      : 0,
    lastFailureFingerprint: emptyToNull(input.lastFailureFingerprint),
    lastFollowUpAt: emptyToNull(input.lastFollowUpAt),
    lastFollowUpRunId: emptyToNull(input.lastFollowUpRunId),
  };
}

/**
 * @param {CursorOriginMetadata} meta
 */
export function formatCursorOriginMetadataComment(meta) {
  const m = buildCursorOriginMetadata(meta);
  const json = JSON.stringify(m);
  return `CURSOR ORIGIN METADATA

Source issue: ${m.sourceIssue != null ? `#${m.sourceIssue}` : 'n/a'}
Activation Actions run: ${m.activationWorkflowRunId || 'n/a'}
Cursor run ID: ${m.cursorRunId || 'n/a'}
Cursor agent ID: ${m.cursorAgentId || 'n/a'}
Cursor agent URL: ${m.cursorAgentUrl || 'n/a'}
Branch: ${m.branch || 'n/a'}
PR: ${m.prNumber != null ? `#${m.prNumber}` : 'n/a'}
Head SHA: ${m.headSha || 'n/a'}
Follow-up attempts: ${m.followUpAttemptCount}
Last failure fingerprint: ${m.lastFailureFingerprint || 'n/a'}

<!-- ${CURSOR_ORIGIN_METADATA_MARKER} ${json} -->
`;
}

/**
 * @param {string} body
 * @returns {CursorOriginMetadata | null}
 */
export function parseCursorOriginMetadataFromText(body) {
  const text = String(body || '');
  const marker = text.match(
    new RegExp(`<!--\\s*${CURSOR_ORIGIN_METADATA_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`, 'i'),
  );
  if (marker) {
    try {
      return buildCursorOriginMetadata(JSON.parse(marker[1]));
    } catch {
      // fall through to heuristic parse
    }
  }
  return null;
}

/**
 * Merge explicit markers + heuristics from PR/issue bodies and comments.
 *
 * @param {{
 *   prBody?: string | null,
 *   issueBody?: string | null,
 *   comments?: Array<{ body?: string | null }>,
 *   prNumber?: number | null,
 *   branch?: string | null,
 *   headSha?: string | null,
 * }} input
 * @returns {CursorOriginMetadata}
 */
export function resolveCursorOriginMetadata(input = {}) {
  const comments = Array.isArray(input.comments) ? input.comments : [];
  /** @type {CursorOriginMetadata | null} */
  let fromMarker = null;
  for (const c of [...comments].reverse()) {
    const parsed = parseCursorOriginMetadataFromText(c?.body || '');
    if (parsed?.cursorAgentId || parsed?.cursorRunId) {
      fromMarker = parsed;
      break;
    }
  }
  if (!fromMarker) {
    fromMarker = parseCursorOriginMetadataFromText(input.prBody || '');
  }

  const blob = [input.prBody, input.issueBody, ...comments.map((c) => c?.body)]
    .filter(Boolean)
    .join('\n');

  const agentId =
    fromMarker?.cursorAgentId ||
    extractCursorAgentIdFromText(blob) ||
    null;
  let runId = fromMarker?.cursorRunId || extractCursorRunIdFromText(blob) || null;
  if (!runId) {
    const activated = blob.match(/Cursor run identifier:\s*(run-[0-9a-f-]{20,})/i);
    const evidence = blob.match(/Cursor run ID:\s*(run-[0-9a-f-]{20,})/i);
    runId = (activated && activated[1]) || (evidence && evidence[1]) || null;
  }
  const agentUrl =
    fromMarker?.cursorAgentUrl ||
    (agentId ? `https://cursor.com/agents/${agentId}` : null);

  let sourceIssue = fromMarker?.sourceIssue || null;
  if (sourceIssue == null) {
    const issueMatch =
      blob.match(/Issue:\s*#(\d+)/i) ||
      blob.match(/Tracks?\s+#(\d+)/i) ||
      blob.match(/source issue\s*#(\d+)/i) ||
      blob.match(/\b#(\d+)\b/);
    if (issueMatch) sourceIssue = Number(issueMatch[1]);
  }

  let activationRunId = fromMarker?.activationWorkflowRunId || null;
  if (!activationRunId) {
    const m = blob.match(/Actions run ID:\s*(\d+)/i) || blob.match(/actions\/runs\/(\d+)/i);
    if (m) activationRunId = m[1];
  }

  return buildCursorOriginMetadata({
    ...(fromMarker || {}),
    sourceIssue,
    activationWorkflowRunId: activationRunId,
    cursorRunId: runId,
    cursorAgentId: agentId,
    cursorAgentUrl: agentUrl,
    branch: input.branch || fromMarker?.branch || null,
    prNumber: input.prNumber ?? fromMarker?.prNumber ?? null,
    headSha: input.headSha || fromMarker?.headSha || null,
  });
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function emptyToNull(value) {
  const s = value == null ? '' : String(value).trim();
  return s || null;
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function toPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}
