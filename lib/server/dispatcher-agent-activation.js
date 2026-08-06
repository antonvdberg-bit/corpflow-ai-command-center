/**
 * Dispatcher agent activation — dry-run plan builder (Phase 0–1).
 *
 * Consumes `corpflow.business_operations_dispatcher.v1` JSON and produces a
 * grouped activation plan. No I/O, no secrets, no executor calls.
 *
 * @see docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md
 */

import { BUSINESS_OPS_DISPATCHER_SCHEMA } from './business-operations-dispatcher.js';
import { CORPFLOW_CURSOR_REPO_URL } from './cursor-cloud-agent-client.js';

export const DISPATCHER_ACTIVATION_SCHEMA = 'corpflow.dispatcher_agent_activation.v1';

/** Prefix for `objectRef` on manual direct-issue Cursor activations. */
export const DISPATCHER_DIRECT_ISSUE_OBJECT_REF_PREFIX = 'issue:';

export const CORPFLOW_GITHUB_REPO_FULL_NAME = 'antonvdberg-bit/corpflow-ai-command-center';

export { BUSINESS_OPS_DISPATCHER_SCHEMA };

export const DISPATCHER_ACTIVATION_MODE_DRY_RUN = 'dry_run';

export const DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE = 'cursor_live';

/** @typedef {'dry_run' | 'cursor_live'} DispatcherActivationMode */

export const DISPATCHER_ACTIVATION_DEDUPE_VERSION = 1;

/**
 * `openhands` is a valid grouping owner so a future OpenHands-eligible
 * routing can be classified without throwing, but it is DRY-RUN ONLY here —
 * scheduled/unattended OpenHands activation is not enabled by this module.
 * See `SKIP_OPENHANDS_NOT_ENABLED` in `selectActivationDecisions` below and
 * `lib/openhands/dispatcher-adapter.js`. Controlling issue: #743.
 *
 * @typedef {'cursor' | 'codex' | 'anton' | 'n8n' | 'no_action' | 'openhands'} ActivationOwner
 */

/** @typedef {import('./business-operations-dispatcher.js').BusinessOpsRouting} BusinessOpsRouting */

const OWNER_ORDER = /** @type {const} */ (['cursor', 'codex', 'anton', 'n8n', 'no_action', 'openhands']);

export const DISPATCHER_ACTIVATION_AUDIT_FILENAME = 'activation-audit.json';

export const THROUGHPUT_PACKET_REQUIRED_FIELDS = /** @type {const} */ ([
  'business_outcome',
  'linked_issue_or_ticket',
  'delivery_surface',
  'evidence_required',
  'cost_risk_cap',
  'allowed_category',
]);

export const THROUGHPUT_PACKET_ALLOWED_CATEGORIES = /** @type {const} */ ([
  'revenue',
  'client-delivery',
  'production-verification',
  'lead-rescue',
  'lux-recovery',
  'paid-pilot',
  'ops-unblocker',
]);

/** @typedef {typeof THROUGHPUT_PACKET_ALLOWED_CATEGORIES[number]} ThroughputPacketCategory */

/** @type {Record<ActivationOwner, string>} */
export const DRY_RUN_ACTION_BY_OWNER = {
  cursor: 'WOULD_ACTIVATE_CURSOR_CLOUD_API',
  codex: 'WOULD_ACTIVATE_CODEX_CLOUD',
  anton: 'SKIP_OPERATOR_GATE',
  n8n: 'SKIP_N8N_HOSTED',
  no_action: 'SKIP_NO_ACTION',
  // Dry-run label only — OpenHands has no live activation path in this
  // module. See SKIP_OPENHANDS_NOT_ENABLED in selectActivationDecisions.
  openhands: 'WOULD_ROUTE_OPENHANDS_PRIVATE_WORKER',
};

/**
 * @param {string | null | undefined} text
 * @param {number} [max]
 */
function truncatePrompt(text, max = 400) {
  const s = String(text || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

/**
 * @param {unknown} value
 */
function normalizePacketField(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry ?? '').trim())
      .filter(Boolean)
      .join('; ');
  }
  return String(value ?? '').trim();
}

/**
 * @param {BusinessOpsRouting | Record<string, unknown> | null | undefined} routing
 */
