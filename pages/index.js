import React from 'react';

import { PrismaClient } from '@prisma/client';

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

function defaultSite({ tenantId, host }) {
  const brand = tenantId ? safeStr(tenantId).replace(/[-_]+/g, ' ') : 'CorpFlow';
  return {
    tenant_id: tenantId || null,
    host: host || null,
    theme: {
      primary: '#0ea5e9', // sky-500
      accent: '#22c55e', // green-500
      background: '#020617', // slate-950
      surface: '#0b1220',
      text: '#e2e8f0', // slate-200
      muted: '#94a3b8', // slate-400
    },
    hero: {
      title: brand,
      subtitle: 'A premium experience — preview draft site powered by CorpFlow.',
      cta_label: 'Request changes',
      cta_href: '/change',
    },
    sections: {
      about: {
        title: 'About',
        body: 'This is a first draft. Use the Change Console to request edits and iterate quickly.',
      },
      services: {
        title: 'Services',
        items: [],
      },
      contact: {
        title: 'Contact',
        email: null,
        phone: null,
        website: host ? `https://${host}` : null,
      },
    },
    media: {
      hero_image_url: null,
      gallery: [],
      logo_url: null,
    },
  };
}

function TenantSite({ site }) {
  const s = site || {};
  const t = s.theme || {};
  const hero = s.hero || {};
  const about = s.sections?.about || {};
  const services = s.sections?.services || {};
  const contact = s.sections?.contact || {};
  const media = s.media || {};

  const css = {
    '--cf-bg': t.background || '#020617',
    '--cf-surface': t.surface || '#0b1220',
    '--cf-text': t.text || '#e2e8f0',
    '--cf-muted': t.muted || '#94a3b8',
    '--cf-primary': t.primary || '#0ea5e9',
    '--cf-accent': t.accent || '#22c55e',
  };

  return (
    <div style={css}>
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
              <div style={{ fontSize: 20, fontWeight: 650 }}>{safeStr(hero.title) || 'Tenant site'}</div>
            </div>
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
            <h1 style={{ marginTop: 8, fontSize: 28, lineHeight: 1.15, fontWeight: 700 }}>{safeStr(hero.subtitle) || ''}</h1>
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--cf-muted)' }}>
              Tenant: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>{safeStr(s.tenant_id) || 'n/a'}</span>
            </div>
          </div>

          <div style={{ borderRadius: 18, border: '1px solid rgba(255,255,255,0.10)', background: 'var(--cf-surface)', padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--cf-muted)' }}>{safeStr(about.title) || 'About'}</div>
            <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, color: 'rgba(226,232,240,0.92)' }}>{safeStr(about.body) || ''}</p>
          </div>
        </section>

        <section style={{ marginTop: 18, borderRadius: 18, border: '1px solid rgba(255,255,255,0.10)', background: 'var(--cf-surface)', padding: 18 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--cf-muted)' }}>{safeStr(services.title) || 'Services'}</div>
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
  return <div>Sovereign Sync Active</div>;
}

export async function getServerSideProps({ req }) {
  const host = normalizeHost(req);
  const prisma = new PrismaClient();
  try {
    if (!host) {
      return { props: { mode: 'core', site: null } };
    }

    // Resolve tenant by DB host mapping first; fallback to null.
    const row = await prisma.tenantHostname.findUnique({
      where: { host },
      select: { tenantId: true, enabled: true },
    });
    const tenantId = row && row.enabled === true ? safeStr(row.tenantId) : '';
    if (!tenantId) {
      return { props: { mode: 'core', site: null } };
    }

    const persona = await prisma.tenantPersona.findUnique({
      where: { tenantId },
      select: { personaJson: true },
    });
    const pj = persona?.personaJson && typeof persona.personaJson === 'object' ? persona.personaJson : {};
    const draft = pj?.website_draft && typeof pj.website_draft === 'object' ? pj.website_draft : null;
    const site = { ...defaultSite({ tenantId, host }), ...(draft || {}) };
    // Ensure contact defaults exist even if draft overwrote them.
    site.sections = site.sections || {};
    site.sections.contact = site.sections.contact || {};
    if (!site.sections.contact.website) {
      site.sections.contact.website = host ? `https://${host}` : null;
    }

    return { props: { mode: 'tenant_site', site } };
  } catch (_) {
    return { props: { mode: 'core', site: null } };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
