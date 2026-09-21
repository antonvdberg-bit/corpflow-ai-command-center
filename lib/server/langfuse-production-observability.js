import { createHash, randomBytes } from 'node:crypto';

const ALLOWED_BASE_URL = 'https://cloud.langfuse.com';
const DEFAULT_TIMEOUT_MS = 900;

function str(v) {
  return v == null ? '' : String(v).trim();
}

function idHex(bytes) {
  return randomBytes(bytes).toString('hex');
}

function stableId(seed, bytes) {
  return createHash('sha256').update(String(seed)).digest('hex').slice(0, bytes * 2);
}

function attr(key, value) {
  if (Array.isArray(value)) {
    return {
      key,
      value: { arrayValue: { values: value.map((item) => ({ stringValue: String(item) })) } },
    };
  }
  if (typeof value === 'boolean') return { key, value: { boolValue: value } };
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value)
      ? { key, value: { intValue: String(value) } }
      : { key, value: { doubleValue: value } };
  }
  return { key, value: { stringValue: String(value) } };
}

function nanos(ms) {
  return String(BigInt(ms) * 1_000_000n);
}

export function langfuseProductionReadiness(env = process.env) {
  const baseUrl = str(env.LANGFUSE_BASE_URL).replace(/\/$/, '');
  const environmentAllowed = str(env.VERCEL_ENV) === 'production';
  return {
    ready:
      environmentAllowed &&
      baseUrl === ALLOWED_BASE_URL &&
      Boolean(str(env.LANGFUSE_PUBLIC_KEY)) &&
      Boolean(str(env.LANGFUSE_SECRET_KEY)),
    environment_allowed: environmentAllowed,
    base_url_allowed: baseUrl === ALLOWED_BASE_URL,
    public_key_configured: Boolean(str(env.LANGFUSE_PUBLIC_KEY)),
    secret_key_configured: Boolean(str(env.LANGFUSE_SECRET_KEY)),
  };
}

export function summarizeLlmMessages(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const roles = {};
  let characters = 0;
  for (const item of list) {
    const role = str(item?.role) || 'unknown';
    roles[role] = (roles[role] || 0) + 1;
    characters += String(item?.content ?? '').length;
  }
  return {
    redacted: true,
    message_count: list.length,
    roles,
    character_count: characters,
  };
}

export function summarizeGroqResponse(data, httpStatus) {
  const choices = Array.isArray(data?.choices) ? data.choices : [];
  return {
    redacted: true,
    http_status: Number(httpStatus) || 0,
    choice_count: choices.length,
    finish_reasons: choices.map((c) => str(c?.finish_reason)).filter(Boolean).slice(0, 8),
    output_character_count: choices.reduce(
      (sum, c) => sum + String(c?.message?.content ?? '').length,
      0,
    ),
  };
}

function usageDetails(data) {
  const usage = data?.usage && typeof data.usage === 'object' ? data.usage : {};
  const input = Number(usage.prompt_tokens);
  const output = Number(usage.completion_tokens);
  const total = Number(usage.total_tokens);
  const out = {};
  if (Number.isFinite(input) && input >= 0) out.input = input;
  if (Number.isFinite(output) && output >= 0) out.output = output;
  if (Number.isFinite(total) && total >= 0) out.total = total;
  return out;
}

function safeContext(context = {}) {
  const workflow = str(context.workflow) || 'groq.chat.completions';
  const product = str(context.product) || 'corpflowai-core';
  const workstreamId = str(context.workstream_id);
  const workPacketId = str(context.work_packet_id);
  return {
    workflow,
    product,
    ...(workstreamId ? { workstream_id: workstreamId.slice(0, 120) } : {}),
    ...(workPacketId ? { work_packet_id: workPacketId.slice(0, 120) } : {}),
  };
}

