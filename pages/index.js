import React from 'react';
import Head from 'next/head';

import { PrismaClient } from '@prisma/client';

import AiLeadRescueLanding from '../components/AiLeadRescueLanding.js';
import CorpFlowPublicHome from '../components/CorpFlowPublicHome.js';
import LuxeMauriceTenantPresentation from '../components/LuxeMauriceTenantPresentation.js';
import { LUXE_MAURICE_STAGED_PROPERTIES } from '../lib/client/luxe-maurice-staged-properties.js';
import { collectPublishedLuxCardMediaByPropertyRefs } from '../lib/server/lux-published-property-media.js';
import { defaultPublicSite, mergeSiteDraft } from '../lib/server/tenant-site-public.js';
import { verifyTenantPreviewToken } from '../lib/server/tenant-preview-token.js';
import { isGhostHost } from '../lib/server/ghost-host.js';
import { listVisualAssetManifests } from '../lib/visualAssets/loadManifest.js';
import { selectHomepageAssets } from '../lib/visualAssets/selectHomepageAssets.js';
import { selectLeadRescueAssets } from '../lib/visualAssets/selectLeadRescueAssets.js';

/**
 * Minimal tenant marketing site renderer (v1).
 * - If request host resolves to a tenant via Postgres host mapping, render that tenant's site draft.
 * - Otherwise, keep the existing minimal landing (core / unknown).
 */

