import { PrismaClient } from '@prisma/client';

import { getSessionFromRequest } from './session.js';

const prisma = new PrismaClient();

function str(v) {
  return v != null ? String(v).trim() : '';
}

function normalizeEmail(v) {
  return str(v).toLowerCase();
}

function isValidEmailBasic(email) {
  const e = str(email);
  if (!e || e.length > 254) return false;
  // basic sanity (avoid heavy regex / perfect RFC compliance)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function resolveTenantIdFromReq(req) {
  try {
    const ctx = req?.corpflowContext;
    if (!ctx || ctx.surface !== 'tenant') return null;
    const tid = str(ctx.tenant_id);
    return tid || null;
  } catch {
    return null;
  }
}

function resolveIpFromReq(req) {
  try {
    const fwd = req?.headers?.['x-forwarded-for'];
    const raw = Array.isArray(fwd) ? fwd[0] : fwd;
    const ip = raw ? String(raw).split(',')[0].trim() : '';
    if (ip) return ip.slice(0, 96);
  } catch {
    /* ignore */
  }
  try {
    const sock = req?.socket;
    const ip = sock && sock.remoteAddress ? String(sock.remoteAddress).trim() : '';
    return ip ? ip.slice(0, 96) : 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Best-effort in-memory limiter (per serverless instance).
 * Acceptable for v1 abuse protection; not a security boundary.
 */
const RL = {
  /** @type {Map<string, { n: number, resetAt: number }>} */
  m: new Map(),
  windowMs: 10 * 60 * 1000,
  maxPerIp: 30,
  maxPerIpEmail: 5,
};

function rlCheckOrBump({ tenantId, ip, email }) {
  const now = Date.now();
  const resetAt = now + RL.windowMs;

  function bump(key, max) {
    const cur = RL.m.get(key);
    if (!cur || cur.resetAt <= now) {
      RL.m.set(key, { n: 1, resetAt });
      return { ok: true, retryAfterMs: 0 };
    }
    if (cur.n >= max) {
      return { ok: false, retryAfterMs: Math.max(0, cur.resetAt - now) };
    }
    cur.n += 1;
    RL.m.set(key, cur);
    return { ok: true, retryAfterMs: 0 };
  }

  const ipKey = `tenant_leads:ip:${tenantId}:${ip}`;
  const ipEmailKey = `tenant_leads:ip_email:${tenantId}:${ip}:${email}`;

  const a = bump(ipKey, RL.maxPerIp);
  if (!a.ok) return a;
  const b = bump(ipEmailKey, RL.maxPerIpEmail);
  if (!b.ok) return b;
  return { ok: true, retryAfterMs: 0 };
}

function safePublicLead(lead) {
  return {
    lead_id: lead.id,
    status: lead.status,
  };
}

function computeQualificationScore(q) {
  const o = q && typeof q === 'object' ? q : {};
  const budget = str(o.budget);
  const intent = str(o.intent);
  const timeline = str(o.timeline);
  const complete = Boolean(intent && timeline);
  const qualified = complete;
  return {
    status: qualified ? 'qualified' : complete ? 'engaged' : 'new',
    qualified,
    complete,
    fields: { budget: budget || null, intent: intent || null, timeline: timeline || null },
  };
}

export async function handleTenantLeadCreate(req, res) {
  if (req.method === 'GET') {
    const tenantId = resolveTenantIdFromReq(req);
    if (!tenantId) return res.status(404).json({ error: 'TENANT_NOT_FOUND' });

    const sess = getSessionFromRequest(req);
    if (!(sess?.ok === true && sess.payload?.typ === 'tenant' && sess.payload?.tenant_id != null)) {
      return res.status(403).json({ error: 'TENANT_SESSION_REQUIRED' });
    }
    const sessTid = str(sess.payload.tenant_id);
    if (!sessTid || sessTid !== tenantId) return res.status(403).json({ error: 'TENANT_MISMATCH' });

    try {
      const leads = await prisma.lead.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      return res.status(200).json({
        ok: true,
        tenant_id: tenantId,
        count: leads.length,
        leads,
      });
    } catch (e) {
      return res.status(500).json({ error: 'LEADS_LIST_FAILED', detail: String(e?.message || e) });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const tenantId = resolveTenantIdFromReq(req);
  if (!tenantId) return res.status(404).json({ error: 'TENANT_NOT_FOUND' });

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }
  const b = body && typeof body === 'object' ? body : {};
  const name = str(b.name);
  const email = normalizeEmail(b.email);
  const phone = str(b.phone) || null;
  if (!name || name.length < 2 || name.length > 120) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!isValidEmailBasic(email)) return res.status(400).json({ error: 'email is required' });

  const ip = resolveIpFromReq(req);
  const rl = rlCheckOrBump({ tenantId, ip, email });
  if (!rl.ok) {
    const retryAfterSec = Math.ceil((rl.retryAfterMs || 0) / 1000);
    try {
      res.setHeader('Retry-After', String(retryAfterSec));
    } catch {
      /* ignore */
    }
    return res.status(429).json({ error: 'RATE_LIMITED', retry_after_s: retryAfterSec });
  }

  const intent = 'private_listings_france_lead';
  const market = 'France';
  const listing = 'private_internal_listings';

  try {
    const lead = await prisma.lead.create({
      data: {
        tenantId,
        name,
        email,
        phone,
        intent,
        market,
        listing,
        status: 'new',
        qualificationJson: null,
        score: null,
      },
    });
    return res.status(200).json({
      ok: true,
      ...safePublicLead(lead),
      auto_response: {
        message:
          'Thanks — to match you with the right private listings in France, please answer 3 quick questions.',
        questions: [
          { key: 'budget', label: 'Budget range (optional)' },
          { key: 'intent', label: 'What are you looking for (buy/rent, location, must-haves)?' },
          { key: 'timeline', label: 'When do you want to move / transact?' },
        ],
      },
    });
  } catch (e) {
    return res.status(500).json({ error: 'LEAD_CREATE_FAILED', detail: String(e?.message || e) });
  }
}

export async function handleTenantLeadQualify(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const tenantId = resolveTenantIdFromReq(req);
  if (!tenantId) return res.status(404).json({ error: 'TENANT_NOT_FOUND' });

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }
  const b = body && typeof body === 'object' ? body : {};
  const leadId = str(b.lead_id || b.leadId);
  const answers = b.answers && typeof b.answers === 'object' ? b.answers : null;
  if (!leadId) return res.status(400).json({ error: 'lead_id is required' });
  if (!answers) return res.status(400).json({ error: 'answers is required' });

  const score = computeQualificationScore(answers);
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || String(lead.tenantId || '') !== tenantId) return res.status(404).json({ error: 'Lead not found' });

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        qualificationJson: score.fields,
        status: score.status,
        score: score.qualified ? 'qualified' : score.complete ? 'engaged' : 'new',
      },
    });

    if (score.qualified) {
      try {
        console.warn('[lead_alert] qualified', JSON.stringify({ tenant_id: tenantId, lead_id: leadId }));
      } catch {
        /* ignore */
      }
    }

    return res.status(200).json({
      ok: true,
      ...safePublicLead(updated),
      qualified: score.qualified,
    });
  } catch (e) {
    return res.status(500).json({ error: 'LEAD_QUALIFY_FAILED', detail: String(e?.message || e) });
  }
}

