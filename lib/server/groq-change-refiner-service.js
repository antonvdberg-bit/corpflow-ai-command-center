import { emitTelemetry } from '../cmp/_lib/telemetry.js';
import { recordTrustedAutomationEvent } from '../automation/internal.js';
import { cfg } from './runtime-config.js';
import { buildChangeRefinerSystemPrompt } from './groq-prompts.js';
import {
  CLIENT_SAFE_CHANGE_REFINER_HOLDING,
  extractJsonObjectFromModelText,
  GROQ_CHANGE_REFINER_PROMPT_VERSION,
  GROQ_CHANGE_REFINER_ROLE,
  hashGroqPromptInputs,
  mergeChangeRefinerBriefForStorage,
  validateChangeRefinerOutput,
} from './groq-contracts.js';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_ATTEMPTS = 3;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {import('@prisma/client').PrismaClient | null} prisma
 * @param {string | null} tenantId
 * @param {string} ticketId
 * @param {Record<string, unknown>} payload
 */
async function emitCodexEscalationMarker(prisma, tenantId, ticketId, payload) {
  if (!prisma) return;
  try {
    await recordTrustedAutomationEvent(prisma, {
      tenantId,
      eventType: 'cmp.groq.codex_escalation_marker',
      source: 'groq_change_refiner',
      payload: {
        ticket_id: ticketId,
        ...payload,
      },
      idempotencyKey: `groq-codex-esc:${ticketId}:${Date.now()}`,
    });
  } catch {
    // Non-blocking internal marker only.
  }
}

/**
 * @param {{
 *   prisma: import('@prisma/client').PrismaClient | null;
 *   ticketId: string;
 *   tenantId?: string | null;
 *   messages: { role?: string; content?: string; ts?: string }[];
 *   locale: string;
 *   existingBrief: Record<string, unknown>;
 * }} args
 * @returns {Promise<{
 *   llm_ok: boolean;
 *   assistant: string;
 *   brief: Record<string, unknown>;
 *   holding_used: boolean;
 *   escalation_triggered: boolean;
 * }>}
 */