function normalizeHost(req) {
  try {
    const raw = (req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').toString();
    return raw.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
  } catch {
    return '';
  }
}

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

function parseSearchParam(req, name) {
  try {
    const raw = req?.url || '';
    const u = raw.startsWith('http') ? new URL(raw) : new URL(raw, 'http://localhost');
    return (u.searchParams.get(name) || '').trim();
  } catch {
    return '';
  }
}


function TenantSite({ site }) {
  const s = site || {};
  const ui = s.client_ui && typeof s.client_ui === 'object' ? s.client_ui : {};
  const luxAcquisition = ui.lux_acquisition === true;
  const operatorDebug = ui.operator_debug === true;
  const t = s.theme || {};
  const hero = s.hero || {};
  const about = s.sections?.about || {};
  const services = s.sections?.services || {};
  const media = s.media || {};
  const contact = s.sections?.contact || {};
  const languages = Array.isArray(s.languages) ? s.languages : ['en', 'fr', 'ru'];
  const langDefault = typeof s.lang_default === 'string' && s.lang_default ? s.lang_default : 'en';
  const lang =
    typeof (s.lang_active) === 'string' && s.lang_active
      ? s.lang_active
      : langDefault;

  const i18n = s.i18n && typeof s.i18n === 'object' ? s.i18n : {};
  const i18nBlock = i18n[lang] && typeof i18n[lang] === 'object' ? i18n[lang] : null;
  const tHero = i18nBlock?.hero && typeof i18nBlock.hero === 'object' ? i18nBlock.hero : null;
  const tAbout = i18nBlock?.about && typeof i18nBlock.about === 'object' ? i18nBlock.about : null;
  const tServices = i18nBlock?.services && typeof i18nBlock.services === 'object' ? i18nBlock.services : null;

  const css = {
    '--cf-bg': t.background || '#020617',
    '--cf-surface': t.surface || '#0b1220',
    '--cf-text': t.text || '#e2e8f0',
    '--cf-muted': t.muted || '#94a3b8',
    '--cf-primary': t.primary || '#0ea5e9',
    '--cf-accent': t.accent || '#22c55e',
  };

  const meta = s.meta && typeof s.meta === 'object' ? s.meta : {};
  const pageTitle = safeStr(meta.page_title) || safeStr(hero.title) || 'Tenant site';

  return (
    <div style={css}>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <div style={{ minHeight: '100vh', background: 'var(--cf-bg)', color: 'var(--cf-text)' }}>
        <main style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 20px' }}>
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {media.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.logo_url} alt="Logo" style={{ width: 40, height: 40, borderRadius: 12, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--cf-surface)', border: '1px solid rgba(255,255,255,0.10)' }} />
            )}
            <div>
              <div style={{ fontSize: 12, letterSpacing: 0.6, color: 'var(--cf-muted)' }}>
                {operatorDebug ? 'Preview' : luxAcquisition ? 'Lux Mauritius' : 'Preview'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 650, letterSpacing: luxAcquisition ? 0.02 : undefined }}>
                {safeStr(tHero?.title) || safeStr(hero.title) || 'Tenant site'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--cf-muted)' }}>Language</div>
            <select
              defaultValue={lang}
              onChange={(e) => {
                try {
                  const u = new URL(window.location.href);
                  u.searchParams.set('lang', e.target.value);
                  window.location.href = u.toString();
                } catch {}
              }}
              style={{
                background: 'rgba(0,0,0,0.18)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 12,
                padding: '6px 10px',
                color: 'var(--cf-text)',
                fontSize: 12,
              }}
            >
              {languages.map((l) => (
                <option key={l} value={l}>
                  {String(l).toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <a
            href={safeStr(hero.cta_href) || (luxAcquisition ? '/concierge' : '/change')}
            style={{
              display: 'inline-block',
              padding: '10px 14px',
              borderRadius: 14,
              background: 'var(--cf-primary)',
              color: '#020617',
              fontWeight: 650,
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            {safeStr(hero.cta_label) || 'Request changes'}
          </a>
        </header>

        {luxAcquisition ? (
          <>
            <p
              style={{
                marginTop: 14,
                maxWidth: 560,
                fontSize: 13,
                lineHeight: 1.55,
                color: 'rgba(245,245,245,0.88)',
                fontWeight: 600,
              }}
            >
              We work with a limited number of clients at any given time.
            </p>
            <p
              style={{
                marginTop: 8,
                maxWidth: 560,
                fontSize: 13,
                lineHeight: 1.55,
                color: 'rgba(245,245,245,0.78)',
              }}
            >
              A private advisor responds within one business day. All enquiries are handled with complete discretion.
            </p>
          </>
        ) : null}

        <section style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr', gap: 18 }}>
          <div style={{ borderRadius: 18, border: '1px solid rgba(255,255,255,0.10)', background: 'var(--cf-surface)', padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--cf-muted)' }}>
              {luxAcquisition ? 'Your path' : 'Welcome'}
            </div>
            <h1 style={{ marginTop: 8, fontSize: 28, lineHeight: 1.15, fontWeight: 700 }}>
              {safeStr(tHero?.headline) ||
                safeStr(tHero?.subtitle) ||
                safeStr(hero.headline) ||
                safeStr(hero.subtitle) ||
                ''}
            </h1>
            {(safeStr(tHero?.tagline) || safeStr(hero.tagline)) ? (
              <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.5, color: 'var(--cf-muted)' }}>
                {safeStr(tHero?.tagline) || safeStr(hero.tagline)}
              </p>
            ) : null}
            {operatorDebug ? (
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--cf-muted)' }}>
                Tenant:{' '}
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                  {safeStr(s.tenant_id) || 'n/a'}
                </span>
              </div>
            ) : null}
          </div>

          <div style={{ borderRadius: 18, border: '1px solid rgba(255,255,255,0.10)', background: 'var(--cf-surface)', padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--cf-muted)' }}>
              {safeStr(tAbout?.title) || safeStr(about.title) || 'About'}
            </div>
            <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, color: 'rgba(226,232,240,0.92)' }}>
              {safeStr(tAbout?.body) || safeStr(about.body) || ''}
            </p>
          </div>
        </section>

        <section style={{ marginTop: 18, borderRadius: 18, border: '1px solid rgba(255,255,255,0.10)', background: 'var(--cf-surface)', padding: 18 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--cf-muted)' }}>
              {safeStr(tServices?.title) || safeStr(services.title) || 'Services'}
            </div>
            {safeStr(services.intro) ? (
              <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.55, color: 'var(--cf-muted)' }}>{safeStr(services.intro)}</div>
            ) : luxAcquisition ? null : (
              <div style={{ marginTop: 6, fontSize: 13, color: 'var(--cf-muted)' }}>
                Draft list — we’ll refine based on client feedback.
              </div>
            )}
          </div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            {(Array.isArray(services.items) ? services.items : []).length ? (
              (services.items || []).map((it, idx) => (
                <div
                  key={idx}
                  style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.18)', padding: 14 }}
                >
                  <div style={{ fontWeight: 650 }}>{safeStr(it?.name) || `Service ${idx + 1}`}</div>
                  {it?.detail ? <div style={{ marginTop: 6, fontSize: 13, color: 'var(--cf-muted)' }}>{safeStr(it.detail)}</div> : null}
                </div>
              ))
            ) : luxAcquisition ? null : (
              <div style={{ fontSize: 13, color: 'var(--cf-muted)' }}>No services listed yet.</div>
            )}
          </div>
        </section>

        <section style={{ marginTop: 18, borderRadius: 18, border: '1px solid rgba(255,255,255,0.10)', background: 'var(--cf-surface)', padding: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--cf-muted)' }}>{safeStr(contact.title) || 'Contact'}</div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.18)', padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--cf-muted)' }}>Email</div>
              <div style={{ marginTop: 6, fontSize: 13 }}>
                {contact.email ? (
                  <a style={{ color: 'var(--cf-accent)' }} href={`mailto:${contact.email}`}>
                    {contact.email}
                  </a>
                ) : (
                  luxAcquisition ? 'By appointment' : '—'
                )}
              </div>
            </div>
            <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.18)', padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--cf-muted)' }}>Phone</div>
              <div style={{ marginTop: 6, fontSize: 13 }}>
                {contact.phone ? (
                  <a style={{ color: 'var(--cf-accent)' }} href={`tel:${contact.phone}`}>
                    {contact.phone}
                  </a>
                ) : (
                  luxAcquisition ? 'By appointment' : '—'
                )}
              </div>
            </div>
            <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.18)', padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--cf-muted)' }}>Website</div>
              <div style={{ marginTop: 6, fontSize: 13 }}>
                {contact.website ? (
                  <a style={{ color: 'var(--cf-accent)' }} href={contact.website}>
                    {contact.website}
                  </a>
                ) : (
                  luxAcquisition ? 'By appointment' : '—'
                )}
              </div>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 18, borderRadius: 18, border: '1px solid rgba(255,255,255,0.10)', background: 'var(--cf-surface)', padding: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--cf-muted)' }}>Enquire</div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const f = e.target;
                const fd = new FormData(f);
                const payload = {
                  name: String(fd.get('name') || '').trim(),
                  email: String(fd.get('email') || '').trim(),
                  intent: String(fd.get('message') || '').trim(),
                  meta: {
                    language: lang,
                    region_focus: String(fd.get('region') || '').trim(),
                    budget_usd: String(fd.get('budget') || '').trim(),
                    host: safeStr(s.host) || null,
                    page: '/',
                  },
                };
                const r = await fetch('/api/tenant/intake', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });
                const j = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(j.error || 'intake_failed');
                alert('Thank you. We will contact you shortly.');
                f.reset();
              } catch (err) {
                alert('Could not submit. Please try again.');
              }
            }}
            style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}
          >
            <input name="name" placeholder="Name" style={{ padding: '10px 12px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.18)', color: 'var(--cf-text)' }} />
            <input required name="email" placeholder="Email" style={{ padding: '10px 12px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.18)', color: 'var(--cf-text)' }} />
            <select name="region" style={{ padding: '10px 12px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.18)', color: 'var(--cf-text)' }}>
              <option value="">Region focus (optional)</option>
              <option value="FR">France / French-speaking Europe</option>
              <option value="ZA">South Africa</option>
              <option value="EE">Eastern Europe</option>
              <option value="RU">Russia</option>
            </select>
            <select name="budget" style={{ padding: '10px 12px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.18)', color: 'var(--cf-text)' }}>
              <option value="">Budget (USD, optional)</option>
              <option value="2-3M">2–3M</option>
              <option value="3-5M">3–5M</option>
              <option value="5-10M">5–10M</option>
              <option value="10M+">10M+</option>
            </select>
            <textarea required name="message" placeholder="Message" rows="4" style={{ padding: '10px 12px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.18)', color: 'var(--cf-text)' }}></textarea>
            <button type="submit" style={{ padding: '10px 12px', borderRadius: 14, background: 'var(--cf-accent)', color: '#020617', fontWeight: 700 }}>
              Submit enquiry
            </button>
          </form>
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--cf-muted)', lineHeight: 1.5 }}>
            {luxAcquisition
              ? 'Qualified principals only. A private advisor will respond within one business day. All enquiries are handled with complete discretion.'
              : 'High-net-worth enquiries only. We respond within 1 business day.'}
          </div>
        </section>

        <footer style={{ marginTop: 18, textAlign: 'center', fontSize: 12, color: 'var(--cf-muted)', lineHeight: 1.45 }}>
          {operatorDebug
            ? 'Powered by CorpFlow · Draft preview for rapid iteration in the Change Console.'
            : luxAcquisition
              ? 'Private client access · Information on this site is indicative and subject to verification.'
              : safeStr(i18nBlock?.footer?.powered) ||
                'Powered by CorpFlow · Draft preview for rapid iteration in the Change Console.'}
        </footer>
        </main>
      </div>
    </div>
  );
}

