import React, { useState } from 'react';
import Head from 'next/head';

import PublicMarketingPhotoGlassShell from './beauty/PublicMarketingPhotoGlassShell.js';
import HeroGlassBlock from './beauty/HeroGlassBlock.js';
import GlassPanel from './beauty/GlassPanel.js';
import GlassCardGrid from './beauty/GlassCardGrid.js';
import {
  buildPublicVisualHero,
  CORPFLOW_PUBLIC_HERO_SCRIM_DESKTOP,
} from '../lib/public/corpflow-public-visuals.js';
import {
  buildCipcDeskDirectSmeFunnelContent,
  buildDirectSmeEnquiryEmail,
  buildDirectSmeProofConfirmation,
  CIPC_DESK_DIRECT_SME_PROOF_FIXTURE,
  CIPC_DESK_DIRECT_SME_PROOF_REFERENCE,
  CIPC_DESK_DIRECT_SME_RESPONSE_CHANNELS,
  CIPC_DESK_DIRECT_SME_SERVICE_OPTIONS,
} from '../lib/cipc-desk/direct-sme-funnel.js';
import {
  CF,
  cfBody,
  cfBtnPrimary,
  cfBtnSecondary,
  cfH2,
  cfKicker,
  cfLead,
  cfSection,
} from './public/corpflow-public-styles.js';

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  marginTop: 8,
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(3,15,34,0.55)',
  color: CF.text,
  fontSize: 16,
  lineHeight: 1.5,
  fontFamily: 'inherit',
};

const labelStyle = {
  display: 'block',
  marginTop: 16,
  fontSize: 13.5,
  fontWeight: 650,
  color: CF.text,
};

const emptyForm = {
  company: '',
  contact_name: '',
  email: '',
  phone: '',
  need: '',
  services: /** @type {string[]} */ ([]),
  preferred_channel: 'email',
};

/**
 * Buyer-facing direct-SME funnel for company owners / directors.
 * Live path posts to existing POST /api/cipc-desk/email-intake.
 * Acceptance uses ?proof=1 local fixtures — no record, send, payment, or filing.
 *
 * @param {{ content?: Record<string, unknown> | null, proofMode?: boolean }} props
 */
