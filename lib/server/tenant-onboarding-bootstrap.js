/**
 * One-shot tenant onboarding for automation: upsert `tenants`, map `tenant_hostnames`,
 * optional sovereign PIN, optional primary `auth_users` row.
 *
 * Auth: factory master (same as other factory routes) OR header
 * `x-corpflow-tenant-bootstrap-secret` when `CORPFLOW_TENANT_BOOTSTRAP_SECRET` is set.
 *
 * HTTP: POST /api/factory/tenant/bootstrap
 * Automation: POST /api/automation/ingest with event_type `tenant.bootstrap.execute`
 * (requires `CORPFLOW_AUTOMATION_TENANT_BOOTSTRAP=true` plus normal ingest secret).
 */

import crypto from 'crypto';

import { PrismaClient } from '@prisma/client';

import { recordTrustedAutomationEvent } from '../automation/internal.js';
import { emitLogicFailure } from '../cmp/_lib/telemetry.js';
import { generateSecureTenantPin, hashPinForStorage } from '../cmp/_lib/tenant-pin.js';
import { timingSafeStringEquals, verifyFactoryMasterAuth } from './factory-master-auth.js';
import { recordSovereignAuditEvent } from './audit.js';
import { cfg } from './runtime-config.js';
import { validateBootstrapHostnamesPolicy } from './tenant-hostname-policy.js';

function str(v) {
  return v != null ? String(v).trim() : '';
}

function normalizeEmailish(s) {
  return str(s).toLowerCase();
}

function computePasswordHash(password, salt) {
  const pw = String(password || '').trim();
  const s = String(salt || '').trim();
  if (!pw || !s) return '';
  return crypto.pbkdf2Sync(pw, s, 120000, 32, 'sha256').toString('hex');
}

function newSaltHex() {
  return crypto.randomBytes(16).toString('hex');
}

function generateRandomLoginPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const buf = crypto.randomBytes(24);
  let out = '';
  for (let i = 0; i < 24; i += 1) {
    out += chars[buf[i] % chars.length];
  }
  return out;
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {boolean}
 */
export function verifyTenantBootstrapAuth(req) {
  if (verifyFactoryMasterAuth(req)) return true;
  const expected = String(cfg('CORPFLOW_TENANT_BOOTSTRAP_SECRET', '')).trim();
  if (!expected) return false;
  const raw = req.headers?.['x-corpflow-tenant-bootstrap-secret'];
  const got = raw != null ? String(raw).trim() : '';
  return timingSafeStringEquals(expected, got);
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, data: Record<string, unknown> } | { ok: false, error: string, hint?: string }}
 */
