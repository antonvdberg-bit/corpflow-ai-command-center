import { createHash, timingSafeEqual } from 'node:crypto';

import { reconcileSalesLifecycle } from '../erpnext/sales-lifecycle-bridge.js';
import { tryFrappeClientFromEnv } from '../erpnext/frappe-rest-client.js';
import { recordTrustedAutomationEvent } from '../automation/internal.js';
import { cfg } from './runtime-config.js';

export const RNE_TENANT_ID = 'rare-exclusive';
export const RNE_EVENT_TYPE = 'rare_exclusive.private_access_requested';
export const RNE_SOURCE = 'rare-exclusive-website';
export const RNE_INTENT = 'rare_exclusive_private_access';

function str(v, max = 4000) {
  return v == null ? '' : String(v).trim().slice(0, max);
}

function normalizeEmail(v) {
  return str(v, 254).toLowerCase();
}

function isValidEmailBasic(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(email));
}

function bearerToken(req) {
  const raw = req?.headers?.authorization;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const match = str(value, 4096).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function constantTimeEqual(a, b) {
  const left = Buffer.from(str(a, 4096));
  const right = Buffer.from(str(b, 4096));
  if (!left.length || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function emailFingerprint(email) {
  return createHash('sha256').update(normalizeEmail(email)).digest('hex').slice(0, 8);
}

export function buildRareExclusiveBridgeEvent(lead, payload) {
  const name = str(lead?.name || payload?.contact?.name, 120) || 'Private Client';
  const email = normalizeEmail(lead?.email || payload?.contact?.email);
  return {
    lead_id: str(lead?.id, 160),
    stage: 'intake',
    synthetic: false,
    product: 'rare-exclusive',
    intake: {
      synthetic: false,
      business_display_name: `Rare & Exclusive Private Client / ${name} / ${emailFingerprint(email)}`,
      primary_contact_name: name,
      working_email: email,
      default_currency: 'MUR',
      website: 'https://rareandexclusive.com',
      external_ref: str(lead?.id, 160),
      source: RNE_SOURCE,
      interest: str(payload?.interest, 120),
      message: str(payload?.message, 4000),
      consent: payload?.consent === true,
      page: str(payload?.page, 500),
    },
  };
}

function validateBody(body) {
  const b = body && typeof body === 'object' ? body : {};
  const event = str(b.event, 160);
  const source = str(b.source, 160);
  const contact = b.contact && typeof b.contact === 'object' ? b.contact : {};
  const name = str(contact.name, 120);
  const email = normalizeEmail(contact.email);
  const message = str(b.message, 4000);
  const interest = str(b.interest, 120);
  const page = str(b.page, 500);
  const occurredAt = str(b.occurred_at, 80);
  const consent = b.consent === true;

  if (event !== RNE_EVENT_TYPE) return { ok: false, error: 'EVENT_NOT_ALLOWED' };
  if (source && source !== RNE_SOURCE) return { ok: false, error: 'SOURCE_NOT_ALLOWED' };
  if (!name || name.length < 2) return { ok: false, error: 'NAME_REQUIRED' };
  if (!isValidEmailBasic(email)) return { ok: false, error: 'EMAIL_REQUIRED' };
  if (!message) return { ok: false, error: 'MESSAGE_REQUIRED' };
  if (!consent) return { ok: false, error: 'CONSENT_REQUIRED' };

  return {
    ok: true,
    data: {
      event: RNE_EVENT_TYPE,
      source: RNE_SOURCE,
      contact: { name, email },
      message,
      interest: interest || 'Private conversation',
      page,
      occurred_at: occurredAt || new Date().toISOString(),
      consent: true,
    },
  };
}

function currentQualification(existing, payload) {
  const prior =
    existing?.qualificationJson &&
    typeof existing.qualificationJson === 'object' &&
    !Array.isArray(existing.qualificationJson)
      ? existing.qualificationJson
      : {};
  return {
    ...prior,
    source: RNE_SOURCE,
    interest: payload.interest,
    message: payload.message,
    consent: true,
    page: payload.page || null,
    last_enquiry_at: payload.occurred_at,
  };
}

function erpEnvFromRuntime() {
  return {
    ERPNEXT_BASE_URL: cfg('ERPNEXT_BASE_URL', ''),
    ERPNEXT_API_KEY: cfg('ERPNEXT_API_KEY', ''),
    ERPNEXT_API_SECRET: cfg('ERPNEXT_API_SECRET', ''),
  };
}

export async function handleRareExclusiveIntake(req, res, deps = {}) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const sharedSecret =
    typeof deps.getSharedSecret === 'function'
      ? str(deps.getSharedSecret(), 4096)
      : str(cfg('RNE_INTAKE_SHARED_SECRET', ''), 4096);
  if (!sharedSecret) {
    return res.status(503).json({ ok: false, error: 'RNE_INTAKE_NOT_CONFIGURED' });
  }
  if (!constantTimeEqual(bearerToken(req), sharedSecret)) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: 'INVALID_JSON' });
    }
  }

  const validated = validateBody(body);
  if (!validated.ok) return res.status(400).json(validated);
  const payload = validated.data;

  const prisma = deps.prisma;
  if (!prisma?.lead) {
    return res.status(503).json({ ok: false, error: 'LEAD_STORE_NOT_CONFIGURED' });
  }

  let lead;
  let created = false;
  try {
    const existing = await prisma.lead.findFirst({
      where: {
        tenantId: RNE_TENANT_ID,
        email: payload.contact.email,
        intent: RNE_INTENT,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      lead = await prisma.lead.update({
        where: { id: existing.id },
        data: {
          name: payload.contact.name,
          message: payload.message,
          listing: payload.interest,
          status: existing.status || 'new',
          qualificationJson: currentQualification(existing, payload),
        },
      });
    } else {
      created = true;
      lead = await prisma.lead.create({
        data: {
          tenantId: RNE_TENANT_ID,
          name: payload.contact.name,
          email: payload.contact.email,
          contact: payload.contact.email,
          message: payload.message,
          intent: RNE_INTENT,
          market: 'Mauritius / international private client',
          listing: payload.interest,
          status: 'new',
          qualificationJson: currentQualification(null, payload),
          score: null,
        },
      });
    }
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: 'LEAD_CAPTURE_FAILED',
      detail: String(e?.message || e).slice(0, 240),
    });
  }

  const automationPayload = {
    schema: 'corpflow.rare_exclusive.intake.v1',
    lead_id: lead.id,
    source: RNE_SOURCE,
    contact: { name: lead.name, email: lead.email },
    interest: payload.interest,
    message: payload.message,
    consent: true,
    page: payload.page || null,
    occurred_at: payload.occurred_at,
  };

  const recordEvent = deps.recordAutomationEvent || recordTrustedAutomationEvent;
  try {
    await recordEvent(prisma, {
      tenantId: RNE_TENANT_ID,
      eventType: RNE_EVENT_TYPE,
      correlationId: lead.id,
      idempotencyKey: `rare-exclusive:intake:${lead.id}:${payload.occurred_at}`,
      source: 'api/intake/rare-exclusive',
      payload: automationPayload,
    });
  } catch {
    // Intake capture is authoritative for website acknowledgement; automation notification is best-effort.
  }

  let erpnextSynced = false;
  let erpnextLead = null;
  let erpnextError = null;

  try {
    const client =
      typeof deps.getErpnextClient === 'function'
        ? deps.getErpnextClient()
        : tryFrappeClientFromEnv(erpEnvFromRuntime());

    if (!client) {
      erpnextError = 'ERPNEXT_NOT_CONFIGURED';
    } else {
      const reconcile = deps.reconcileSalesLifecycle || reconcileSalesLifecycle;
      const bridgeResult = await reconcile(buildRareExclusiveBridgeEvent(lead, payload), {
        client,
        allowRealCustomer: true,
      });
      erpnextSynced = bridgeResult?.ok === true;
      erpnextLead = bridgeResult?.erpnext_lead || null;
      erpnextError = erpnextSynced ? null : str(bridgeResult?.reason || bridgeResult?.error || 'ERPNEXT_SYNC_FAILED', 160);

      const prior =
        lead.qualificationJson &&
        typeof lead.qualificationJson === 'object' &&
        !Array.isArray(lead.qualificationJson)
          ? lead.qualificationJson
          : {};
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          qualificationJson: {
            ...prior,
            erpnext: {
              schema: 'corpflow.qualification.erpnext.v1',
              bridge: 'lead_opportunity_promotion',
              state: erpnextSynced ? 'synced' : 'pending',
              erpnext_lead: erpnextLead,
              error: erpnextError,
              updated_at: new Date().toISOString(),
            },
          },
        },
      });
    }
  } catch (e) {
    erpnextError = str(e?.message || e || 'ERPNEXT_SYNC_FAILED', 160);
  }

  return res.status(200).json({
    ok: true,
    lead_id: lead.id,
    created,
    erpnext_synced: erpnextSynced,
    erpnext_lead: erpnextLead,
    erpnext_pending: !erpnextSynced,
  });
}

export default handleRareExclusiveIntake;