export function buildProductionGroqTrace({
  model,
  messages,
  providerData,
  httpStatus,
  startedAtMs,
  endedAtMs,
  context,
  env = process.env,
  ids = {},
}) {
  const traceId = ids.traceId || idHex(16);
  const spanId = ids.spanId || idHex(8);
  const safe = safeContext(context);
  const usage = usageDetails(providerData);
  const actualModel = str(providerData?.model) || str(model) || 'unknown';
  const environment = str(env.VERCEL_ENV) || str(env.NODE_ENV) || 'unknown';
  const release = str(env.VERCEL_GIT_COMMIT_SHA);
  const inputSummary = summarizeLlmMessages(messages);
  const outputSummary = summarizeGroqResponse(providerData, httpStatus);
  const ok = Number(httpStatus) >= 200 && Number(httpStatus) < 300;

  const attrs = [
    attr('langfuse.trace.name', `corpflowai.${safe.workflow}`),
    attr('langfuse.environment', environment),
    attr('langfuse.trace.tags', ['corpflowai', 'production-observability', 'groq']),
    attr('langfuse.trace.metadata.corpflow.product', safe.product),
    attr('langfuse.trace.metadata.corpflow.workflow', safe.workflow),
    attr('langfuse.trace.metadata.corpflow.provider', 'groq'),
    attr('langfuse.trace.metadata.corpflow.data_class', 'production_redacted'),
    ...(safe.workstream_id
      ? [attr('langfuse.trace.metadata.corpflow.workstream_id', safe.workstream_id)]
      : []),
    ...(safe.work_packet_id
      ? [attr('langfuse.trace.metadata.corpflow.work_packet_id', safe.work_packet_id)]
      : []),
    attr('langfuse.observation.type', 'generation'),
    attr('langfuse.observation.model.name', actualModel),
    attr('langfuse.observation.input', JSON.stringify(inputSummary)),
    attr('langfuse.observation.output', JSON.stringify(outputSummary)),
    attr('langfuse.observation.metadata.provider', 'groq'),
    attr('langfuse.observation.metadata.content_policy', 'redacted_summary_only'),
    attr('langfuse.observation.metadata.http_status', Number(httpStatus) || 0),
    ...(Object.keys(usage).length
      ? [attr('langfuse.observation.usage_details', JSON.stringify(usage))]
      : []),
    ...(release ? [attr('langfuse.release', release)] : []),
  ];

  const span = {
    traceId,
    spanId,
    name: safe.workflow,
    kind: 1,
    startTimeUnixNano: nanos(startedAtMs),
    endTimeUnixNano: nanos(Math.max(endedAtMs, startedAtMs + 1)),
    attributes: attrs,
    status: { code: ok ? 1 : 2 },
  };

  return {
    traceId,
    spanId,
    payload: {
      resourceSpans: [
        {
          resource: {
            attributes: [
              attr('service.name', 'corpflowai-llm-observability'),
              attr('deployment.environment.name', environment),
            ],
          },
          scopeSpans: [
            {
              scope: { name: 'corpflowai.langfuse.production', version: '1.0.0' },
              spans: [span],
            },
          ],
        },
      ],
    },
    usage,
    inputSummary,
    outputSummary,
  };
}

