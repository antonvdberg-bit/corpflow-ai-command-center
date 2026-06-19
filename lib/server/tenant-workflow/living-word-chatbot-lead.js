/**
 * Map chatbot preferred_contact_method to operator routing hint.
 *
 * @param {string | null | undefined} preferredContactMethod
 * @returns {'email' | 'whatsapp' | 'phone' | 'sms' | 'general'}
 */
export function mapPreferredContactToRecommendedChannel(preferredContactMethod) {
  const v = preferredContactMethod != null ? String(preferredContactMethod).trim().toLowerCase() : '';
  switch (v) {
    case 'email':
      return 'email';
    case 'whatsapp':
      return 'whatsapp';
    case 'phone_call':
      return 'phone';
    case 'sms':
      return 'sms';
    default:
      return 'general';
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} leadPayload
 * @param {Record<string, unknown> | null | undefined} originPayload
 * @param {{
 *   tenantId: string;
 *   threadId: string;
 *   eventId: string;
 * }} refs
 * @returns {Record<string, unknown>}
 */
export function buildLivingWordChatbotLeadStepData(leadPayload, originPayload, refs) {
  const lead = leadPayload && typeof leadPayload === 'object' ? leadPayload : {};
  const origin = originPayload && typeof originPayload === 'object' ? originPayload : {};
  const preferred = lead.preferred_contact_method != null ? String(lead.preferred_contact_method) : null;

  return {
    first_name: lead.first_name ?? null,
    surname: lead.surname ?? null,
    full_name: lead.name ?? null,
    email: lead.email ?? null,
    whatsapp_or_mobile: lead.whatsapp_or_mobile ?? lead.phone ?? null,
    preferred_contact_method: preferred,
    message_excerpt: lead.message_excerpt ?? null,
    source_host: origin.source_host ?? null,
    source_path: origin.source_path ?? null,
    thread_id: refs.threadId,
    event_id: refs.eventId,
    recommended_channel: mapPreferredContactToRecommendedChannel(preferred),
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} leadPayload
 * @param {Record<string, unknown> | null | undefined} originPayload
 * @param {string} threadId
 * @returns {Record<string, unknown>}
 */
export function buildLivingWordChatbotLeadContext(leadPayload, originPayload, threadId) {
  const lead = leadPayload && typeof leadPayload === 'object' ? leadPayload : {};
  const origin = originPayload && typeof originPayload === 'object' ? originPayload : {};
  const preferred = lead.preferred_contact_method != null ? String(lead.preferred_contact_method) : null;

  return {
    schema: 'corpflow.workflow.run.context.v1',
    lead_summary: {
      full_name: lead.name ?? null,
      email: lead.email ?? null,
      whatsapp_or_mobile: lead.whatsapp_or_mobile ?? lead.phone ?? null,
      preferred_contact_method: preferred,
      request_type: lead.request_type ?? null,
      message_excerpt: lead.message_excerpt ?? null,
    },
    origin: {
      source_host: origin.source_host ?? null,
      source_path: origin.source_path ?? null,
    },
    thread_id: threadId,
    recommended_channel: mapPreferredContactToRecommendedChannel(preferred),
  };
}
