import { computeMarketValueCost } from './lib/costing-engine.js';
import {
  buildImpactSummary,
  inferComplexityFromDescription,
  inferRiskFromDescription,
} from './lib/preview-heuristics.js';

/**
 * POST /api/cmp/costing-preview
 * Body: { description: string, ticketId?: string, is_demo?: boolean, tier?: string,
 *         complexity?: 'low'|'medium'|'high', risk?: 'low'|'medium'|'high' }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  if (!description) {
    return res.status(400).json({ error: 'description is required' });
  }

  const tier =
    body.tier === 'premium' || body.tier === 'enterprise' || body.tier === 'internal'
      ? body.tier
      : 'standard';

  let complexity = body.complexity;
  let risk = body.risk;
  if (!complexity || !['low', 'medium', 'high'].includes(complexity)) {
    complexity = inferComplexityFromDescription(description);
  }
  if (!risk || !['low', 'medium', 'high'].includes(risk)) {
    risk = inferRiskFromDescription(description);
  }

  const is_demo = Boolean(body.is_demo);

  const impact = buildImpactSummary(description, { complexity, risk });
  const cost = computeMarketValueCost({
    complexity,
    risk,
    tier,
    is_demo,
  });

  return res.status(200).json({
    ticket_id: body.ticketId != null ? String(body.ticketId) : null,
    impact: {
      summary: impact.summary,
      risk_level: impact.risk_level,
      technical_risks: impact.technical_risks,
      complexity_inferred: impact.complexity_inferred,
    },
    cost: {
      full_market_value_usd: cost.full_market_value_usd,
      displayed_client_usd: cost.displayed_client_usd,
      is_demo: cost.is_demo,
      demo_discount_rate: cost.demo_discount_rate,
      breakdown: cost.breakdown,
    },
  });
}