export function extractThroughputPacket(routing) {
  const rawRouting = routing && typeof routing === 'object' ? routing : {};
  const rawPacket =
    (rawRouting.throughput_packet && typeof rawRouting.throughput_packet === 'object'
      ? rawRouting.throughput_packet
      : null) ||
    (rawRouting.throughputPacket && typeof rawRouting.throughputPacket === 'object'
      ? rawRouting.throughputPacket
      : null);

  if (!rawPacket) return null;

  return Object.fromEntries(
    THROUGHPUT_PACKET_REQUIRED_FIELDS.map((field) => [
      field,
      normalizePacketField(rawPacket[field]),
    ]),
  );
}

/**
 * @param {BusinessOpsRouting | Record<string, unknown> | null | undefined} routing
 * @returns {{
 *   eligible: boolean,
 *   packet: Record<string, string> | null,
 *   missing_fields: string[],
 *   invalid_fields: string[],
 *   reason: string,
 * }}
 */
export function evaluateThroughputPacketGate(routing) {
  const packet = extractThroughputPacket(routing);
  if (!packet) {
    return {
      eligible: false,
      packet: null,
      missing_fields: [...THROUGHPUT_PACKET_REQUIRED_FIELDS],
      invalid_fields: [],
      reason: 'missing throughput_packet',
    };
  }

  const missing_fields = THROUGHPUT_PACKET_REQUIRED_FIELDS.filter((field) => !packet[field]);
  const invalid_fields = [];
  const category = packet.allowed_category;
  if (category && !THROUGHPUT_PACKET_ALLOWED_CATEGORIES.includes(
    /** @type {ThroughputPacketCategory} */ (category),
  )) {
    invalid_fields.push('allowed_category');
  }

  const eligible = missing_fields.length === 0 && invalid_fields.length === 0;
  let reason = 'throughput packet accepted';
  if (!eligible) {
    const parts = [];
    if (missing_fields.length) parts.push(`missing ${missing_fields.join(', ')}`);
    if (invalid_fields.length) {
      parts.push(
        `invalid ${invalid_fields.join(', ')} (allowed: ${THROUGHPUT_PACKET_ALLOWED_CATEGORIES.join(', ')})`,
      );
    }
    reason = `throughput packet rejected — ${parts.join('; ')}`;
  }

  return {
    eligible,
    packet,
    missing_fields,
    invalid_fields,
    reason,
  };
}

/**
 * @param {BusinessOpsRouting} routing
 * @param {string} mode
 */
function formatPlanEntry(routing, mode) {
  const owner = routing?.owner;
  const action =
    owner && DRY_RUN_ACTION_BY_OWNER[owner]
      ? DRY_RUN_ACTION_BY_OWNER[owner]
      : 'SKIP_UNKNOWN_OWNER';

  return {
    objectRef: String(routing?.objectRef || 'unknown'),
    objectType: routing?.objectType || 'monitor',
    severity: routing?.severity || 'info',
    gated: Boolean(routing?.gated),
    action,
    mode,
    executorPrompt: truncatePrompt(routing?.executorPrompt),
    reason: String(routing?.reason || '').trim(),
    throughput_packet: extractThroughputPacket(routing),
  };
}

/**
 * @param {import('./business-operations-dispatcher.js').BusinessOpsRouting[] | unknown} routings
 * @param {string} mode
 */
export function groupRoutingsForActivationPlan(routings, mode = DISPATCHER_ACTIVATION_MODE_DRY_RUN) {
  /** @type {Record<ActivationOwner, ReturnType<typeof formatPlanEntry>[]>} */
  const plan = {
    cursor: [],
    codex: [],
    anton: [],
    n8n: [],
    no_action: [],
    openhands: [],
  };

  const list = Array.isArray(routings) ? routings : [];
  for (const routing of list) {
    if (!routing || typeof routing !== 'object') continue;
    const owner = /** @type {ActivationOwner | string} */ (routing.owner);
    if (owner in plan) {
      plan[/** @type {ActivationOwner} */ (owner)].push(
        formatPlanEntry(/** @type {BusinessOpsRouting} */ (routing), mode),
      );
    }
  }

  return plan;
}

/**
 * @param {Record<string, unknown> | null | undefined} dispatcherReport
 * @param {{ mode?: string }} [opts]
 */
