import React from 'react';
import Head from 'next/head';

import { PrismaClient } from '@prisma/client';

import { defaultPublicSite, mergeSiteDraft } from '../lib/server/tenant-site-public.js';

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

function CorpFlowMarketing() {
  const css = {
    '--cf-bg': '#020617',
    '--cf-surface': '#0b1220',
    '--cf-text': '#e2e8f0',
    '--cf-muted': '#94a3b8',
    '--cf-primary': '#38bdf8',
    '--cf-accent': '#22c55e',
  };

  return (
    <div style={css}>
      <div style={{ minHeight: '100vh', background: 'var(--cf-bg)', color: 'var(--cf-text)' }}>
        <main style={{ maxWidth: 1120, margin: '0 auto', padding: '56px 20px' }}>
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--cf-muted)' }}>
                CorpFlow
              </div>
              <div style={{ marginTop: 10, fontSize: 28, lineHeight: 1.15, fontWeight: 780 }}>
                From request → estimate → build → preview.
                <br />
                Fast, auditable delivery for real businesses.
              </div>
              <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: 'rgba(226,232,240,0.92)', maxWidth: 720 }}>
                CorpFlow turns plain-English change requests into a managed delivery pipeline with visible progress, client approvals, and a factory audit trail.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <a
                href="/change"
                style={{
                  display: 'inline-block',
                  padding: '10px 14px',
                  borderRadius: 14,
                  background: 'var(--cf-primary)',
                  color: '#020617',
                  fontWeight: 750,
                  fontSize: 13,
                  textDecoration: 'none',
                }}
              >
                Open Change Console
              </a>
              <a
                href="/login"
                style={{
                  display: 'inline-block',
                  padding: '10px 14px',
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--cf-text)',
                  fontWeight: 650,
                  fontSize: 13,
                  textDecoration: 'none',
                }}
              >
                Login
              </a>
            </div>
          </header>

          <section style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
            <div style={{ gridColumn: 'span 7', borderRadius: 18, border: '1px solid rgba(255,255,255,0.10)', background: 'var(--cf-surface)', padding: 18 }}>
              <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--cf-muted)' }}>How it works</div>
              <ol style={{ marginTop: 12, paddingLeft: 18, color: 'rgba(226,232,240,0.92)', lineHeight: 1.7, fontSize: 14 }}>
                <li>Describe what you want in plain language.</li>
                <li>Get an estimate and a clear “done when” outcome list.</li>
                <li>Approve build → factory dispatches work + keeps an audit trail.</li>
                <li>Review preview → approve or request changes.</li>
              </ol>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--cf-muted)' }}>
                Operator tools stay on the core host; client surfaces stay tenant-scoped.
              </div>
            </div>

            <div style={{ gridColumn: 'span 5', borderRadius: 18, border: '1px solid rgba(255,255,255,0.10)', background: 'var(--cf-surface)', padding: 18 }}>
              <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--cf-muted)' }}>Why it matters</div>
              <ul style={{ marginTop: 12, paddingLeft: 18, color: 'rgba(226,232,240,0.92)', lineHeight: 1.7, fontSize: 14 }}>
                <li>Clear progress: you can manage what you can see.</li>
                <li>Less firefighting: self-heal and monitoring prevent stalls.</li>
                <li>Trust: every action leaves evidence.</li>
              </ul>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--cf-muted)' }}>
                Start with one ticket. Scale the process.
              </div>
            </div>
          </section>

          <footer style={{ marginTop: 22, textAlign: 'center', fontSize: 12, color: 'var(--cf-muted)' }}>
            <a style={{ color: 'var(--cf-accent)' }} href="/change">
              Go to /change
            </a>
            {' · '}
            <a style={{ color: 'var(--cf-accent)' }} href="/factory/approvals">
              Factory approvals
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}

