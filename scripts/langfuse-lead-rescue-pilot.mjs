import { randomBytes } from 'node:crypto';

const TRACE_NAME = 'corpflowai.lead_rescue.synthetic_pilot';
const SERVICE_NAME = 'corpflowai-langfuse-sandbox-pilot';
const ALLOWED_BASE_URL = 'https://cloud.langfuse.com';

const SYNTHETIC_ENQUIRY = Object.freeze({
  enquiry_id: 'synthetic-enquiry-1282-001',
  tenant_id: 'synthetic-tenant-langfuse-pilot',
  contact_name: 'Synthetic Visitor',
  business_name: 'Synthetic Mauritius Services Ltd',
  contact_method: 'email',
  contact_value: 'synthetic@example.invalid',
  service_interest: 'lead_rescue',
  message: 'We receive website enquiries but sometimes take a day to respond. Please show how Lead Rescue would handle this.',
  urgency: 'normal',
});

const SYNTHETIC_CLASSIFICATION = Object.freeze({
  intent: 'lead_rescue',
  urgency: 'normal',
  confidence: 0.98,
  requires_human_review: true,
});

const SYNTHETIC_PROMPT = Object.freeze({
  name: 'lead-rescue-response-draft-synthetic-pilot',
  version: 1,
  messages: [
    {
      role: 'system',
      content: 'Draft a concise acknowledgement for a Lead Rescue enquiry. Do not make pricing, availability, revenue, or delivery commitments. State that a CorpFlowAI human will review before any next action.',
    },
    {
      role: 'user',
      content: SYNTHETIC_ENQUIRY.message,
    },
  ],
});

const SYNTHETIC_DRAFT = 'Thanks for your enquiry. CorpFlowAI can review where follow-up is being lost and prepare a Lead Rescue recommendation. A CorpFlowAI human will review your enquiry before any next action or commitment.';

const SYNTHETIC_HANDOFF = Object.freeze({
  decision: 'human_review_required',
  route: 'corpflow_operator',
  outbound_action: 'none',
});

const SYNTHETIC_OUTCOME = Object.freeze({
  status: 'draft_ready_for_human_review',
  customer_contacted: false,
  production_write: false,
});

function idHex(bytes) {
  return randomBytes(bytes).toString('hex');
}

function valueString(value) {
  return { stringValue: String(value) };
}

function valueBool(value) {
  return { boolValue: Boolean(value) };
}

function valueStringArray(values) {
  return { arrayValue: { values: values.map((value) => valueString(value)) } };
}

function attr(key, value) {
  if (Array.isArray(value)) return { key, value: valueStringArray(value) };
  if (typeof value === 'boolean') return { key, value: valueBool(value) };
  return { key, value: valueString(value) };
}

function json(value) {
  return JSON.stringify(value);
}

function nanos(ms) {
  return String(BigInt(ms) * 1_000_000n);
}

function traceAttributes(overrides = {}) {
  const metadata = {
    'corpflow.tenant_id': SYNTHETIC_ENQUIRY.tenant_id,
    'corpflow.product': 'ai-lead-rescue',
    'corpflow.workflow': 'lead_rescue_sandbox_pilot',
    'corpflow.workstream_id': 'github-issue-1282',
    'corpflow.work_packet_id': 'langfuse-pilot-v1',
    'corpflow.operator_id': 'synthetic-operator',
    'corpflow.context_budget': 'sandbox-synthetic-only',
    'corpflow.outcome': SYNTHETIC_OUTCOME.status,
    'corpflow.data_class': 'synthetic_only',
    ...overrides,
  };

  return [
    attr('langfuse.trace.name', TRACE_NAME),
    attr('langfuse.session.id', 'synthetic-session-1282-001'),
    attr('langfuse.trace.tags', ['corpflowai', 'lead-rescue', 'sandbox', 'synthetic', 'issue-1282']),
    attr('langfuse.environment', 'development'),
    ...Object.entries(metadata).map(([key, value]) => attr(`langfuse.trace.metadata.${key}`, value)),
  ];
}

function observationAttributes({ type, input, output, metadata = {}, extra = [] }) {
  return [
    ...traceAttributes(),
    attr('langfuse.observation.type', type),
    attr('langfuse.observation.input', json(input)),
    attr('langfuse.observation.output', json(output)),
    ...Object.entries(metadata).map(([key, value]) => attr(`langfuse.observation.metadata.${key}`, value)),
    ...extra,
  ];
}

function span({ traceId, spanId, parentSpanId, name, startMs, endMs, attributes }) {
  return {
    traceId,
    spanId,
    ...(parentSpanId ? { parentSpanId } : {}),
    name,
    kind: 1,
    startTimeUnixNano: nanos(startMs),
    endTimeUnixNano: nanos(endMs),
    attributes,
    status: { code: 1 },
  };
}

