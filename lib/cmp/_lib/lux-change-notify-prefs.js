/**
 * LuxeMaurice Change Console — operator ticket email notification prefs.
 * Stored in `tenant_personas.persona_json.lux_change_notify` (Lux tenant only).
 */

export const LUX_TENANT_ID = 'luxe-maurice';
export const LUX_CHANGE_NOTIFY_PREFS_KEY = 'lux_change_notify';
export const LUX_TICKET_NOTIFY_EMAIL_DEFAULT = 'jan@luxemaurice.com';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {unknown} raw
 * @returns {{ enabled: boolean; email: string }}
 */
export function normalizeLuxChangeNotifyPrefs(raw) {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const email = String(o.email || '').trim().toLowerCase();
  const enabled = o.enabled !== false && o.enabled !== 'false' && o.enabled !== 0;
  return { enabled, email };
}

/**
 * @param {{ enabled?: boolean; email?: string | null }} prefs
 * @returns {{ ok: true; prefs: { enabled: boolean; email: string } } | { ok: false; error: string }}
 */
export function validateLuxChangeNotifyPrefsInput(prefs) {
  const normalized = normalizeLuxChangeNotifyPrefs(prefs);
  if (normalized.email && !EMAIL_RE.test(normalized.email)) {
    return { ok: false, error: 'INVALID_NOTIFY_EMAIL' };
  }
  return { ok: true, prefs: normalized };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 * @returns {Promise<{ enabled: boolean; email: string; effective_email: string }>}
 */
export async function readLuxChangeNotifyPrefsPg(prisma, tenantId) {
  const tid = String(tenantId || '').trim();
  if (tid !== LUX_TENANT_ID) {
    return {
      enabled: false,
      email: '',
      effective_email: LUX_TICKET_NOTIFY_EMAIL_DEFAULT,
    };
  }
  const row = await prisma.tenantPersona.findUnique({
    where: { tenantId: tid },
    select: { personaJson: true },
  });
  const pj = row?.personaJson && typeof row.personaJson === 'object' ? row.personaJson : {};
  const stored = normalizeLuxChangeNotifyPrefs(pj[LUX_CHANGE_NOTIFY_PREFS_KEY]);
  const effective = stored.email || LUX_TICKET_NOTIFY_EMAIL_DEFAULT;
  return { ...stored, effective_email: effective };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 * @param {{ enabled?: boolean; email?: string | null }} prefs
 */
export async function writeLuxChangeNotifyPrefsPg(prisma, tenantId, prefs) {
  const tid = String(tenantId || '').trim();
  if (tid !== LUX_TENANT_ID) {
    throw new Error('LUX_TENANT_ONLY');
  }
  const validated = validateLuxChangeNotifyPrefsInput(prefs);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  const existing = await prisma.tenantPersona.findUnique({
    where: { tenantId: tid },
    select: { personaJson: true, tokenCreditBalanceUsd: true },
  });
  const prev =
    existing?.personaJson && typeof existing.personaJson === 'object' && !Array.isArray(existing.personaJson)
      ? existing.personaJson
      : {};
  const next = {
    ...prev,
    [LUX_CHANGE_NOTIFY_PREFS_KEY]: validated.prefs,
  };
  await prisma.tenantPersona.upsert({
    where: { tenantId: tid },
    create: {
      tenantId: tid,
      tokenCreditBalanceUsd: existing?.tokenCreditBalanceUsd ?? 0,
      billingExempt: false,
      personaJson: next,
    },
    update: { personaJson: next },
  });
  const effective = validated.prefs.email || LUX_TICKET_NOTIFY_EMAIL_DEFAULT;
  return { ...validated.prefs, effective_email: effective };
}