export function buildDispatcherActivationPlan(dispatcherReport, opts = {}) {
  const mode = opts.mode || DISPATCHER_ACTIVATION_MODE_DRY_RUN;
  const report = dispatcherReport && typeof dispatcherReport === 'object' ? dispatcherReport : {};
  const routings = Array.isArray(report.routings) ? report.routings : [];
  const plan = groupRoutingsForActivationPlan(routings, mode);

  const would_activate = plan.cursor.length + plan.codex.length;
  const skip =
    plan.anton.length + plan.n8n.length + plan.no_action.length + plan.openhands.length;

  return {
    schema: DISPATCHER_ACTIVATION_SCHEMA,
    version: 1,
    mode,
    evaluated_at: report.evaluated_at != null ? String(report.evaluated_at) : null,
    dispatcher_schema: report.schema != null ? String(report.schema) : null,
    dispatcher_ok: typeof report.ok === 'boolean' ? report.ok : null,
    summary: report.summary && typeof report.summary === 'object' ? report.summary : null,
    plan,
    totals: {
      routings: routings.length,
      would_activate,
      skip,
      by_owner: Object.fromEntries(OWNER_ORDER.map((o) => [o, plan[o].length])),
    },
  };
}

/**
 * Human-readable activation plan for CI logs and operator review.
 *
 * @param {ReturnType<typeof buildDispatcherActivationPlan>} activationPlan
 */
export function formatActivationPlanText(activationPlan) {
  const plan = activationPlan?.plan && typeof activationPlan.plan === 'object' ? activationPlan.plan : {};
  const lines = [
    '=== Dispatcher agent activation plan (dry-run) ===',
    `mode: ${activationPlan?.mode || DISPATCHER_ACTIVATION_MODE_DRY_RUN}`,
    `evaluated_at: ${activationPlan?.evaluated_at || 'n/a'}`,
    `dispatcher_ok: ${activationPlan?.dispatcher_ok}`,
    `would_activate: ${activationPlan?.totals?.would_activate ?? 0}`,
    `skip: ${activationPlan?.totals?.skip ?? 0}`,
    '',
  ];

  for (const owner of OWNER_ORDER) {
    const entries = Array.isArray(plan[owner]) ? plan[owner] : [];
    lines.push(`--- owner=${owner} (${entries.length}) ---`);
    if (entries.length === 0) {
      lines.push('  (none)');
      lines.push('');
      continue;
    }
    for (const entry of entries) {
      lines.push(`  [${entry.severity}] ${entry.objectRef}`);
      lines.push(`    action: ${entry.action}`);
      if (entry.reason) lines.push(`    reason: ${entry.reason}`);
      if (entry.executorPrompt) lines.push(`    executorPrompt: ${entry.executorPrompt}`);
    }
    lines.push('');
  }

  lines.push('=== end dry-run plan ===');
  return lines.join('\n');
}

/**
 * Resolve dispatcher URL from a factory base or health URL.
 *
 * @param {string} [input]
 * @returns {string}
 */
export function resolveDispatcherActivationUrl(input) {
  const s = String(input || '').trim();
  if (!s) return '';
  const normalized = s.replace(/\/+$/, '');
  const low = normalized.toLowerCase();
  if (low.includes('/api/factory/business-operations-dispatcher')) return normalized;
  if (low.endsWith('/api/factory/business-operations-monitor')) {
    return `${normalized.slice(0, normalized.length - '/api/factory/business-operations-monitor'.length)}/api/factory/business-operations-dispatcher`;
  }
  if (low.endsWith('/api/factory/health')) {
    return `${normalized.slice(0, normalized.length - '/api/factory/health'.length)}/api/factory/business-operations-dispatcher`;
  }
  return `${normalized}/api/factory/business-operations-dispatcher`;
}

/**
 * Parse a dispatcher HTTP response. Non-2xx is valid when the body carries the
 * dispatcher schema (e.g. HTTP 503 when `ok: false` / action required).
 *
 * @param {number} httpStatus
 * @param {string} bodyText
 * @returns {{ report: Record<string, unknown>, httpStatus: number }}
 */
/**
 * @param {string | undefined | null} mode
 * @returns {DispatcherActivationMode}
 */
export function normalizeActivationMode(mode) {
  const m = String(mode || DISPATCHER_ACTIVATION_MODE_DRY_RUN).trim().toLowerCase();
  if (m === DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE) return DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE;
  return DISPATCHER_ACTIVATION_MODE_DRY_RUN;
}

/**
 * Stable dedupe key for a routing (v1).
 *
 * @param {BusinessOpsRouting} routing
 */