export function evaluateSyntheticDraft(draft = SYNTHETIC_DRAFT) {
  const lower = String(draft).toLowerCase();
  const checks = {
    human_review_disclosed: lower.includes('human') && lower.includes('review'),
    no_revenue_guarantee: !/(guarantee|guaranteed).*(revenue|sales|lead)/i.test(draft),
    no_immediate_send_commitment: !/(we will|we'll).*(email|whatsapp|sms|call).*(now|immediately|today)/i.test(draft),
    no_pricing_commitment: !/(price is|costs? mur|costs? usd|fixed price)/i.test(draft),
  };
  return {
    passed: Object.values(checks).every(Boolean),
    checks,
  };
}

export function buildSyntheticLeadRescuePilot({ nowMs = Date.now(), ids = {} } = {}) {
  const traceId = ids.traceId || idHex(16);
  const rootSpanId = ids.rootSpanId || idHex(8);
  const classifySpanId = ids.classifySpanId || idHex(8);
  const generationSpanId = ids.generationSpanId || idHex(8);
  const handoffSpanId = ids.handoffSpanId || idHex(8);
  const evaluatorSpanId = ids.evaluatorSpanId || idHex(8);
  const outcomeSpanId = ids.outcomeSpanId || idHex(8);
  const evaluation = evaluateSyntheticDraft();

  const root = span({
    traceId,
    spanId: rootSpanId,
    name: 'lead_rescue.synthetic_pilot',
    startMs: nowMs,
    endMs: nowMs + 80,
    attributes: observationAttributes({
      type: 'span',
      input: SYNTHETIC_ENQUIRY,
      output: SYNTHETIC_OUTCOME,
      metadata: { phase: 'root', synthetic: true },
    }),
  });

  const classify = span({
    traceId,
    spanId: classifySpanId,
    parentSpanId: rootSpanId,
    name: 'lead_rescue.classify',
    startMs: nowMs + 5,
    endMs: nowMs + 15,
    attributes: observationAttributes({
      type: 'span',
      input: { message: SYNTHETIC_ENQUIRY.message, service_interest: SYNTHETIC_ENQUIRY.service_interest },
      output: SYNTHETIC_CLASSIFICATION,
      metadata: { phase: 'classification', implementation: 'deterministic_synthetic_fixture' },
    }),
  });

  const generation = span({
    traceId,
    spanId: generationSpanId,
    parentSpanId: rootSpanId,
    name: 'lead_rescue.response_draft',
    startMs: nowMs + 20,
    endMs: nowMs + 50,
    attributes: observationAttributes({
      type: 'generation',
      input: SYNTHETIC_PROMPT.messages,
      output: { content: SYNTHETIC_DRAFT },
      metadata: {
        phase: 'response_draft',
        provider_execution: 'NOT_INVOKED_SYNTHETIC_FIXTURE',
        token_usage_source: 'not_provided',
        cost_source: 'not_provided',
      },
      extra: [
        attr('langfuse.observation.model.name', 'gpt-4o-mini'),
        attr('langfuse.observation.prompt.name', SYNTHETIC_PROMPT.name),
        attr('langfuse.observation.prompt.version', SYNTHETIC_PROMPT.version),
      ],
    }),
  });

  const handoff = span({
    traceId,
    spanId: handoffSpanId,
    parentSpanId: rootSpanId,
    name: 'lead_rescue.handoff_decision',
    startMs: nowMs + 52,
    endMs: nowMs + 60,
    attributes: observationAttributes({
      type: 'span',
      input: { classification: SYNTHETIC_CLASSIFICATION, response_draft: SYNTHETIC_DRAFT },
      output: SYNTHETIC_HANDOFF,
      metadata: { phase: 'handoff', protected_action: false },
    }),
  });

  const evaluator = span({
    traceId,
    spanId: evaluatorSpanId,
    parentSpanId: rootSpanId,
    name: 'lead_rescue.policy_safety_eval',
    startMs: nowMs + 61,
    endMs: nowMs + 68,
    attributes: observationAttributes({
      type: 'evaluator',
      input: { response_draft: SYNTHETIC_DRAFT },
      output: evaluation,
      metadata: { phase: 'evaluation', evaluator: 'deterministic_code', score_name: 'policy_safety' },
    }),
  });

  const outcome = span({
    traceId,
    spanId: outcomeSpanId,
    parentSpanId: rootSpanId,
    name: 'lead_rescue.outcome',
    startMs: nowMs + 70,
    endMs: nowMs + 75,
    attributes: observationAttributes({
      type: 'event',
      input: SYNTHETIC_HANDOFF,
      output: SYNTHETIC_OUTCOME,
      metadata: { phase: 'outcome' },
    }),
  });

  const payload = {
    resourceSpans: [
      {
        resource: {
          attributes: [
            attr('service.name', SERVICE_NAME),
            attr('deployment.environment.name', 'development'),
          ],
        },
        scopeSpans: [
          {
            scope: { name: 'corpflowai.langfuse.synthetic-pilot', version: '1.0.0' },
            spans: [root, classify, generation, handoff, evaluator, outcome],
          },
        ],
      },
    ],
  };

  const automatedScore = {
    traceId,
    observationId: generationSpanId,
    name: 'policy_safety',
    value: evaluation.passed ? 1 : 0,
    dataType: 'BOOLEAN',
    comment: 'Deterministic sandbox code evaluation: human-review disclosure and no commitment language.',
    metadata: { source: 'corpflowai-sandbox-pilot', synthetic: true },
  };

  return {
    traceId,
    rootSpanId,
    generationSpanId,
    payload,
    automatedScore,
    scenario: {
      enquiry: SYNTHETIC_ENQUIRY,
      classification: SYNTHETIC_CLASSIFICATION,
      prompt: SYNTHETIC_PROMPT,
      responseDraft: SYNTHETIC_DRAFT,
      handoff: SYNTHETIC_HANDOFF,
      outcome: SYNTHETIC_OUTCOME,
      evaluation,
    },
  };
}

export function validateSendConfig(env = process.env) {
  const baseUrl = String(env.LANGFUSE_BASE_URL || '').replace(/\/$/, '');
  if (baseUrl !== ALLOWED_BASE_URL) {
    throw new Error(`LANGFUSE_BASE_URL must be exactly ${ALLOWED_BASE_URL} for this sandbox pilot.`);
  }
  if (!env.LANGFUSE_PUBLIC_KEY || !env.LANGFUSE_SECRET_KEY) {
    throw new Error('Missing Development-only LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY. Load them securely from Infisical; do not paste them into chat or source files.');
  }
  if (env.CONFIRM_LANGFUSE_SYNTHETIC_PILOT !== 'YES') {
    throw new Error('Set CONFIRM_LANGFUSE_SYNTHETIC_PILOT=YES for the one synthetic sandbox send.');
  }
  return {
    baseUrl,
    publicKey: env.LANGFUSE_PUBLIC_KEY,
    secretKey: env.LANGFUSE_SECRET_KEY,
  };
}

export async function sendSyntheticLeadRescuePilot({ env = process.env, fetchImpl = globalThis.fetch, nowMs = Date.now(), ids } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.');
  const config = validateSendConfig(env);
  const pilot = buildSyntheticLeadRescuePilot({ nowMs, ids });
  const authorization = `Basic ${Buffer.from(`${config.publicKey}:${config.secretKey}`, 'utf8').toString('base64')}`;

  const traceResponse = await fetchImpl(`${config.baseUrl}/api/public/otel/v1/traces`, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      'x-langfuse-ingestion-version': '4',
    },
    body: JSON.stringify(pilot.payload),
  });
  if (!traceResponse.ok) {
    throw new Error(`Langfuse trace ingestion failed with HTTP ${traceResponse.status}.`);
  }

  const scoreResponse = await fetchImpl(`${config.baseUrl}/api/public/scores`, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pilot.automatedScore),
  });
  if (!scoreResponse.ok) {
    throw new Error(`Langfuse score ingestion failed with HTTP ${scoreResponse.status}. Trace ${pilot.traceId} may already exist in the sandbox.`);
  }

  return {
    traceId: pilot.traceId,
    generationSpanId: pilot.generationSpanId,
    traceAccepted: true,
    automatedScoreAccepted: true,
    humanReviewRequired: true,
  };
}

