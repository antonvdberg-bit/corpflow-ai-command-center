/**
 * Segregated GitHub → Cursor issue dispatch lifecycle.
 *
 * Extends the existing factory dispatcher route — does not replace it.
 * Scans `dispatch:cursor-ready` issues, classifies them, enforces WIP /
 * segregation, posts acknowledgement comments, and claims eligible work.
 *
 * @see docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md
 * @see docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md
 */

export const CURSOR_ISSUE_DISPATCH_LIFECYCLE_SCHEMA =
  'corpflow.cursor_issue_dispatch_lifecycle.v1';

export const DISPATCH_LABEL_READY = 'dispatch:cursor-ready';
export const DISPATCH_LABEL_CLAIMED = 'dispatch:cursor-claimed';
export const DISPATCH_LABEL_IN_PROGRESS = 'status:in-progress';
export const DISPATCH_LABEL_NEEDS_ANTON = 'needs:anton';
export const DISPATCH_LABEL_BLOCKED = 'dispatch:blocked';

/** Default WIP limits (Anton operating change 2026-07-28). */
export const DEFAULT_WIP_LIMITS = Object.freeze({
  maxActiveCursorImplementationIssues: 2,
  maxActivePerTenant: 1,
  maxActiveDatabaseSchemaIssues: 1,
  maxActiveProductionDeployCandidates: 1,
});

/** Stale claimed work threshold (hours) before status-request comment. */
export const DEFAULT_STALE_CLAIM_HOURS = 12;

export const SYSTEM_BOUNDARIES = Object.freeze([
  'core',
  'corpflowai_business_system',
  'tenant',
]);

export const ENVIRONMENTS = Object.freeze([
  'local',
  'test',
  'preview',
  'production',
]);

export const WORK_TYPES = Object.freeze([
  'research',
  'documentation',
  'ui',
  'api',
  'database',
  'integration',
  'deployment',
  'validation',
]);

export const PROTECTED_GATES = Object.freeze([
  'none',
  'production',
  'database',
  'secrets',
  'messaging',
  'payment',
  'outreach',
  'paid_tool',
]);

/**
 * @typedef {{
 *   systemBoundary: 'core' | 'corpflowai_business_system' | 'tenant',
 *   tenantOrClient: string,
 *   environment: 'local' | 'test' | 'preview' | 'production',
 *   workTypes: string[],
 *   protectedGate: string,
 *   separateBranchRequired: boolean,
 *   separatePrRequired: boolean,
 *   mayRunConcurrently: boolean,
 *   concurrencyReason: string,
 *   productWorkstream?: string | null,
 * }} IssueWorkClassification
 */

/**
 * @typedef {{
 *   number: number,
 *   title: string,
 *   body?: string | null,
 *   labels?: Array<string | { name?: string }>,
 *   htmlUrl?: string | null,
 *   updatedAt?: string | null,
 * }} DispatchIssue
 */

/**
 * @param {unknown} labels
 * @returns {string[]}
 */
export function normalizeIssueLabels(labels) {
  if (!Array.isArray(labels)) return [];
  return labels
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (entry && typeof entry === 'object' && 'name' in entry) {
        return String(/** @type {{ name?: unknown }} */ (entry).name || '').trim();
      }
      return '';
    })
    .filter(Boolean);
}

/**
 * @param {string} text
 * @returns {string}
 */
function lower(text) {
  return String(text || '').toLowerCase();
}

/**
 * Infer a conservative classification from issue title/body/labels.
 * Operators should refine via WORK CLASSIFICATION comments; unclear → not eligible.
 *
 * @param {DispatchIssue} issue
 * @returns {IssueWorkClassification}
 */
