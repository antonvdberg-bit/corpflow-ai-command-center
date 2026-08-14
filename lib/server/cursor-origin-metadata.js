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
 * Extract a source issue only from explicit lineage fields.
 * Does not use the first `#N` mention in prose — that is how PR #947 attached
 * #721 from "Prospect Operations (#721)" instead of authoritative #701.
 *
 * @param {unknown} text
 * @returns {{ sourceIssue: number | null, reason: string, ambiguous: boolean, matches: number[] }}
 */
export function extractAuthoritativeSourceIssue(text) {
  const body = String(text || '');
  if (!body.trim()) {
    return { sourceIssue: null, reason: 'empty', ambiguous: false, matches: [] };
  }

  /** @type {Array<{ n: number, kind: string }>} */
  const found = [];
  const patterns = [
    { re: /source\s+issue\b[\s:*]*#(\d+)/gi, kind: 'source_issue' },
    { re: /source\s+item\b[\s:*]*#(\d+)/gi, kind: 'source_item' },
    { re: /selected\s+source\s+issue\s*:\s*#(\d+)/gi, kind: 'handoff' },
    { re: /\btracks?\s+#(\d+)/gi, kind: 'tracks' },
    { re: /\b(?:closes|fixes|resolves)\s+#(\d+)/gi, kind: 'closes' },
  ];
  for (const { re, kind } of patterns) {
    for (const m of body.matchAll(re)) {
      const n = toPositiveInt(m[1]);
      if (n) found.push({ n, kind });
    }
  }
  if (!found.length) {
    return { sourceIssue: null, reason: 'no_authoritative_source', ambiguous: false, matches: [] };
  }

  const strong = found.filter(
    (f) => f.kind === 'source_issue' || f.kind === 'source_item' || f.kind === 'handoff',
  );
  const strongUnique = [...new Set(strong.map((f) => f.n))];
  if (strongUnique.length > 1) {
    return {
      sourceIssue: null,
      reason: 'ambiguous_authoritative_source',
      ambiguous: true,
      matches: strongUnique,
    };
  }
  if (strongUnique.length === 1) {
    return {
      sourceIssue: strongUnique[0],
      reason: 'authoritative_pr_source',
      ambiguous: false,
      matches: strongUnique,
    };
  }

  const weakUnique = [...new Set(found.map((f) => f.n))];
  if (weakUnique.length > 1) {
    return {
      sourceIssue: null,
      reason: 'ambiguous_authoritative_source',
      ambiguous: true,
      matches: weakUnique,
    };
  }
  return {
    sourceIssue: weakUnique[0],
    reason: 'closing_keyword',
    ambiguous: false,
    matches: weakUnique,
  };
}

/**
 * Authoritative source for this PR/issue: body fields first, then factory
 * handoff comments. Operator-review comments are not a source of truth.
 *
 * @param {{
 *   prBody?: string | null,
 *   issueBody?: string | null,
 *   comments?: Array<{ body?: string | null }>,
 *   expectedSourceIssue?: number | null,
 * }} input
 */
export function collectAuthoritativeSourceIssue(input = {}) {
  const expected = toPositiveInt(input.expectedSourceIssue);
  if (expected) {
    return { sourceIssue: expected, reason: 'expected_source', ambiguous: false, matches: [expected] };
  }
  const fromBodies = extractAuthoritativeSourceIssue(
    [input.prBody, input.issueBody].filter(Boolean).join('\n'),
  );
  if (fromBodies.sourceIssue || fromBodies.ambiguous) return fromBodies;

  /** @type {number[]} */
  const handoff = [];
  for (const c of Array.isArray(input.comments) ? input.comments : []) {
    const body = String(c?.body || '');
    if (
      !/CORPFLOW FACTORY HANDOFF/i.test(body) &&
      !/corpflow\.factory_cursor_handoff\.v1/i.test(body)
    ) {
      continue;
    }
    const parsed = extractAuthoritativeSourceIssue(body);
    if (parsed.sourceIssue) handoff.push(parsed.sourceIssue);
  }
  const unique = [...new Set(handoff)];
  if (unique.length === 1) {
    return { sourceIssue: unique[0], reason: 'factory_handoff', ambiguous: false, matches: unique };
  }
  if (unique.length > 1) {
    return { sourceIssue: null, reason: 'ambiguous_handoff_source', ambiguous: true, matches: unique };
  }
  return { sourceIssue: null, reason: 'no_authoritative_source', ambiguous: false, matches: [] };
}

/**
 * True when an origin marker belongs to this exact PR / source / head.
 * Markers that identify a different issue, PR, or SHA are contamination.
 *
 * @param {CursorOriginMetadata | null} parsed
 * @param {{
 *   prNumber?: number | null,
 *   headSha?: string | null,
 *   expectedSourceIssue?: number | null,
 * }} input
 * @param {number | null} [authoritativeSource]
 */
export function originMarkerCompatible(parsed, input = {}, authoritativeSource = null) {
  if (!parsed || !(parsed.cursorAgentId || parsed.cursorRunId)) return false;
  const wantIssue = toPositiveInt(authoritativeSource ?? input.expectedSourceIssue);
  const wantPr = toPositiveInt(input.prNumber);
  const wantSha = normalizeSha(input.headSha);
  if (wantIssue && parsed.sourceIssue && parsed.sourceIssue !== wantIssue) return false;
  if (wantPr && parsed.prNumber && parsed.prNumber !== wantPr) return false;
  if (wantSha && parsed.headSha && !shaPrefixEqual(parsed.headSha, wantSha)) return false;
  return true;
}

/**
 * @param {unknown} text
 * @param {{ prNumber?: number | null, headSha?: string | null, expectedSourceIssue?: number | null }} input
 * @param {number | null} authoritativeSource
 */
function isCompatibleOriginEvidenceText(text, input, authoritativeSource) {
  if (!isCursorOriginEvidenceText(text)) return false;
  const parsed = parseCursorOriginMetadataFromText(text);
  if (parsed?.cursorAgentId || parsed?.cursorRunId) {
    return originMarkerCompatible(parsed, input, authoritativeSource);
  }
  const wantIssue = toPositiveInt(authoritativeSource ?? input.expectedSourceIssue);
  if (wantIssue) {
    const issueLine = String(text).match(/Issue:\s*#(\d+)/i);
    if (issueLine && Number(issueLine[1]) !== wantIssue) return false;
    const sourceLine = String(text).match(/source\s+issue\b[\s:*]*#(\d+)/i);
    if (sourceLine && Number(sourceLine[1]) !== wantIssue) return false;
  }
  const wantPr = toPositiveInt(input.prNumber);
  if (wantPr) {
    const prLine = String(text).match(/\bPR:\s*#(\d+)/i);
    if (prLine && Number(prLine[1]) !== wantPr) return false;
  }
  return true;
}

/**
 * Merge explicit markers + heuristics from PR/issue bodies and comments.
 *
 * Exact-PR / exact-head / exact-source lineage is authoritative (#949).
 * Unrelated `#N` mentions, historical comments, and other-issue origin
 * markers must not substitute a different issue or agent.
 *
 * @param {{
 *   prBody?: string | null,
 *   issueBody?: string | null,
 *   comments?: Array<{ body?: string | null }>,
 *   prNumber?: number | null,
 *   branch?: string | null,
 *   headSha?: string | null,
 *   expectedSourceIssue?: number | null,
 * }} input
 * @returns {CursorOriginMetadata}
 */
export function resolveCursorOriginMetadata(input = {}) {
  const allComments = Array.isArray(input.comments) ? input.comments : [];
  const generation = currentGenerationComments(allComments);
  const comments = generation.comments;
  const authoritative = collectAuthoritativeSourceIssue(input);

  /** @type {CursorOriginMetadata | null} */
  let fromMarker = null;
  for (const c of [...comments].reverse()) {
    const parsed = parseCursorOriginMetadataFromText(c?.body || '');
    if (originMarkerCompatible(parsed, input, authoritative.sourceIssue)) {
      fromMarker = parsed;
      break;
    }
  }
  // PR body is historical evidence once an explicit requeue boundary exists.
  if (!fromMarker && !generation.hasRequeueBoundary) {
    const parsed = parseCursorOriginMetadataFromText(input.prBody || '');
    if (originMarkerCompatible(parsed, input, authoritative.sourceIssue)) {
      fromMarker = parsed;
    }
  }

  // Run/agent heuristics must be restricted to current-generation origin
  // evidence that belongs to this PR/source. Before #862 repair, a factory
  // capacity packet on #882 that mentioned #881's run made #882 consume a
  // second WIP slot with the same ID. Before #949, #721 origin comments mixed
  // into PR #947 made the CI-green packet report the wrong issue/agent.
  const originEvidenceBlob = [
    generation.hasRequeueBoundary ? null : input.prBody,
    ...comments
      .map((c) => c?.body)
      .filter((body) => isCompatibleOriginEvidenceText(body, input, authoritative.sourceIssue)),
  ]
    .filter(Boolean)
    .join('\n');

  const prBodyAgent = extractCursorAgentIdFromText(input.prBody || '');
  const prBodyRun = extractCursorRunIdFromText(input.prBody || '');
  const evidenceAgent = extractCursorAgentIdFromText(originEvidenceBlob);
  let evidenceRun = extractCursorRunIdFromText(originEvidenceBlob);
  if (!evidenceRun) {
    const activated = originEvidenceBlob.match(/Cursor run identifier:\s*(run-[0-9a-f-]{20,})/i);
    const evidence = originEvidenceBlob.match(/Cursor run ID:\s*(run-[0-9a-f-]{20,})/i);
    evidenceRun = (activated && activated[1]) || (evidence && evidence[1]) || null;
  }

  let agentId = fromMarker?.cursorAgentId || null;
  let runId = fromMarker?.cursorRunId || null;
  if (prBodyAgent) {
    if (agentId && agentId !== prBodyAgent) {
      agentId = prBodyAgent;
      runId = prBodyRun || null;
    } else {
      agentId = prBodyAgent;
    }
  }
  if (!agentId) agentId = evidenceAgent || null;
  if (!runId) runId = prBodyRun || evidenceRun || null;

  const agentUrl =
    (agentId && fromMarker?.cursorAgentId === agentId ? fromMarker.cursorAgentUrl : null) ||
    (agentId ? `https://cursor.com/agents/${agentId}` : null);

  let sourceIssue = authoritative.ambiguous ? null : authoritative.sourceIssue;
  if (sourceIssue == null && fromMarker?.sourceIssue) {
    sourceIssue = fromMarker.sourceIssue;
  }
  if (sourceIssue == null) {
    const issueLine = originEvidenceBlob.match(/Issue:\s*#(\d+)/i);
    if (issueLine) sourceIssue = Number(issueLine[1]);
  }

  let activationRunId = fromMarker?.activationWorkflowRunId || null;
  if (!activationRunId) {
    const m =
      originEvidenceBlob.match(/Actions run ID:\s*(\d+)/i) ||
      originEvidenceBlob.match(/actions\/runs\/(\d+)/i);
    if (m) activationRunId = m[1];
  }

  return buildCursorOriginMetadata({
    ...(fromMarker && fromMarker.cursorAgentId === agentId ? fromMarker : {}),
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
 * @typedef {CursorOriginMetadata & {
 *   lineageStatus: 'authoritative' | 'inferred' | 'unknown' | 'ambiguous',
 *   lineageReason: string,
 * }} PrBoundCursorOrigin
 */

/**
 * Resolve origin for a CI/operator-review packet bound to one PR.
 * Fail closed (unknown/ambiguous) rather than substituting another issue.
 *
 * @param {{
 *   prBody?: string | null,
 *   issueBody?: string | null,
 *   comments?: Array<{ body?: string | null }>,
 *   prNumber?: number | null,
 *   branch?: string | null,
 *   headSha?: string | null,
 *   expectedSourceIssue?: number | null,
 * }} input
 * @returns {PrBoundCursorOrigin}
 */
export function resolvePrBoundCursorOrigin(input = {}) {
  const authoritative = collectAuthoritativeSourceIssue(input);
  const meta = resolveCursorOriginMetadata({
    ...input,
    expectedSourceIssue: authoritative.sourceIssue,
  });
  const lineageStatus = authoritative.ambiguous
    ? 'ambiguous'
    : authoritative.sourceIssue
      ? 'authoritative'
      : meta.sourceIssue
        ? 'inferred'
        : 'unknown';
  return {
    ...meta,
    sourceIssue: authoritative.ambiguous ? null : authoritative.sourceIssue || meta.sourceIssue,
    lineageStatus,
    lineageReason: authoritative.reason,
  };
}

/**
 * Header lines for OPERATOR REVIEW REQUIRED — CI GREEN.
 *
 * @param {PrBoundCursorOrigin | CursorOriginMetadata} origin
 */
export function formatCiOperatorReviewLineage(origin) {
  const unknown =
    origin && 'lineageStatus' in origin
      ? origin.lineageStatus === 'ambiguous' || origin.lineageStatus === 'unknown'
      : false;
  const source =
    unknown || origin?.sourceIssue == null
      ? unknown
        ? 'unknown'
        : 'n/a'
      : `#${origin.sourceIssue}`;
  const lines = [
    `Source issue: ${source}`,
    `Cursor agent: ${origin?.cursorAgentId || 'n/a'}`,
    `Cursor run: ${origin?.cursorRunId || 'n/a'}`,
  ];
  if (unknown) {
    lines.push(`Lineage: unknown (${origin?.lineageReason || 'no authoritative exact-PR source'})`);
  }
  return lines.join('\n');
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeSha(value) {
  const s = value == null ? '' : String(value).trim().toLowerCase();
  if (!s) return null;
  return s.length >= 7 ? s.slice(0, 40) : null;
}

/**
 * @param {unknown} a
 * @param {unknown} b
 */
function shaPrefixEqual(a, b) {
  const x = normalizeSha(a);
  const y = normalizeSha(b);
  if (!x || !y) return false;
  const n = Math.min(x.length, y.length);
  return n >= 7 && x.slice(0, n) === y.slice(0, n);
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
