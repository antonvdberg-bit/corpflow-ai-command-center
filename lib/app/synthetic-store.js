/**
 * #778 Slice 1 — in-memory synthetic request store (no DB / schema).
 * Shape mirrors future console_json.client_view.components[] under existing JSON doctrine.
 */

import { normalizeComponentMilestone } from './milestones.js';

export const REFERENCE_TENANT_ID = 'corpflowai';
export const REFERENCE_TENANT_NAME = 'CorpFlowAI';
export const SYNTHETIC_REQUEST_ID = 'req_slice1_corpflowai_progress_001';

/** @type {ReadonlySet<string>} */
export const REVIEW_DECISIONS = new Set(['approve', 'amend', 'reject']);

/**
 * @returns {Record<string, unknown>}
 */
export function createInitialSyntheticRequest() {
  return {
    id: SYNTHETIC_REQUEST_ID,
    tenant_id: REFERENCE_TENANT_ID,
    title: 'Reference-tenant Requests & Progress shell',
    outcome:
      'Deliver a client-safe progress view of one delivery request with governed component review.',
    status: 'Approved',
    stage: 'Build',
    client_safe_blocker: 'Waiting on your review of the landing copy component.',
    attention_required: true,
    latest_client_safe_update: 'Landing copy was exposed for your review on 2026-08-06.',
    next_client_action: 'Review the Landing copy component and approve, amend, or reject.',
    // Internal Core-only work / evidence references (never projected to Tenant).
    internal: {
      work_package_key: 'wp_slice1_shell',
      tasks: [
        { key: 'task_shell', title: 'Thin /app shell routes', status: 'done' },
        { key: 'task_projection', title: 'Client-safe projection module', status: 'in_progress' },
      ],
      evidence_refs: [
        { kind: 'github_pr', label: 'PR #778 slice', path: 'internal-only' },
        { kind: 'ci_run', label: 'Agent CI', path: 'internal-only' },
        { kind: 'agent_run', label: 'Cursor run', path: 'internal-only' },
        { kind: 'internal_note', label: 'Do not show tenants engineering debate notes.' },
      ],
      github: { pr_number: 778, branch: 'cursor/dispatcher-issue-778-7cf4', commit: 'synthetic' },
      ci: { status: 'pending', workflow: 'test' },
      agent: { run_id: 'bc-454508b6-2860-497c-b9c2-db796d038587' },
      internal_notes: ['Operator staging note — not client-safe.'],
    },
    components: [
      {
        key: 'landing_copy',
        title: 'Landing copy',
        client_safe_summary: 'Plain-language homepage headline and supporting sentence for review.',
        milestone: 'client_review',
        exposed_for_client_review: true,
        review: null,
        comments: [],
      },
      {
        key: 'internal_wiring',
        title: 'Internal API wiring',
        client_safe_summary: 'Platform wiring that supports your request (view-only).',
        milestone: 'in_progress',
        exposed_for_client_review: false,
        review: null,
        comments: [],
        // Ordinary internal component — Core may show extra refs; Tenant stays view-only.
        internal_task_ref: 'task_projection',
        internal_evidence_ref: 'github_pr',
      },
    ],
  };
}

/** @type {Map<string, Record<string, unknown>>} */
const storesByNamespace = new Map();

/**
 * @param {string} [namespace]
 * @returns {Map<string, Record<string, unknown>>}
 */
function nsMap(namespace = 'default') {
  const key = String(namespace || 'default');
  let m = storesByNamespace.get(key);
  if (!m) {
    m = new Map();
    storesByNamespace.set(key, m);
  }
  return m;
}

/**
 * Deep-ish clone for synthetic JSON (plain data only).
 * @param {unknown} value
 * @returns {any}
 */
export function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * @param {string} [namespace]
 * @returns {Record<string, unknown>}
 */
export function ensureSyntheticRequest(namespace = 'default') {
  const m = nsMap(namespace);
  if (!m.has(SYNTHETIC_REQUEST_ID)) {
    m.set(SYNTHETIC_REQUEST_ID, createInitialSyntheticRequest());
  }
  return /** @type {Record<string, unknown>} */ (m.get(SYNTHETIC_REQUEST_ID));
}

/**
 * @param {string} [namespace]
 */
export function resetSyntheticStore(namespace = 'default') {
  const m = nsMap(namespace);
  m.clear();
  m.set(SYNTHETIC_REQUEST_ID, createInitialSyntheticRequest());
}

/**
 * @param {string} [namespace]
 * @returns {Record<string, unknown>[]}
 */
export function listSyntheticRequests(namespace = 'default') {
  ensureSyntheticRequest(namespace);
  return Array.from(nsMap(namespace).values()).map((r) => cloneJson(r));
}

/**
 * @param {string} requestId
 * @param {string} [namespace]
 * @returns {Record<string, unknown> | null}
 */
