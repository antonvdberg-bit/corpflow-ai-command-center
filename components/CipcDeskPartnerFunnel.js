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
  buildCipcDeskPartnerFunnelContent,
  buildPartnerFunnelEnquiryEmail,
  CIPC_DESK_PARTNER_RESPONSE_CHANNELS,
  CIPC_DESK_PARTNER_SERVICE_OPTIONS,
} from '../lib/cipc-desk/partner-funnel.js';
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
  fontSize: 14.5,
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
  firm: '',
  contact_name: '',
  email: '',
  phone: '',
  need: '',
  services: /** @type {string[]} */ ([]),
  preferred_channel: 'email',
};

/**
 * Buyer-facing partner funnel for accounting / advisory firms (#986).
 * Enquiry posts to existing POST /api/cipc-desk/email-intake.
 *
 * @param {{ content?: Record<string, unknown> | null }} props
 */
export default function CipcDeskPartnerFunnel({ content }) {
  const c =
    content && typeof content === 'object' ? content : buildCipcDeskPartnerFunnelContent();
  const meta = c.meta && typeof c.meta === 'object' ? c.meta : {};
  const nav = c.nav && typeof c.nav === 'object' ? c.nav : {};
  const hero = c.hero && typeof c.hero === 'object' ? c.hero : {};
  const audience = c.audience && typeof c.audience === 'object' ? c.audience : {};
  const problem = c.problem && typeof c.problem === 'object' ? c.problem : {};
  const offer = c.offer && typeof c.offer === 'object' ? c.offer : {};
  const proof = c.proof && typeof c.proof === 'object' ? c.proof : {};
  const services = c.services && typeof c.services === 'object' ? c.services : {};
  const how = c.how_it_works && typeof c.how_it_works === 'object' ? c.how_it_works : {};
  const trust = c.trust && typeof c.trust === 'object' ? c.trust : {};
  const faqs = c.faqs && typeof c.faqs === 'object' ? c.faqs : {};
  const formCopy = c.form && typeof c.form === 'object' ? c.form : {};
  const footer = c.footer && typeof c.footer === 'object' ? c.footer : {};
  const fieldLabels = formCopy.fields && typeof formCopy.fields === 'object' ? formCopy.fields : {};

  const pageTitle =
    safeStr(meta.page_title) ||
    'Overflow and white-label company-secretarial support for accounting firms';
  const description =
    safeStr(meta.description) ||
    'Fractional and white-label company-secretarial capacity for South African accounting firms.';
  const primaryCta = hero.primary_cta && typeof hero.primary_cta === 'object' ? hero.primary_cta : {};
  const secondaryCta =
    hero.secondary_cta && typeof hero.secondary_cta === 'object' ? hero.secondary_cta : {};

  const visualHero = buildPublicVisualHero('services') || buildPublicVisualHero('process');

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

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

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitted(false);

    const built = buildPartnerFunnelEnquiryEmail(form);
    if (!built.ok) {
      setError(built.error);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/cipc-desk/email-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email_text: built.email_text,
          client_path: '/partners',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(
          'We could not record the enquiry just now. Please try again in a moment, or email the same details to the desk.',
        );
        return;
      }
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
        <meta property="og:image" content="/assets/visuals/corpflow-services-hero.jpg" />
        <meta name="theme-color" content="#06111f" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media (max-width: 768px) {
                .cipc-desk-partner-funnel [data-cf-public-scrim] {
                  background: linear-gradient(180deg, rgba(3,15,34,0.9) 0%, rgba(3,15,34,0.82) 62%, rgba(3,15,34,0.72) 100%) !important;
                }
              }
            `,
          }}
        />
      </Head>

      <PublicMarketingPhotoGlassShell
        pageClassName="cipc-desk-partner-funnel"
        maxWidth={1120}
        hero={visualHero}
        scrimTone="dark"
        scrimStyle={{ background: CORPFLOW_PUBLIC_HERO_SCRIM_DESKTOP }}
        publicScrimHook
        footer={
          <div>
            <div style={{ fontWeight: 800, color: CF.text, marginBottom: 6 }}>
              {safeStr(nav.brand) || 'Company-secretarial operations'}
            </div>
            <p style={{ ...cfBody, margin: 0, fontSize: 13.5 }}>
              {safeStr(footer.independence) ||
                'Independent company-secretarial support. Not CIPC, not a government channel, and not a law firm. Filing outcomes are not guaranteed.'}
            </p>
            <p style={{ ...cfBody, margin: '10px 0 0', fontSize: 13 }}>
              {safeStr(footer.sme_link_label) || 'Looking for help with your own company?'}{' '}
              <a href="/" style={{ color: CF.link, fontWeight: 600 }}>
                {safeStr(audience.not_for_cta) || 'Go to the company-administration desk'}
              </a>
            </p>
          </div>
        }
      >
        <nav
          aria-label="Partner funnel"
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
              {safeStr(nav.brand) || 'Company-secretarial operations'}
            </div>
            <div style={{ color: CF.textFaint, fontSize: 12, marginTop: 2 }}>
              {safeStr(nav.location) || 'South Africa · remote delivery'}
            </div>
          </div>
          <a
            href={safeStr(primaryCta.href) || '#partner-enquiry'}
            style={{ ...cfBtnPrimary, fontSize: 13, minHeight: 44, padding: '10px 16px' }}
          >
            {safeStr(primaryCta.label) || 'Discuss overflow / white-label support'}
          </a>
        </nav>

        <HeroGlassBlock
          style={{ maxWidth: 820 }}
          eyebrow={
            <p style={{ ...cfKicker, marginBottom: 10 }}>
              {safeStr(hero.eyebrow) || 'For accounting, tax and advisory firms'}
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
              {safeStr(hero.headline) ||
                'Experienced company-secretarial capacity behind your accounting practice.'}
            </h1>
          }
          lead={<p style={{ ...cfLead, marginBottom: 0 }}>{safeStr(hero.subhead)}</p>}
          actions={
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 18 }}>
              <a href={safeStr(primaryCta.href) || '#partner-enquiry'} style={cfBtnPrimary}>
                {safeStr(primaryCta.label) || 'Discuss overflow / white-label support'}
              </a>
              <a href={safeStr(secondaryCta.href) || '#partner-services'} style={cfBtnSecondary}>
                {safeStr(secondaryCta.label) || 'See services we can handle'}
              </a>
            </div>
          }
        />

        <section style={cfSection} aria-labelledby="partner-audience-title">
          <p style={cfKicker}>Who this is for</p>
          <h2 id="partner-audience-title" style={cfH2}>
            {safeStr(audience.title) || 'Built for firms that already have the clients'}
          </h2>
          <GlassPanel variant={{ padding: 24, elevation: 2 }}>
            <p style={{ ...cfBody, marginBottom: 12 }}>{safeStr(audience.body)}</p>
            <p style={{ ...cfBody, margin: 0 }}>
              {safeStr(audience.not_for)}{' '}
              <a href={safeStr(audience.not_for_href) || '/'} style={{ color: CF.link, fontWeight: 600 }}>
                {safeStr(audience.not_for_cta) || 'Go to the company-administration desk'}
              </a>
              .
            </p>
          </GlassPanel>
        </section>

        <section style={cfSection} aria-labelledby="partner-problem-title">
          <GlassCardGrid minColWidth={280}>
            <GlassPanel as="article" variant={{ padding: 22, elevation: 2 }}>
              <p style={cfKicker}>The friction</p>
              <h2 id="partner-problem-title" style={{ ...cfH2, fontSize: 22 }}>
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

        <section style={cfSection} aria-labelledby="partner-proof-title">
          <p style={cfKicker}>Proof</p>
          <h2 id="partner-proof-title" style={cfH2}>
            {safeStr(proof.title) || 'Why firms use specialist capacity'}
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

        <section style={cfSection} id="partner-services" aria-labelledby="partner-services-title">
          <p style={cfKicker}>Service matrix</p>
          <h2 id="partner-services-title" style={cfH2}>
            {safeStr(services.title) || 'Services we can handle'}
          </h2>
          {safeStr(services.intro) ? <p style={cfBody}>{safeStr(services.intro)}</p> : null}
          <GlassCardGrid minColWidth={240} style={{ marginTop: 16 }}>
            {serviceItems.map((item, idx) => (
              <GlassPanel key={`svc-${idx}`} as="article" variant={{ padding: 20, elevation: 1 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 16.5, color: CF.text }}>{safeStr(item?.name)}</h3>
                <p style={{ ...cfBody, margin: 0, fontSize: 14 }}>{safeStr(item?.detail)}</p>
              </GlassPanel>
            ))}
          </GlassCardGrid>
        </section>

        <section style={cfSection} aria-labelledby="partner-how-title">
          <p style={cfKicker}>Process</p>
          <h2 id="partner-how-title" style={cfH2}>
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

        <section style={cfSection} aria-labelledby="partner-trust-title">
          <p style={cfKicker}>Trust</p>
          <h2 id="partner-trust-title" style={cfH2}>
            {safeStr(trust.title) || 'Boundaries you can show a partner'}
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

        <section style={cfSection} aria-labelledby="partner-faq-title">
          <p style={cfKicker}>Questions</p>
          <h2 id="partner-faq-title" style={cfH2}>
            {safeStr(faqs.title) || 'Questions firms usually ask first'}
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

        <section style={{ ...cfSection, marginTop: 48 }} id="partner-enquiry" aria-labelledby="partner-enquiry-title">
          <p style={cfKicker}>Next step</p>
          <h2 id="partner-enquiry-title" style={cfH2}>
            {safeStr(formCopy.title) || 'Discuss overflow / white-label support'}
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
                  {safeStr(formCopy.confirmation)}
                </p>
                <button
                  type="button"
                  style={{ ...cfBtnSecondary, marginTop: 18 }}
                  onClick={() => setSubmitted(false)}
                >
                  Send another enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate>
                <label style={labelStyle} htmlFor="partner-firm">
                  {safeStr(fieldLabels.firm) || 'Firm name'}
                </label>
                <input
                  id="partner-firm"
                  name="firm"
                  autoComplete="organization"
                  value={form.firm}
                  onChange={(e) => updateField('firm', e.target.value)}
                  style={fieldStyle}
                  required
                />

                <label style={labelStyle} htmlFor="partner-contact">
                  {safeStr(fieldLabels.contact_name) || 'Your name'}
                </label>
                <input
                  id="partner-contact"
                  name="contact_name"
                  autoComplete="name"
                  value={form.contact_name}
                  onChange={(e) => updateField('contact_name', e.target.value)}
                  style={fieldStyle}
                  required
                />

                <label style={labelStyle} htmlFor="partner-email">
                  {safeStr(fieldLabels.email) || 'Work email'}
                </label>
                <input
                  id="partner-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  style={fieldStyle}
                  required
                />

                <label style={labelStyle} htmlFor="partner-phone">
                  {safeStr(fieldLabels.phone) || 'Phone (optional)'}
                </label>
                <input
                  id="partner-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  style={fieldStyle}
                />

                <label style={labelStyle} htmlFor="partner-need">
                  {safeStr(fieldLabels.need) || 'Approximate client portfolio or immediate need'}
                </label>
                <textarea
                  id="partner-need"
                  name="need"
                  rows={4}
                  value={form.need}
                  onChange={(e) => updateField('need', e.target.value)}
                  style={{ ...fieldStyle, minHeight: 110, resize: 'vertical' }}
                  required
                />

                <fieldset style={{ border: 0, margin: '18px 0 0', padding: 0 }}>
                  <legend style={{ ...labelStyle, marginTop: 0 }}>
                    {safeStr(fieldLabels.services) || 'Services of interest'}
                  </legend>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 10,
                      marginTop: 10,
                    }}
                  >
                    {CIPC_DESK_PARTNER_SERVICE_OPTIONS.map((opt) => {
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

                <label style={labelStyle} htmlFor="partner-channel">
                  {safeStr(fieldLabels.preferred_channel) || 'Preferred response channel'}
                </label>
                <select
                  id="partner-channel"
                  name="preferred_channel"
                  value={form.preferred_channel}
                  onChange={(e) => updateField('preferred_channel', e.target.value)}
                  style={fieldStyle}
                >
                  {CIPC_DESK_PARTNER_RESPONSE_CHANNELS.map((opt) => (
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
                      : safeStr(formCopy.submit_label) || 'Send partner enquiry'}
                  </button>
                  <a href="#partner-services" style={cfBtnSecondary}>
                    {safeStr(secondaryCta.label) || 'See services we can handle'}
                  </a>
                </div>
              </form>
            )}
          </GlassPanel>
        </section>
      </PublicMarketingPhotoGlassShell>
    </>
  );
}
