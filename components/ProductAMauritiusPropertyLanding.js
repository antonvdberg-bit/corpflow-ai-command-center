import React, { useRef, useState } from 'react';
import Head from 'next/head';

import { trackEvent } from '../lib/analytics/index.js';
import PublicSiteFooter from './PublicSiteFooter.js';
import PublicMarketingPhotoGlassShell from './beauty/PublicMarketingPhotoGlassShell.js';
import GlassPanel from './beauty/GlassPanel.js';
import GlassCardGrid from './beauty/GlassCardGrid.js';
import HeroGlassBlock from './beauty/HeroGlassBlock.js';
import CtaGlassBlock from './beauty/CtaGlassBlock.js';
import { GLASS_TOKENS } from '../lib/ui/glass.js';

// Must match PRODUCT_A_MARKET_MAURITIUS_PROPERTY in lib/server/product-a-intake-payload.js
const MARKET_MAURITIUS_PROPERTY = 'mauritius-property';

// Human-First Beauty Layer hero — governed Mauritius property reception interior
// (shared derivative set with the Lead Rescue property wedge; see
// data/visual-assets/product-a-mauritius-property-hero.manifest.json).
const HERO_BASE = '/assets/visuals/lead-rescue-property-reception-hero-v1';
const HERO_SOURCES = [
  { type: 'image/avif', media: '(max-width: 768px)', srcSet: `${HERO_BASE}-768.avif` },
  { type: 'image/webp', media: '(max-width: 768px)', srcSet: `${HERO_BASE}-768.webp` },
  { media: '(max-width: 768px)', srcSet: `${HERO_BASE}-768.jpg` },
  { type: 'image/avif', srcSet: `${HERO_BASE}.avif` },
  { type: 'image/webp', srcSet: `${HERO_BASE}.webp` },
];
const HERO_PRELOAD_SRCSET = `${HERO_BASE}-768.avif 768w, ${HERO_BASE}.avif 2400w`;

const text = GLASS_TOKENS.text;
const muted = '#cdd9e6';
const faint = '#9fb2c4';

const styles = {
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  brandMark: { fontWeight: 900, fontSize: 22, color: text },
  brandSub: { color: muted, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2 },
  navLink: {
    background: 'rgba(255,255,255,0.10)', color: text, border: '1px solid rgba(255,255,255,0.18)',
    padding: '9px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: 'none',
  },
  h1: { margin: '14px 0 0', fontSize: 'clamp(34px, 5.8vw, 58px)', lineHeight: 1.04, letterSpacing: '-0.04em', maxWidth: 760, color: text },
  lead: { marginTop: 20, fontSize: 'clamp(17px, 1.9vw, 21px)', lineHeight: 1.55, color: muted, maxWidth: 720 },
  section: { marginTop: 28 },
  label: { fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7dd3fc', fontWeight: 800 },
  h2: { margin: '8px 0 0', fontSize: 'clamp(24px, 3vw, 30px)', letterSpacing: '-0.03em', color: text },
  muted: { color: '#bccdde', lineHeight: 1.65 },
  list: { margin: '14px 0 0', paddingLeft: 18, color: '#e0ecf7', lineHeight: 1.8 },
  cta: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, padding: '13px 16px', border: 0, fontWeight: 800, cursor: 'pointer', textDecoration: 'none',
  },
  primary: { background: GLASS_TOKENS.ctaWarm, color: GLASS_TOKENS.ctaWarmText, boxShadow: GLASS_TOKENS.ctaWarmShadow },
  secondary: { background: 'rgba(255,255,255,0.12)', color: text, border: '1px solid rgba(255,255,255,0.20)' },
  input: {
    width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(0,0,0,0.28)', color: text,
  },
  fieldLabel: { fontSize: 13, color: '#dbe7f3', marginBottom: 6, display: 'block' },
  successBox: {
    border: '1px solid rgba(45,212,191,0.35)', borderRadius: 16,
    background: 'rgba(45,212,191,0.12)', padding: 16, color: '#d6f5ef',
  },
  errorBox: {
    border: '1px solid rgba(248,113,113,0.35)', borderRadius: 16,
    background: 'rgba(248,113,113,0.12)', padding: 16, color: '#fecaca',
  },
  wedgeNote: { marginTop: 20, fontSize: 14, color: faint, lineHeight: 1.6, maxWidth: 720 },
  wedgeLink: { color: '#7dd3fc' },
};

const EMPTY_FORM = {
  agency_name: '',
  website: '',
  contact_name: '',
  email: '',
  phone: '',
  city_region: '',
  biggest_problem: '',
};

/**
 * Product A — Mauritius property audit landing (premium tier).
 * POST /api/product-a/intake with market=mauritius-property.
 * Doctrine: docs/marketing/PRODUCT_A_MAURITIUS_PROPERTY_OFFER_V1.md
 */