export function routingDedupeKey(routing) {
  const owner = String(routing?.owner || 'unknown');
  const objectType = String(routing?.objectType || 'monitor');
  const objectRef = String(routing?.objectRef || 'unknown');
  const severity = String(routing?.severity || 'info');
  return `${owner}:${objectType}:${objectRef}:${severity}`;
}

/**
 * @typedef {{
 *   version: number,
 *   keys: string[],
 * }} DispatcherActivationDedupeState
 */

/**
 * @param {unknown} raw
 * @returns {DispatcherActivationDedupeState}
 */
export function normalizeDedupeState(raw) {
  if (!raw || typeof raw !== 'object') {
    return { version: DISPATCHER_ACTIVATION_DEDUPE_VERSION, keys: [] };
  }
  const keys = Array.isArray(raw.keys)
    ? raw.keys.filter((k) => typeof k === 'string' && k.trim()).map((k) => k.trim())
    : [];
  return { version: DISPATCHER_ACTIVATION_DEDUPE_VERSION, keys };
}

/**
 * @param {DispatcherActivationDedupeState} state
 * @param {string} key
 */
export function dedupeStateHasKey(state, key) {
  const k = String(key || '').trim();
  if (!k) return false;
  return state.keys.includes(k);
}

/**
 * @param {DispatcherActivationDedupeState} state
 * @param {string} key
 * @returns {DispatcherActivationDedupeState}
 */
export function dedupeStateAddKey(state, key) {
  const k = String(key || '').trim();
  if (!k || state.keys.includes(k)) return state;
  return { ...state, keys: [...state.keys, k] };
}

/**
 * @typedef {{
 *   routing: BusinessOpsRouting,
 *   action: string,
 *   dedupeKey?: string,
 *   throughputGate?: ReturnType<typeof evaluateThroughputPacketGate>,
 *   actionReason?: string,
 * }} ActivationDecision
 */

/**
 * Select per-routing activation decisions.
 *
 * @param {BusinessOpsRouting[]} routings
 * @param {{ mode?: DispatcherActivationMode, dedupeKeys?: string[], maxCursorLive?: number, requireThroughputPacket?: boolean }} [opts]
 * @returns {ActivationDecision[]}
 */
export function selectActivationDecisions(routings, opts = {}) {
  const mode = normalizeActivationMode(opts.mode);
  const dedupeKeys = new Set(
    Array.isArray(opts.dedupeKeys) ? opts.dedupeKeys.filter(Boolean) : [],
  );
  const maxCursorLive = opts.maxCursorLive ?? (mode === DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE ? 1 : 0);
  const requireThroughputPacket = Boolean(opts.requireThroughputPacket);
  let cursorLiveCount = 0;

  const list = Array.isArray(routings) ? routings : [];
  /** @type {ActivationDecision[]} */
  const decisions = [];

  for (const routing of list) {
    if (!routing || typeof routing !== 'object') continue;

    if (routing.gated === true) {
      decisions.push({ routing, action: 'SKIP_GATED' });
      continue;
    }

    const owner = routing.owner;
    if (owner === 'anton') {
      decisions.push({ routing, action: 'SKIP_OPERATOR_GATE' });
      continue;
    }
    if (owner === 'n8n') {
      decisions.push({ routing, action: 'SKIP_N8N_HOSTED' });
      continue;
    }
    if (owner === 'no_action') {
      decisions.push({ routing, action: 'SKIP_NO_ACTION' });
      continue;
    }
    if (owner === 'openhands') {
      // Scheduled/unattended OpenHands activation is NOT enabled in this
      // module, regardless of activation mode (dry_run or cursor_live).
      // Controlling issue #743 authorizes package/dry-run validation only —
      // see lib/openhands/dispatcher-adapter.js. This branch must never call
      // an OpenHands API or start a container.
      decisions.push({
        routing,
        action: 'SKIP_OPENHANDS_NOT_ENABLED',
        actionReason:
          'OpenHands scheduled/unattended activation is not enabled (issue #743, package/dry-run only).',
      });
      continue;
    }
    if (owner === 'codex') {
      decisions.push({ routing, action: 'DRY_RUN_CODEX' });
      continue;
    }

    if (owner === 'cursor') {
      const dedupeKey = routingDedupeKey(routing);
      const throughputGate = evaluateThroughputPacketGate(routing);

      if (requireThroughputPacket && !throughputGate.eligible) {
        decisions.push({
          routing,
          action: 'SKIP_THROUGHPUT_PACKET',
          dedupeKey,
          throughputGate,
          actionReason: throughputGate.reason,
        });
        continue;
      }

      if (dedupeKeys.has(dedupeKey)) {
        decisions.push({
          routing,
          action: 'SKIP_DEDUPE',
          dedupeKey,
          throughputGate,
          actionReason: 'routing already activated in dedupe state',
        });
        continue;
      }

      if (mode === DISPATCHER_ACTIVATION_MODE_DRY_RUN) {
        decisions.push({
          routing,
          action: DRY_RUN_ACTION_BY_OWNER.cursor,
          dedupeKey,
          throughputGate,
          actionReason: 'dry_run only — no Cursor spend consumed',
        });
        continue;
      }

      if (cursorLiveCount < maxCursorLive) {
        decisions.push({
          routing,
          action: 'ACTIVATE_CURSOR',
          dedupeKey,
          throughputGate,
          actionReason: throughputGate.eligible
            ? throughputGate.reason
            : 'throughput packet not required for this manual activation path',
        });
        cursorLiveCount += 1;
        continue;
      }

      decisions.push({
        routing,
        action: 'SKIP_CURSOR_CAP',
        dedupeKey,
        throughputGate,
        actionReason: 'max 1 live Cursor activation per run',
      });
    }
  }

  return decisions;
}

