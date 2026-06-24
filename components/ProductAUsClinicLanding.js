import React, { useRef, useState } from 'react';
import Head from 'next/head';

import { trackEvent } from '../lib/analytics/index.js';
import PublicSiteFooter from './PublicSiteFooter.js';
import PhotoBackground from './beauty/PhotoBackground.js';
import Scrim from './beauty/Scrim.js';
import GlassPanel from './beauty/GlassPanel.js';
import GlassCardGrid from './beauty/GlassCardGrid.js';
import HeroGlassBlock from './beauty/HeroGlassBlock.js';
import CtaGlassBlock from './beauty/CtaGlassBlock.js';
import { GLASS_GLOBAL_CSS } from '../lib/ui/glass.js';

// Human-First Beauty Layer hero. Temporary governed placeholder asset; see
// data/visual-assets/product-a-hero-clinic.manifest.json for the replacement note.
const HERO_IMAGE = '/assets/product-a/hero-clinic-placeholder.svg';

const PAGE_CSS =
  GLASS_GLOBAL_CSS +
  '.pa-page a:focus-visible,.pa-page button:focus-visible,.pa-page input:focus-visible,.pa-page textarea:focus-visible{outline:2px solid #2dd4bf;outline-offset:2px;border-radius:8px;}';

const styles = {
  page: {
    position: 'relative',
    minHeight: '100vh',
    overflowX: 'hidden',
    background: '#06111f',
    color: '#eef6ff',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  shell: { position: 'relative', zIndex: 1, maxWidth: 1120, margin: '0 auto', padding: '42px 20px 56px' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 999,
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.08)',
    color: '#dceaf7',
    fontSize: 13,
  },
  h1: { margin: 0, fontSize: 'clamp(34px, 6vw, 64px)', lineHeight: 1.02, letterSpacing: '-0.045em', maxWidth: 760 },
  lead: { marginTop: 20, fontSize: 'clamp(17px, 2vw, 21px)', lineHeight: 1.55, color: '#dbe7f3', maxWidth: 720 },
  section: { marginTop: 28 },
  label: { fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7dd3fc', fontWeight: 800 },
  h2: { margin: '8px 0 0', fontSize: 28, letterSpacing: '-0.03em' },
  muted: { color: '#bccdde', lineHeight: 1.65 },
  list: { margin: '14px 0 0', paddingLeft: 18, color: '#e0ecf7', lineHeight: 1.8 },
  cta: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: '13px 16px',
    border: 0,
    fontWeight: 800,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  primary: { background: '#2dd4bf', color: '#031018' },
  secondary: { background: 'rgba(255,255,255,0.12)', color: '#eef6ff', border: '1px solid rgba(255,255,255,0.20)' },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 12px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.16)',
    background: 'rgba(0,0,0,0.28)',
    color: '#eef6ff',
  },
  fieldLabel: { fontSize: 13, color: '#dbe7f3', marginBottom: 6, display: 'block' },
  successBox: {
    border: '1px solid rgba(45,212,191,0.35)',
    borderRadius: 16,
    background: 'rgba(45,212,191,0.12)',
    padding: 16,
    color: '#d6f5ef',
  },
  errorBox: {
    border: '1px solid rgba(248,113,113,0.35)',
    borderRadius: 16,
    background: 'rgba(248,113,113,0.12)',
    padding: 16,
    color: '#fecaca',
  },
};

const EMPTY_FORM = {
  clinic_name: '',
  website: '',
  contact_name: '',
  email: '',
  phone: '',
  city_state: '',
  biggest_problem: '',
};

/**
 * Product A — US medspa / aesthetic / elective clinic audit landing.
 * POST /api/product-a/intake — see docs/product/PRODUCT_A_INTAKE_WEBHOOK.md
 * Visual: Human-First Beauty Layer — docs/product/PRODUCT_A_BEAUTY_LAYER_IMPLEMENTATION_PACKET_V1.md
 */
