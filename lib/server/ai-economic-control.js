import {
  AI_COST_CLASSES,
  AI_MEASUREMENT_QUALITIES,
  findAiCostSource,
} from './ai-cost-source-registry.js';

export const AI_BUDGET_DECISIONS = Object.freeze([
  'ALLOW',
  'WARN',
  'REQUIRE_APPROVAL',
  'STOP',
]);

export const AI_OUTCOMES = Object.freeze([
  'successful',
  'failed',
  'reworked',
  'cancelled',
  'unknown',
]);

const EXECUTION_TIERS = new Set(['LOW', 'MEDIUM', 'HIGH']);
const CONTEXT_BUDGETS = new Set(['S', 'M', 'L', 'XL']);
const OUTCOMES = new Set(AI_OUTCOMES);
const COST_CLASSES = new Set(AI_COST_CLASSES);
const MEASUREMENT_QUALITIES = new Set(AI_MEASUREMENT_QUALITIES);

function finiteNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function nonNegative(value) {
  const n = finiteNumber(value);
  return n != null && n >= 0 ? n : null;
}

function cleanString(value, max = 160) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
}

function cleanEnum(value, allowed, fallback) {
  const text = cleanString(value, 80);
  return text && allowed.has(text) ? text : fallback;
}

export function normalizeAiEconomicEvent(input = {}) {
  const sourceId = cleanString(input.source_id || input.sourceId);
  const source = sourceId ? findAiCostSource(sourceId) : null;
  const costClass = cleanEnum(
    input.cost_class || input.costClass,
    COST_CLASSES,
    source?.cost_classes?.[0] || null,
  );
  const measurementQuality = cleanEnum(
    input.measurement_quality || input.measurementQuality,
    MEASUREMENT_QUALITIES,
    'unknown',
  );
  const contextBudget = cleanString(input.context_budget || input.contextBudget, 8)?.toUpperCase() || null;
  const executionTier = cleanString(input.execution_tier || input.executionTier, 12)?.toUpperCase() || null;
  const outcome = cleanString(input.outcome, 20)?.toLowerCase() || 'unknown';

  return {
    schema: 'corpflow.ai_economic_event.v1',
    event_id: cleanString(input.event_id || input.eventId, 200),
    occurred_at: cleanString(input.occurred_at || input.occurredAt, 80),
    source_id: sourceId,
    provider: cleanString(input.provider, 120) || source?.provider || null,
    tool: cleanString(input.tool, 120) || source?.tool || null,
    model: cleanString(input.model, 200),
    cost_class: costClass,
    cash_cost: nonNegative(input.cash_cost ?? input.cashCost),
    cash_currency: cleanString(input.cash_currency || input.cashCurrency, 8)?.toUpperCase() || null,
    economic_consumption: nonNegative(input.economic_consumption ?? input.economicConsumption),
    economic_unit: cleanString(input.economic_unit || input.economicUnit, 80),
    usage: {
      input: nonNegative(input.usage?.input),
      output: nonNegative(input.usage?.output),
      total: nonNegative(input.usage?.total),
    },
    tenant_id: cleanString(input.tenant_id || input.tenantId, 160),
    product: cleanString(input.product, 160),
    workflow: cleanString(input.workflow, 160),
    workstream_id: cleanString(input.workstream_id || input.workstreamId, 160),
    work_packet_id: cleanString(input.work_packet_id || input.workPacketId, 160),
    erpnext_customer_id: cleanString(input.erpnext_customer_id || input.erpnextCustomerId, 160),
    erpnext_project_id: cleanString(input.erpnext_project_id || input.erpnextProjectId, 160),
    context_budget: contextBudget && CONTEXT_BUDGETS.has(contextBudget) ? contextBudget : null,
    execution_tier: executionTier && EXECUTION_TIERS.has(executionTier) ? executionTier : null,
    retry_count: nonNegative(input.retry_count ?? input.retryCount) ?? 0,
    followup_count: nonNegative(input.followup_count ?? input.followupCount) ?? 0,
    outcome: OUTCOMES.has(outcome) ? outcome : 'unknown',
    outcome_ref: cleanString(input.outcome_ref || input.outcomeRef, 240),
    measurement_quality: measurementQuality,
  };
}

export function validateAiEconomicEvent(input = {}) {
  const event = normalizeAiEconomicEvent(input);
  const errors = [];

  if (!event.event_id) errors.push('event_id_required');
  if (!event.source_id) errors.push('source_id_required');
  if (event.source_id && !findAiCostSource(event.source_id)) errors.push('unknown_source_id');
  if (!event.cost_class) errors.push('cost_class_required');
  if (event.cash_cost != null && !event.cash_currency) errors.push('cash_currency_required_when_cash_cost_present');
  if (event.economic_consumption != null && !event.economic_unit) {
    errors.push('economic_unit_required_when_economic_consumption_present');
  }
  if (event.measurement_quality === 'exact' && event.cash_cost == null && event.usage.total == null) {
    errors.push('exact_measurement_requires_exact_value');
  }

  return { ok: errors.length === 0, event, errors };
}