export function parseBootstrapBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'JSON body required' };
  }
  const b = /** @type {Record<string, unknown>} */ (body);
  const tenantIdRaw = b.tenant_id ?? b.tenantId;
  const tenantId = str(tenantIdRaw);
  if (!tenantId) {
    return { ok: false, error: 'tenant_id is required' };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(tenantId)) {
    return {
      ok: false,
      error: 'tenant_id must be alphanumeric with ._- only',
    };
  }

  const slugRaw = b.slug != null ? str(b.slug) : '';
  const slug = slugRaw || tenantId;
  const name = b.name != null ? str(b.name) : tenantId;
  const fqdn = b.fqdn != null ? str(b.fqdn) : '';
  const lifecycle = b.lifecycle != null ? str(b.lifecycle) : '';
  const tenantStatus = b.tenant_status != null ? str(b.tenant_status) : '';

  let hostnames = [];
  if (Array.isArray(b.hostnames)) {
    hostnames = b.hostnames.map((h) => str(h).toLowerCase()).filter(Boolean);
  }
  const singleHost = str(b.host);
  if (singleHost) hostnames.push(singleHost.toLowerCase());
  hostnames = [...new Set(hostnames)];

  for (const h of hostnames) {
    if (!/^[a-z0-9.-]+$/.test(h)) {
      return { ok: false, error: `Invalid hostname: ${h}`, hint: 'Use letters, digits, dot, hyphen only.' };
    }
  }

  const hostnameMode = str(b.hostname_mode || b.host_mode || 'tenant') || 'tenant';
  const hostEnabled = b.host_enabled !== false && b.hostnames_enabled !== false;

  const issuePin = b.issue_pin === true || b.issue_sovereign_pin === true;

  const pu = b.primary_user;
  let primaryUser = null;
  if (pu && typeof pu === 'object') {
    const p = /** @type {Record<string, unknown>} */ (pu);
    const username = normalizeEmailish(p.username || p.email);
    const generatePassword = p.generate_password === true || p.gen_password === true;
    const password = str(p.password || p.new_password);
    const level = str(p.level || 'tenant') || 'tenant';
    if (username) {
      primaryUser = { username, generatePassword, password, level };
    }
  }

  if (primaryUser && !primaryUser.generatePassword && primaryUser.password.length < 10) {
    return {
      ok: false,
      error: 'primary_user.password must be at least 10 characters or use generate_password: true',
    };
  }

  let convertLeadIds = [];
  if (Array.isArray(b.convert_lead_ids)) {
    convertLeadIds = b.convert_lead_ids.map((x) => str(x)).filter(Boolean);
  }
  const singleLead = str(b.convert_lead_id);
  if (singleLead) convertLeadIds.push(singleLead);
  convertLeadIds = [...new Set(convertLeadIds)];

  const executionOnly = b.execution_only != null ? Boolean(b.execution_only) : undefined;

  return {
    ok: true,
    data: {
      tenantId,
      slug,
      name,
      fqdn: fqdn || null,
      lifecycle: lifecycle || undefined,
      tenantStatus: tenantStatus || undefined,
      executionOnly,
      hostnames,
      hostnameMode,
      hostEnabled,
      issuePin,
      primaryUser,
      convertLeadIds,
      dryRun: b.dry_run === true,
    },
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {Record<string, unknown>} body
 * @param {{ emitAutomationMirror?: boolean; ingestSource?: boolean; allowHostnamePolicyBypass?: boolean }} [opts]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function executeTenantBootstrap(prisma, body, opts = {}) {
  const parsed = parseBootstrapBody(body);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, hint: parsed.hint };
  }

  const d = parsed.data;
  const emitMirror = opts.emitAutomationMirror !== false && !opts.ingestSource;

  const bypassPolicy =
    opts.allowHostnamePolicyBypass === true &&
    body &&
    typeof body === 'object' &&
    Boolean((/** @type {Record<string, unknown>} */ (body)).bypass_client_hostname_policy);

  /** @type {{ host: string; notice: string }[]} */
  let hostnamePolicyNotices = [];
  if (d.hostnames.length > 0) {
    const hp = validateBootstrapHostnamesPolicy(d.hostnames, {
      bypass: bypassPolicy,
      tenantId: d.tenantId,
    });
    if (!hp.ok) {
      return {
        ok: false,
        error: hp.error,
        hint: hp.hint,
        code: hp.code,
      };
    }
    hostnamePolicyNotices = hp.notices;
  }

  if (d.dryRun) {
    return {
      ok: true,
      dry_run: true,
      plan: {
        tenant_id: d.tenantId,
        slug: d.slug,
        name: d.name,
        fqdn: d.fqdn,
        hostnames: d.hostnames,
        issue_pin: d.issuePin,
        primary_user: d.primaryUser ? { username: d.primaryUser.username, level: d.primaryUser.level } : null,
        convert_lead_ids: d.convertLeadIds,
        hostname_policy_notices: hostnamePolicyNotices,
      },
    };
  }

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    return {
      ok: false,
      error: 'POSTGRES_URL_MISSING',
      hint: 'Configure POSTGRES_URL to run tenant bootstrap.',
    };
  }

  let plainPin = null;
  let plainPassword = null;

  if (d.primaryUser?.generatePassword) {
    plainPassword = generateRandomLoginPassword();
  } else if (d.primaryUser) {
    plainPassword = d.primaryUser.password;
  }

  try {
    const tenantRow = await prisma.$transaction(async (tx) => {
      const row = await tx.tenant.upsert({
        where: { tenantId: d.tenantId },
        update: {
          slug: d.slug,
          name: d.name,
          fqdn: d.fqdn,
          ...(d.lifecycle != null ? { lifecycle: d.lifecycle } : {}),
          ...(d.tenantStatus != null ? { tenantStatus: d.tenantStatus } : {}),
          ...(d.executionOnly !== undefined ? { executionOnly: d.executionOnly } : {}),
        },
        create: {
          tenantId: d.tenantId,
          slug: d.slug,
          name: d.name,
          fqdn: d.fqdn,
          ...(d.lifecycle != null ? { lifecycle: d.lifecycle } : {}),
          ...(d.tenantStatus != null ? { tenantStatus: d.tenantStatus } : {}),
          ...(d.executionOnly !== undefined ? { executionOnly: d.executionOnly } : {}),
        },
        select: {
          tenantId: true,
          slug: true,
          name: true,
          fqdn: true,
          lifecycle: true,
          tenantStatus: true,
          executionOnly: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      for (const hostRaw of d.hostnames) {
        const id = crypto.randomUUID();
        await tx.$executeRaw`
          insert into tenant_hostnames (id, host, tenant_id, mode, enabled, created_at, updated_at)
          values (${id}, ${hostRaw}, ${d.tenantId}, ${d.hostnameMode}, ${d.hostEnabled}, now(), now())
          on conflict (host)
          do update set
            tenant_id = excluded.tenant_id,
            mode = excluded.mode,
            enabled = excluded.enabled,
            updated_at = now()
        `;
      }

      if (d.issuePin) {
        plainPin = generateSecureTenantPin();
        const hashed = hashPinForStorage(plainPin);
        await tx.tenant.update({
          where: { tenantId: d.tenantId },
          data: { sovereignPinHash: hashed },
        });
      }

      if (d.primaryUser && plainPassword) {
        const salt = newSaltHex();
        const hash = computePasswordHash(plainPassword, salt);
        if (!hash) {
          throw new Error('PASSWORD_HASH_FAILED');
        }
        await tx.authUser.upsert({
          where: { username: d.primaryUser.username },
          create: {
            username: d.primaryUser.username,
            passwordHash: hash,
            passwordSalt: salt,
            level: d.primaryUser.level,
            tenantId: d.tenantId,
            enabled: true,
          },
          update: {
            passwordHash: hash,
            passwordSalt: salt,
            level: d.primaryUser.level,
            tenantId: d.tenantId,
            enabled: true,
          },
        });
      }

      return row;
    });

    let leadsMarked = 0;
    if (d.convertLeadIds.length > 0) {
      const u = await prisma.lead.updateMany({
        where: { id: { in: d.convertLeadIds } },
        data: { status: 'CONVERTED' },
      });
      leadsMarked = u.count;
    }

    recordSovereignAuditEvent({
      tenant_id: d.tenantId,
      action: 'tenant-bootstrap',
      meta: {
        slug: d.slug,
        host_count: d.hostnames.length,
        issue_pin: d.issuePin,
        primary_user: d.primaryUser?.username || null,
        leads_marked: leadsMarked,
        hostname_policy_bypass: bypassPolicy === true,
        hostname_policy_notices: hostnamePolicyNotices.length > 0 ? hostnamePolicyNotices : undefined,
      },
    });

    if (emitMirror) {
      await recordTrustedAutomationEvent(prisma, {
        tenantId: d.tenantId,
        eventType: 'factory.tenant.bootstrap',
        payload: {
          tenant_id: d.tenantId,
          host_count: d.hostnames.length,
          pin_issued: Boolean(plainPin),
          user_username: d.primaryUser?.username || null,
          leads_marked: leadsMarked,
        },
        idempotencyKey: null,
        source: 'factory',
      });
    }

    /** @type {Record<string, unknown>} */
    const hostRows =
      d.hostnames.length > 0
        ? await prisma.$queryRaw`
            select host, tenant_id, mode, enabled, created_at, updated_at
            from tenant_hostnames
            where tenant_id = ${d.tenantId}
          `
        : [];

    const list = Array.isArray(hostRows) ? hostRows : [];

    /** @type {Record<string, unknown>} */
    const out = {
      ok: true,
      tenant: {
        tenant_id: tenantRow.tenantId,
        slug: tenantRow.slug,
        name: tenantRow.name,
        fqdn: tenantRow.fqdn,
        lifecycle: tenantRow.lifecycle,
        tenant_status: tenantRow.tenantStatus,
        execution_only: tenantRow.executionOnly,
        created_at: tenantRow.createdAt instanceof Date ? tenantRow.createdAt.toISOString() : null,
        updated_at: tenantRow.updatedAt instanceof Date ? tenantRow.updatedAt.toISOString() : null,
      },
      hostnames: list,
      leads_marked: leadsMarked,
    };

    if (plainPin != null) {
      out.pin_print_once = plainPin;
      out.pin_warning = 'Store the PIN now; it is not retained in plaintext.';
    }
    if (plainPassword != null && d.primaryUser) {
      out.password_print_once = plainPassword;
      out.password_warning = 'Store the password now; it cannot be read back from the API.';
      out.primary_username = d.primaryUser.username;
    }

    return out;
  } catch (e) {
    emitLogicFailure({
      source: 'tenant-onboarding-bootstrap',
      severity: 'error',
      error: e instanceof Error ? e : new Error(String(e)),
      cmp: { ticket_id: 'n/a', action: 'tenant-bootstrap' },
      meta: { tenant_id: d.tenantId },
      recommended_action: 'Verify ensure-schema, unique slug/username, and POSTGRES_URL.',
    });
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: 'TENANT_BOOTSTRAP_FAILED', detail: msg };
  }
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export async function handleFactoryTenantBootstrap(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifyTenantBootstrapAuth(req)) {
    return res.status(403).json({
      error: 'TENANT_BOOTSTRAP_AUTH_REQUIRED',
      hint:
        'Use factory master auth (Bearer / x-session-token) or set CORPFLOW_TENANT_BOOTSTRAP_SECRET and send x-corpflow-tenant-bootstrap-secret.',
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : null;
  const client = new PrismaClient();
  try {
    const result = await executeTenantBootstrap(client, body || {}, {
      emitAutomationMirror: true,
      allowHostnamePolicyBypass: verifyFactoryMasterAuth(req),
    });
    if (result.ok === false) {
      const code = result.error === 'POSTGRES_URL_MISSING' ? 503 : 400;
      return res.status(code).json(result);
    }
    return res.status(200).json(result);
  } finally {
    await client.$disconnect().catch(() => {});
  }
}