/**
 * @param {Record<string, unknown>} dispatcherReport
 * @param {{
 *   mode?: DispatcherActivationMode,
 *   dedupeState?: DispatcherActivationDedupeState,
 *   cursorApiKey?: string,
 *   cursorDeps?: { fetch?: typeof fetch, timeoutMs?: number },
 *   smokeInternal?: boolean,
 *   smokePrompt?: string,
 *   requireThroughputPacket?: boolean,
 * }} [opts]
 */
export async function runDispatcherActivation(dispatcherReport, opts = {}) {
  const mode = normalizeActivationMode(opts.mode);
  let report = dispatcherReport && typeof dispatcherReport === 'object' ? dispatcherReport : {};
  const isDirectIssue =
    Boolean(opts.directIssue) ||
    (report.summary &&
      typeof report.summary === 'object' &&
      report.summary.source === 'target_issue');
  const requireThroughputPacket =
    opts.requireThroughputPacket ?? (mode === DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE && !isDirectIssue);

  if (!isDirectIssue) {
    report = injectSmokeInternalCursorRouting(report, {
      smokeInternal: Boolean(opts.smokeInternal),
      smokePrompt: opts.smokePrompt,
    });
  }
  const routings = Array.isArray(report.routings) ? report.routings : [];
  const dedupeState = normalizeDedupeState(opts.dedupeState);

  const decisions = selectActivationDecisions(routings, {
    mode,
    dedupeKeys: dedupeState.keys,
    maxCursorLive: mode === DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE ? 1 : 0,
    requireThroughputPacket,
  });

  const plan = buildDispatcherActivationPlan(report, { mode });

  /** @type {Record<string, unknown> | null} */
  let cursorLive = null;
  let nextDedupeState = dedupeState;

  if (mode === DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE) {
    const liveDecision = decisions.find((d) => d.action === 'ACTIVATE_CURSOR');
    if (liveDecision) {
      const { buildCursorAgentCreatePayload, createCursorCloudAgent, extractCursorGitDetails } =
        await import('./cursor-cloud-agent-client.js');
      const apiKey = String(opts.cursorApiKey || '').trim();
      if (!apiKey) {
        throw new Error('CURSOR_API_KEY missing — live Cursor activation disabled (fail closed)');
      }
      const payload = buildCursorAgentCreatePayload(liveDecision.routing);
      const apiResult = await createCursorCloudAgent(apiKey, payload, opts.cursorDeps);
      const gitDetails = extractCursorGitDetails(apiResult);
      cursorLive = {
        objectRef: liveDecision.routing.objectRef,
        dedupeKey: liveDecision.dedupeKey,
        agentId: gitDetails.agentId,
        agentUrl: gitDetails.agentUrl,
        runId: gitDetails.runId,
        branch: gitDetails.branch,
        prNumber: gitDetails.prNumber,
        prUrl: gitDetails.prUrl,
      };
      if (liveDecision.dedupeKey) {
        nextDedupeState = dedupeStateAddKey(dedupeState, liveDecision.dedupeKey);
      }
    }
  }

  return {
    schema: DISPATCHER_ACTIVATION_SCHEMA,
    version: 2,
    mode,
    evaluated_at: report.evaluated_at != null ? String(report.evaluated_at) : null,
    dispatcher_ok: typeof report.ok === 'boolean' ? report.ok : null,
    plan,
    decisions: decisions.map((d) => ({
      owner: d.routing.owner,
      objectRef: d.routing.objectRef,
      objectType: d.routing.objectType,
      severity: d.routing.severity,
      gated: Boolean(d.routing.gated),
      action: d.action,
      reason: d.actionReason || d.throughputGate?.reason || null,
      dedupeKey: d.dedupeKey || null,
      category: d.throughputGate?.packet?.allowed_category || null,
      business_outcome: d.throughputGate?.packet?.business_outcome || null,
      evidence_required: d.throughputGate?.packet?.evidence_required || null,
      linked_issue_or_ticket: d.throughputGate?.packet?.linked_issue_or_ticket || null,
      delivery_surface: d.throughputGate?.packet?.delivery_surface || null,
      spend_risk_note: d.throughputGate?.packet?.cost_risk_cap || null,
      throughput_packet: d.throughputGate?.packet || null,
      throughput_packet_eligible: d.throughputGate?.eligible ?? null,
      throughput_packet_missing_fields: d.throughputGate?.missing_fields || [],
      throughput_packet_invalid_fields: d.throughputGate?.invalid_fields || [],
    })),
    live: {
      cursor: cursorLive,
    },
    dedupeState: nextDedupeState,
  };
}

