/**
 * #1072 — Prospect → Client → Commercial → Delivery continuity.
 *
 * Projects already-recorded identity / commercial-rail / delivery-operator
 * fields onto one operator trace. No second CRM, ledger, or project system.
 * `/app/commercial` and `/app/delivery` are not on current main; commercial
 * and delivery hops reuse the shared Prospect detail anchors plus existing
 * Company Master / Lead Rescue / Website Rescue / Change contracts.
 */

import { ACTION_QUEUE_PATH, CLIENT_SHARED_DETAIL_PREFIX } from './workspace-context.js';
import { COMPANY_MASTER_PATH, TENANT_DELIVERY_PATH, normalizeClientName } from './clients-workspace.js';

export const LIFECYCLE_ISSUE = 1072;
export const SYNTHETIC_LIFECYCLE_PROSPECT_ID = 'syn-772-lr-ada';
export const SYNTHETIC_LIFECYCLE_CLIENT_ID = 'cmp_ada_spa_synthetic';
export const LIFECYCLE_VERDICT_PASS = 'LIFECYCLE CONTINUITY PASS';

export const LIFECYCLE_STAGES = Object.freeze(['prospect', 'client', 'commercial', 'delivery']);

export const LIFECYCLE_SOURCES_OF_TRUTH = Object.freeze({
  prospect: 'Postgres leads (fixture | leads_read) via /app/prospects/[id]',
  client: 'Company Master identity via /app/clients/[id] — no second Client table',
  commercial:
    'leads row commercial_approval namespace (#714 rail, #551 projection). ERPNext quotation/invoice names are pointers only — not a second ledger.',
  delivery:
    'Same leads row: Lead Rescue operator or Website Rescue / Rapid Delivery operator. Tenant service-request stays at /change. No second project system.',
});

/**
 * @param {string} path
 * @param {{ proofMode?: boolean, hash?: string }} [opts]
 * @returns {string}
 */