function dryRunSummary(pilot) {
  return {
    mode: 'DRY_RUN_NO_NETWORK',
    traceName: TRACE_NAME,
    traceId: pilot.traceId,
    observationCount: pilot.payload.resourceSpans[0].scopeSpans[0].spans.length,
    observationNames: pilot.payload.resourceSpans[0].scopeSpans[0].spans.map((item) => item.name),
    syntheticTenant: SYNTHETIC_ENQUIRY.tenant_id,
    modelLabel: 'gpt-4o-mini',
    providerExecution: 'NOT_INVOKED_SYNTHETIC_FIXTURE',
    tokenUsage: 'NOT PROVIDED — do not fabricate',
    modelCost: 'NOT PROVIDED — Langfuse inference to be observed after sandbox ingestion',
    automatedEvaluationPassed: pilot.scenario.evaluation.passed,
    humanReview: 'REQUIRED IN LANGFUSE UI — not fabricated by script',
    protectedActions: 'NONE',
  };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const send = args.has('--send');
  const printPayload = args.has('--json');
  const pilot = buildSyntheticLeadRescuePilot();

  if (!send) {
    console.log(JSON.stringify(printPayload ? pilot.payload : dryRunSummary(pilot), null, 2));
    return;
  }

  const result = await sendSyntheticLeadRescuePilot();
  console.log(JSON.stringify({
    ...result,
    credentialsLogged: false,
    productionChanged: false,
    clientDataUsed: false,
  }, null, 2));
}

const invokedDirectly = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`Langfuse sandbox pilot failed: ${error.message}`);
    process.exitCode = 1;
  });
}