/**
 * @param {ReturnType<typeof runDispatcherActivation> extends Promise<infer R> ? R : never} result
 */
export function formatActivationResultText(result) {
  const lines = [
    '=== Dispatcher agent activation ===',
    `mode: ${result.mode}`,
    `evaluated_at: ${result.evaluated_at || 'n/a'}`,
    `dispatcher_ok: ${result.dispatcher_ok}`,
    '',
    '--- decisions ---',
  ];

  for (const d of result.decisions) {
    lines.push(
      `  [${d.severity}] owner=${d.owner} ${d.objectRef} → ${d.action}${d.dedupeKey ? ` (${d.dedupeKey})` : ''}`,
    );
    if (d.reason) lines.push(`    reason: ${d.reason}`);
    if (d.category) lines.push(`    category: ${d.category}`);
    if (d.business_outcome) lines.push(`    business_outcome: ${d.business_outcome}`);
    if (d.linked_issue_or_ticket) lines.push(`    linked_issue_or_ticket: ${d.linked_issue_or_ticket}`);
    if (d.evidence_required) lines.push(`    evidence_required: ${d.evidence_required}`);
    if (d.spend_risk_note) lines.push(`    spend_risk_note: ${d.spend_risk_note}`);
  }

  lines.push('');
  if (result.live?.cursor) {
    lines.push('--- live cursor ---');
    lines.push(`  objectRef: ${result.live.cursor.objectRef}`);
    lines.push(`  agentId: ${result.live.cursor.agentId}`);
    lines.push(`  agentUrl: ${result.live.cursor.agentUrl}`);
    if (result.live.cursor.branch) lines.push(`  branch: ${result.live.cursor.branch}`);
    if (result.live.cursor.prUrl) lines.push(`  prUrl: ${result.live.cursor.prUrl}`);
    if (result.live.cursor.prNumber) lines.push(`  prNumber: ${result.live.cursor.prNumber}`);
    lines.push('');
  }

  lines.push(formatActivationPlanText(result.plan));
  return lines.join('\n');
}

export function parseDispatcherFetchResponse(httpStatus, bodyText) {
  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throw new Error(`dispatcher response is not JSON (HTTP ${httpStatus})`);
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    parsed.schema !== BUSINESS_OPS_DISPATCHER_SCHEMA
  ) {
    const got = parsed && typeof parsed === 'object' ? parsed.schema : 'missing';
    throw new Error(`dispatcher response has invalid schema (HTTP ${httpStatus}): ${got}`);
  }

  return { report: parsed, httpStatus };
}

/** Internal smoke routing for first cursor_live GHA proof (no client impact). */
export const DISPATCHER_SMOKE_CURSOR_OBJECT_REF = 'smoke:dispatcher_cursor_live_v1';

/**
 * @param {{ promptText?: string }} [opts]
 * @returns {import('./business-operations-dispatcher.js').BusinessOpsRouting}
 */
