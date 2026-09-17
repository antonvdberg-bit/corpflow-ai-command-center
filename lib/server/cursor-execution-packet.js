/**
 * Deterministic, bounded execution-packet contract for remote Cursor dispatch.
 *
 * Durable issue history stays on GitHub, but only this extracted packet may
 * enter a Cloud Agent prompt.
 */
export const CURSOR_EXECUTION_PACKET_SCHEMA = 'corpflow.cursor_execution_packet.v1';
export const CURSOR_EXECUTION_PACKET_MARKER = 'CURRENT CURSOR PACKET';
export const CURSOR_EXECUTION_PACKET_MAX_CHARS = 12000;

const REQUIRED_FIELDS = Object.freeze([
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
 * Extract and validate the sole current packet from an issue body.
 * Current human-readable headings are accepted; all newly authored packets
 * should use the canonical snake_case field labels.
 */
export function validateCurrentCursorExecutionPacket(issue = {}) {
  const body = normalizeText(issue?.body);
  if (/NOT A CURSOR EXECUTION PACKET|controller[- /]only|reference[- /]only/i.test(body)) {
    return { ok: false, reason: 'controller_or_reference_issue', packet: null };
  }

  const markerCount = countCurrentPacketMarkers(body);
  if (markerCount === 0) return { ok: false, reason: 'current_packet_missing', packet: null };
  if (markerCount !== 1) return { ok: false, reason: 'current_packet_ambiguous', packet: null };

  const match = body.match(/^\s*#{1,6}\s+(CURRENT CURSOR PACKET[^\n]*)([\s\S]*?)(?=^\s*#{1,6}\s+Historical references\b|$)/im);
  const packet = normalizeText(match ? `${match[1]}\n${match[2]}` : '');
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
    value_class: fieldValue(packet, ['value_class', 'value class']),
    expected_outcome: fieldValue(packet, ['expected_outcome', 'expected outcome']),
    context_budget: fieldValue(packet, ['context_budget', 'context budget', 'context']),
    execution_budget: executionBudget(packet),
    stop_condition: fieldValue(packet, ['stop_condition', 'stop condition']),
  };
  const missing = REQUIRED_FIELDS.filter((field) => !metadata[field]);
  if (missing.length) {
    return { ok: false, reason: `frugal_metadata_missing:${missing.join(',')}`, packet: null, missing };
  }

  return {
    ok: true,
    schema: CURSOR_EXECUTION_PACKET_SCHEMA,
    marker: CURSOR_EXECUTION_PACKET_MARKER,
    packet,
    character_count: packet.length,
    frugal_metadata: metadata,
  };
}
