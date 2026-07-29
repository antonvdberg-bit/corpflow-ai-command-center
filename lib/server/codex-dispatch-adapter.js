/**
 * Codex dispatch adapter — bounded unattended trigger packets (Track B).
 *
 * Codex handles research/review/isolated packets only. Does NOT own Cursor
 * active files or implementation issues. Supported route: GHA workflow_dispatch
 * packet + Operator Bridge issue comment template (no live API in this module).
 *
 * @see docs/operations/ACTIVE_AGENT_CONTROL_LOOP_V1.md
 * @see docs/execution/CODEX_CLOUD_ACTIVATION_PACKET_V1.md
 */

export const CODEX_DISPATCH_ADAPTER_SCHEMA = 'corpflow.codex_dispatch_adapter.v1';

export const CODEX_DISPATCH_ADAPTER_VERSION = 1;

/** Supported unattended trigger surface (Phase 4 — bounded). */
export const CODEX_TRIGGER_SURFACE = 'github_actions_workflow_dispatch';

export const CODEX_PACKET_TYPES = Object.freeze([
  'research',
  'review',
  'adr-lite',
  'isolated-fix',
]);

export const CODEX_FORBIDDEN_PACKET_TYPES = Object.freeze([
  'implementation',
  'cursor-lifecycle',
  'production-deploy',
  'schema-migration',
]);

/**
 * @typedef {{
 *   schema: string,
 *   version: number,
 *   triggerSurface: string,
 *   packetType: string,
 *   objectRef: string,
 *   linkedIssue: number | null,
 *   branchSuggestion: string,
 *   executorPrompt: string,
 *   returnCommentRequired: boolean,
 *   cursorConflictCheck: boolean,
 *   workflowInputs: Record<string, string>,
 * }} CodexDispatchTriggerPacket
 */

/**
 * @param {unknown} value
 */
function str(value) {
  return value == null ? '' : String(value).trim();
}

/**
 * @param {{ owner?: string, objectType?: string, objectRef?: string, executorPrompt?: string, recommendedNextAction?: string, gated?: boolean }} routing
 */
export function isCodexEligibleRouting(routing) {
  if (!routing || typeof routing !== 'object') return false;
  if (routing.owner !== 'codex') return false;
  if (routing.gated === true) return false;
  const ref = str(routing.objectRef).toLowerCase();
  if (/implementation|dispatch:cursor|schema|production/.test(ref)) return false;
  return true;
}

/**
 * Infer packet type from routing text.
 *
 * @param {{ executorPrompt?: string, recommendedNextAction?: string, objectRef?: string }} routing
 */
export function inferCodexPacketType(routing) {
  const blob = [
    str(routing.executorPrompt),
    str(routing.recommendedNextAction),
    str(routing.objectRef),
  ]
    .join(' ')
    .toLowerCase();
  if (/adr|decision memo|architecture/.test(blob)) return 'adr-lite';
  if (/review|audit|gap matrix/.test(blob)) return 'review';
  if (/isolated|small fix|single file/.test(blob)) return 'isolated-fix';
  return 'research';
}

/**
 * @param {Array<{ provider?: string, issueNumber?: number | null, phase?: string }>} activeRuns
 * @param {{ linkedIssue?: number | null }} packet
 */
export function wouldConflictWithCursor(activeRuns, packet) {
  const issue = packet.linkedIssue;
  if (issue == null) return false;
  return (activeRuns || []).some(
    (r) =>
      r.provider === 'cursor' &&
      r.issueNumber === issue &&
      r.phase !== 'complete' &&
      r.phase !== 'blocked',
  );
}

/**
 * Build a testable Codex dispatch trigger packet (no network I/O).
 *
 * @param {{ owner?: string, objectType?: string, objectRef?: string, executorPrompt?: string, recommendedNextAction?: string, gated?: boolean, link?: string | null }} routing
 * @param {{ linkedIssue?: number | null, activeCursorRuns?: Array<{ provider?: string, issueNumber?: number | null, phase?: string }>, suffix?: string }} [opts]
 */