export function buildSmokeInternalCursorRouting(opts = {}) {
  const promptText =
    String(opts.promptText || '').trim() ||
    [
      'Internal ops smoke only (dispatcher cursor_live v1).',
      'Add one dated bullet under Phase 3 in docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md',
      'recording that the first GitHub Actions cursor_live smoke completed (date only, no secrets).',
      'Open a PR only; do not merge; no production deploy; no client-facing changes.',
    ].join(' ');

  return {
    owner: 'cursor',
    severity: 'info',
    source: 'corpflowai',
    objectType: 'monitor',
    objectRef: DISPATCHER_SMOKE_CURSOR_OBJECT_REF,
    gated: false,
    antonNeeded: false,
    safeToIgnore: false,
    reason: 'First live Cursor Cloud activation smoke (internal ops task).',
    recommendedNextAction: 'Record smoke completion in dispatcher activation doc.',
    executorPrompt: promptText,
    link: null,
  };
}

/**
 * @param {Record<string, unknown>} dispatcherReport
 * @param {{ smokeInternal?: boolean, smokePrompt?: string }} [opts]
 */
export function injectSmokeInternalCursorRouting(dispatcherReport, opts = {}) {
  if (!opts.smokeInternal) return dispatcherReport;
  const report = dispatcherReport && typeof dispatcherReport === 'object' ? dispatcherReport : {};
  const routings = Array.isArray(report.routings) ? report.routings : [];
  const hasEligibleCursor = routings.some(
    (r) => r && r.owner === 'cursor' && r.gated !== true,
  );
  if (hasEligibleCursor) return report;

  const smoke = buildSmokeInternalCursorRouting({ promptText: opts.smokePrompt });
  return {
    ...report,
    routings: [...routings, smoke],
  };
}

/**
 * @param {string | null | undefined} repoUrl
 * @returns {string}
 */