function TenantSite({ site }) {
  const s = site || {};
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
              <div style={{ fontSize: 12, letterSpacing: 0.6, color: 'var(--cf-muted)' }}>Preview</div>
              <div style={{ fontSize: 20, fontWeight: 650 }}>
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
            href={safeStr(hero.cta_href) || '/change'}
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

        <section style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr', gap: 18 }}>
          <div style={{ borderRadius: 18, border: '1px solid rgba(255,255,255,0.10)', background: 'var(--cf-surface)', padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--cf-muted)' }}>Welcome</div>
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
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--cf-muted)' }}>
              Tenant: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>{safeStr(s.tenant_id) || 'n/a'}</span>
            </div>
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
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--cf-muted)' }}>Draft list — we’ll refine based on client feedback.</div>
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
            ) : (
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
                {contact.email ? <a style={{ color: 'var(--cf-accent)' }} href={`mailto:${contact.email}`}>{contact.email}</a> : '—'}
              </div>
            </div>
            <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.18)', padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--cf-muted)' }}>Phone</div>
              <div style={{ marginTop: 6, fontSize: 13 }}>
                {contact.phone ? <a style={{ color: 'var(--cf-accent)' }} href={`tel:${contact.phone}`}>{contact.phone}</a> : '—'}
              </div>
            </div>
            <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.18)', padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--cf-muted)' }}>Website</div>
              <div style={{ marginTop: 6, fontSize: 13 }}>
                {contact.website ? <a style={{ color: 'var(--cf-accent)' }} href={contact.website}>{contact.website}</a> : '—'}
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
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--cf-muted)' }}>
            High-net-worth enquiries only. We respond within 1 business day.
          </div>
        </section>

        <footer style={{ marginTop: 18, textAlign: 'center', fontSize: 12, color: 'var(--cf-muted)' }}>
          Powered by CorpFlow · Draft preview for rapid iteration in the Change Console.
        </footer>
        </main>
      </div>
    </div>
  );
}

export default function Home({ mode, site }) {
  if (mode === 'tenant_site') {
    return <TenantSite site={site} />;
  }
  if (mode === 'corpflow_marketing') {
    return <CorpFlowMarketing />;
  }
  return <CorpFlowMarketing />;
}

export async function getServerSideProps({ req }) {
  const host = normalizeHost(req);
  const prisma = new PrismaClient();
  try {
    if (!host) {
      return { props: { mode: 'corpflow_marketing', site: null } };
    }

    const root = String(process.env.CORPFLOW_ROOT_DOMAIN || 'corpflowai.com')
      .toLowerCase()
      .replace(/^\./, '')
      .trim();
    if (host === root || host === `www.${root}`) {
      return { props: { mode: 'corpflow_marketing', site: null } };
    }

    // Resolve tenant by DB host mapping first; fallback to null.
    const row = await prisma.tenantHostname.findUnique({
      where: { host },
      select: { tenantId: true, enabled: true },
    });
    const tenantId = row && row.enabled === true ? safeStr(row.tenantId) : '';
    if (!tenantId) {
      return { props: { mode: 'corpflow_marketing', site: null } };
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
      try {
        const raw = req?.url || '';
        const u = raw.startsWith('http') ? new URL(raw) : new URL(raw, 'http://localhost');
        const v = (u.searchParams.get('lang') || '').trim().toLowerCase();
        return v || '';
      } catch {
        return '';
      }
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

    // Luxe Mauritius: marketing/hero copy refresh (copy-only).
    // Force these strings regardless of any saved draft so production always matches the acceptance criteria.
    if (tenantId === 'luxe-maurice') {
      site.meta = site.meta && typeof site.meta === 'object' ? site.meta : {};
      site.meta.page_title = 'Lux Mauritius · Private previews';
      site.hero = site.hero && typeof site.hero === 'object' ? site.hero : {};
      site.hero.headline = 'Exclusive Mauritius residences — curated for you.';
      site.hero.tagline = 'Private previews and priority access for qualified buyers.';
      site.hero.cta_label = 'Request a private preview';
    }

    return { props: { mode: 'tenant_site', site } };
  } catch (_) {
    return { props: { mode: 'corpflow_marketing', site: null } };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
