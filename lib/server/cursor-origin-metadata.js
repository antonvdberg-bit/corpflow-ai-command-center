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
  return `CURSOR ORIGIN METADATA\n\nSource issue: ${m.sourceIssue != null ? `#${m.sourceIssue}` : 'n/a'}\nActivation Actions run: ${m.activationWorkflowRunId || 'n/a'}\nCursor run ID: ${m.cursorRunId || 'n/a'}\nCursor agent ID: ${m.cursorAgentId || 'n/a'}\nCursor agent URL: ${m.cursorAgentUrl || 'n/a'}\nBranch: ${m.branch || 'n/a'}\nPR: ${m.prNumber != null ? `#${m.prNumber}` : 'n/a'}\nHead SHA: ${m.headSha || 'n/a'}\nFollow-up attempts: ${m.followUpAttemptCount}\nLast failure fingerprint: ${m.lastFailureFingerprint || 'n/a'}\n\n<!-- ${CURSOR_ORIGIN_METADATA_MARKER} ${json} -->\n`;
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
 * True only for text that is itself Cursor-origin evidence. This intentionally
 * excludes factory capacity/handoff packets: those may quote another issue's
 * run id and must never make the current issue look live.
 *
 * @param {unknown} value
 */
function isCursorOriginEvidenceText(value) {
  const text = String(value || '');
  if (!text) return false;
  if (/CORPFLOW FACTORY HANDOFF/i.test(text)) return false;
  return (
    /CURSOR ORIGIN METADATA/i.test(text) ||
    /CURSOR DISPATCH ACTIVATED/i.test(text) ||
    /Cursor run identifier:\s*run-[0-9a-f-]{20,}/i.test(text) ||
    /Cursor run ID:\s*run-[0-9a-f-]{20,}/i.test(text) ||
    /Cursor agent ID:\s*bc-[0-9a-f-]{20,}/i.test(text)
  );
}

/**
 * A higher-generation CURSOR REQUEUE is a durable boundary: origin evidence
 * before that marker belongs to the retired generation and must not make the
 * new generation look completed/live.
 *
 * @param {Array<{ body?: string | null }>} comments
 */
function currentGenerationComments(comments) {
  const list = Array.isArray(comments) ? comments : [];
  let latestRequeueIndex = -1;
  for (let i = 0; i < list.length; i += 1) {
    if (/<!--\s*corpflow\.cursor_requeue\.v1\s+\{/i.test(String(list[i]?.body || ''))) {
      latestRequeueIndex = i;
    }
  }
  return {
    comments: latestRequeueIndex >= 0 ? list.slice(latestRequeueIndex + 1) : list,
    hasRequeueBoundary: latestRequeueIndex >= 0,
  };
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
  const allComments = Array.isArray(input.comments) ? input.comments : [];
  const generation = currentGenerationComments(allComments);
  const comments = generation.comments;

  /** @type {CursorOriginMetadata | null} */
  let fromMarker = null;
  for (const c of [...comments].reverse()) {
    const parsed = parseCursorOriginMetadataFromText(c?.body || '');
    if (parsed?.cursorAgentId || parsed?.cursorRunId) {
      fromMarker = parsed;
      break;
    }
  }
  // PR body is historical evidence once an explicit requeue boundary exists.
  if (!fromMarker && !generation.hasRequeueBoundary) {
    fromMarker = parseCursorOriginMetadataFromText(input.prBody || '');
  }

  // Keep full text only for non-liveness metadata such as source issue hints.
  const blob = [input.prBody, input.issueBody, ...allComments.map((c) => c?.body)]
    .filter(Boolean)
    .join('\n');

  // Run/agent heuristics must be restricted to current-generation origin
  // evidence. Before #862 repair, a factory capacity packet on #882 that
  // mentioned #881's run made #882 consume a second WIP slot with the same ID.
  // Likewise, a valid generation-2 requeue of #881 was rejected because its
  // generation-1 origin marker still looked like a completed current agent.
  const originEvidenceBlob = [
    generation.hasRequeueBoundary ? null : input.prBody,
    ...comments.map((c) => c?.body).filter(isCursorOriginEvidenceText),
  ]
    .filter(Boolean)
    .join('\n');

  const agentId =
    fromMarker?.cursorAgentId ||
    extractCursorAgentIdFromText(originEvidenceBlob) ||
    null;
  let runId = fromMarker?.cursorRunId || extractCursorRunIdFromText(originEvidenceBlob) || null;
  if (!runId) {
    const activated = originEvidenceBlob.match(/Cursor run identifier:\s*(run-[0-9a-f-]{20,})/i);
    const evidence = originEvidenceBlob.match(/Cursor run ID:\s*(run-[0-9a-f-]{20,})/i);
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
    const m = originEvidenceBlob.match(/Actions run ID:\s*(\d+)/i) || originEvidenceBlob.match(/actions\/runs\/(\d+)/i);
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