const AI_LEAD_RESCUE_HOST = 'aileadrescue.corpflowai.com';

export default function Home({ mode, site, host, homepageAssets, leadRescueAssets }) {
  if (mode === 'ai_lead_rescue') {
    return <AiLeadRescueLanding host={host || AI_LEAD_RESCUE_HOST} leadRescueAssets={leadRescueAssets || null} />;
  }
  if (mode === 'tenant_site' && site?.client_ui?.lux_acquisition === true) {
    return <LuxeMauriceTenantPresentation site={site} />;
  }
  if (mode === 'tenant_site') {
    return <TenantSite site={site} />;
  }
  if (mode === 'corpflow_marketing') {
    return <CorpFlowPublicHome homepageAssets={homepageAssets || null} />;
  }
  return <CorpFlowPublicHome homepageAssets={homepageAssets || null} />;
}

/**
 * Build the homepage asset selection at SSR time. Centralised so we
 * can swallow filesystem / validation failures without breaking the
 * customer-facing route — per `.cursor/rules/delivery-reality.mdc`,
 * a content-only failure must never take down `/`.
 */
function buildHomepageAssetsSafe() {
  try {
    const pool = listVisualAssetManifests('core').concat(listVisualAssetManifests('shared'));
    const seen = new Set();
    const deduped = [];
    for (const m of pool) {
      if (!m || typeof m.id !== 'string') continue;
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      deduped.push(m);
    }
    return selectHomepageAssets(deduped);
  } catch (err) {
    try {
      console.warn('[corpflow-marketing] homepage asset selection failed; rendering without manifests', err && err.message ? err.message : err);
    } catch {}
    return null;
  }
}