export function getSyntheticRequest(requestId, namespace = 'default') {
  ensureSyntheticRequest(namespace);
  const id = String(requestId || '').trim();
  const row = nsMap(namespace).get(id);
  return row ? cloneJson(row) : null;
}

/**
 * @param {string} requestId
 * @param {string} componentKey
 * @param {boolean} exposed
 * @param {string} [namespace]
 * @returns {{ ok: true, request: Record<string, unknown> } | { ok: false, error: string }}
 */
export function setComponentExposure(requestId, componentKey, exposed, namespace = 'default') {
  ensureSyntheticRequest(namespace);
  const id = String(requestId || '').trim();
  const key = String(componentKey || '').trim();
  const row = nsMap(namespace).get(id);
  if (!row) return { ok: false, error: 'Request not found' };
  const components = Array.isArray(row.components) ? row.components : [];
  const idx = components.findIndex((c) => c && String(c.key) === key);
  if (idx < 0) return { ok: false, error: 'Component not found' };
  const next = cloneJson(components[idx]);
  next.exposed_for_client_review = exposed === true;
  if (exposed === true && normalizeComponentMilestone(next.milestone) !== 'client_review') {
    // Exposing for review moves milestone into client_review when not already terminal.
    const m = normalizeComponentMilestone(next.milestone);
    if (m !== 'approved' && m !== 'live_verified') {
      next.milestone = 'client_review';
    }
  }
  components[idx] = next;
  row.components = components;
  row.attention_required = components.some((c) => c && c.exposed_for_client_review === true);
  if (exposed === true) {
    row.client_safe_blocker = `Waiting on your review of the ${next.title} component.`;
    row.next_client_action = `Review the ${next.title} component and approve, amend, or reject.`;
    row.latest_client_safe_update = `${next.title} was exposed for your review.`;
  }
  return { ok: true, request: cloneJson(row) };
}

/**
 * @param {{
 *   requestId: string,
 *   componentKey: string,
 *   decision: string,
 *   comment?: string,
 *   by?: string,
 *   namespace?: string,
 * }} args
 * @returns {{ ok: true, request: Record<string, unknown> } | { ok: false, error: string, status?: number }}
 */
export function applyComponentReview(args) {
  const namespace = args.namespace || 'default';
  ensureSyntheticRequest(namespace);
  const id = String(args.requestId || '').trim();
  const key = String(args.componentKey || '').trim();
  const decision = String(args.decision || '')
    .trim()
    .toLowerCase();
  const comment = args.comment != null ? String(args.comment).trim() : '';
  if (!REVIEW_DECISIONS.has(decision)) {
    return { ok: false, error: 'Invalid decision', status: 400 };
  }
  const row = nsMap(namespace).get(id);
  if (!row) return { ok: false, error: 'Request not found', status: 404 };
  if (String(row.tenant_id || '') !== REFERENCE_TENANT_ID) {
    return { ok: false, error: 'Request not found', status: 404 };
  }
  const components = Array.isArray(row.components) ? row.components : [];
  const idx = components.findIndex((c) => c && String(c.key) === key);
  if (idx < 0) return { ok: false, error: 'Component not found', status: 404 };
  const comp = cloneJson(components[idx]);
  if (comp.exposed_for_client_review !== true) {
    return {
      ok: false,
      error: 'Component is not exposed for client review',
      status: 403,
    };
  }
  const now = new Date().toISOString();
  const entry = {
    decided_at: now,
    decision,
    comment: comment || null,
    by: args.by || 'tenant',
  };
  const comments = Array.isArray(comp.comments) ? comp.comments : [];
  if (comment) {
    comments.push({ at: now, body: comment, by: entry.by });
  }
  comp.comments = comments;
  comp.review = entry;
  if (decision === 'approve') {
    comp.milestone = 'approved';
    comp.exposed_for_client_review = false;
  } else if (decision === 'amend') {
    // Remain in client_review while amendments are negotiated; stay exposed.
    comp.milestone = 'client_review';
    comp.exposed_for_client_review = true;
  } else {
    // reject — return to internal work; no further tenant review until Core re-exposes.
    comp.milestone = 'in_progress';
    comp.exposed_for_client_review = false;
  }
  components[idx] = comp;
  row.components = components;
  row.attention_required = components.some((c) => c && c.exposed_for_client_review === true);
  row.latest_client_safe_update = `You ${decision}d “${comp.title}”.`;
  if (decision === 'approve') {
    row.client_safe_blocker = null;
    row.next_client_action = 'No action required — thank you.';
  } else if (decision === 'amend') {
    row.client_safe_blocker = 'You requested amendments; the team will update the component.';
    row.next_client_action = 'Wait for an updated review package.';
  } else {
    row.client_safe_blocker = 'You rejected this component; the team will revise the plan.';
    row.next_client_action = 'Wait for a revised proposal.';
  }
  return { ok: true, request: cloneJson(row) };
}
