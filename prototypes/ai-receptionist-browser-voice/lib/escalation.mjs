/**
 * Escalation detectors for the synthetic AI receptionist prototype.
 * Pure functions — no I/O, no network, no secrets.
 */

/** @typedef {'pricing_guarantee' | 'regulated_advice' | 'urgent_safety' | 'protected_action' | 'tenant_boundary' | 'secrets_probe'} EscalationReason */

/**
 * @param {string} text
 * @returns {{ escalate: boolean, reason: EscalationReason | null, message: string | null }}
 */
export function detectEscalation(text) {
  const t = String(text || '').toLowerCase().trim();
  if (!t) return { escalate: false, reason: null, message: null };

  if (
    /\b(guarantee|guaranteed|roi promise|promise.*(revenue|leads)|how much (do you|does it) cost|what('s| is) (your|the) price|pricing(?!.*(later|follow))|quote me)\b/.test(
      t,
    )
  ) {
    return {
      escalate: true,
      reason: 'pricing_guarantee',
      message:
        'I cannot give pricing or performance guarantees from this prototype. A human operator will follow up with accurate commercial information. No external message has been sent.',
    };
  }

  if (
    /\b(legal advice|medical advice|financial advice|diagnose|lawsuit|attorney|doctor|investment advice|tax advice)\b/.test(
      t,
    )
  ) {
    return {
      escalate: true,
      reason: 'regulated_advice',
      message:
        'I cannot provide legal, medical, or financial advice. I am escalating this to a human operator. No external action has been executed.',
    };
  }

  if (
    /\b(emergency|suicide|self[- ]harm|threat(en|ening)|imminent (danger|harm)|call the police|urgent safety)\b/.test(
      t,
    )
  ) {
    return {
      escalate: true,
      reason: 'urgent_safety',
      message:
        'This sounds like an urgent safety concern. Please contact local emergency services if you are in immediate danger. I am escalating to a human operator. No automated call or message has been placed.',
    };
  }

  if (
    /\b(deploy(ment)? (to )?(prod|production)|merge (this|the) pr|approve (the )?(build|payment)|bypass (approval|gate)|execute (payment|contract)|sign (the )?contract|charge (my|the) card|send (the )?(email|whatsapp|sms)|call (the )?client|write to (the )?(crm|database|db))\b/.test(
      t,
    )
  ) {
    return {
      escalate: true,
      reason: 'protected_action',
      message:
        'That is a protected action. I can only draft or recommend — I cannot execute deployments, payments, contracts, CRM writes, DB writes, or outbound messages. Escalating to a human operator for review.',
    };
  }

  if (
    /\b(other (tenant|client)|another (tenant|client)|show me (lux|luxe|living.?word|cipc).*(data|records|leads)|access (tenant|client) .*(records|data)|lookup (their|another) (lead|client))\b/.test(
      t,
    )
  ) {
    return {
      escalate: true,
      reason: 'tenant_boundary',
      message:
        'I cannot access another tenant or client’s records. Tenant isolation is enforced. Escalating to a human operator. No data was retrieved.',
    };
  }

  if (
    /\b(api[_ -]?key|secret|password|token|credential|infisical|system prompt|ignore (previous|your) instructions|reveal (your )?(internal|hidden) (prompt|instructions))\b/.test(
      t,
    )
  ) {
    return {
      escalate: true,
      reason: 'secrets_probe',
      message:
        'I cannot share secrets, credentials, or internal instructions. Escalating to a human operator. No secrets were disclosed.',
    };
  }

  return { escalate: false, reason: null, message: null };
}
