/**
 * Lightweight "AI analysis" stand-in: infer complexity/risk from free text until a model is wired.
 * @param {string} description
 */
export function inferComplexityFromDescription(description) {
  const t = (description || '').trim();
  const words = t ? t.split(/\s+/).length : 0;
  if (words > 120 || t.length > 900) return 'high';
  if (words > 35 || t.length > 240) return 'medium';
  return 'low';
}

/**
 * @param {string} description
 */
export function inferRiskFromDescription(description) {
  const t = description || '';
  if (
    /payment|pci|pii|auth|login|password|sso|oauth|hipaa|phi|legal|compliance|security|encryption|gdpr/i.test(
      t,
    )
  ) {
    return 'high';
  }
  if (/api|integration|webhook|database|crm|email|smtp|form|checkout/i.test(t)) {
    return 'medium';
  }
  return 'low';
}

/**
 * @param {string} description
 * @param {{ complexity?: string, risk?: string }} [overrides]
 */
export function buildImpactSummary(description, overrides = {}) {
  const complexity = overrides.complexity || inferComplexityFromDescription(description);
  const risk = overrides.risk || inferRiskFromDescription(description);
  const summary = [
    `Scoped effort appears **${complexity}** based on description length and integration surface.`,
    `Operational risk is assessed as **${risk}** from keyword signals (security, integrations, data handling).`,
    'Full human review occurs after ticket review and workflow gating; this panel is a structured preview only.',
  ].join(' ');
  const technical_risks = [];
  if (risk === 'high') {
    technical_risks.push({
      area: 'Security & compliance',
      severity: 'high',
      mitigation: 'Mandate security review, staging UAT, and Deployment Protection on Preview.',
    });
  }
  if (/integration|api|webhook|crm/i.test(description)) {
    technical_risks.push({
      area: 'Integrations',
      severity: risk === 'high' ? 'high' : 'medium',
      mitigation: 'Define contract tests and rollback; verify secrets rotation and webhook signatures.',
    });
  }
  if (technical_risks.length === 0) {
    technical_risks.push({
      area: 'General release',
      severity: 'low',
      mitigation: 'Standard preview branch, automated checks, then UAT sign-off.',
    });
  }
  return {
    summary,
    risk_level: risk,
    complexity_inferred: complexity,
    technical_risks,
  };
}

/**
 * Heuristic effort band (billable hours) from complexity and risk tiers.
 * Intended for client-facing estimates only; not a quote.
 *
 * @param {string} complexity - 'low' | 'medium' | 'high'
 * @param {string} risk - 'low' | 'medium' | 'high'
 * @returns {{ effort_hours_low: number, effort_hours_high: number }}
 */
export function inferEffortHoursBand(complexity, risk) {
  const c = ['low', 'medium', 'high'].includes(complexity) ? complexity : 'medium';
  const r = ['low', 'medium', 'high'].includes(risk) ? risk : 'medium';
  const base = { low: [4, 16], medium: [12, 48], high: [32, 120] };
  const [lo, hi] = base[c];
  const riskBump = r === 'high' ? 1.35 : r === 'medium' ? 1.12 : 1;
  return {
    effort_hours_low: Math.max(1, Math.round(lo * riskBump)),
    effort_hours_high: Math.max(2, Math.round(hi * riskBump)),
  };
}