export function parseGitHubRepoFullName(repoUrl) {
  const m = String(repoUrl || '')
    .trim()
    .match(/github\.com\/([^/]+\/[^/?#]+)/i);
  return m ? m[1].replace(/\.git$/i, '') : '';
}

/**
 * @param {string | null | undefined} repoFullName
 * @returns {string}
 */
export function resolveGitHubRepoFullName(repoFullName) {
  const fromInput = String(repoFullName || '').trim();
  if (fromInput.includes('/')) return fromInput.replace(/\/+$/, '');
  const fromUrl = parseGitHubRepoFullName(CORPFLOW_CURSOR_REPO_URL);
  return fromUrl || CORPFLOW_GITHUB_REPO_FULL_NAME;
}

/**
 * @param {string | number | null | undefined} raw
 * @returns {{ ok: true, issueNumber: number } | { ok: false, reason: 'blank' | 'invalid_format' | 'invalid_range' }}
 */
export function parseTargetIssueNumber(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { ok: false, reason: 'blank' };
  if (!/^\d+$/.test(s)) return { ok: false, reason: 'invalid_format' };
  const issueNumber = Number(s);
  if (!Number.isInteger(issueNumber) || issueNumber < 1) {
    return { ok: false, reason: 'invalid_range' };
  }
  return { ok: true, issueNumber };
}

/**
 * Direct-issue activation: manual workflow_dispatch input, or issue-scan handoff.
 * Manual `target_issue` input is workflow_dispatch only; scan handoff is allowed on schedule.
 *
 * @param {{
 *   targetIssue?: string | number | null,
 *   eventName?: string | null,
 *   issueScanHandoff?: boolean,
 * }} [opts]
 * @returns {{
 *   allowed: boolean,
 *   issueNumber?: number,
 *   reason?: 'blank' | 'invalid_format' | 'invalid_range' | 'scheduled_run_forbidden',
 * }}
 */
export function validateDirectIssueActivationContext(opts = {}) {
  const parsed = parseTargetIssueNumber(opts.targetIssue);
  if (!parsed.ok) {
    return { allowed: false, reason: parsed.reason };
  }

  const eventName = String(opts.eventName || '').trim().toLowerCase();
  const issueScanHandoff = Boolean(opts.issueScanHandoff);
  if (eventName === 'schedule' && !issueScanHandoff) {
    return {
      allowed: false,
      reason: 'scheduled_run_forbidden',
      issueNumber: parsed.issueNumber,
    };
  }

  return { allowed: true, issueNumber: parsed.issueNumber };
}

/**
 * @param {{
 *   issueNumber: number,
 *   url: string,
 *   title: string,
 *   body?: string | null,
 * }} issue
 */
export function buildDirectIssueExecutorPrompt(issue) {
  const title = String(issue.title || '').trim() || `(issue #${issue.issueNumber})`;
  const body = String(issue.body || '').trim();
  return [
    `GitHub issue #${issue.issueNumber}: ${title}`,
    `Issue URL: ${issue.url}`,
    '',
    'Issue body / context:',
    body || '(no body)',
    '',
    'Constraints: Open a PR only. Do not merge. Do not deploy.',
    'No env/secrets changes. No DB/schema changes. No client sends.',
  ].join('\n');
}

/**
 * @param {{
 *   number: number,
 *   title?: string | null,
 *   body?: string | null,
 *   html_url?: string | null,
 * }} issue
 * @param {{ repoFullName?: string }} [opts]
 * @returns {import('./business-operations-dispatcher.js').BusinessOpsRouting}
 */
export function buildDirectIssueCursorRouting(issue, opts = {}) {
  const issueNumber = issue.number;
  const repoFullName = resolveGitHubRepoFullName(opts.repoFullName);
  const url = String(issue.html_url || '').trim() ||
    `https://github.com/${repoFullName}/issues/${issueNumber}`;
  const title = String(issue.title || '').trim() || `(issue #${issueNumber})`;

  return {
    owner: 'cursor',
    severity: 'info',
    source: 'corpflowai',
    objectType: 'issue',
    objectRef: `${DISPATCHER_DIRECT_ISSUE_OBJECT_REF_PREFIX}${issueNumber}`,
    gated: false,
    antonNeeded: false,
    safeToIgnore: false,
    reason: `Manual direct-issue Cursor activation for GitHub issue #${issueNumber}.`,
    recommendedNextAction: 'Open PR only; do not merge or deploy.',
    executorPrompt: buildDirectIssueExecutorPrompt({
      issueNumber,
      url,
      title,
      body: issue.body,
    }),
    link: url,
  };
}

/**
 * Synthetic dispatcher report for a single direct-issue Cursor activation.
 *
 * @param {{
 *   number: number,
 *   title?: string | null,
 *   body?: string | null,
 *   html_url?: string | null,
 * }} issue
 * @param {{ repoFullName?: string, evaluatedAt?: string }} [opts]
 */
export function buildDirectIssueActivationReport(issue, opts = {}) {
  const routing = buildDirectIssueCursorRouting(issue, { repoFullName: opts.repoFullName });
  return {
    schema: BUSINESS_OPS_DISPATCHER_SCHEMA,
    ok: true,
    evaluated_at: opts.evaluatedAt || new Date().toISOString(),
    routings: [routing],
    summary: {
      source: 'target_issue',
      direct_issue: issue.number,
    },
  };
}

/**
 * @param {number} issueNumber
 * @param {{ token?: string, repoFullName?: string, fetch?: typeof fetch, timeoutMs?: number }} [opts]
 */
export async function fetchGitHubIssue(issueNumber, opts = {}) {
  const repo = resolveGitHubRepoFullName(opts.repoFullName);
  const token = String(opts.token || '').trim();
  if (!token) {
    throw new Error('GITHUB_TOKEN missing — cannot fetch target issue (fail closed)');
  }

  const fetchFn = opts.fetch || globalThis.fetch;
  const timeoutMs = opts.timeoutMs ?? 30000;
  const url = `https://api.github.com/repos/${repo}/issues/${issueNumber}`;

  let res;
  try {
    res = await fetchFn(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`GitHub issue GET unreachable: ${msg}`);
  }

  const bodyText = await res.text();
  let json = null;
  try {
    json = JSON.parse(bodyText);
  } catch {
    json = null;
  }

  if (!res.ok) {
    const detail =
      (json && typeof json === 'object' && (json.message || json.error)) ||
      bodyText.slice(0, 300);
    throw new Error(`GitHub issue HTTP ${res.status}: ${detail}`);
  }

  if (!json || typeof json !== 'object' || typeof json.number !== 'number') {
    throw new Error(`GitHub issue response invalid for #${issueNumber}`);
  }

  if (json.pull_request) {
    throw new Error(`GitHub #${issueNumber} is a pull request — use a numeric issue only`);
  }

  return json;
}
