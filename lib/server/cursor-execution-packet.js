/**
 * Deterministic, bounded execution-packet contract for remote Cursor dispatch.
 *
 * Durable issue history stays on GitHub, but only this extracted packet may
 * enter a Cloud Agent prompt.
 */
export const CURSOR_EXECUTION_PACKET_SCHEMA = 'corpflow.cursor_execution_packet.v1';
export const CURSOR_EXECUTION_PACKET_MARKER = 'CURRENT CURSOR PACKET';
export const LEGACY_CURSOR_EXECUTION_PACKET_MARKER = 'CODEX_PACKET_V1';
export const CURSOR_EXECUTION_PACKET_MAX_CHARS = 12000;
export const CURSOR_EXECUTION_KINDS = Object.freeze([
  'CODE_CHANGE',
  'BUSINESS_ACTION',
  'READ_ONLY_VERIFICATION',
  'DOCUMENTATION',
  'FORGE_TASK',
]);

const REQUIRED_FIELDS = Object.freeze([
  'execution_kind',
  'value_class',
  'expected_outcome',
  'context_budget',
  'execution_budget',
  'stop_condition',
]);

function normalizeText(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

function fieldValue(packet, labels) {
  for (const label of labels) {
    const match = packet.match(new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?${label}\\s*:\\s*([^\\n]+)`, 'i'));
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return null;
}

function countCurrentPacketMarkers(body) {
  return [...body.matchAll(/^\s*#{1,6}\s+CURRENT CURSOR PACKET\b/gim)].length;
}

function legacyPacketMarkers(body) {
  return [...body.matchAll(/^\s*CODEX_PACKET_V1\s*$/gim)];
}

function executionBudget(packet) {
  const explicit = fieldValue(packet, ['execution_budget', 'execution budget']);
  if (explicit) return explicit;
  const maxRuns = fieldValue(packet, ['max runs']);
  const maxRetries = fieldValue(packet, ['max retries']);
  const maxFollowUps = fieldValue(packet, ['max follow-ups']);
  return maxRuns && maxRetries && maxFollowUps
    ? `max_runs=${maxRuns}; max_retries=${maxRetries}; max_follow_ups=${maxFollowUps}`
    : null;
}

/**
 * Extract and validate the sole executable packet from an issue body.
 * `CURRENT CURSOR PACKET` is canonical. The bounded historical
 * `CODEX_PACKET_V1` format remains accepted for already-approved execution
 * work so a heading migration cannot strand it in the queue.
 */
export function validateCurrentCursorExecutionPacket(issue = {}) {
  const body = normalizeText(issue?.body);
  if (/NOT A CURSOR EXECUTION PACKET|controller[- /]only|reference[- /]only/i.test(body)) {
    return { ok: false, reason: 'controller_or_reference_issue', packet: null };
  }

  const currentMarkerCount = countCurrentPacketMarkers(body);
  const legacyMarkers = legacyPacketMarkers(body);
  if (currentMarkerCount === 0 && legacyMarkers.length === 0) {
    return { ok: false, reason: 'current_packet_missing', packet: null };
  }
  if (currentMarkerCount > 1 || (currentMarkerCount === 0 && legacyMarkers.length !== 1)) {
    return { ok: false, reason: 'current_packet_ambiguous', packet: null };
  }

  const marker =
    currentMarkerCount === 1
      ? CURSOR_EXECUTION_PACKET_MARKER
      : LEGACY_CURSOR_EXECUTION_PACKET_MARKER;
  const start =
    currentMarkerCount === 1
      ? body.search(/^\s*#{1,6}\s+CURRENT CURSOR PACKET\b/im)
      : legacyMarkers[0].index;
  const afterStart = start >= 0 ? body.slice(start) : '';
  const historicalStart = afterStart.search(/^\s*#{1,6}\s+Historical references\b/im);
  const packetEnd = start + (historicalStart >= 0 ? historicalStart : afterStart.length);
  if (currentMarkerCount === 1) {
    const legacyMarkersInsideCanonicalPacket = legacyMarkers.filter(
      (match) => Number(match.index) >= start && Number(match.index) < packetEnd,
    );
    // One legacy declaration inside the canonical wrapper is compatibility
    // metadata. Any declaration outside that packet, or duplicates inside it,
    // is a second executable candidate and must fail closed.
    if (
      legacyMarkers.length !== legacyMarkersInsideCanonicalPacket.length ||
      legacyMarkersInsideCanonicalPacket.length > 1
    ) {
      return { ok: false, reason: 'current_packet_ambiguous', packet: null };
    }
  }
  const packet = normalizeText(
    historicalStart >= 0 ? afterStart.slice(0, historicalStart) : afterStart,
  );
  if (!packet) return { ok: false, reason: 'current_packet_malformed', packet: null };
  if (packet.length > CURSOR_EXECUTION_PACKET_MAX_CHARS) {
    return {
      ok: false,
      reason: 'current_packet_oversized',
      packet: null,
      character_count: packet.length,
    };
  }

  const metadata = {
    execution_kind: fieldValue(packet, ['execution_kind', 'execution kind']),
    value_class: fieldValue(packet, ['value_class', 'value class']),
    expected_outcome: fieldValue(packet, ['expected_outcome', 'expected outcome']),
    context_budget: fieldValue(packet, ['context_budget', 'context budget', 'context']),
    execution_budget: executionBudget(packet),
    stop_condition: fieldValue(packet, ['stop_condition', 'stop condition']),
  };
  const missing = REQUIRED_FIELDS.filter((field) => !metadata[field]);
  if (!metadata.execution_kind) {
    return { ok: false, reason: 'execution_kind_required', packet: null };
  }
  if (metadata.execution_kind && !CURSOR_EXECUTION_KINDS.includes(metadata.execution_kind.toUpperCase())) {
    return {
      ok: false,
      reason: 'execution_kind_invalid',
      packet: null,
      execution_kind: metadata.execution_kind,
      allowed_execution_kinds: CURSOR_EXECUTION_KINDS,
    };
  }
  if (missing.length) {
    return { ok: false, reason: `frugal_metadata_missing:${missing.join(',')}`, packet: null, missing };
  }

  return {
    ok: true,
    schema: CURSOR_EXECUTION_PACKET_SCHEMA,
    marker,
    packet,
    character_count: packet.length,
    frugal_metadata: metadata,
    execution_kind: metadata.execution_kind.toUpperCase(),
  };
}