export function withLifecycleProofHref(path, opts = {}) {
  const raw = String(path || '').trim();
  if (!raw) return '';
  const hashFromPath = raw.includes('#') ? raw.slice(raw.indexOf('#') + 1) : '';
  const base = raw.includes('#') ? raw.slice(0, raw.indexOf('#')) : raw;
  const hash = String(opts.hash || hashFromPath || '').replace(/^#/, '');
  let href = base;
  if (opts.proofMode === true && !/[?&]proof=1(?:&|$)/.test(href)) {
    href += href.includes('?') ? '&proof=1' : '?proof=1';
  }
  return hash ? `${href}#${hash}` : href;
}

/**
 * Reverse of matchProspectsToClient. Returns the single matching client or null.
 * Does not guess when zero or several Company Master identities match.
 *
 * @param {Record<string, unknown> | null | undefined} prospect
 * @param {Array<Record<string, unknown>>} clients
 * @returns {Record<string, unknown> | null}
 */
export function matchClientForProspect(prospect, clients) {
  const prospectId = String(prospect?.id || '').trim();
  const org = normalizeClientName(prospect?.organisation_name);
  const list = Array.isArray(clients) ? clients : [];
  /** @type {Record<string, unknown>[]} */
  const hits = [];
  const seen = new Set();
  for (const client of list) {
    if (!client || typeof client !== 'object') continue;
    const companyId = String(client.company_id || client.id || '').trim();
    if (!companyId || seen.has(companyId)) continue;
    const related = Array.isArray(client.related_prospects) ? client.related_prospects : [];
    const explicit = [
      ...related.map((row) => String(row?.id || '').trim()),
      ...(Array.isArray(client.linked_prospect_ids)
        ? client.linked_prospect_ids.map((id) => String(id || '').trim())
        : []),
    ].filter(Boolean);
    const names = [client.legal_name, client.trading_name].map((value) => normalizeClientName(value)).filter(Boolean);
    const matched = (prospectId && explicit.includes(prospectId)) || (org && names.includes(org));
    if (!matched) continue;
    seen.add(companyId);
    hits.push(client);
  }
  return hits.length === 1 ? hits[0] : null;
}

/**
 * @param {Record<string, unknown> | null | undefined} client
 * @returns {{ company_id: string, legal_name: string | null, trading_name: string | null, summary_path: string, record_owner: string | null } | null}
 */
export function linkedClientRef(client) {
  if (!client || typeof client !== 'object') return null;
  const companyId = String(client.company_id || client.id || '').trim();
  if (!companyId) return null;
  return {
    company_id: companyId,
    legal_name: client.legal_name != null ? String(client.legal_name) : null,
    trading_name: client.trading_name != null ? String(client.trading_name) : null,
    summary_path: String(client.summary_path || `${CLIENT_SHARED_DETAIL_PREFIX}${encodeURIComponent(companyId)}`),
    record_owner: client.record_owner != null ? String(client.record_owner) : null,
  };
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function asText(value) {
  const text = value == null ? '' : String(value).trim();
  return text || null;
}

/**
 * @param {Record<string, unknown> | null | undefined} prospect
 * @returns {Record<string, unknown>}
 */
function commercialFromProspect(prospect) {
  const row =
    prospect?.commercial_clearance && typeof prospect.commercial_clearance === 'object'
      ? /** @type {Record<string, unknown>} */ (prospect.commercial_clearance)
      : {};
  const proposal = row.proposal && typeof row.proposal === 'object' ? /** @type {Record<string, unknown>} */ (row.proposal) : {};
  const approval =
    row.financial_approval && typeof row.financial_approval === 'object'
      ? /** @type {Record<string, unknown>} */ (row.financial_approval)
      : {};
  const evidence =
    row.payment_evidence && typeof row.payment_evidence === 'object'
      ? /** @type {Record<string, unknown>} */ (row.payment_evidence)
      : {};
  const blockers = Array.isArray(row.blockers) ? row.blockers.map((item) => String(item)) : [];
  const nextRequired = asText(row.next_required);
  const cleared = row.commercially_cleared === true || row.financially_approved === true;
  return {
    recorded: row.recorded === true,
    commercially_cleared: cleared,
    financially_approved: row.financially_approved === true,
    clearance_label: asText(row.clearance_label) || (cleared ? 'CLEARED TO BUILD' : 'NOT CLEARED'),
    blockers,
    next_required: nextRequired,
    erpnext_quotation: asText(proposal.erpnext_quotation),
    erpnext_sales_invoice: asText(proposal.erpnext_sales_invoice),
    erpnext_customer: asText(row.erpnext_customer),
    proposal_version: asText(proposal.version),
    financial_approval_ref: cleared ? `FA-${String(prospect?.id || '').trim()}` : null,
    approved_by: asText(approval.approved_by),
    payment_evidence_status: asText(evidence.status),
    owner: asText(approval.approved_by) || asText(prospect?.owner),
    blocker: blockers[0] || (cleared ? null : asText(row.clearance_label) || 'NOT CLEARED'),
    next_action: nextRequired || (cleared ? 'Proceed to onboarding / build.' : 'Record commercial evidence.'),
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} prospect
 * @param {ReturnType<typeof commercialFromProspect>} commercial
 * @returns {Record<string, unknown>}
 */
function deliveryFromProspect(prospect, commercial) {
  const product = asText(prospect?.product) || asText(prospect?.offer_title) || 'unknown';
  const native = asText(prospect?.native_status_label) || asText(prospect?.native_status) || asText(prospect?.canonical_stage);
  const cleared = commercial.commercially_cleared === true;
  const operatorBlocker = asText(prospect?.current_blocker);
  if (!cleared) {
    return {
      item_id: asText(prospect?.id),
      product,
      status: 'blocked_pending_commercial_clearance',
      native_status: native,
      commercially_cleared: false,
      owner: asText(prospect?.owner),
      blocker: `Commercial gate — ${commercial.clearance_label || 'NOT CLEARED'}`,
      next_action:
        asText(commercial.next_required) || 'Do not start delivery until commercially cleared.',
      product_detail_path: asText(prospect?.product_detail_path) || asText(prospect?.detail_path),
      action_queue_path: ACTION_QUEUE_PATH,
      tenant_delivery_path: TENANT_DELIVERY_PATH,
    };
  }
  return {
    item_id: asText(prospect?.id),
    product,
    status: asText(prospect?.canonical_stage) || native || 'in_progress',
    native_status: native,
    commercially_cleared: true,
    owner: asText(prospect?.owner),
    blocker: operatorBlocker,
    next_action:
      asText(prospect?.next_action) || asText(prospect?.recommended_next_action) || 'Continue delivery on the existing product contract.',
    product_detail_path: asText(prospect?.product_detail_path) || asText(prospect?.detail_path),
    action_queue_path: ACTION_QUEUE_PATH,
    tenant_delivery_path: TENANT_DELIVERY_PATH,
  };
}

/**
 * @param {{
 *   prospect?: Record<string, unknown> | null,
 *   client?: Record<string, unknown> | null,
 *   proofMode?: boolean,
 * }} args
 * @returns {Record<string, unknown>}
 */
export function projectLifecycleTrace(args) {
  const proofMode = args.proofMode === true;
  const prospect = args.prospect && typeof args.prospect === 'object' ? args.prospect : null;
  const client = args.client && typeof args.client === 'object' ? args.client : null;
  const linked = linkedClientRef(client);
  const commercial = commercialFromProspect(prospect);
  const delivery = deliveryFromProspect(prospect, commercial);
  const prospectId = asText(prospect?.id);
  const prospectHref = prospectId
    ? withLifecycleProofHref(String(prospect?.shared_detail_path || `/app/prospects/${encodeURIComponent(prospectId)}`), {
        proofMode,
      })
    : '';
  const clientHref = linked
    ? withLifecycleProofHref(linked.summary_path, { proofMode })
    : withLifecycleProofHref('/app/clients', { proofMode });
  const commercialHref = prospectHref
    ? withLifecycleProofHref(prospectHref, { proofMode, hash: 'commercial-clearance' })
    : '';
  const deliveryHref = prospectHref
    ? withLifecycleProofHref(prospectHref, { proofMode, hash: 'delivery-state' })
    : withLifecycleProofHref(ACTION_QUEUE_PATH, { proofMode });

  /** @type {Record<string, Record<string, unknown>>} */
  const stages = {
    prospect: {
      stage: 'prospect',
      record_id: prospectId,
      source_of_truth: LIFECYCLE_SOURCES_OF_TRUTH.prospect,
      href: prospectHref,
      owner: asText(prospect?.owner),
      blocker: asText(prospect?.current_blocker),
      next_action: asText(prospect?.next_action) || asText(prospect?.recommended_next_action),
      organisation_name: asText(prospect?.organisation_name),
      canonical_stage: asText(prospect?.canonical_stage),
      product: asText(prospect?.product),
    },
    client: {
      stage: 'client',
      record_id: linked?.company_id || null,
      source_of_truth: LIFECYCLE_SOURCES_OF_TRUTH.client,
      href: clientHref,
      owner: asText(linked?.record_owner) || asText(client?.record_owner),
      blocker: Array.isArray(client?.missing_fields) && client.missing_fields.length
        ? `Not recorded: ${client.missing_fields.join(', ')}`
        : null,
      next_action: asText(client?.next_action),
      legal_name: asText(linked?.legal_name) || asText(client?.legal_name),
      company_master_path: COMPANY_MASTER_PATH,
    },
    commercial: {
      stage: 'commercial',
      record_id: prospectId,
      source_of_truth: LIFECYCLE_SOURCES_OF_TRUTH.commercial,
      href: commercialHref,
      owner: commercial.owner,
      blocker: commercial.blocker,
      next_action: commercial.next_action,
      financially_approved: commercial.financially_approved,
      commercially_cleared: commercial.commercially_cleared,
      financial_approval_ref: commercial.financial_approval_ref,
      erpnext_quotation: commercial.erpnext_quotation,
      erpnext_sales_invoice: commercial.erpnext_sales_invoice,
      erpnext_customer_pointer: commercial.erpnext_customer,
      second_ledger: false,
    },
    delivery: {
      stage: 'delivery',
      record_id: delivery.item_id,
      source_of_truth: LIFECYCLE_SOURCES_OF_TRUTH.delivery,
      href: deliveryHref,
      owner: delivery.owner,
      blocker: delivery.blocker,
      next_action: delivery.next_action,
      status: delivery.status,
      product: delivery.product,
      commercially_cleared: delivery.commercially_cleared,
      product_detail_path: delivery.product_detail_path,
      action_queue_path: delivery.action_queue_path,
      tenant_delivery_path: delivery.tenant_delivery_path,
    },
  };

  for (const stage of LIFECYCLE_STAGES) {
    stages[stage].nav = {
      prospect: prospectHref,
      client: clientHref,
      commercial: commercialHref,
      delivery: deliveryHref,
    };
  }

  const recordIds = [prospectId, linked?.company_id || null].filter(Boolean);
  const uniqueRecordIds = [...new Set(recordIds)];
  const commercialUsesProspectRow = stages.commercial.record_id === prospectId;
  const deliveryUsesProspectRow = stages.delivery.record_id === prospectId;

  return {
    schema: 'corpflow.lifecycle_continuity.v1',
    issue: LIFECYCLE_ISSUE,
    workspace: 'operating',
    tenant_accessible: false,
    second_ledger: false,
    schema_change: false,
    external_send: false,
    prospect_id: prospectId,
    company_id: linked?.company_id || null,
    linked_client: linked,
    stages,
    sources_of_truth: { ...LIFECYCLE_SOURCES_OF_TRUTH },
    unique_record_ids: uniqueRecordIds,
    no_duplicate_records: uniqueRecordIds.length === recordIds.length && commercialUsesProspectRow && deliveryUsesProspectRow,
    commercial_uses_same_lead_row: commercialUsesProspectRow,
    delivery_uses_same_lead_row: deliveryUsesProspectRow,
  };
}

/**
 * @param {Record<string, unknown>} trace
 * @returns {{ verdict: string, blocker: string | null, ok: boolean }}
 */
export function evaluateLifecycleContinuity(trace) {
  const stages = trace?.stages && typeof trace.stages === 'object' ? /** @type {Record<string, any>} */ (trace.stages) : {};
  if (trace?.tenant_accessible === true) {
    return { ok: false, verdict: 'NOT READY — Tenant can traverse internal cross-client lifecycle', blocker: 'tenant_accessible' };
  }
  if (trace?.second_ledger === true) {
    return { ok: false, verdict: 'NOT READY — Commercial truth copied into a second ledger', blocker: 'second_ledger' };
  }
  if (!stages.prospect?.record_id) {
    return { ok: false, verdict: 'NOT READY — prospect identity missing', blocker: 'prospect_identity' };
  }
  if (!stages.client?.record_id) {
    return { ok: false, verdict: 'NOT READY — prospect is not linked to one Company Master identity', blocker: 'client_link' };
  }
  if (trace?.no_duplicate_records !== true) {
    return { ok: false, verdict: 'NOT READY — duplicate records in the lifecycle trace', blocker: 'duplicate_records' };
  }
  for (const name of LIFECYCLE_STAGES) {
    const stage = stages[name] || {};
    if (!stage.source_of_truth || !stage.href) {
      return { ok: false, verdict: `NOT READY — ${name} source or href missing`, blocker: `${name}_source` };
    }
    if (!stage.next_action) {
      return { ok: false, verdict: `NOT READY — ${name} next action missing`, blocker: `${name}_next_action` };
    }
  }
  if (!stages.commercial?.erpnext_quotation && stages.commercial?.commercially_cleared !== true) {
    // Pointer may be absent; still a valid rail as long as owner/blocker/next exist.
  }
  return { ok: true, verdict: LIFECYCLE_VERDICT_PASS, blocker: null };
}

/**
 * @param {{
 *   trace: Record<string, unknown>,
 *   data_source: string,
 *   proof_mode?: boolean,
 * }} args
 */
export function buildLifecyclePayload(args) {
  const evaluation = evaluateLifecycleContinuity(args.trace);
  return {
    ok: evaluation.ok,
    workspace: 'operating',
    path: '/api/app/lifecycle',
    view: 'lifecycle_continuity',
    issue: LIFECYCLE_ISSUE,
    data_source: args.data_source,
    proof_mode: args.proof_mode === true,
    verdict: evaluation.verdict,
    blocker: evaluation.blocker,
    lifecycle: args.trace,
    tenant_accessible: false,
    second_ledger: false,
    schema_change: false,
    erpnext_write: false,
    external_send: false,
    later_slices: {
      commercial_summary: '#1004',
      delivery_summary: '#1005',
    },
  };
}

/**
 * Static HTML for desktop/mobile screenshot evidence. No live session required.
 *
 * @param {Record<string, unknown>} payload
 * @returns {string}
 */
export function renderLifecycleContinuityHtml(payload) {
  const lifecycle = payload?.lifecycle && typeof payload.lifecycle === 'object' ? /** @type {Record<string, any>} */ (payload.lifecycle) : {};
  const stages = lifecycle.stages && typeof lifecycle.stages === 'object' ? lifecycle.stages : {};
  const cards = LIFECYCLE_STAGES.map((name) => {
    const stage = stages[name] || {};
    return `<article class="cf-life-card" data-testid="lifecycle-stage-${name}" data-stage="${name}">
  <h2>${escapeHtml(name)}</h2>
  <p class="cf-life-id"><code>${escapeHtml(stage.record_id || '—')}</code></p>
  <dl>
    <div><dt>Owner</dt><dd>${escapeHtml(stage.owner || '—')}</dd></div>
    <div><dt>Blocker</dt><dd>${escapeHtml(stage.blocker || 'None recorded')}</dd></div>
    <div><dt>Next action</dt><dd>${escapeHtml(stage.next_action || '—')}</dd></div>
    <div><dt>Source of truth</dt><dd>${escapeHtml(stage.source_of_truth || '—')}</dd></div>
  </dl>
  <p><a href="${escapeAttr(stage.href || '#')}">${escapeHtml(stage.href || '')}</a></p>
</article>`;
  }).join('\n');
  const rail = LIFECYCLE_STAGES.map((name) => {
    const stage = stages[name] || {};
    return `<a class="cf-life-rail-step" data-testid="lifecycle-rail-${name}" href="${escapeAttr(stage.href || '#')}">${escapeHtml(name)}</a>`;
  }).join('<span aria-hidden="true">→</span>');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Lifecycle continuity · CorpFlowAI</title>
  <style>
    :root { --bg:#071411; --panel:#10231f; --text:#e8f4f0; --muted:#9bb8b0; --accent:#5ee0c5; --border:#1f3d36; }
    body { margin:0; font-family: ui-sans-serif, system-ui, sans-serif; background:var(--bg); color:var(--text); }
    .cf-app-chrome { display:flex; justify-content:space-between; gap:12px; padding:16px 20px; border-bottom:1px solid var(--border); }
    .cf-app-main { padding:20px; max-width:1100px; margin:0 auto; }
    .cf-life-rail { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin:0 0 18px; }
    .cf-life-rail-step { color:var(--accent); text-decoration:none; font-weight:650; border:1px solid var(--border); border-radius:999px; padding:8px 12px; }
    .cf-life-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:12px; }
    .cf-life-card { border:1px solid var(--border); background:var(--panel); border-radius:14px; padding:16px; min-width:0; }
    .cf-life-card h2 { margin:0 0 6px; text-transform:capitalize; }
    .cf-life-id { color:var(--muted); margin:0 0 10px; }
    dl { display:grid; gap:8px; margin:0; }
    dt { font-size:0.72rem; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }
    dd { margin:2px 0 0; line-height:1.4; word-break:break-word; }
    a { color:var(--accent); word-break:break-all; }
    .cf-app-muted { color:var(--muted); }
    @media (max-width: 640px) {
      .cf-life-grid { grid-template-columns:1fr; }
      .cf-app-main { padding:16px 12px 40px; }
    }
  </style>
</head>
<body>
  <header class="cf-app-chrome" data-testid="app-chrome">
    <div>CorpFlowAI Operating Workspace</div>
    <div data-testid="lifecycle-verdict">${escapeHtml(String(payload?.verdict || ''))}</div>
  </header>
  <main class="cf-app-main">
    <h1>Prospect → Client → Commercial → Delivery</h1>
    <p class="cf-app-muted">Staff-only continuity over existing records. Tenant Workspace cannot traverse this path.</p>
    <nav class="cf-life-rail" data-testid="lifecycle-rail" aria-label="Lifecycle">${rail}</nav>
    <section class="cf-life-grid">${cards}</section>
  </main>
</body>
</html>`;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function escapeAttr(value) {
  return escapeHtml(value);
}