export function evaluateAiBudgetPolicy(input = {}) {
  const budgetLimit = nonNegative(input.budget_limit ?? input.budgetLimit);
  const spent = nonNegative(input.spent) ?? 0;
  const expectedRunCost = nonNegative(input.expected_run_cost ?? input.expectedRunCost) ?? 0;
  const maxRunCost = nonNegative(input.max_run_cost ?? input.maxRunCost);
  const runCount = nonNegative(input.run_count ?? input.runCount) ?? 0;
  const maxRuns = nonNegative(input.max_runs ?? input.maxRuns);
  const retryCount = nonNegative(input.retry_count ?? input.retryCount) ?? 0;
  const maxRetries = nonNegative(input.max_retries ?? input.maxRetries);
  const executionTier = cleanString(input.execution_tier || input.executionTier, 12)?.toUpperCase() || 'LOW';
  const approved = input.approved === true;
  const critical = input.critical === true;
  const exceptionApproved = input.exception_approved === true || input.exceptionApproved === true;

  const reasons = [];
  const projectedSpend = budgetLimit == null ? null : spent + expectedRunCost;
  const projectedRatio = budgetLimit && budgetLimit > 0 ? projectedSpend / budgetLimit : null;

  if (maxRuns != null && runCount >= maxRuns) {
    return decision('STOP', 'run_envelope_exhausted', { projectedSpend, projectedRatio, reasons: ['max_runs_reached'] });
  }
  if (maxRetries != null && retryCount >= maxRetries) {
    return decision('STOP', 'retry_envelope_exhausted', { projectedSpend, projectedRatio, reasons: ['max_retries_reached'] });
  }
  if (maxRunCost != null && expectedRunCost > maxRunCost) {
    return decision('STOP', 'per_run_cost_cap_exceeded', { projectedSpend, projectedRatio, reasons: ['expected_run_cost_exceeds_cap'] });
  }

  if (budgetLimit == null) {
    return decision('REQUIRE_APPROVAL', 'budget_not_defined', {
      projectedSpend,
      projectedRatio,
      reasons: ['governed_variable_execution_requires_budget_or_operator_decision'],
    });
  }

  if (budgetLimit === 0 || projectedSpend >= budgetLimit) {
    if (critical && exceptionApproved) {
      reasons.push('critical_exception_approved');
      return decision('ALLOW', 'approved_critical_exception', { projectedSpend, projectedRatio, reasons });
    }
    return decision('STOP', 'budget_exhausted_or_projected_to_exceed', {
      projectedSpend,
      projectedRatio,
      reasons: ['monthly_or_scope_budget_exhausted'],
    });
  }

  if (executionTier === 'HIGH' && !approved) {
    return decision('REQUIRE_APPROVAL', 'premium_tier_requires_approval', {
      projectedSpend,
      projectedRatio,
      reasons: ['high_execution_tier'],
    });
  }

  if (projectedRatio >= 0.9) {
    if (approved) {
      reasons.push('near_ceiling_approved');
      return decision('ALLOW', 'approved_near_budget_ceiling', { projectedSpend, projectedRatio, reasons });
    }
    return decision('REQUIRE_APPROVAL', 'near_budget_ceiling', {
      projectedSpend,
      projectedRatio,
      reasons: ['projected_spend_at_or_above_90_percent'],
    });
  }

  if (projectedRatio >= 0.75) {
    return decision('WARN', 'economical_execution_preferred', {
      projectedSpend,
      projectedRatio,
      reasons: ['projected_spend_at_or_above_75_percent'],
    });
  }

  if (projectedRatio >= 0.5) reasons.push('budget_visibility_threshold_reached');

  return decision('ALLOW', projectedRatio >= 0.5 ? 'visible_budget_consumption' : 'within_budget', {
    projectedSpend,
    projectedRatio,
    reasons,
  });
}

function decision(action, code, extra = {}) {
  return {
    schema: 'corpflow.ai_budget_decision.v1',
    action,
    code,
    projected_spend: extra.projectedSpend ?? null,
    projected_ratio: extra.projectedRatio ?? null,
    reasons: extra.reasons || [],
  };
}

export function summarizeAiEconomics(events = []) {
  const normalized = events.map((event) => normalizeAiEconomicEvent(event));
  const cashEvents = normalized.filter((event) => event.cash_cost != null);
  const exactOrProviderReported = normalized.filter((event) =>
    ['exact', 'provider_reported'].includes(event.measurement_quality),
  );
  const outcomes = normalized.reduce((acc, event) => {
    acc[event.outcome] = (acc[event.outcome] || 0) + 1;
    return acc;
  }, {});

  return {
    schema: 'corpflow.ai_economics_summary.v1',
    events: normalized.length,
    measured_cash_cost: cashEvents.reduce((sum, event) => sum + event.cash_cost, 0),
    high_confidence_events: exactOrProviderReported.length,
    successful_events: outcomes.successful || 0,
    failed_or_reworked_events: (outcomes.failed || 0) + (outcomes.reworked || 0),
    unknown_outcomes: outcomes.unknown || 0,
    unattributed_events: normalized.filter(
      (event) => !event.workstream_id && !event.product && !event.workflow,
    ).length,
  };
}