export default function ProductAMauritiusPropertyLanding() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitState, setSubmitState] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const intakeStartedRef = useRef(false);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (submitState === 'error') {
      setSubmitState('idle');
      setErrorMessage('');
    }
  }

  function handleIntakeStart() {
    if (intakeStartedRef.current) return;
    intakeStartedRef.current = true;
    trackEvent('pa_mu_intake_start');
  }

  async function submitAuditRequest(e) {
    e.preventDefault();
    if (submitState === 'submitting') return;

    setSubmitState('submitting');
    setErrorMessage('');
    trackEvent('pa_mu_intake_submit_attempt');

    const payload = {
      market: MARKET_MAURITIUS_PROPERTY,
      agency_name: form.agency_name.trim(),
      website: form.website.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      city_region: form.city_region.trim(),
      biggest_problem: form.biggest_problem.trim(),
    };

    try {
      const r = await fetch('/api/product-a/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const detail = data?.error || data?.detail || 'Could not submit your audit request.';
        throw new Error(detail);
      }
      trackEvent('pa_mu_intake_submit_success');
      setSubmitState('success');
    } catch (err) {
      trackEvent('pa_mu_intake_submit_error');
      setSubmitState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Could not submit your audit request.');
    }
  }

  const footer = (
    <PublicSiteFooter
      flush
      extra="Product A Website & Lead Rescue audits for Mauritius property operators. Intake only — no card or banking details on this page. Scope and quote follow intake review."
    />
  );

  return (
    <>
      <Head>
        <title>Website &amp; Lead Rescue Audit · Mauritius Property · CorpFlowAI</title>
        <meta
          name="description"
          content="Request a Website & Lead Rescue audit for Mauritius property agencies and rental operators. Website, enquiry capture, and follow-up review — scope quoted after intake."
        />
      </Head>

      <PublicMarketingPhotoGlassShell
        pageClassName="pa-mu-page"
        maxWidth={1120}
        scrimTone="dark"
        footer={footer}
        hero={{
          base: HERO_BASE,
          sources: HERO_SOURCES,
          preloadSrcSet: HERO_PRELOAD_SRCSET,
          objectPosition: 'center 45%',
          alt: '',
        }}
      >
        <nav style={styles.nav}>
          <div>
            <div style={styles.brandMark}>CorpFlowAI</div>
            <div style={styles.brandSub}>Mauritius property edition</div>
          </div>
          <a
            style={styles.navLink}
            href="#intake"
            onClick={() => trackEvent('pa_mu_cta_click', { props: { location: 'nav' } })}
          >
            Request a Website &amp; Lead Rescue Audit
          </a>
        </nav>

        <GlassCardGrid minColWidth={300} gap={24} style={{ marginTop: 44, alignItems: 'start' }}>
          <HeroGlassBlock>
            <div style={styles.label}>Premium tier · Mauritius property</div>
            <h1 style={styles.h1}>Stop losing viewings because property enquiries disappear across channels.</h1>
            <p style={styles.lead}>
              Property24, WhatsApp, Facebook, your website, and walk-ins should feed one accountable follow-up path —
              not five separate inboxes. Request a Website &amp; Lead Rescue audit and we will review your site,
              enquiry capture, and where viewings slip before you rebuild anything blindly.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
              <a
                style={{ ...styles.cta, ...styles.primary }}
                href="#intake"
                onClick={() => trackEvent('pa_mu_cta_click', { props: { location: 'hero' } })}
              >
                Request a Website &amp; Lead Rescue Audit
              </a>
              <a
                style={{ ...styles.cta, ...styles.secondary }}
                href="#audit-covers"
                onClick={() => trackEvent('pa_mu_cta_click', { props: { location: 'hero_secondary' } })}
              >
                See what the audit covers
              </a>
            </div>
            <p style={styles.wedgeNote}>
              Already have a workable website and only need follow-up visibility?{' '}
              <a href="/lead-rescue/property-mauritius" style={styles.wedgeLink}>
                Start with the USD 150 Lead Rescue pilot
              </a>{' '}
              instead — a lighter entry path for enquiry logging and daily summaries.
            </p>
          </HeroGlassBlock>

          <GlassPanel variant={{ elevation: 1 }}>
            <div style={styles.label}>What you get</div>
            <h2 style={{ ...styles.h2, fontSize: 24 }}>A practical audit — not a software pitch.</h2>
            <ul style={styles.list}>
              <li>Website and listing-enquiry path review</li>
              <li>Where viewings and rental enquiries are lost today</li>
              <li>Lead Rescue workflow recommendations for property teams</li>
              <li>Clear next steps — scope and quote after intake review</li>
            </ul>
          </GlassPanel>
        </GlassCardGrid>

        <section id="audit-covers" style={styles.section}>
          <GlassPanel>
            <div style={styles.label}>Audit scope</div>
            <h2 style={styles.h2}>What the audit covers</h2>
            <ul style={styles.list}>
              <li>Public website and listing enquiry capture (forms, WhatsApp links, portal hand-offs)</li>
              <li>Follow-up visibility — who sees new viewing requests and when</li>
              <li>Multi-channel friction — Property24, Facebook, email, and WhatsApp in one operating view</li>
              <li>Lightweight fixes before any rebuild or migration</li>
            </ul>
            <p style={{ ...styles.muted, fontSize: 13, marginTop: 16 }}>
              We do not guarantee new sales or lead volume. We help make sure existing property enquiries are captured, visible, and followed up.
            </p>
            <p style={{ ...styles.muted, fontSize: 13, marginTop: 8 }}>
              No payment on this page. After we review your intake, we follow up by email with scope and the agreed manual pro-forma route.
            </p>
          </GlassPanel>
        </section>

        <section id="intake" style={styles.section}>
          <CtaGlassBlock style={{ maxWidth: 760 }}>
            <div style={styles.label}>Request audit</div>
            <h2 style={styles.h2}>Request a Website &amp; Lead Rescue Audit</h2>
            <p style={styles.muted}>
              Tell us about your agency or property operation. We review every request within 2 business days and follow up by email.
            </p>

            {submitState === 'success' ? (
              <div style={{ ...styles.successBox, marginTop: 16 }} role="status">
                <strong>Thank you — your audit request was received.</strong>
                <p style={{ margin: '8px 0 0', lineHeight: 1.6 }}>
                  We will review your details within 2 business days and contact you at the email you provided.
                </p>
              </div>
            ) : (
              <form
                onSubmit={submitAuditRequest}
                onFocusCapture={handleIntakeStart}
                style={{ display: 'grid', gap: 12, marginTop: 16 }}
                noValidate
              >
                {submitState === 'error' && errorMessage ? (
                  <div style={styles.errorBox} role="alert">
                    {errorMessage}
                  </div>
                ) : null}

                <label>
                  <span style={styles.fieldLabel}>Agency or business name *</span>
                  <input
                    required
                    name="agency_name"
                    value={form.agency_name}
                    onChange={(e) => updateField('agency_name', e.target.value)}
                    placeholder="Your agency or property business name"
                    style={styles.input}
                    disabled={submitState === 'submitting'}
                  />
                </label>

                <label>
                  <span style={styles.fieldLabel}>Website *</span>
                  <input
                    required
                    name="website"
                    type="url"
                    value={form.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="https://youragency.mu"
                    style={styles.input}
                    disabled={submitState === 'submitting'}
                  />
                </label>

                <label>
                  <span style={styles.fieldLabel}>Contact name *</span>
                  <input
                    required
                    name="contact_name"
                    value={form.contact_name}
                    onChange={(e) => updateField('contact_name', e.target.value)}
                    placeholder="Owner, director, or operations lead"
                    style={styles.input}
                    disabled={submitState === 'submitting'}
                  />
                </label>

                <label>
                  <span style={styles.fieldLabel}>Email *</span>
                  <input
                    required
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="you@youragency.mu"
                    style={styles.input}
                    disabled={submitState === 'submitting'}
                  />
                </label>

                <label>
                  <span style={styles.fieldLabel}>Phone / WhatsApp (optional)</span>
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+230 …"
                    style={styles.input}
                    disabled={submitState === 'submitting'}
                  />
                </label>

                <label>
                  <span style={styles.fieldLabel}>City or region *</span>
                  <input
                    required
                    name="city_region"
                    value={form.city_region}
                    onChange={(e) => updateField('city_region', e.target.value)}
                    placeholder="e.g. Grand Baie, North"
                    style={styles.input}
                    disabled={submitState === 'submitting'}
                  />
                </label>

                <label>
                  <span style={styles.fieldLabel}>Biggest enquiry or follow-up problem *</span>
                  <textarea
                    required
                    name="biggest_problem"
                    rows={4}
                    value={form.biggest_problem}
                    onChange={(e) => updateField('biggest_problem', e.target.value)}
                    placeholder="e.g. Property24 leads sit in email while WhatsApp viewings get answered first — we lose track of who replied."
                    style={styles.input}
                    disabled={submitState === 'submitting'}
                  />
                </label>

                <button
                  type="submit"
                  style={{ ...styles.cta, ...styles.primary, opacity: submitState === 'submitting' ? 0.7 : 1 }}
                  disabled={submitState === 'submitting'}
                >
                  {submitState === 'submitting' ? 'Submitting…' : 'Request a Website & Lead Rescue Audit'}
                </button>
              </form>
            )}

            <p style={{ ...styles.muted, fontSize: 12, marginTop: 12 }}>
              No payment on this page. Your email is used only to schedule and follow up on the audit request.
            </p>
          </CtaGlassBlock>
        </section>
      </PublicMarketingPhotoGlassShell>

      <style jsx global>{`
        @media (prefers-reduced-motion: no-preference) {
          .pa-mu-page .pa-mu-cta-primary {
            transition: transform 220ms ease, box-shadow 220ms ease, filter 220ms ease;
          }
          .pa-mu-page .pa-mu-cta-primary:hover {
            transform: translateY(-1px);
            filter: brightness(1.03);
            box-shadow: 0 16px 38px rgba(150, 100, 28, 0.5);
          }
        }
      `}</style>
    </>
  );
}
