import React, { useMemo, useState } from 'react';
import Head from 'next/head';

import {
  CIPCDESK_CLIENT_ROUTES,
  CIPCDESK_CONTACT_EMAIL,
  CIPCDESK_LEGAL_DISCLAIMER,
  CIPCDESK_SERVICE_CATALOGUE,
  buildCipcDeskMailtoHref,
} from '../lib/server/cipc-desk-catalogue.js';

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

const COLORS = {
  ink: '#12201f',
  deep: '#0b2e2c',
  moss: '#1f5c56',
  sand: '#f3ebe0',
  paper: '#fffaf3',
  accent: '#c45c26',
  accentText: '#fffaf3',
  muted: '#4a5c59',
  line: 'rgba(18, 32, 31, 0.14)',
};

const fonts = {
  brand: '"Fraunces", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
  body: '"Source Sans 3", "Source Sans Pro", "Segoe UI", sans-serif',
};

/**
 * Dedicated CIPC Desk corpflow_test landing.
 * Brand-first, email-first CTAs, SME vs professional-partner routes, provisional catalogue.
 * Not CIPC, not a law firm — conservative wording for Serah validation.
 */
export default function CipcDeskLanding({ site }) {
  const s = site && typeof site === 'object' ? site : {};
  const contactEmail = safeStr(s?.sections?.contact?.email) || CIPCDESK_CONTACT_EMAIL;
  const pageTitle = safeStr(s?.meta?.page_title) || 'CIPC Desk · CorpFlow test desk';

  const [route, setRoute] = useState('direct_sme');
  const [serviceSlug, setServiceSlug] = useState(CIPCDESK_SERVICE_CATALOGUE[0]?.slug || '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const mailtoPrimary = useMemo(() => buildCipcDeskMailtoHref(route, serviceSlug), [route, serviceSlug]);

  async function submitEnquiry(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        intent: message.trim(),
        message: message.trim(),
        meta: {
          product: 'cipc-desk',
          client_route: route,
          service_slug: serviceSlug,
          host: safeStr(s.host) || null,
          page: '/',
          communication_model: 'email-first',
          fictional_data_only: true,
        },
      };
      const r = await fetch('/api/tenant/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'intake_failed');
      setStatus(
        'Enquiry captured on the test desk. Serah / operators will review in /change. Prefer email for the first reply path — no live automated send from this form.',
      );
      setMessage('');
    } catch {
      setError('Could not submit on this host. Email your matter instead — that path always works for the email-first desk.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', color: COLORS.ink, fontFamily: fonts.body, background: COLORS.sand }}>
      <Head>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content="CIPC Desk — South African CIPC administration handled remotely. CorpFlowAI test desk. Provisional catalogue pending Serah validation."
        />
        <meta name="robots" content="noindex,nofollow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Source+Sans+3:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        style={{
          position: 'relative',
          minHeight: '100vh',
          overflow: 'hidden',
          background:
            'radial-gradient(1200px 700px at 12% 8%, rgba(31,92,86,0.28), transparent 55%), ' +
            'radial-gradient(900px 600px at 88% 18%, rgba(196,92,38,0.16), transparent 50%), ' +
            `linear-gradient(165deg, ${COLORS.deep} 0%, #163f3c 42%, #2a4f45 72%, ${COLORS.sand} 72%)`,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,250,243,0.035) 0 1px, transparent 1px 28px), ' +
              'repeating-linear-gradient(90deg, rgba(255,250,243,0.025) 0 1px, transparent 1px 28px)',
            pointerEvents: 'none',
          }}
        />

        <main style={{ position: 'relative', maxWidth: 1080, margin: '0 auto', padding: '28px 20px 64px' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div
                style={{
                  fontFamily: fonts.brand,
                  fontSize: 'clamp(2rem, 5vw, 3.1rem)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.03em',
                  color: COLORS.paper,
                  fontWeight: 700,
                }}
              >
                CIPC Desk
              </div>
              <div style={{ marginTop: 6, color: 'rgba(255,250,243,0.78)', fontSize: 14, fontWeight: 600 }}>
                CorpFlowAI test desk · email-first · fictional data only
              </div>
            </div>
            <a
              href={mailtoPrimary}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 16px',
                borderRadius: 4,
                background: COLORS.accent,
                color: COLORS.accentText,
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 15,
              }}
            >
              Email your matter
            </a>
          </header>

          <section style={{ marginTop: 'clamp(36px, 8vh, 72px)', maxWidth: 720 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: fonts.brand,
                fontSize: 'clamp(1.85rem, 4.2vw, 2.75rem)',
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
                color: COLORS.paper,
                fontWeight: 650,
              }}
            >
              South African CIPC administration — handled remotely
            </h1>
            <p style={{ margin: '16px 0 0', fontSize: 'clamp(1.05rem, 2vw, 1.2rem)', lineHeight: 1.55, color: 'rgba(255,250,243,0.88)', maxWidth: 640 }}>
              One operating desk for direct SME matters and professional-partner referrals. You email; Serah reviews; progress is tracked in CorpFlow.
            </p>
            <div style={{ marginTop: 22, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a
                href="#for-sme"
                onClick={() => setRoute('direct_sme')}
                style={{
                  display: 'inline-flex',
                  padding: '12px 16px',
                  borderRadius: 4,
                  background: COLORS.paper,
                  color: COLORS.deep,
                  fontWeight: 700,
                  textDecoration: 'none',
                  fontSize: 15,
                }}
              >
                I am a business owner
              </a>
              <a
                href="#for-partners"
                onClick={() => setRoute('professional_partner')}
                style={{
                  display: 'inline-flex',
                  padding: '12px 16px',
                  borderRadius: 4,
                  border: '1px solid rgba(255,250,243,0.45)',
                  background: 'rgba(255,250,243,0.08)',
                  color: COLORS.paper,
                  fontWeight: 700,
                  textDecoration: 'none',
                  fontSize: 15,
                }}
              >
                I am an accountant / practitioner
              </a>
            </div>
          </section>

          <section
            id="routes"
            style={{
              marginTop: 56,
              background: COLORS.paper,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 6,
              padding: '28px 22px',
              boxShadow: '0 18px 40px rgba(11, 46, 44, 0.12)',
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: COLORS.moss, fontWeight: 700 }}>
              Choose your path
            </div>
            <h2 style={{ margin: '8px 0 0', fontFamily: fonts.brand, fontSize: '1.55rem', color: COLORS.ink }}>
              Same desk. Two entry routes.
            </h2>
            <p style={{ margin: '10px 0 0', color: COLORS.muted, lineHeight: 1.55, maxWidth: 640 }}>
              Both routes share the service catalogue, checklist, and email-first workflow. `/change` remains the operator control plane.
            </p>
            <div
              style={{
                marginTop: 20,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 14,
              }}
            >
              <div id="for-sme" style={{ padding: '18px 16px', border: `1px solid ${COLORS.line}`, borderRadius: 4, background: COLORS.sand }}>
                <div style={{ fontFamily: fonts.brand, fontSize: '1.2rem', fontWeight: 700 }}>{CIPCDESK_CLIENT_ROUTES.direct_sme.label}</div>
                <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: COLORS.moss }}>{CIPCDESK_CLIENT_ROUTES.direct_sme.short}</div>
                <p style={{ margin: '10px 0 0', color: COLORS.muted, lineHeight: 1.5, fontSize: 15 }}>
                  {CIPCDESK_CLIENT_ROUTES.direct_sme.description}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRoute('direct_sme');
                    document.getElementById('enquiry')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  style={{
                    marginTop: 14,
                    padding: '10px 12px',
                    borderRadius: 4,
                    border: 0,
                    background: COLORS.deep,
                    color: COLORS.paper,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Start SME enquiry
                </button>
              </div>
              <div id="for-partners" style={{ padding: '18px 16px', border: `1px solid ${COLORS.line}`, borderRadius: 4, background: COLORS.sand }}>
                <div style={{ fontFamily: fonts.brand, fontSize: '1.2rem', fontWeight: 700 }}>
                  {CIPCDESK_CLIENT_ROUTES.professional_partner.label}
                </div>
                <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: COLORS.moss }}>
                  {CIPCDESK_CLIENT_ROUTES.professional_partner.short}
                </div>
                <p style={{ margin: '10px 0 0', color: COLORS.muted, lineHeight: 1.5, fontSize: 15 }}>
                  {CIPCDESK_CLIENT_ROUTES.professional_partner.description}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRoute('professional_partner');
                    document.getElementById('enquiry')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  style={{
                    marginTop: 14,
                    padding: '10px 12px',
                    borderRadius: 4,
                    border: 0,
                    background: COLORS.deep,
                    color: COLORS.paper,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Start partner enquiry
                </button>
              </div>
            </div>
          </section>

          <section
            id="catalogue"
            style={{
              marginTop: 22,
              background: COLORS.paper,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 6,
              padding: '28px 22px',
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: COLORS.moss, fontWeight: 700 }}>
              Service catalogue
            </div>
            <h2 style={{ margin: '8px 0 0', fontFamily: fonts.brand, fontSize: '1.55rem', color: COLORS.ink }}>
              Provisional first catalogue
            </h2>
            <p style={{ margin: '10px 0 0', color: COLORS.muted, lineHeight: 1.55, maxWidth: 680 }}>
              Concise list for the corpflow_test slice. Details below are provisional until Serah validates scope, documents, and exclusions.
            </p>
            <ul style={{ margin: '18px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
              {CIPCDESK_SERVICE_CATALOGUE.map((it) => (
                <li
                  key={it.slug}
                  style={{
                    padding: '14px 14px',
                    borderTop: `1px solid ${COLORS.line}`,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{it.name}</div>
                  <div style={{ marginTop: 6, color: COLORS.muted, lineHeight: 1.5, fontSize: 15 }}>{it.detail}</div>
                </li>
              ))}
            </ul>
          </section>

          <section
            id="enquiry"
            style={{
              marginTop: 22,
              background: COLORS.paper,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 6,
              padding: '28px 22px',
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: COLORS.moss, fontWeight: 700 }}>
              Enquiry
            </div>
            <h2 style={{ margin: '8px 0 0', fontFamily: fonts.brand, fontSize: '1.55rem', color: COLORS.ink }}>
              Capture a matter (test data only)
            </h2>
            <p style={{ margin: '10px 0 0', color: COLORS.muted, lineHeight: 1.55, maxWidth: 680 }}>
              Preferred client path is email to <strong style={{ color: COLORS.ink }}>{contactEmail}</strong>. This form also records an enquiry on the
              tenant for operator review. No automated client email is sent from here.
            </p>

            <form onSubmit={submitEnquiry} style={{ marginTop: 18, display: 'grid', gap: 12, maxWidth: 560 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 14, fontWeight: 600 }}>
                Client route
                <select
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  style={fieldStyle}
                >
                  <option value="direct_sme">{CIPCDESK_CLIENT_ROUTES.direct_sme.label}</option>
                  <option value="professional_partner">{CIPCDESK_CLIENT_ROUTES.professional_partner.label}</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 14, fontWeight: 600 }}>
                Service
                <select value={serviceSlug} onChange={(e) => setServiceSlug(e.target.value)} style={fieldStyle}>
                  {CIPCDESK_SERVICE_CATALOGUE.map((it) => (
                    <option key={it.slug} value={it.slug}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 14, fontWeight: 600 }}>
                Your name
                <input value={name} onChange={(e) => setName(e.target.value)} name="name" style={fieldStyle} placeholder="Name" />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 14, fontWeight: 600 }}>
                Email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  name="email"
                  style={fieldStyle}
                  placeholder="you@example.com"
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 14, fontWeight: 600 }}>
                Matter summary
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  name="message"
                  rows={5}
                  style={{ ...fieldStyle, resize: 'vertical', minHeight: 120 }}
                  placeholder="What needs to be done? Use fictional company identifiers only."
                />
              </label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 4,
                    border: 0,
                    background: busy ? '#8aa19d' : COLORS.accent,
                    color: COLORS.accentText,
                    fontWeight: 700,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    fontSize: 15,
                  }}
                >
                  {busy ? 'Submitting…' : 'Submit enquiry'}
                </button>
                <a href={mailtoPrimary} style={{ color: COLORS.moss, fontWeight: 700, fontSize: 15 }}>
                  Or open email draft
                </a>
              </div>
              {status ? <div style={{ fontSize: 14, color: COLORS.moss, lineHeight: 1.5 }}>{status}</div> : null}
              {error ? <div style={{ fontSize: 14, color: '#9b2c2c', lineHeight: 1.5 }}>{error}</div> : null}
            </form>
          </section>

          <section
            style={{
              marginTop: 22,
              background: COLORS.deep,
              color: COLORS.paper,
              borderRadius: 6,
              padding: '24px 22px',
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,250,243,0.7)', fontWeight: 700 }}>
              How it works
            </div>
            <ol style={{ margin: '12px 0 0', paddingLeft: 20, lineHeight: 1.7, color: 'rgba(255,250,243,0.9)' }}>
              <li>You email (or submit) a matter with the route and service.</li>
              <li>Serah reviews scope in `/change` and updates the checklist.</li>
              <li>A client reply draft is prepared for approval — not auto-sent.</li>
              <li>You receive a guided decisions / status link when ready.</li>
            </ol>
          </section>

          <footer style={{ marginTop: 28, color: COLORS.muted, fontSize: 13, lineHeight: 1.55, maxWidth: 820 }}>
            <p style={{ margin: 0 }}>{CIPCDESK_LEGAL_DISCLAIMER}</p>
            <p style={{ margin: '10px 0 0' }}>
              Operator surface: <a href="/change" style={{ color: COLORS.moss, fontWeight: 700 }}>/change</a> · Contact:{' '}
              <a href={`mailto:${contactEmail}`} style={{ color: COLORS.moss, fontWeight: 700 }}>
                {contactEmail}
              </a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  borderRadius: 4,
  border: `1px solid ${COLORS.line}`,
  background: '#fff',
  color: COLORS.ink,
  fontFamily: 'inherit',
  fontSize: 15,
};