export default function CipcDeskDirectSmeFunnel({ content, proofMode = false }) {
  const c =
    content && typeof content === 'object' ? content : buildCipcDeskDirectSmeFunnelContent();
  const meta = c.meta && typeof c.meta === 'object' ? c.meta : {};
  const nav = c.nav && typeof c.nav === 'object' ? c.nav : {};
  const hero = c.hero && typeof c.hero === 'object' ? c.hero : {};
  const audience = c.audience && typeof c.audience === 'object' ? c.audience : {};
  const problem = c.problem && typeof c.problem === 'object' ? c.problem : {};
  const offer = c.offer && typeof c.offer === 'object' ? c.offer : {};
  const proof = c.proof && typeof c.proof === 'object' ? c.proof : {};
  const services = c.services && typeof c.services === 'object' ? c.services : {};
  const limitations = c.limitations && typeof c.limitations === 'object' ? c.limitations : {};
  const how = c.how_it_works && typeof c.how_it_works === 'object' ? c.how_it_works : {};
  const trust = c.trust && typeof c.trust === 'object' ? c.trust : {};
  const faqs = c.faqs && typeof c.faqs === 'object' ? c.faqs : {};
  const formCopy = c.form && typeof c.form === 'object' ? c.form : {};
  const footer = c.footer && typeof c.footer === 'object' ? c.footer : {};
  const fieldLabels = formCopy.fields && typeof formCopy.fields === 'object' ? formCopy.fields : {};

  const pageTitle =
    safeStr(meta.page_title) || 'Company-secretarial help for your CIPC filings';
  const description =
    safeStr(meta.description) ||
    'Independent company-secretarial support for South African business owners.';
  const primaryCta = hero.primary_cta && typeof hero.primary_cta === 'object' ? hero.primary_cta : {};
  const secondaryCta =
    hero.secondary_cta && typeof hero.secondary_cta === 'object' ? hero.secondary_cta : {};

  const visualHero = buildPublicVisualHero('process') || buildPublicVisualHero('services');

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [enquiryReference, setEnquiryReference] = useState('');
  const [proofConfirmed, setProofConfirmed] = useState(false);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  }

  function toggleService(key) {
    setForm((prev) => {
      const next = prev.services.includes(key)
        ? prev.services.filter((x) => x !== key)
        : [...prev.services, key];
      return { ...prev, services: next };
    });
    setError('');
  }

  function selectServiceAndEnquire(key) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(key) ? prev.services : [...prev.services, key],
    }));
    setError('');
  }

  function loadProofFixture() {
    setForm({
      company: CIPC_DESK_DIRECT_SME_PROOF_FIXTURE.company,
      contact_name: CIPC_DESK_DIRECT_SME_PROOF_FIXTURE.contact_name,
      email: CIPC_DESK_DIRECT_SME_PROOF_FIXTURE.email,
      phone: CIPC_DESK_DIRECT_SME_PROOF_FIXTURE.phone,
      need: CIPC_DESK_DIRECT_SME_PROOF_FIXTURE.need,
      services: [...CIPC_DESK_DIRECT_SME_PROOF_FIXTURE.services],
      preferred_channel: CIPC_DESK_DIRECT_SME_PROOF_FIXTURE.preferred_channel,
    });
    setError('');
    setSubmitted(false);
    setProofConfirmed(false);
    setEnquiryReference('');
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitted(false);
    setProofConfirmed(false);
    setEnquiryReference('');

    const built = buildDirectSmeEnquiryEmail(form);
    if (!built.ok) {
      setError(built.error);
      return;
    }

    if (proofMode) {
      const proofResult = buildDirectSmeProofConfirmation(built);
      setEnquiryReference(proofResult.reference || CIPC_DESK_DIRECT_SME_PROOF_REFERENCE);
      setProofConfirmed(true);
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/cipc-desk/email-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email_text: built.email_text,
          client_path: '/company',
          source: 'direct_sme_web',
          sender_email: form.email,
          company: form.company,
          contact_name: form.contact_name,
          phone: form.phone,
          need: form.need,
          preferred_channel: form.preferred_channel,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(
          'We could not record the enquiry just now. Please try again in a moment, or email the same details to the desk.',
        );
        return;
      }
      setEnquiryReference(String(json?.public_reference || json?.confirmation?.reference || ''));
      setSubmitted(true);
      setForm(emptyForm);
    } catch {
      setError(
        'We could not record the enquiry just now. Please try again in a moment, or email the same details to the desk.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const proofItems = Array.isArray(proof.items) ? proof.items : [];
  const serviceItems = Array.isArray(services.items) ? services.items : [];
  const limitationItems = Array.isArray(limitations.items) ? limitations.items : [];
  const steps = Array.isArray(how.steps) ? how.steps : [];
  const trustItems = Array.isArray(trust.items) ? trust.items : [];
  const faqItems = Array.isArray(faqs.items) ? faqs.items : [];

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="noindex,nofollow" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="/assets/visuals/corpflow-process-hero.jpg" />
        <meta name="theme-color" content="#06111f" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media (max-width: 768px) {
                .cipc-desk-direct-sme [data-cf-public-scrim] {
                  background: linear-gradient(180deg, rgba(3,15,34,0.9) 0%, rgba(3,15,34,0.82) 62%, rgba(3,15,34,0.72) 100%) !important;
                }
              }
            `,
          }}
        />
      </Head>

      <PublicMarketingPhotoGlassShell
        pageClassName="cipc-desk-direct-sme"
        maxWidth={1120}
        hero={visualHero}
        scrimTone="dark"
        scrimStyle={{ background: CORPFLOW_PUBLIC_HERO_SCRIM_DESKTOP }}
        publicScrimHook
        footer={
          <div>
            <div style={{ fontWeight: 800, color: CF.text, marginBottom: 6 }}>
              {safeStr(nav.brand) || 'Company-secretarial help'}
            </div>
            <p style={{ ...cfBody, margin: 0, fontSize: 13.5 }}>
              {safeStr(footer.independence) ||
                'Independent company-secretarial support. Not CIPC, not a government channel, and not a law firm. Filing outcomes are not guaranteed.'}
            </p>
            <p style={{ ...cfBody, margin: '10px 0 0', fontSize: 13 }}>
              {safeStr(footer.partner_link_label) || 'Accounting firm looking for overflow capacity?'}{' '}
              <a href="/partners" style={{ color: CF.link, fontWeight: 600 }}>
                {safeStr(audience.not_for_cta) || 'Discuss overflow / white-label support'}
              </a>
            </p>
          </div>
        }
      >
        <nav
          aria-label="Company-secretarial help"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 900,
                fontSize: 20,
                letterSpacing: '-0.02em',
                color: CF.text,
              }}
            >
              {safeStr(nav.brand) || 'Company-secretarial help'}
            </div>
            <div style={{ color: CF.textFaint, fontSize: 12, marginTop: 2 }}>
              {safeStr(nav.location) || 'South Africa · for your company'}
            </div>
          </div>
          <a
            href={safeStr(primaryCta.href) || '#sme-enquiry'}
            style={{ ...cfBtnPrimary, fontSize: 13, minHeight: 44, padding: '10px 16px' }}
          >
            {safeStr(primaryCta.label) || 'Request company-secretarial help'}
          </a>
        </nav>

        <HeroGlassBlock
          style={{ maxWidth: 820 }}
          eyebrow={
            <p style={{ ...cfKicker, marginBottom: 10 }}>
              {safeStr(hero.eyebrow) || 'For South African business owners and directors'}
            </p>
          }
          title={
            <h1
              style={{
                margin: '0 0 12px',
                fontSize: 'clamp(32px, 5.6vw, 50px)',
                lineHeight: 1.06,
                letterSpacing: '-0.03em',
                color: CF.text,
                maxWidth: 760,
              }}
            >
              {safeStr(hero.headline) || 'Company-secretarial help for your CIPC filings.'}
            </h1>
          }
          lead={<p style={{ ...cfLead, marginBottom: 0 }}>{safeStr(hero.subhead)}</p>}
          actions={
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 18 }}>
              <a href={safeStr(primaryCta.href) || '#sme-enquiry'} style={cfBtnPrimary}>
                {safeStr(primaryCta.label) || 'Request company-secretarial help'}
              </a>
              <a href={safeStr(secondaryCta.href) || '#sme-services'} style={cfBtnSecondary}>
                {safeStr(secondaryCta.label) || 'See standard services'}
              </a>
            </div>
          }
        />

        <section style={cfSection} aria-labelledby="sme-audience-title">
          <p style={cfKicker}>Who this is for</p>
          <h2 id="sme-audience-title" style={cfH2}>
            {safeStr(audience.title) || 'Built for the company that needs the filing done'}
          </h2>
          <GlassPanel variant={{ padding: 24, elevation: 2 }}>
            <p style={{ ...cfBody, marginBottom: 12 }}>{safeStr(audience.body)}</p>
            <p style={{ ...cfBody, margin: 0 }}>
              {safeStr(audience.not_for)}{' '}
              <a
                href={safeStr(audience.not_for_href) || '/partners'}
                style={{ color: CF.link, fontWeight: 600 }}
              >
                {safeStr(audience.not_for_cta) || 'Discuss overflow / white-label support'}
              </a>
              .
            </p>
          </GlassPanel>
        </section>

        <section style={cfSection} aria-labelledby="sme-problem-title">
          <GlassCardGrid minColWidth={280}>
            <GlassPanel as="article" variant={{ padding: 22, elevation: 2 }}>
              <p style={cfKicker}>The friction</p>
              <h2 id="sme-problem-title" style={{ ...cfH2, fontSize: 22 }}>
                {safeStr(problem.title)}
              </h2>
              <p style={{ ...cfBody, margin: 0 }}>{safeStr(problem.body)}</p>
            </GlassPanel>
            <GlassPanel as="article" variant={{ padding: 22, elevation: 2 }}>
              <p style={cfKicker}>The offer</p>
              <h2 style={{ ...cfH2, fontSize: 22 }}>{safeStr(offer.title)}</h2>
              <p style={{ ...cfBody, margin: 0 }}>{safeStr(offer.body)}</p>
            </GlassPanel>
          </GlassCardGrid>
        </section>

        <section style={cfSection} aria-labelledby="sme-proof-title">
          <p style={cfKicker}>Proof</p>
          <h2 id="sme-proof-title" style={cfH2}>
            {safeStr(proof.title) || 'How the path stays safe'}
          </h2>
          <GlassCardGrid minColWidth={240} style={{ marginTop: 16 }}>
            {proofItems.map((item, idx) => (
              <GlassPanel key={`proof-${idx}`} as="article" variant={{ padding: 20, elevation: 1 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 16.5, color: CF.text }}>{safeStr(item?.name)}</h3>
                <p style={{ ...cfBody, margin: 0, fontSize: 14 }}>{safeStr(item?.detail)}</p>
              </GlassPanel>
            ))}
          </GlassCardGrid>
        </section>

        <section style={cfSection} id="sme-services" aria-labelledby="sme-services-title">
          <p style={cfKicker}>Service catalogue</p>
          <h2 id="sme-services-title" style={cfH2}>
            {safeStr(services.title) || 'Standard services we can help administer'}
          </h2>
          {safeStr(services.intro) ? <p style={cfBody}>{safeStr(services.intro)}</p> : null}
          <GlassCardGrid minColWidth={240} style={{ marginTop: 16 }}>
            {serviceItems.map((item, idx) => {
              const key = safeStr(item?.key);
              return (
                <GlassPanel key={`svc-${idx}`} as="article" variant={{ padding: 20, elevation: 1 }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: 16.5, color: CF.text }}>{safeStr(item?.name)}</h3>
                  <p style={{ ...cfBody, margin: 0, fontSize: 14 }}>{safeStr(item?.detail)}</p>
                  {key ? (
                    <a
                      href="#sme-enquiry"
                      onClick={() => selectServiceAndEnquire(key)}
                      style={{ ...cfBtnSecondary, fontSize: 12.5, minHeight: 40, marginTop: 12 }}
                    >
                      Request this help
                    </a>
                  ) : null}
                </GlassPanel>
              );
            })}
          </GlassCardGrid>
        </section>

        <section style={cfSection} aria-labelledby="sme-limits-title">
          <p style={cfKicker}>Limitations</p>
          <h2 id="sme-limits-title" style={cfH2}>
            {safeStr(limitations.title) || 'What this standard path does not do'}
          </h2>
          {safeStr(limitations.intro) ? <p style={cfBody}>{safeStr(limitations.intro)}</p> : null}
          <GlassPanel variant={{ padding: 22, elevation: 1 }} style={{ marginTop: 12 }}>
            <ul style={{ margin: 0, paddingLeft: 20, color: CF.textMuted, lineHeight: 1.7 }}>
              {limitationItems.map((item, idx) => (
                <li key={`limit-${idx}`} style={{ marginBottom: 8 }}>
                  {safeStr(item)}
                </li>
              ))}
            </ul>
          </GlassPanel>
        </section>

        <section style={cfSection} aria-labelledby="sme-how-title">
          <p style={cfKicker}>Process</p>
          <h2 id="sme-how-title" style={cfH2}>
            {safeStr(how.title) || 'How it works'}
          </h2>
          <ol
            style={{
              margin: '16px 0 0',
              padding: 0,
              listStyle: 'none',
              display: 'grid',
              gap: 12,
            }}
          >
            {steps.map((step, idx) => (
              <GlassPanel key={`step-${idx}`} as="li" variant={{ padding: 20, elevation: 1 }}>
                <div style={{ ...cfKicker, marginBottom: 6 }}>Step {idx + 1}</div>
                <h3 style={{ margin: '0 0 6px', fontSize: 17, color: CF.text }}>{safeStr(step?.name)}</h3>
                <p style={{ ...cfBody, margin: 0, fontSize: 14 }}>{safeStr(step?.detail)}</p>
              </GlassPanel>
            ))}
          </ol>
        </section>

        <section style={cfSection} aria-labelledby="sme-trust-title">
          <p style={cfKicker}>Trust</p>
          <h2 id="sme-trust-title" style={cfH2}>
            {safeStr(trust.title) || 'Boundaries you can rely on'}
          </h2>
          <GlassPanel variant={{ padding: 22, elevation: 1 }}>
            <ul style={{ margin: 0, paddingLeft: 20, color: CF.textMuted, lineHeight: 1.7 }}>
              {trustItems.map((item, idx) => (
                <li key={`trust-${idx}`} style={{ marginBottom: 8 }}>
                  {safeStr(item)}
                </li>
              ))}
            </ul>
          </GlassPanel>
        </section>

        <section style={cfSection} aria-labelledby="sme-faq-title">
          <p style={cfKicker}>Questions</p>
          <h2 id="sme-faq-title" style={cfH2}>
            {safeStr(faqs.title) || 'Questions owners usually ask first'}
          </h2>
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {faqItems.map((item, idx) => (
              <GlassPanel key={`faq-${idx}`} as="article" variant={{ padding: 20, elevation: 1 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 16.5, color: CF.text }}>{safeStr(item?.q)}</h3>
                <p style={{ ...cfBody, margin: 0, fontSize: 14 }}>{safeStr(item?.a)}</p>
              </GlassPanel>
            ))}
          </div>
        </section>

        <section style={{ ...cfSection, marginTop: 48 }} id="sme-enquiry" aria-labelledby="sme-enquiry-title">
          <p style={cfKicker}>Next step</p>
          <h2 id="sme-enquiry-title" style={cfH2}>
            {safeStr(formCopy.title) || 'Request company-secretarial help'}
          </h2>
          {safeStr(formCopy.intro) ? <p style={cfBody}>{safeStr(formCopy.intro)}</p> : null}

          <GlassPanel
            variant={{
              fill: 'rgba(45,212,191,0.08)',
              border: 'rgba(45,212,191,0.28)',
              padding: 24,
              elevation: 2,
            }}
          >
            {submitted ? (
              <div role="status">
                <p style={{ ...cfBody, color: CF.text, margin: 0, fontSize: 16 }}>
                  {proofConfirmed
                    ? safeStr(formCopy.proof_confirmation)
                    : safeStr(formCopy.confirmation)}
                  {enquiryReference ? ` Your reference is ${enquiryReference}.` : ''}
                </p>
                <button
                  type="button"
                  style={{ ...cfBtnSecondary, marginTop: 18, minHeight: 44 }}
                  onClick={() => {
                    setSubmitted(false);
                    setProofConfirmed(false);
                    setEnquiryReference('');
                  }}
                >
                  Send another enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate>
                {proofMode ? (
                  <p style={{ ...cfBody, margin: '0 0 8px', fontSize: 13.5 }}>
                    Proof mode is on. Confirmation uses a local fixture and does not record, send, charge, or file.
                  </p>
                ) : null}

                <label style={labelStyle} htmlFor="sme-company">
                  {safeStr(fieldLabels.company) || 'Company name'}
                </label>
                <input
                  id="sme-company"
                  name="company"
                  autoComplete="organization"
                  value={form.company}
                  onChange={(e) => updateField('company', e.target.value)}
                  style={fieldStyle}
                  required
                />

                <label style={labelStyle} htmlFor="sme-contact">
                  {safeStr(fieldLabels.contact_name) || 'Your name'}
                </label>
                <input
                  id="sme-contact"
                  name="contact_name"
                  autoComplete="name"
                  value={form.contact_name}
                  onChange={(e) => updateField('contact_name', e.target.value)}
                  style={fieldStyle}
                  required
                />

                <label style={labelStyle} htmlFor="sme-email">
                  {safeStr(fieldLabels.email) || 'Email'}
                </label>
                <input
                  id="sme-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  style={fieldStyle}
                  required
                />

                <label style={labelStyle} htmlFor="sme-phone">
                  {safeStr(fieldLabels.phone) || 'Phone (optional)'}
                </label>
                <input
                  id="sme-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  style={fieldStyle}
                />

                <label style={labelStyle} htmlFor="sme-need">
                  {safeStr(fieldLabels.need) || 'What you need help with'}
                </label>
                <textarea
                  id="sme-need"
                  name="need"
                  rows={4}
                  value={form.need}
                  onChange={(e) => updateField('need', e.target.value)}
                  style={{ ...fieldStyle, minHeight: 110, resize: 'vertical' }}
                  required
                />

                <fieldset style={{ border: 0, margin: '18px 0 0', padding: 0 }}>
                  <legend style={{ ...labelStyle, marginTop: 0 }}>
                    {safeStr(fieldLabels.services) || 'Standard service'}
                  </legend>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 10,
                      marginTop: 10,
                    }}
                  >
                    {CIPC_DESK_DIRECT_SME_SERVICE_OPTIONS.map((opt) => {
                      const checked = form.services.includes(opt.key);
                      return (
                        <label
                          key={opt.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            minHeight: 44,
                            padding: '8px 10px',
                            borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: checked ? 'rgba(45,212,191,0.12)' : 'rgba(3,15,34,0.35)',
                            color: CF.text,
                            fontSize: 14,
                          }}
                        >
                          <input
                            type="checkbox"
                            name="services"
                            value={opt.key}
                            checked={checked}
                            onChange={() => toggleService(opt.key)}
                          />
                          {opt.label}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <label style={labelStyle} htmlFor="sme-channel">
                  {safeStr(fieldLabels.preferred_channel) || 'Preferred response channel'}
                </label>
                <select
                  id="sme-channel"
                  name="preferred_channel"
                  value={form.preferred_channel}
                  onChange={(e) => updateField('preferred_channel', e.target.value)}
                  style={{ ...fieldStyle, minHeight: 44 }}
                >
                  {CIPC_DESK_DIRECT_SME_RESPONSE_CHANNELS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {error ? (
                  <p role="alert" style={{ ...cfBody, color: '#fecaca', margin: '16px 0 0' }}>
                    {error}
                  </p>
                ) : null}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
                  <button type="submit" style={cfBtnPrimary} disabled={submitting}>
                    {submitting
                      ? 'Sending…'
                      : proofMode
                        ? safeStr(formCopy.proof_submit_label) || 'Confirm proof enquiry'
                        : safeStr(formCopy.submit_label) || 'Send company enquiry'}
                  </button>
                  {proofMode ? (
                    <button type="button" style={cfBtnSecondary} onClick={loadProofFixture}>
                      {safeStr(formCopy.load_fixture_label) || 'Use proof fixture'}
                    </button>
                  ) : (
                    <a href="#sme-services" style={cfBtnSecondary}>
                      {safeStr(secondaryCta.label) || 'See standard services'}
                    </a>
                  )}
                </div>
              </form>
            )}
          </GlassPanel>
        </section>
      </PublicMarketingPhotoGlassShell>
    </>
  );
}