/**
 * Same defensive shape as `buildHomepageAssetsSafe` but for the AI
 * Lead Rescue surface, used when the request resolves to the
 * `aileadrescue.corpflowai.com` host. The `/lead-rescue` path under
 * the apex host has its own SSG entry in `pages/lead-rescue.js`.
 */
function buildLeadRescueAssetsSafe() {
  try {
    const pool = listVisualAssetManifests('lead-rescue').concat(listVisualAssetManifests('shared'));
    const seen = new Set();
    const deduped = [];
    for (const m of pool) {
      if (!m || typeof m.id !== 'string') continue;
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      deduped.push(m);
    }
    return selectLeadRescueAssets(deduped);
  } catch (err) {
    try {
      console.warn('[ai-lead-rescue] asset selection failed; rendering without manifests', err && err.message ? err.message : err);
    } catch {}
    return null;
  }
}

export async function getServerSideProps({ req }) {
  const host = normalizeHost(req);
  if (host && isGhostHost(host)) {
    return { redirect: { destination: '/log-stream.html', permanent: false } };
  }
  if (host === AI_LEAD_RESCUE_HOST) {
    return { props: { mode: 'ai_lead_rescue', site: null, host: AI_LEAD_RESCUE_HOST, leadRescueAssets: buildLeadRescueAssetsSafe() } };
  }
  const prisma = new PrismaClient();
  try {
    if (!host) {
      return { props: { mode: 'corpflow_marketing', site: null, homepageAssets: buildHomepageAssetsSafe() } };
    }

    const root = String(process.env.CORPFLOW_ROOT_DOMAIN || 'corpflowai.com')
      .toLowerCase()
      .replace(/^\./, '')
      .trim();
    if (host === root || host === `www.${root}`) {
      return { props: { mode: 'corpflow_marketing', site: null, homepageAssets: buildHomepageAssetsSafe() } };
    }

    // Resolve tenant by DB host mapping first; fallback to null.
    const row = await prisma.tenantHostname.findUnique({
      where: { host },
      select: { tenantId: true, enabled: true },
    });
    let tenantId = row && row.enabled === true ? safeStr(row.tenantId) : '';
    if (!tenantId) {
      const cfPreview = parseSearchParam(req, 'cf_preview');
      if (cfPreview) {
        const verified = verifyTenantPreviewToken(cfPreview);
        if (verified.ok) {
          const tExists = await prisma.tenant.findUnique({
            where: { tenantId: verified.tenantId },
            select: { tenantId: true },
          });
          if (tExists?.tenantId) tenantId = safeStr(tExists.tenantId);
        }
      }
    }
    if (!tenantId) {
      return { props: { mode: 'corpflow_marketing', site: null, homepageAssets: buildHomepageAssetsSafe() } };
    }

    const [persona, tenantRow] = await Promise.all([
      prisma.tenantPersona.findUnique({
        where: { tenantId },
        select: { personaJson: true },
      }),
      prisma.tenant.findUnique({
        where: { tenantId },
        select: { name: true },
      }),
    ]);
    const pj = persona?.personaJson && typeof persona.personaJson === 'object' ? persona.personaJson : {};
    const draft = pj?.website_draft && typeof pj.website_draft === 'object' ? pj.website_draft : null;
    const qLang = (() => {
      const v = parseSearchParam(req, 'lang').toLowerCase();
      return v || '';
    })();

    const base = defaultPublicSite(tenantId, host, { dbName: tenantRow?.name ?? null });
    const site = mergeSiteDraft(base, draft || {});
    site.lang_default = site.lang_default || 'en';
    site.languages = Array.isArray(site.languages) ? site.languages : ['en', 'fr', 'ru'];
    site.lang_active = qLang && site.languages.includes(qLang) ? qLang : site.lang_default;
    site.sections = site.sections || {};
    site.sections.contact = site.sections.contact || {};
    if (!site.sections.contact.website) {
      site.sections.contact.website = host ? `https://${host}` : null;
    }

    // Luxe Mauritius: brand-aligned island presentation + UI flags (SSR only; tenant_id unchanged; no API changes).
    // Repositioned 2026-06-11 to the Private Wealth & Lifestyle Platform direction.
    if (tenantId === 'luxe-maurice') {
      const operatorDebug = parseSearchParam(req, 'debug') === '1';
      site.client_ui = { lux_acquisition: true, operator_debug: operatorDebug };

      site.meta = site.meta && typeof site.meta === 'object' ? site.meta : {};
      site.meta.page_title = 'LuxeMaurice · Private Wealth & Lifestyle Platform for Mauritius';

      site.hero = site.hero && typeof site.hero === 'object' ? site.hero : {};
      site.hero.title = 'LuxeMaurice';
      site.hero.headline = 'Private. Curated. Considered.';
      site.hero.tagline = 'Private Wealth & Lifestyle Platform for Mauritius';
      site.hero.cta_label = 'Request a private consultation';
      site.hero.cta_href = '/concierge';

      site.sections = site.sections && typeof site.sections === 'object' ? site.sections : {};
      site.sections.about =
        site.sections.about && typeof site.sections.about === 'object' ? site.sections.about : {};
      site.sections.about.title = 'Mauritius as a strategic base';
      site.sections.about.body =
        'For internationally mobile families and private investors, Mauritius pairs natural beauty with political stability, a favourable climate, and a credible long-term lifestyle. We present it as five overlapping propositions — lifestyle, security, connectivity, legacy, and opportunity — and help discerning clients enter it on terms appropriate to their life and balance sheet.';

      site.sections.services =
        site.sections.services && typeof site.sections.services === 'object' ? site.sections.services : {};
      site.sections.services.title = 'Private opportunities';
      site.sections.services.intro =
        'Curated completed residences and development partnerships across the island. Public previews where appropriate; private depth on enquiry. Nothing on this site is an offer until terms are agreed in writing.';

      const existingSvc = Array.isArray(site.sections.services.items) ? site.sections.services.items : [];
      if (!existingSvc.length) {
        site.sections.services.items = [
          {
            name: 'Completed luxury residences',
            detail: 'Finished, furnished, exceptional properties — for clients who value privacy, immediacy, and architectural quality that does not need defending.',
          },
          {
            name: 'Development partnerships',
            detail: 'Buy into considered plans. Participate in finishes, materials, and furnishings. Direct decisions from anywhere in the world, with calm governance.',
          },
          {
            name: 'Owner Experience',
            detail: 'Invitation-only environment for engaged clients — project status, progress, decisions, procurement, and concierge support, in one private thread.',
          },
        ];
      }

      site.staged_properties =
        Array.isArray(site.staged_properties) && site.staged_properties.length
          ? site.staged_properties
          : LUXE_MAURICE_STAGED_PROPERTIES;

      /* Vision-aligned (2026-06-11): no feed-shaped preview inventory on public surfaces.
       * The Phase 2B `lxf-*` preview band is no longer rendered. `feed_properties`
       * is intentionally an empty array — direct navigation to a `lxf-*` slug is
       * still resolved by `resolveLuxPropertyRef` for backward compatibility,
       * but no link from the public site points there. */
      site.feed_properties = [];

      /** Phase 4D.2 — resolved slug/id → safe published card image (for homepage cards only). */
      const cardRefInputs = [];
      for (const p of site.staged_properties || []) {
        if (p?.slug) cardRefInputs.push(String(p.slug));
      }
      const cardMap = await collectPublishedLuxCardMediaByPropertyRefs(prisma, cardRefInputs);
      site.lux_published_card_media = Object.fromEntries(cardMap);

      site.i18n = site.i18n && typeof site.i18n === 'object' ? site.i18n : {};
      site.i18n.en = site.i18n.en && typeof site.i18n.en === 'object' ? site.i18n.en : {};
      site.i18n.en.about = {
        title: site.sections.about.title,
        body: site.sections.about.body,
      };
    }

    return { props: { mode: 'tenant_site', site } };
  } catch (_) {
    return { props: { mode: 'corpflow_marketing', site: null, homepageAssets: buildHomepageAssetsSafe() } };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