export function inferIssueClassification(issue) {
  const title = String(issue?.title || '');
  const body = String(issue?.body || '');
  const blob = lower(`${title}\n${body}`);
  const labels = normalizeIssueLabels(issue?.labels).map((l) => l.toLowerCase());

  let systemBoundary = /** @type {IssueWorkClassification['systemBoundary']} */ (
    'corpflowai_business_system'
  );
  let tenantOrClient = 'N/A';
  let productWorkstream = /** @type {string | null} */ (null);

  if (labels.includes('lux') || labels.includes('luxe-maurice') || /\blux\b|luxe|rare\s*&\s*exclusive/.test(blob)) {
    systemBoundary = 'tenant';
    tenantOrClient = 'lux / Rare & Exclusive';
  } else if (labels.includes('cipc') || /cipc\s*desk/.test(blob)) {
    systemBoundary = 'tenant';
    tenantOrClient = 'CIPC Desk';
  } else if (/living\s*word/.test(blob)) {
    systemBoundary = 'tenant';
    tenantOrClient = 'Living Word';
  } else if (/\bcore\b/.test(blob) && /tenant/.test(blob) === false) {
    systemBoundary = 'core';
  }

  if (/lead\s*rescue|ai\s*lead\s*rescue/.test(blob) || labels.includes('lead-rescue')) {
    productWorkstream = 'lead-rescue';
  } else if (/website\s*rescue|landing\s*page\s*rescue|premium\s*landing/.test(blob)) {
    productWorkstream = 'website-rescue';
  }

  /** @type {string[]} */
  const workTypes = [];
  if (/research|gap matrix|comparison/.test(blob)) workTypes.push('research');
  if (/documentation|docs-only|runbook|checklist|quotation|product pack/.test(blob)) {
    workTypes.push('documentation');
  }
  if (/ui|landing|product page|cta|visual/.test(blob)) workTypes.push('ui');
  if (/\bapi\b|endpoint|intake/.test(blob)) workTypes.push('api');
  if (/schema|migration|prisma|postgres|database/.test(blob)) workTypes.push('database');
  if (/integration|n8n|webhook/.test(blob)) workTypes.push('integration');
  if (/deploy|production deployment|vercel production/.test(blob)) workTypes.push('deployment');
  if (/validat|smoke|live verify|delivery reality/.test(blob)) workTypes.push('validation');
  if (workTypes.length === 0) workTypes.push('documentation');

  let protectedGate = 'none';
  const forbidsProduction =
    /no production deploy|without.*production|not.*production deploy|no db\/schema|no schema change/.test(
      blob,
    );
  if (
    !forbidsProduction &&
    (/production deploy|deploy to production/.test(blob) || workTypes.includes('deployment'))
  ) {
    protectedGate = 'production';
  } else if (
    !forbidsProduction &&
    (workTypes.includes('database') || /schema change|prisma migrate/.test(blob))
  ) {
    protectedGate = 'database';
  } else if (/secret|env var|\.env|infisical/.test(blob) && !/no env|no secret|no \.env/.test(blob)) {
    protectedGate = 'secrets';
  } else if (
    /whatsapp|sms|email runtime|messaging/.test(blob) &&
    !/no.*whatsapp|no.*sms|no.*messaging|no email/.test(blob)
  ) {
    protectedGate = 'messaging';
  } else if (
    /payment runtime|checkout|stripe/.test(blob) &&
    !/no payment|without.*payment/.test(blob)
  ) {
    protectedGate = 'payment';
  } else if (/outreach|cold email|bulk send/.test(blob) && !/no.*outreach|without.*outreach/.test(blob)) {
    protectedGate = 'outreach';
  } else if (/paid tool|new vendor/.test(blob) && !/no paid tool|without.*paid/.test(blob)) {
    protectedGate = 'paid_tool';
  }

  // Drop false-positive deployment work type when the issue forbids production deploy.
  if (forbidsProduction) {
    const filtered = workTypes.filter((t) => t !== 'deployment' && t !== 'database');
    workTypes.length = 0;
    workTypes.push(...(filtered.length ? filtered : ['documentation']));
  }

  let environment = /** @type {IssueWorkClassification['environment']} */ ('preview');
  if (protectedGate === 'production' || /production only|live production/.test(blob)) {
    environment = 'production';
  } else if (/local only|docs-only/.test(blob) && !workTypes.includes('ui')) {
    environment = 'local';
  }

  const mayRunConcurrently =
    systemBoundary !== 'tenant' &&
    protectedGate === 'none' &&
    !workTypes.includes('database') &&
    environment !== 'production';

  return {
    systemBoundary,
    tenantOrClient,
    environment,
    workTypes: [...new Set(workTypes)],
    protectedGate,
    separateBranchRequired: true,
    separatePrRequired: true,
    mayRunConcurrently,
    concurrencyReason: mayRunConcurrently
      ? 'Non-tenant, non-schema, non-production work; still requires separate branch/PR and WIP check.'
      : 'Segregation by default — tenant, schema, production, or protected gate requires isolation.',
    productWorkstream,
  };
}