export async function emitProductionGroqTrace({
  model,
  messages,
  providerData,
  httpStatus,
  startedAtMs,
  endedAtMs,
  context,
  env = process.env,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const readiness = langfuseProductionReadiness(env);
  if (!readiness.ready) return { ok: false, skipped: true, reason: 'LANGFUSE_NOT_CONFIGURED' };
  if (typeof fetchImpl !== 'function') return { ok: false, skipped: true, reason: 'FETCH_UNAVAILABLE' };

  const built = buildProductionGroqTrace({
    model,
    messages,
    providerData,
    httpStatus,
    startedAtMs,
    endedAtMs,
    context,
    env,
  });
  const baseUrl = str(env.LANGFUSE_BASE_URL).replace(/\/$/, '');
  const authorization = `Basic ${Buffer.from(
    `${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`,
    'utf8',
  ).toString('base64')}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(100, Number(timeoutMs) || DEFAULT_TIMEOUT_MS));

  try {
    const response = await fetchImpl(`${baseUrl}/api/public/otel/v1/traces`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        'x-langfuse-ingestion-version': '4',
      },
      body: JSON.stringify(built.payload),
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      skipped: false,
      http_status: response.status,
      trace_id: built.traceId,
      span_id: built.spanId,
      usage_ingested: Object.keys(built.usage).length > 0,
      content_redacted: true,
    };
  } catch {
    return { ok: false, skipped: false, reason: 'LANGFUSE_EMIT_FAILED', content_redacted: true };
  } finally {
    clearTimeout(timer);
  }
}

function cursorUsageDetails(usage = {}) {
  const source = usage && typeof usage === 'object' ? usage : {};
  const aliases = {
    input: ['inputTokens', 'input_tokens', 'promptTokens', 'prompt_tokens'],
    output: ['outputTokens', 'output_tokens', 'completionTokens', 'completion_tokens'],
    cache_write: ['cacheWriteTokens', 'cache_write_tokens'],
    cache_read: ['cacheReadTokens', 'cache_read_tokens'],
    total: ['totalTokens', 'total_tokens'],
  };
  const result = {};
  for (const [name, keys] of Object.entries(aliases)) {
    const value = keys.map((key) => source[key]).find((candidate) => candidate != null);
    const number = Number(value);
    if (Number.isFinite(number) && number >= 0) result[name] = number;
  }
  if (result.total == null && (result.input != null || result.output != null)) {
    result.total = (result.input || 0) + (result.output || 0);
  }
  return result;
}

export function buildProductionCursorTrace({
  agentId,
  runId,
  sourceIssue,
  modelSelection,
  usage,
  status,
  outcomeRef,
  occurredAt,
  env = process.env,
}) {
  const safeAgent = str(agentId).slice(0, 120);
  const safeRun = str(runId).slice(0, 160);
  const usageDetails = cursorUsageDetails(usage);
  const actualModel =
    str(modelSelection?.id) ||
    str(usage?.model) ||
    str(usage?.modelId) ||
    'unknown';
  const eventId = `cursor:${safeAgent}:${safeRun}`;
  const traceId = stableId(`corpflow.cursor.cloud_agent.run:${eventId}`, 16);
  const spanId = stableId(`observation:${eventId}`, 8);
  const environment = str(env.VERCEL_ENV) || str(env.NODE_ENV) || 'unknown';
  const total = usageDetails.total;
  const included =
    String(usage?.cost || usage?.costType || usage?.billing || '').toLowerCase() ===
    'included';
  const economicEvent = {
    schema: 'corpflow.ai_economic_event.v1',
    event_id: eventId,
    occurred_at: str(occurredAt) || null,
    source_id: 'cursor-cloud-factory',
    provider: 'cursor',
    tool: 'cursor-cloud',
    model: actualModel,
    cost_class: included ? 'included_capacity' : 'variable_usage',
    cash_cost: null,
    cash_currency: null,
    economic_consumption: total ?? null,
    economic_unit: total != null ? 'tokens' : null,
    usage: {
      input: usageDetails.input ?? null,
      output: usageDetails.output ?? null,
      total: total ?? null,
    },
    product: 'cursor-cloud',
    workflow: 'cursor.cloud_agent.run',
    work_packet_id: Number.isInteger(Number(sourceIssue))
      ? `github-issue-${Number(sourceIssue)}`
      : null,
    retry_count: 0,
    followup_count: 0,
    outcome: String(status).toUpperCase() === 'COMPLETED' ? 'successful' : 'failed',
    outcome_ref: str(outcomeRef).slice(0, 240) || null,
    measurement_quality: total != null ? 'provider_reported' : 'unknown',
  };
  const attrs = [
    attr('langfuse.trace.name', 'corpflowai.cursor.cloud_agent.run'),
    attr('langfuse.environment', environment),
    attr('langfuse.trace.tags', ['corpflowai', 'cursor', 'economic-evidence']),
    attr('langfuse.trace.metadata.corpflow.source', 'cursor-cloud-factory'),
    attr('langfuse.trace.metadata.corpflow.agent_id', safeAgent),
    attr('langfuse.trace.metadata.corpflow.run_id', safeRun),
    ...(sourceIssue ? [attr('langfuse.trace.metadata.corpflow.source_issue', Number(sourceIssue))] : []),
    attr('langfuse.trace.metadata.corpflow.data_class', 'operational_redacted'),
    attr('langfuse.observation.type', 'generation'),
    attr('langfuse.observation.model.name', actualModel),
    attr('langfuse.observation.input', JSON.stringify({ redacted: true, source: 'cursor_usage_api' })),
    attr('langfuse.observation.output', JSON.stringify({ redacted: true, status })),
    attr('langfuse.observation.metadata.economic_event', JSON.stringify(economicEvent)),
    attr('langfuse.observation.metadata.content_policy', 'no_prompt_transcript_or_client_data'),
    attr('langfuse.observation.usage_details', JSON.stringify({
      ...usageDetails,
      cache_write: usageDetails.cache_write ?? null,
      cache_read: usageDetails.cache_read ?? null,
    })),
  ];
  const span = {
    traceId,
    spanId,
    name: 'cursor.cloud_agent.run',
    kind: 1,
    startTimeUnixNano: nanos(Date.parse(occurredAt) || Date.now()),
    endTimeUnixNano: nanos((Date.parse(occurredAt) || Date.now()) + 1),
    attributes: attrs,
    status: { code: String(status).toUpperCase() === 'COMPLETED' ? 1 : 2 },
  };
  return {
    traceId,
    spanId,
    economicEvent,
    payload: {
      resourceSpans: [{
        resource: {
          attributes: [
            attr('service.name', 'corpflowai-cursor-economic-observability'),
            attr('deployment.environment.name', environment),
          ],
        },
        scopeSpans: [{
          scope: { name: 'corpflowai.langfuse.cursor', version: '1.0.0' },
          spans: [span],
        }],
      }],
    },
  };
}

export async function emitProductionCursorTrace(input = {}) {
  const readiness = langfuseProductionReadiness(input.env || process.env);
  if (!readiness.ready) return { ok: false, skipped: true, reason: 'LANGFUSE_NOT_CONFIGURED' };
  if (typeof input.fetchImpl !== 'function' && typeof globalThis.fetch !== 'function') {
    return { ok: false, skipped: true, reason: 'FETCH_UNAVAILABLE' };
  }
  const env = input.env || process.env;
  const built = buildProductionCursorTrace({ ...input, env });
  const controller = new AbortController();
  const timeoutMs = Math.max(100, Number(input.timeoutMs) || DEFAULT_TIMEOUT_MS);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await (input.fetchImpl || globalThis.fetch)(
      `${str(env.LANGFUSE_BASE_URL).replace(/\/$/, '')}/api/public/otel/v1/traces`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`, 'utf8').toString('base64')}`,
          'Content-Type': 'application/json',
          'x-langfuse-ingestion-version': '4',
        },
        body: JSON.stringify(built.payload),
        signal: controller.signal,
      },
    );
    return {
      ok: response.ok,
      skipped: false,
      http_status: response.status,
      trace_id: built.traceId,
      span_id: built.spanId,
      economic_event: built.economicEvent,
      content_redacted: true,
    };
  } catch {
    return { ok: false, skipped: false, reason: 'LANGFUSE_EMIT_FAILED', content_redacted: true };
  } finally {
    clearTimeout(timer);
  }
}
