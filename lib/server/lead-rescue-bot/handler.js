/**
 * AI Lead Rescue assistant — POST handler for the chat-turn endpoint.
 *
 * Route: POST /api/lead-rescue/bot/turn (dispatched from `api/factory_router.js`).
 *
 * Wire format (request):
 * ```
 * {
 *   session_id: string,                 // opaque per-tab uuid minted by the client
 *   is_first_turn: boolean,             // true on the visitor's first message
 *   messages: [{ role: 'user' | 'assistant', content: string }, ...]
 * }
 * ```
 *
 * Wire format (response):
 * ```
 * {
 *   assistant_text: string,
 *   tool_calls: Array<{ name: 'scroll_to_intake' | 'prefill_intake_form', arguments: Record<string,unknown> }>,
 *   refusal_class: string | null,       // if non-null, this was a refusal — emit `lr_bot_refusal` on the client
 *   session_id: string                   // echoed for client-side verification
 * }
 * ```
 *
 * Security model (defence in depth):
 *  - Kill switch `CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED` (default OFF) gates the entire endpoint.
 *  - Apex / allow-listed host check (no calling from arbitrary tenant subdomains).
 *  - Origin / Referer header check (CSRF-class protection).
 *  - Hard length caps on every input field BEFORE any LLM call.
 *  - Per-IP rate limiter (sessions/hour + turns/session).
 *  - Input filter — banking-class data is replaced with `[REDACTED]` and the
 *    handler short-circuits with a refusal (the LLM never sees it).
 *  - Doctrine-locked system prompt + KB (verbatim from audit § 7) sent on every turn.
 *  - Output filter — assistant text is regex-checked against the doctrine
 *    forbidden-claims list; on match the text is replaced with a canonical refusal.
 *  - Tool whitelist of exactly 2 client-side tools (no DB writes, no auto-submit).
 *  - Tools have `additionalProperties:false` and `strict:true`.
 *  - `parallel_tool_calls:false`, `store:false` on the Responses API call.
 *
 * No DB writes. No tenant_id derivation. No PII persisted server-side. The
 * `lr_bot_*` Plausible events emitted on the client provide week-1 review data.
 * Catastrophic errors are emitted via `emitLogicFailure` (existing pattern).
 *
 * Doctrine references:
 *  - `docs/strategy/AI_LEAD_RESCUE_CHATBOT_VOICEBOT_OPTIONS_AUDIT_V1.md` § 5, § 7, § 8
 *  - `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § AI Lead Rescue doctrine
 *  - `docs/operations/SECURITY_REVIEW_CHECKLIST.md`
 */

import { emitLogicFailure } from '../../cmp/_lib/telemetry.js';
import { cfg } from '../runtime-config.js';
import {
  LEAD_RESCUE_BOT_MODEL_DEFAULTS,
  LEAD_RESCUE_BOT_SYSTEM_PROMPT,
} from './system-prompt.js';
import { buildSystemPromptWithKb } from './kb.js';
import { checkUserInputForBankingData } from './input-filter.js';
import { checkAssistantOutput } from './output-filter.js';
import {
  OUTPUT_FILTER_REFUSAL_MAP,
  getRefusalTemplate,
} from './refusal-templates.js';
import { checkRateLimit, recordTurn } from './rate-limiter.js';
import {
  callOpenAiResponses,
  extractAssistantText,
  extractFunctionCalls,
  resolveLeadRescueBotModel,
} from './openai-client.js';
import {
  LEAD_RESCUE_BOT_TOOLS,
  LEAD_RESCUE_BOT_TOOL_NAME_ALLOWLIST,
  PREFILL_FIELD_ALLOWLIST,
} from './tools.js';

const MAX_MESSAGES_HISTORY = 20;
const MAX_MESSAGE_CHARS = 1000;
const MAX_TOTAL_CHARS = 6000;
const SESSION_ID_RX = /^[0-9a-zA-Z._-]{8,80}$/;

/**
 * @param {unknown} v
 * @returns {string}
 */
function asString(v) {
  return v == null ? '' : String(v).trim();
}

/**
 * @returns {boolean}
 */