/**
 * @param {IssueWorkClassification} classification
 * @returns {string}
 */
export function formatWorkClassificationComment(issueNumber, classification) {
  const workType = classification.workTypes.join(' / ');
  return `WORK CLASSIFICATION

Issue: #${issueNumber}
System boundary:
- ${classification.systemBoundary === 'corpflowai_business_system' ? 'CorpFlowAI business system' : classification.systemBoundary}

Tenant or client:
- ${classification.tenantOrClient}

Environment:
- ${classification.environment}

Work type:
- ${workType}

Protected gate:
- ${classification.protectedGate}

Execution isolation:
- separate branch required: ${classification.separateBranchRequired ? 'yes' : 'no'}
- separate PR required: ${classification.separatePrRequired ? 'yes' : 'no'}
- may run concurrently with other work: ${classification.mayRunConcurrently ? 'yes' : 'no'}
- reason: ${classification.concurrencyReason}${
    classification.productWorkstream
      ? `\n\nProduct workstream: ${classification.productWorkstream} (must not merge with sibling product streams)`
      : ''
  }
`;
}

/**
 * @param {{
 *   issueNumber: number,
 *   priority?: string,
 *   classificationComplete: boolean,
 *   eligibleToClaim: boolean,
 *   reason: string,
 *   nextAction: string,
 * }} opts
 */
export function formatDispatchDiscoveredComment(opts) {
  return `CURSOR DISPATCH DISCOVERED

Issue: #${opts.issueNumber}
Priority: ${opts.priority || 'unspecified'}
Classification complete: ${opts.classificationComplete ? 'Yes' : 'No'}
Eligible to claim: ${opts.eligibleToClaim ? 'Yes' : 'No'}
Reason: ${opts.reason}
Next action: ${opts.nextAction}
`;
}

/**
 * @param {{
 *   issueNumber: number,
 *   agentRunId?: string | null,
 *   branch?: string | null,
 *   workstream?: string | null,
 *   tenantOrClient?: string,
 *   environment?: string,
 *   startedIso?: string,
 *   protectedGate?: string,
 *   expectedOutputs?: string[],
 * }} opts
 */
export function formatDispatchClaimedComment(opts) {
  const outputs = (opts.expectedOutputs || [
    'implementation or research result',
    'linked PR where applicable',
    'tests/build evidence',
    'verification evidence',
  ])
    .map((line) => `- ${line}`)
    .join('\n');

  return `CURSOR WORK CLAIMED

Issue: #${opts.issueNumber}
Execution owner: Cursor
Agent/run identifier: ${opts.agentRunId || 'pending'}
Branch: ${opts.branch || 'pending'}
Workstream: ${opts.workstream || 'unspecified'}
Tenant/client: ${opts.tenantOrClient || 'N/A'}
Environment: ${opts.environment || 'preview'}
Started: ${opts.startedIso || new Date().toISOString()}
Protected gate encountered: ${opts.protectedGate && opts.protectedGate !== 'none' ? `Yes — ${opts.protectedGate}` : 'No'}
Expected outputs:
${outputs}
`;
}

/**
 * @param {{
 *   issueNumber: number,
 *   status: string,
 *   progress: string,
 *   completed?: string[],
 *   currentlyWorkingOn?: string[],
 *   remaining?: string[],
 *   blockers?: string,
 *   pr?: string,
 *   antonRequired?: string,
 * }} opts
 */
