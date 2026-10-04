/**
 * Bounded COO read surface for governed Cursor Cloud runs.
 *
 * GitHub comments remain the durable source of truth. Provider reads enrich
 * that evidence; they never replace the GitHub governance filter.
 */
import {
  buildCursorLifecycleState,
  parseCursorLifecycleStateFromText,
} from './cursor-agent-lifecycle.js';
import {
  buildCloudAgentsExecutorEvidence,
  parseCloudAgentsExecutorEvidence,
} from './factory-cloud-agents-executor.js';
import { validateCursorBusinessEvidence } from './cursor-completion-contract.js';

export const CURSOR_CONTROL_SCHEMA = 'corpflow.cursor_control.v1';
export const CURSOR_CONTROL_MAX_RUNS = 25;

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function text(value, max = 240) {
  const result = String(value || '').trim();
  return result ? result.slice(0, max) : null;
}

function summarizeUsage(usage) {
  if (!usage || typeof usage !== 'object' || Array.isArray(usage)) return null;
  const allowed = ['inputTokens', 'outputTokens', 'totalTokens', 'cost', 'costUsd', 'currency'];
  const out = {};
  for (const key of allowed) {
    if (usage[key] == null) continue;
    if (typeof usage[key] === 'number') out[key] = usage[key];
    else if (typeof usage[key] === 'string') out[key] = usage[key].slice(0, 80);
  }
  return Object.keys(out).length ? out : null;
}

/**
 * @param {Array<{ body?: string | null }>} comments
 * @returns {{ evidence: ReturnType<typeof buildCloudAgentsExecutorEvidence> | null, lifecycle: ReturnType<typeof buildCursorLifecycleState> | null }}
 */
export function extractGovernedCursorEvidence(comments) {
  const list = Array.isArray(comments) ? [...comments].reverse() : [];
  let evidence = null;
  let lifecycle = null;
  for (const comment of list) {
    const body = String(comment?.body || '');
    if (!evidence) evidence = parseCloudAgentsExecutorEvidence(body);
    if (!lifecycle) lifecycle = parseCursorLifecycleStateFromText(body);
    if (evidence && lifecycle) break;
  }
  return { evidence, lifecycle };
}

/**
 * A next-packet release is safe only after the persisted completion contract
 * says PASS. COMPLETED provider status alone is intentionally insufficient.
 */
export function canReleaseNextCursorPacket(record) {
  return (
    String(record?.final_verdict || '').toUpperCase() === 'PASS' &&
    Boolean(record?.cursor_agent_id || record?.cursor_run_id) &&
    Boolean(record?.terminal_result_captured || record?.pr_number || record?.business_evidence_valid)
  );
}

/**
 * @param {{ issueNumber?: number | string | null, title?: string | null, url?: string | null, comments?: Array<{ body?: string | null }>, provider?: Record<string, unknown> | null }} input
 */
export function buildCursorControlRecord(input = {}) {
  const parsed = extractGovernedCursorEvidence(input.comments);
  const evidence = parsed.evidence;
  const lifecycle = parsed.lifecycle;
  const provider = input.provider && typeof input.provider === 'object' ? input.provider : {};
  const agentId = text(evidence?.cursor_agent_id || lifecycle?.cursorAgentId || provider.agentId, 160);
  const runId = text(evidence?.cursor_run_id || lifecycle?.cursorRunId || provider.id, 160);
  const finalResult = text(lifecycle?.finalResult || provider.finalResult, 1200);
  const finalVerdict = text(lifecycle?.finalVerdict || evidence?.final_verdict, 40);
  const businessEvidence = validateCursorBusinessEvidence(
    lifecycle?.business_evidence || evidence?.business_evidence || provider.finalResult,
    {
      sourceIssue: input.issueNumber || evidence?.source_issue,
      cursorAgentId: agentId,
      cursorRunId: runId,
    },
  );
  const record = {
    schema: CURSOR_CONTROL_SCHEMA,
    issue_number: positiveInteger(input.issueNumber || evidence?.source_issue),
    title: text(input.title, 300),
    issue_url: text(input.url, 500),
    cursor_agent_id: agentId,
    cursor_run_id: runId,
    phase: text(lifecycle?.phase || evidence?.status, 40),
    raw_status: text(lifecycle?.rawStatus || provider.status, 80),
    branch: text(lifecycle?.branch || evidence?.branch, 240),
    pr_number: positiveInteger(lifecycle?.prNumber || evidence?.pr_number),
    pr_url: text(lifecycle?.prUrl || evidence?.pr_url, 500),
    head_sha: text(lifecycle?.headSha || evidence?.head_sha, 120),
    ci_state: text(evidence?.ci_state || provider.ci_state, 80),
    final_verdict: finalVerdict,
    final_result: finalResult,
    terminal_result_captured: Boolean(finalResult),
    business_evidence_valid: businessEvidence.ok,
    business_evidence: businessEvidence.ok ? businessEvidence.evidence : null,
    usage: summarizeUsage(provider.usage),
    next_packet_release: canReleaseNextCursorPacket({
      final_verdict: finalVerdict,
      cursor_agent_id: agentId,
      cursor_run_id: runId,
      terminal_result_captured: Boolean(finalResult),
      business_evidence_valid: businessEvidence.ok,
      pr_number: positiveInteger(lifecycle?.prNumber || evidence?.pr_number),
    }),
    evidence_source: evidence ? 'github_comment' : 'provider_only',
  };
  return record;
}

/**
 * Only these query selectors are accepted by the COO read path.
 */
export function parseCursorControlQuery(query = {}) {
  const allowed = new Set(['issue', 'agent_id', 'run_id', 'limit']);
  const unexpected = Object.keys(query || {}).find((key) => key !== '__path' && !allowed.has(key));
  if (unexpected) return { ok: false, status: 400, error: 'UNEXPECTED_QUERY_PARAM', param: unexpected };
  const issue = query.issue == null ? null : positiveInteger(Array.isArray(query.issue) ? query.issue[0] : query.issue);
  const agentId = text(Array.isArray(query.agent_id) ? query.agent_id[0] : query.agent_id, 160);
  const runId = text(Array.isArray(query.run_id) ? query.run_id[0] : query.run_id, 160);
  const rawLimit = query.limit == null ? 10 : Number(Array.isArray(query.limit) ? query.limit[0] : query.limit);
  if (query.issue != null && issue == null) return { ok: false, status: 400, error: 'BAD_ISSUE' };
  if (query.limit != null && (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > CURSOR_CONTROL_MAX_RUNS)) {
    return { ok: false, status: 400, error: 'BAD_LIMIT' };
  }
  return { ok: true, value: { issue, agentId, runId, limit: rawLimit } };
}