export default function ProductAUsClinicLanding() {
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

  // Additive marketing measurement only — does not touch the intake/automation
  // event contract. Fires once when the visitor first engages the intake form.
  function handleIntakeStart() {
    if (intakeStartedRef.current) return;
    intakeStartedRef.current = true;
    trackEvent('pa_intake_start');
  }

  async function submitAuditRequest(e) {
    e.preventDefault();
    if (submitState === 'submitting') return;

    setSubmitState('submitting');
    setErrorMessage('');
    trackEvent('pa_intake_submit_attempt');

    const payload = {
      clinic_name: form.clinic_name.trim(),
      website: form.website.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      city_state: form.city_state.trim(),
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
      trackEvent('pa_intake_submit_success');
      setSubmitState('success');
    } catch (err) {
      trackEvent('pa_intake_submit_error');
      setSubmitState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Could not submit your audit request.');
    }
  }

  return (
    <div className="pa-page" style={styles.page}>
      <Head>
        <title>Website &amp; Lead Rescue Audit · US Medspas · CorpFlowAI</title>
        <meta
          name="description"
          content="Request a Website & Lead Rescue audit for US medspas, aesthetic clinics, and elective clinics. Enquiry capture review without forcing a CRM migration."
        />
        <link rel="preload" as="image" href={HERO_IMAGE} />
        <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      </Head>

      <PhotoBackground fixed priority fallbackSrc={HERO_IMAGE} alt="" />
      <Scrim fixed tone="dark" />

      <main style={styles.shell}>
        <nav style={styles.nav}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>CorpFlowAI</div>
            <div style={{ color: '#cdd9e6', fontSize: 13 }}>Website &amp; Lead Rescue · US clinics</div>
          </div>
          <a
            style={{ ...styles.cta, ...styles.secondary }}
            href="#intake"
            onClick={() => trackEvent('pa_cta_click', { props: { location: 'nav' } })}
          >
            Request a Website &amp; Lead Rescue Audit
          </a>
        </nav>

        <GlassCardGrid minColWidth={300} gap={24} style={{ marginTop: 44, alignItems: 'start' }}>
          <HeroGlassBlock
            eyebrow={<span style={styles.badge}>US medspas · aesthetic clinics · elective clinics</span>}
            title={
              <h1 style={{ ...styles.h1, marginTop: 16 }}>Stop losing bookings because enquiries disappear.</h1>
            }
            lead={
              <p style={styles.lead}>
                Your website, contact forms, and follow-up should work together — not against each other.
                Request a Website &amp; Lead Rescue audit and we will review how enquiries are captured,
                where they go, and what breaks before a patient books.
              </p>
            }
            actions={
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
                <a
                  style={{ ...styles.cta, ...styles.primary }}
                  href="#intake"
                  onClick={() => trackEvent('pa_cta_click', { props: { location: 'hero' } })}
                >
                  Request a Website &amp; Lead Rescue Audit
                </a>
                <a
                  style={{ ...styles.cta, ...styles.secondary }}
                  href="#audit-covers"
                  onClick={() => trackEvent('pa_cta_click', { props: { location: 'hero_secondary' } })}
                >
                  See what the audit covers
                </a>
              </div>
            }
          />

          <GlassPanel>
            <div style={styles.label}>What you get</div>
            <h2 style={{ ...styles.h2, fontSize: 24 }}>A practical audit — not a software pitch.</h2>
            <ul style={styles.list}>
              <li>Website and enquiry-path review</li>
              <li>Where leads are lost today (forms, email, booking tools)</li>
              <li>Lead Rescue workflow recommendations</li>
              <li>Clear next steps — no CRM migration required to start</li>
            </ul>
          </GlassPanel>
        </GlassCardGrid>

        <section id="audit-covers" style={styles.section}>
          <GlassPanel>
            <div style={styles.label}>Audit scope</div>
            <h2 style={styles.h2}>What the audit covers</h2>
            <ul style={styles.list}>
              <li>Public website enquiry capture (forms, click-to-call, chat widgets if present)</li>
              <li>Follow-up visibility — who sees new enquiries and when</li>
              <li>Booking friction — where patients drop off before an appointment</li>
              <li>Lightweight fixes before any rebuild or migration</li>
            </ul>
            <p style={{ ...styles.muted, fontSize: 13, marginTop: 16 }}>
              We do not guarantee new revenue. We help make sure existing enquiries are captured, visible, and followed up.
            </p>
          </GlassPanel>
        </section>

        <section id="intake" style={styles.section}>
          <CtaGlassBlock style={{ maxWidth: 760 }}>
            <div style={styles.label}>Request audit</div>
            <h2 style={styles.h2}>Request a Website &amp; Lead Rescue Audit</h2>
            <p style={styles.muted}>
              Tell us about your clinic. We review every request within 2 business days and follow up by email.
            </p>

            {submitState === 'success' ? (
              <div style={{ ...styles.successBox, marginTop: 16 }} role="status">
                <strong>Thank you — your audit request was received.</strong>
                <p style={{ margin: '8px 0 0', lineHeight: 1.6 }}>
                  We will review your clinic details within 2 business days and contact you at the email you provided.
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
                  <span style={styles.fieldLabel}>Clinic name *</span>
                  <input
                    required
                    name="clinic_name"
                    value={form.clinic_name}
                    onChange={(e) => updateField('clinic_name', e.target.value)}
                    placeholder="Your clinic or medspa name"
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
                    placeholder="https://yourclinic.com"
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
                    placeholder="Owner, manager, or marketing lead"
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
                    placeholder="you@yourclinic.com"
                    style={styles.input}
                    disabled={submitState === 'submitting'}
                  />
                </label>

                <label>
                  <span style={styles.fieldLabel}>Phone (optional)</span>
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="US number — optional"
                    style={styles.input}
                    disabled={submitState === 'submitting'}
                  />
                </label>

                <label>
                  <span style={styles.fieldLabel}>City / state *</span>
                  <input
                    required
                    name="city_state"
                    value={form.city_state}
                    onChange={(e) => updateField('city_state', e.target.value)}
                    placeholder="e.g. Austin, TX"
                    style={styles.input}
                    disabled={submitState === 'submitting'}
                  />
                </label>

                <label>
                  <span style={styles.fieldLabel}>Biggest enquiry or booking problem *</span>
                  <textarea
                    required
                    name="biggest_problem"
                    rows={4}
                    value={form.biggest_problem}
                    onChange={(e) => updateField('biggest_problem', e.target.value)}
                    placeholder="e.g. Website form submissions go to an inbox nobody checks; weekend enquiries wait until Monday."
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

        <PublicSiteFooter extra="Product A Website & Lead Rescue audits for US medspas and aesthetic clinics. Intake only — no card or banking details on this page." />
      </main>
    </div>
  );
}