export function formatProgressUpdateComment(opts) {
  const list = (items, empty) =>
    (items && items.length ? items : [empty]).map((line) => `- ${line}`).join('\n');

  return `CURSOR PROGRESS UPDATE

Issue: #${opts.issueNumber}
Status: ${opts.status}
Progress: ${opts.progress}
Completed:
${list(opts.completed, 'none yet')}

Currently working on:
${list(opts.currentlyWorkingOn, 'none')}

Remaining:
${list(opts.remaining, 'none')}

Blockers:
- ${opts.blockers || 'none'}

PR:
- ${opts.pr || 'none'}

Anton required:
- ${opts.antonRequired || 'No'}
`;
}

/**
 * Decide whether two classifications may run concurrently.
 *
 * @param {IssueWorkClassification} a
 * @param {IssueWorkClassification} b
 */
export function canRunConcurrently(a, b) {
  if (!a || !b) return { ok: false, reason: 'missing classification' };
  if (a.systemBoundary === 'tenant' && b.systemBoundary === 'tenant') {
    if (a.tenantOrClient === b.tenantOrClient) {
      return { ok: false, reason: 'same tenant — max one active implementation issue per tenant' };
    }
  }
  if (
    a.productWorkstream &&
    b.productWorkstream &&
    a.productWorkstream === b.productWorkstream
  ) {
    return { ok: false, reason: 'same product workstream' };
  }
  if (
    a.productWorkstream &&
    b.productWorkstream &&
    a.productWorkstream !== b.productWorkstream
  ) {
    // Segregation by default: Lead Rescue vs Website Rescue (and similar)
    // start sequentially unless a shared-system issue explicitly authorises
    // parallel work with non-overlapping files.
    return {
      ok: false,
      reason:
        'sibling products require sequential start (segregation by default; shared changes need their own issue)',
    };
  }
  if (a.workTypes.includes('database') && b.workTypes.includes('database')) {
    return { ok: false, reason: 'two database/schema issues cannot run concurrently' };
  }
  if (a.environment === 'production' && b.environment === 'production') {
    return { ok: false, reason: 'only one production-deployment candidate at a time' };
  }
  if (a.protectedGate !== 'none' && a.protectedGate === b.protectedGate && a.protectedGate !== 'none') {
    return { ok: false, reason: `same protected gate (${a.protectedGate})` };
  }
  return { ok: true, reason: 'different boundaries and no shared gate conflict' };
}

/**
 * @param {{
 *   readyIssues: DispatchIssue[],
 *   claimedIssues?: DispatchIssue[],
 *   wipLimits?: typeof DEFAULT_WIP_LIMITS,
 *   preferIssueNumbers?: number[],
 * }} input
 */