function isServerSideKillSwitchEnabled() {
  const raw = String(cfg('CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED', '') || '').toLowerCase().trim();
  return raw === 'true' || raw === '1' || raw === 'on' || raw === 'yes';
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {string}
 */
function resolveHost(req) {
  const raw =
    (req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').toString().split(',')[0] || '';
  return raw.trim().toLowerCase().replace(/:\d+$/, '');
}

/**
 * Apex (corpflowai.com / www.corpflowai.com) is always allowed. A dedicated
 * subdomain can be added via `CORPFLOW_LEAD_RESCUE_BOT_ALLOWED_HOSTS`
 * (comma-separated). Any other host is rejected (the bot is launch-specific
 * for the /lead-rescue page).
 *
 * @param {string} host
 * @returns {boolean}
 */
function isHostAllowed(host) {
  const h = String(host || '').toLowerCase().replace(/:\d+$/, '');
  if (!h) return false;
  const root = String(cfg('CORPFLOW_ROOT_DOMAIN', 'corpflowai.com')).toLowerCase().replace(/^\./, '');
  if (h === root || h === `www.${root}`) return true;
  const extra = String(cfg('CORPFLOW_LEAD_RESCUE_BOT_ALLOWED_HOSTS', '') || '')
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return extra.includes(h);
}

/**
 * Reject if Origin / Referer is set but does not match the host (or is not on
 * an allowed host). When neither header is set (rare; programmatic calls), we
 * defer to the host check + rate limit. We do NOT require Origin to be present
 * because some browsers omit it on same-origin POSTs.
 *
 * @param {import('http').IncomingMessage} req
 * @param {string} host
 * @returns {boolean}
 */
function isOriginAcceptable(req, host) {
  const origin = asString(req?.headers?.origin);
  const referer = asString(req?.headers?.referer);
  if (!origin && !referer) return true;
  for (const candidate of [origin, referer]) {
    if (!candidate) continue;
    try {
      const u = new URL(candidate);
      const candidateHost = u.host.toLowerCase().replace(/:\d+$/, '');
      if (!isHostAllowed(candidateHost)) return false;
      if (candidateHost !== host && candidateHost !== `www.${host}`) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {string}
 */
function resolveCallerIp(req) {
  const xff = asString(req?.headers?.['x-forwarded-for']);
  if (xff) {
    const first = xff.split(',')[0];
    if (first) return first.trim();
  }
  const real = asString(req?.headers?.['x-real-ip']);
  if (real) return real;
  return asString(/** @type {any} */ (req)?.socket?.remoteAddress) || 'unknown';
}

/**
 * @typedef {{role: 'user' | 'assistant', content: string}} ChatMessage
 */

/**
 * Validate + clamp the messages array. Returns `null` if the shape is invalid.
 *
 * @param {unknown} raw
 * @returns {ChatMessage[] | null}
 */
function validateMessages(raw) {
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return null;
  if (raw.length > MAX_MESSAGES_HISTORY) return null;
  /** @type {ChatMessage[]} */
  const out = [];
  let total = 0;
  for (const m of raw) {
    if (!m || typeof m !== 'object') return null;
    const role = asString(/** @type {any} */ (m).role);
    const content = asString(/** @type {any} */ (m).content);
    if (role !== 'user' && role !== 'assistant') return null;
    if (!content) return null;
    if (content.length > MAX_MESSAGE_CHARS) return null;
    total += content.length;
    if (total > MAX_TOTAL_CHARS) return null;
    out.push({ role, content });
  }
  if (out[out.length - 1].role !== 'user') return null;
  return out;
}

/**
 * @param {ChatMessage[]} messages
 * @returns {import('./openai-client.js').ResponsesInputItem[]}
 */
function toResponsesInput(messages) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

/**
 * @param {Array<{ name: string, call_id: string, arguments: string }>} rawCalls
 * @returns {Array<{ name: string, arguments: Record<string, unknown> }>}
 */
function sanitizeToolCalls(rawCalls) {
  /** @type {Array<{ name: string, arguments: Record<string, unknown> }>} */
  const out = [];
  for (const c of rawCalls) {
    if (!c || !LEAD_RESCUE_BOT_TOOL_NAME_ALLOWLIST.has(c.name)) continue;
    /** @type {Record<string, unknown>} */
    let parsed = {};
    if (c.arguments) {
      try {
        const p = JSON.parse(c.arguments);
        if (p && typeof p === 'object' && !Array.isArray(p)) {
          parsed = /** @type {Record<string, unknown>} */ (p);
        }
      } catch {
        parsed = {};
      }
    }
    if (c.name === 'prefill_intake_form') {
      /** @type {Record<string, unknown>} */
      const filtered = {};
      for (const k of Object.keys(parsed)) {
        if (!PREFILL_FIELD_ALLOWLIST.has(k)) continue;
        const v = parsed[k];
        if (typeof v !== 'string') continue;
        const trimmed = v.trim();
        if (!trimmed) continue;
        filtered[k] = trimmed.slice(0, 200);
      }
      parsed = filtered;
    }
    out.push({ name: c.name, arguments: parsed });
  }
  return out;
}

/**
 * @param {string} refusalId
 * @param {string} sessionId
 * @returns {{ assistant_text: string, tool_calls: Array<{name: string, arguments: Record<string,unknown>}>, refusal_class: string, session_id: string }}
 */
function buildRefusalResponse(refusalId, sessionId) {
  const template = getRefusalTemplate(refusalId);
  /** @type {Array<{name: string, arguments: Record<string,unknown>}>} */
  const toolCalls = template.offerIntake
    ? [{ name: 'scroll_to_intake', arguments: {} }]
    : [];
  return {
    assistant_text: template.message,
    tool_calls: toolCalls,
    refusal_class: template.id,
    session_id: sessionId,
  };
}

/**
 * @param {import('http').IncomingMessage & { body?: unknown }} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export default async function leadRescueBotTurnHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }));
    return;
  }

  if (!isServerSideKillSwitchEnabled()) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'BOT_DISABLED' }));
    return;
  }

  const host = resolveHost(req);
  if (!isHostAllowed(host)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'HOST_NOT_ALLOWED' }));
    return;
  }
  if (!isOriginAcceptable(req, host)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'ORIGIN_NOT_ALLOWED' }));
    return;
  }

  const body = req.body && typeof req.body === 'object' ? /** @type {any} */ (req.body) : null;
  if (!body) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'MISSING_JSON_BODY' }));
    return;
  }

  const sessionId = asString(body.session_id);
  if (!SESSION_ID_RX.test(sessionId)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'INVALID_SESSION_ID' }));
    return;
  }

  const isFirstTurn = body.is_first_turn === true;

  const messages = validateMessages(body.messages);
  if (!messages) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'INVALID_MESSAGES' }));
    return;
  }

  const ip = resolveCallerIp(req);

  const rate = checkRateLimit({ ip, sessionId, isFirstTurn });
  if (!rate.allowed) {
    const refusal = buildRefusalResponse('rate_limited', sessionId);
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Retry-After', '300');
    res.end(JSON.stringify(refusal));
    return;
  }

  const lastUserMessage = messages[messages.length - 1].content;
  const inputCheck = checkUserInputForBankingData(lastUserMessage);
  if (inputCheck.blocked) {
    recordTurn({ ip, sessionId, isFirstTurn });
    const refusal = buildRefusalResponse('banking_data_in_input', sessionId);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(refusal));
    return;
  }

  const instructions = buildSystemPromptWithKb(LEAD_RESCUE_BOT_SYSTEM_PROMPT);
  const model = resolveLeadRescueBotModel();

  /** @type {import('./openai-client.js').ResponsesApiResult} */
  let result;
  try {
    result = await callOpenAiResponses({
      model,
      instructions,
      input: toResponsesInput(messages),
      tools: /** @type {any} */ (LEAD_RESCUE_BOT_TOOLS),
      temperature: LEAD_RESCUE_BOT_MODEL_DEFAULTS.temperature,
      maxOutputTokens: LEAD_RESCUE_BOT_MODEL_DEFAULTS.max_output_tokens,
    });
  } catch (err) {
    const kind = /** @type {any} */ (err)?.kind || 'unknown';
    try {
      emitLogicFailure({
        source: 'lead_rescue_bot.openai_responses_call',
        severity: 'error',
        error: /** @type {any} */ (err),
        recommended_action:
          'Confirm OPENAI_API_KEY is set on the active environment, check OpenAI Platform credits + usage alert, then re-test.',
        meta: {
          host,
          session_id_prefix: sessionId.slice(0, 6),
          model,
          err_kind: kind,
          err_status: /** @type {any} */ (err)?.status ?? null,
          err_body_preview: String(/** @type {any} */ (err)?.body || '').slice(0, 200),
        },
      });
    } catch {
      /* telemetry must never crash the response */
    }
    recordTurn({ ip, sessionId, isFirstTurn });
    const refusal = buildRefusalResponse('vendor_unavailable', sessionId);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(refusal));
    return;
  }

  recordTurn({ ip, sessionId, isFirstTurn });

  const rawAssistantText = extractAssistantText(result);
  const rawFunctionCalls = extractFunctionCalls(result);

  const outputCheck = checkAssistantOutput(rawAssistantText);
  if (outputCheck.blocked && outputCheck.refusalClass) {
    try {
      emitLogicFailure({
        source: 'lead_rescue_bot.output_filter_blocked',
        severity: 'warn',
        error: new Error(
          `Assistant output blocked by post-filter: ${outputCheck.refusalClass}`,
        ),
        recommended_action:
          'Review the matched pattern + assistant output preview; if false-positive, tighten the regex in `lib/server/lead-rescue-bot/output-filter.js`. If true-positive, tighten the system prompt in `lib/server/lead-rescue-bot/system-prompt.js`.',
        meta: {
          host,
          session_id_prefix: sessionId.slice(0, 6),
          model,
          refusal_class: outputCheck.refusalClass,
          matched_pattern: outputCheck.matchedPattern,
          assistant_text_preview: rawAssistantText.slice(0, 200),
        },
      });
    } catch {
      /* ignore */
    }
    const refusalId = OUTPUT_FILTER_REFUSAL_MAP[outputCheck.refusalClass] || 'internal_error';
    const refusal = buildRefusalResponse(refusalId, sessionId);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(refusal));
    return;
  }

  const sanitizedToolCalls = sanitizeToolCalls(rawFunctionCalls);

  const finalText = rawAssistantText
    || "I can help you start the intake — we review every intake within two business hours.";

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      assistant_text: finalText,
      tool_calls: sanitizedToolCalls,
      refusal_class: null,
      session_id: sessionId,
    }),
  );
}

/**
 * Exported for unit tests. Mirrors the production export.
 */
export const __internal = Object.freeze({
  validateMessages,
  sanitizeToolCalls,
  buildRefusalResponse,
  isHostAllowed,
  isOriginAcceptable,
});