export async function runGovernedGroqChangeRefiner(args) {
  const { prisma, ticketId, tenantId, messages, locale, existingBrief } = args;
  const key = String(process.env.GROQ_API_KEY || cfg('GROQ_API_KEY', '') || '')
    .toString()
    .trim();
  const model = String(process.env.GROQ_MODEL_NAME || cfg('GROQ_MODEL_NAME', '') || 'llama-3.3-70b-versatile').trim();

  const system = buildChangeRefinerSystemPrompt(locale);
  const tail = messages.slice(-16).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || ''),
  }));
  const promptHash = hashGroqPromptInputs(system, tail);

  /** @type {Record<string, unknown>[]} */
  const attemptLog = [];
  let escalation_triggered = false;

  const baseCmp = { ticket_id: ticketId, action: 'change-chat' };

  const logSession = (final) => {
    emitTelemetry({
      event_type: 'groq.change_refiner',
      cmp: baseCmp,
      payload: {
        role: GROQ_CHANGE_REFINER_ROLE,
        prompt_version: GROQ_CHANGE_REFINER_PROMPT_VERSION,
        model,
        prompt_hash: promptHash,
        ticket_id: ticketId,
        tenant_id: tenantId != null ? String(tenantId) : null,
        escalation_triggered,
        attempts: attemptLog,
        ...final,
      },
    });
  };

  if (!key) {
    attemptLog.push({ attempt: 0, stage: 'config', success: false, error_reason: 'groq_api_key_missing' });
    logSession({
      final_success: false,
      final_error_reason: 'groq_api_key_missing',
      parsed_output_safe: null,
      raw_output_included: false,
    });
    return {
      llm_ok: false,
      assistant: CLIENT_SAFE_CHANGE_REFINER_HOLDING,
      brief: { ...existingBrief },
      holding_used: true,
      escalation_triggered: false,
    };
  }

  let lastRaw = '';
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const t0 = Date.now();
    let usage = null;
    let latencyMs = 0;
    try {
      const r = await fetch(GROQ_CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [{ role: 'system', content: system }, ...tail],
        }),
      });
      latencyMs = Date.now() - t0;
      const data = await r.json().catch(() => ({}));
      const text = data?.choices?.[0]?.message?.content ?? '';
      lastRaw = String(text || '').trim();
      usage =
        data?.usage && typeof data.usage === 'object'
          ? {
              prompt_tokens: data.usage.prompt_tokens,
              completion_tokens: data.usage.completion_tokens,
              total_tokens: data.usage.total_tokens,
            }
          : null;

      if (!r.ok) {
        const errText = data?.error?.message || data?.message || `groq_http_${r.status}`;
        lastError = String(errText || 'groq_http_error');
        attemptLog.push({
          attempt,
          success: false,
          latency_ms: latencyMs,
          token_usage: usage,
          error_reason: lastError,
          raw_output_snippet: lastRaw ? lastRaw.slice(0, 2000) : null,
        });
        if (attempt < MAX_ATTEMPTS) await sleep(120 * attempt);
        continue;
      }

      const obj = extractJsonObjectFromModelText(lastRaw);
      const validated = validateChangeRefinerOutput(obj);
      if (!validated.ok) {
        lastError = validated.reason;
        attemptLog.push({
          attempt,
          success: false,
          latency_ms: latencyMs,
          token_usage: usage,
          error_reason: validated.reason,
          raw_output_snippet: lastRaw ? lastRaw.slice(0, 4000) : null,
        });
        if (attempt < MAX_ATTEMPTS) await sleep(120 * attempt);
        continue;
      }

      const mergedBrief = mergeChangeRefinerBriefForStorage(existingBrief, validated.value);
      attemptLog.push({
        attempt,
        success: true,
        latency_ms: latencyMs,
        token_usage: usage,
        error_reason: null,
        parsed_output_safe: validated.value,
        raw_output_included: true,
        raw_output_snippet: lastRaw ? lastRaw.slice(0, 4000) : null,
      });
      logSession({
        final_success: true,
        final_error_reason: null,
        parsed_output_safe: validated.value,
        raw_output_included: true,
      });
      return {
        llm_ok: true,
        assistant: validated.value.client_safe_response,
        brief: mergedBrief,
        holding_used: false,
        escalation_triggered: false,
      };
    } catch (e) {
      latencyMs = Date.now() - t0;
      lastError = String(e?.message || e || 'groq_network_error');
      attemptLog.push({
        attempt,
        success: false,
        latency_ms: latencyMs,
        token_usage: usage,
        error_reason: lastError,
        raw_output_snippet: lastRaw ? lastRaw.slice(0, 2000) : null,
      });
      if (attempt < MAX_ATTEMPTS) await sleep(120 * attempt);
    }
  }

  escalation_triggered = true;
  attemptLog.push({
    attempt: 'final',
    success: false,
    error_reason: lastError || 'exhausted_retries',
    raw_output_snippet: lastRaw ? lastRaw.slice(0, 4000) : null,
  });
  logSession({
    final_success: false,
    final_error_reason: lastError || 'exhausted_retries',
    parsed_output_safe: null,
    raw_output_included: Boolean(lastRaw),
    raw_output_snippet: lastRaw ? lastRaw.slice(0, 8000) : null,
  });

  await emitCodexEscalationMarker(prisma, tenantId || null, ticketId, {
    role: GROQ_CHANGE_REFINER_ROLE,
    prompt_version: GROQ_CHANGE_REFINER_PROMPT_VERSION,
    model,
    prompt_hash: promptHash,
    reason: lastError || 'exhausted_retries',
    escalated_at: new Date().toISOString(),
    note:
      'Automated Codex handoff is not wired in-repo; this automation_events row is the internal escalation marker for operators/agents.',
  });

  return {
    llm_ok: false,
    assistant: CLIENT_SAFE_CHANGE_REFINER_HOLDING,
    brief: { ...existingBrief },
    holding_used: true,
    escalation_triggered: true,
  };
}