export function planCursorIssueClaims(input) {
  const limits = { ...DEFAULT_WIP_LIMITS, ...(input.wipLimits || {}) };
  const claimed = Array.isArray(input.claimedIssues) ? input.claimedIssues : [];
  const claimedCount = claimed.length;
  const slots = Math.max(0, limits.maxActiveCursorImplementationIssues - claimedCount);

  /** @type {Array<{
   *   issue: DispatchIssue,
   *   classification: IssueWorkClassification,
   *   decision: 'claim' | 'discover_only' | 'reject',
   *   reason: string,
   * }>} */
  const decisions = [];

  const prefer = new Set((input.preferIssueNumbers || []).map((n) => Number(n)));

  /**
   * @param {DispatchIssue} issue
   */
  function priorityRank(issue) {
    if (prefer.has(Number(issue.number))) return 0;
    const labels = normalizeIssueLabels(issue.labels).map((l) => l.toLowerCase());
    if (labels.includes('priority:p0') || labels.includes('p0')) return 1;
    if (labels.includes('priority:p1') || labels.includes('p1')) return 2;
    if (labels.includes('revenue')) return 3;
    return 4;
  }

  const sorted = [...(input.readyIssues || [])].sort((a, b) => {
    const rankDiff = priorityRank(a) - priorityRank(b);
    if (rankDiff !== 0) return rankDiff;
    return Number(a.number) - Number(b.number);
  });

  /** @type {IssueWorkClassification[]} */
  const acceptedClassifications = claimed.map((issue) => inferIssueClassification(issue));
  let remainingSlots = slots;

  for (const issue of sorted) {
    const labels = normalizeIssueLabels(issue.labels).map((l) => l.toLowerCase());
    const classification = inferIssueClassification(issue);

    if (labels.includes(DISPATCH_LABEL_BLOCKED.toLowerCase())) {
      decisions.push({
        issue,
        classification,
        decision: 'reject',
        reason: 'labelled dispatch:blocked',
      });
      continue;
    }

    if (labels.includes(DISPATCH_LABEL_CLAIMED.toLowerCase())) {
      decisions.push({
        issue,
        classification,
        decision: 'discover_only',
        reason: 'already claimed',
      });
      continue;
    }

    if (classification.protectedGate !== 'none') {
      decisions.push({
        issue,
        classification,
        decision: 'discover_only',
        reason: `protected gate ${classification.protectedGate} — classify and wait for Anton unlock before claim/activation`,
      });
      continue;
    }

    if (remainingSlots <= 0) {
      decisions.push({
        issue,
        classification,
        decision: 'discover_only',
        reason: `WIP cap reached (max ${limits.maxActiveCursorImplementationIssues} active Cursor implementation issues)`,
      });
      continue;
    }

    let blockedBy = /** @type {string | null} */ (null);
    for (const existing of acceptedClassifications) {
      const check = canRunConcurrently(existing, classification);
      if (!check.ok) {
        blockedBy = check.reason;
        break;
      }
    }

    if (blockedBy) {
      decisions.push({
        issue,
        classification,
        decision: 'discover_only',
        reason: `concurrency hold: ${blockedBy}`,
      });
      continue;
    }

    if (
      classification.systemBoundary === 'tenant' &&
      acceptedClassifications.some(
        (c) =>
          c.systemBoundary === 'tenant' && c.tenantOrClient === classification.tenantOrClient,
      )
    ) {
      decisions.push({
        issue,
        classification,
        decision: 'discover_only',
        reason: `tenant WIP: already one active issue for ${classification.tenantOrClient}`,
      });
      continue;
    }

    decisions.push({
      issue,
      classification,
      decision: 'claim',
      reason: 'eligible under segregation + WIP rules',
    });
    acceptedClassifications.push(classification);
    remainingSlots -= 1;
  }

  return {
    schema: CURSOR_ISSUE_DISPATCH_LIFECYCLE_SCHEMA,
    wipLimits: limits,
    claimedCount,
    availableSlots: slots,
    decisions,
    claimIssueNumbers: decisions.filter((d) => d.decision === 'claim').map((d) => Number(d.issue.number)),
  };
}

/**
 * Suggest a segregated branch name for an issue.
 *
 * @param {number} issueNumber
 * @param {IssueWorkClassification} classification
 * @param {string} [suffix]
 */
export function suggestIssueBranchName(issueNumber, classification, suffix = '1e9e') {
  const stream =
    classification.productWorkstream ||
    (classification.systemBoundary === 'tenant'
      ? classification.tenantOrClient.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : classification.workTypes[0] || 'ops');
  const slug = String(stream || 'issue')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `cursor/${slug}-${issueNumber}-${suffix}`;
}

/**
 * @param {DispatchIssue} issue
 * @param {string} [nowIso]
 * @param {number} [staleHours]
 */
export function isClaimStale(issue, nowIso = new Date().toISOString(), staleHours = DEFAULT_STALE_CLAIM_HOURS) {
  const labels = normalizeIssueLabels(issue.labels).map((l) => l.toLowerCase());
  if (!labels.includes(DISPATCH_LABEL_CLAIMED.toLowerCase())) return false;
  const updated = issue.updatedAt ? Date.parse(issue.updatedAt) : NaN;
  if (!Number.isFinite(updated)) return false;
  const now = Date.parse(nowIso);
  return now - updated >= staleHours * 3600 * 1000;
}

/**
 * Exception-only stale status request (no heartbeat noise).
 *
 * @param {number} issueNumber
 * @param {string} owner
 */
export function formatStaleWorkStatusRequest(issueNumber, owner = 'Cursor') {
  return `CURSOR STALE WORK STATUS REQUEST

Issue: #${issueNumber}
Owner: ${owner}
Observation: No meaningful movement within the stale threshold.
Required response: resume, requeue, or mark blocked with named blocker.
Do not leave claimed indefinitely.
`;
}