export function buildCodexDispatchTriggerPacket(routing, opts = {}) {
  const objectRef = str(routing?.objectRef) || 'unknown';
  const packetType = inferCodexPacketType(routing || {});
  const linkedIssue =
    opts.linkedIssue != null
      ? Number(opts.linkedIssue)
      : /issue[:\s#]*(\d+)/i.test(objectRef)
        ? Number(objectRef.match(/issue[:\s#]*(\d+)/i)?.[1])
        : null;

  if (CODEX_FORBIDDEN_PACKET_TYPES.includes(packetType)) {
    return {
      valid: false,
      errors: [`packet type ${packetType} is forbidden for Codex adapter`],
      packet: null,
    };
  }

  if (!isCodexEligibleRouting(routing || {})) {
    return {
      valid: false,
      errors: ['routing is not codex-eligible or is gated'],
      packet: null,
    };
  }

  if (wouldConflictWithCursor(opts.activeCursorRuns || [], { linkedIssue })) {
    return {
      valid: false,
      errors: [`Cursor already active on issue #${linkedIssue} — Codex must not take same packet`],
      packet: null,
    };
  }

  const suffix = str(opts.suffix) || 'codex';
  const slug = objectRef
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  const branchSuggestion = `codex/${slug}-${suffix}`;

  const prompt =
    str(routing?.executorPrompt) ||
    str(routing?.recommendedNextAction) ||
    `Research/review packet for ${objectRef}`;

  /** @type {CodexDispatchTriggerPacket} */
  const packet = {
    schema: CODEX_DISPATCH_ADAPTER_SCHEMA,
    version: CODEX_DISPATCH_ADAPTER_VERSION,
    triggerSurface: CODEX_TRIGGER_SURFACE,
    packetType,
    objectRef,
    linkedIssue,
    branchSuggestion,
    executorPrompt: prompt.slice(0, 2000),
    returnCommentRequired: true,
    cursorConflictCheck: true,
    workflowInputs: {
      activation_mode: 'codex_packet',
      packet_type: packetType,
      object_ref: objectRef,
      target_branch: branchSuggestion,
    },
  };

  return { valid: true, errors: [], packet };
}

/**
 * @param {unknown} raw
 */
export function validateCodexTriggerPacket(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['packet must be an object'] };
  }
  const p = /** @type {Record<string, unknown>} */ (raw);
  if (p.schema !== CODEX_DISPATCH_ADAPTER_SCHEMA) errors.push('invalid schema');
  if (!CODEX_PACKET_TYPES.includes(String(p.packetType || ''))) {
    errors.push(`packetType must be one of: ${CODEX_PACKET_TYPES.join(', ')}`);
  }
  if (!str(p.objectRef)) errors.push('objectRef required');
  if (!str(p.executorPrompt)) errors.push('executorPrompt required');
  if (p.triggerSurface !== CODEX_TRIGGER_SURFACE) {
    errors.push(`triggerSurface must be ${CODEX_TRIGGER_SURFACE}`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Format Operator Bridge comment for Codex queue (notification path).
 *
 * @param {CodexDispatchTriggerPacket} packet
 */
export function formatCodexBridgeComment(packet) {
  return [
    '### Codex dispatch trigger (bounded)',
    '',
    `**Packet type:** ${packet.packetType}`,
    `**Object:** ${packet.objectRef}`,
    `**Branch:** \`${packet.branchSuggestion}\``,
    `**Trigger:** \`${packet.triggerSurface}\` with inputs \`activation_mode=codex_packet\``,
    '',
    '**Executor prompt:**',
    packet.executorPrompt,
    '',
    '**Return required:** comment on this issue with CODEX_PACKET_COMPLETE marker.',
    '',
    '_Codex must not claim Cursor implementation issues or edit Track A dispatcher files._',
  ].join('\n');
}
