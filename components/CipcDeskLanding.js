import React from 'react';
import Head from 'next/head';

import PublicMarketingPhotoGlassShell from './beauty/PublicMarketingPhotoGlassShell.js';
import HeroGlassBlock from './beauty/HeroGlassBlock.js';
import GlassPanel from './beauty/GlassPanel.js';
import GlassCardGrid from './beauty/GlassCardGrid.js';
import {
  buildPublicVisualHero,
  CORPFLOW_PUBLIC_HERO_SCRIM_DESKTOP,
} from '../lib/public/corpflow-public-visuals.js';
import { GLASS_TOKENS } from '../lib/ui/glass.js';
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

/**
 * CIPC Desk public presentation — CorpFlowAI photo + glass visual language,
 * branded for company-secretarial / CIPC administration (presentation only).
 *
 * @param {{ site?: Record<string, unknown> | null }} props
 */
export default function CipcDeskLanding({ site }) {
  const s = site && typeof site === 'object' ? site : {};
  const hero = s.hero && typeof s.hero === 'object' ? s.hero : {};
  const meta = s.meta && typeof s.meta === 'object' ? s.meta : {};
  const sections = s.sections && typeof s.sections === 'object' ? s.sections : {};
  const about = sections.about && typeof sections.about === 'object' ? sections.about : {};
  const services = sections.services && typeof sections.services === 'object' ? sections.services : {};
  const routes = sections.routes && typeof sections.routes === 'object' ? sections.routes : {};
  const trust = sections.trust && typeof sections.trust === 'object' ? sections.trust : {};
  const contact = sections.contact && typeof sections.contact === 'object' ? sections.contact : {};

  const brand = safeStr(hero.title) || 'CIPC Desk';
  const headline = safeStr(hero.headline) || 'Clear company administration — handled with care';
  const tagline =
    safeStr(hero.tagline) ||
    'Professional support for registrations, amendments, annual returns, records and compliance-related administration.';
  const pageTitle = safeStr(meta.page_title) || `${brand} · Company administration support`;
  const description =
    safeStr(meta.description) ||
    'CIPC Desk — professional South African CIPC and company-secretarial administration support.';

  const primaryCta = {
    label: safeStr(hero.cta_label) || 'Email your CIPC matter',
    href: safeStr(hero.cta_href) || 'mailto:swart829@gmail.com?subject=CIPC%20Desk%20enquiry',
  };
  const secondaryCtaLabel = safeStr(hero.cta_secondary_label);
  const secondaryCtaHref = safeStr(hero.cta_secondary_href);
  const contactEmail = safeStr(contact.email) || 'swart829@gmail.com';

  const serviceItems = Array.isArray(services.items) ? services.items : [];
  const routeItems = Array.isArray(routes.items) ? routes.items : [];
  const trustItems = Array.isArray(trust.items) ? trust.items : [];

  const visualKey =
    s.media && typeof s.media === 'object' && typeof s.media.visual_key === 'string'
      ? s.media.visual_key
      : 'process';
  const visualHero = buildPublicVisualHero(
    /** @type {'home'|'contact'|'about'|'process'|'services'|'standards'|'onboarding'} */ (visualKey),
  ) || buildPublicVisualHero('process');

  const aboutParagraphs = safeStr(about.body)
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

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
                .cipc-desk-landing [data-cf-public-scrim] {
                  background: linear-gradient(180deg, rgba(3,15,34,0.9) 0%, rgba(3,15,34,0.82) 62%, rgba(3,15,34,0.72) 100%) !important;
                }
              }
            `,
          }}
        />
      </Head>

      <PublicMarketingPhotoGlassShell
        pageClassName="cipc-desk-landing"
        maxWidth={1120}
        hero={visualHero}
        scrimTone="dark"
        scrimStyle={{ background: CORPFLOW_PUBLIC_HERO_SCRIM_DESKTOP }}
        publicScrimHook
        footer={
          <div>
            <div style={{ fontWeight: 800, color: CF.text, marginBottom: 6 }}>{brand}</div>
            <p style={{ ...cfBody, margin: 0, fontSize: 13.5 }}>
              Internal CorpFlowAI test desk for company administration presentation. Not CIPC, not a law firm, and not an
              authorised government channel. Powered by CorpFlowAI.
            </p>
            {safeStr(contact.note) ? (
              <p style={{ ...cfBody, margin: '10px 0 0', fontSize: 13 }}>{safeStr(contact.note)}</p>
            ) : null}
          </div>
        }
      >
        <nav
          aria-label="CIPC Desk"
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
                fontSize: 22,
                letterSpacing: '-0.02em',
                color: CF.text,
              }}
            >
              {brand}
            </div>
            <div style={{ color: CF.textFaint, fontSize: 12, marginTop: 2 }}>
              Company administration · South Africa
            </div>
          </div>
          <a href={primaryCta.href} style={{ ...cfBtnPrimary, fontSize: 13, minHeight: 40, padding: '10px 16px' }}>
            {primaryCta.label}
          </a>
        </nav>

        <HeroGlassBlock
          eyebrow={
            <p style={{ ...cfKicker, marginBottom: 10 }}>Professional CIPC administration support</p>
          }
          title={
            <h1
              style={{
                margin: '0 0 10px',
                fontSize: 'clamp(34px, 6vw, 52px)',
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                color: CF.text,
                maxWidth: 720,
              }}
            >
              {brand}
            </h1>
          }
          lead={
            <>
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: 'clamp(18px, 2.4vw, 24px)',
                  lineHeight: 1.35,
                  letterSpacing: '-0.02em',
                  color: CF.text,
                  fontWeight: 650,
                  maxWidth: 640,
                }}
              >
                {headline}
              </p>
              <p style={{ ...cfLead, marginBottom: 0 }}>{tagline}</p>
            </>
          }
          actions={
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 18 }}>
              <a href={primaryCta.href} style={cfBtnPrimary}>
                {primaryCta.label}
              </a>
              {secondaryCtaLabel && secondaryCtaHref ? (
                <a href={secondaryCtaHref} style={cfBtnSecondary}>
                  {secondaryCtaLabel}
                </a>
              ) : null}
            </div>
          }
        />

        {routeItems.length ? (
          <section style={cfSection} aria-labelledby="cipc-routes-title">
            <p style={cfKicker}>Who this is for</p>
            <h2 id="cipc-routes-title" style={cfH2}>
              {safeStr(routes.title) || 'Two entry routes — one clear process'}
            </h2>
            {safeStr(routes.intro) ? <p style={cfBody}>{safeStr(routes.intro)}</p> : null}
            <GlassCardGrid minColWidth={280} style={{ marginTop: 16 }}>
              {routeItems.map((item, idx) => {
                const name = safeStr(item?.name) || `Route ${idx + 1}`;
                const detail = safeStr(item?.detail);
                const ctaLabel = safeStr(item?.cta_label);
                const ctaHref = safeStr(item?.cta_href);
                return (
                  <GlassPanel key={`route-${idx}`} as="article" variant={{ padding: 22, elevation: 2 }}>
                    <h3 style={{ ...cfH2, fontSize: 18, marginBottom: 8 }}>{name}</h3>
                    {detail ? <p style={{ ...cfBody, marginBottom: ctaHref ? 14 : 0 }}>{detail}</p> : null}
                    {ctaLabel && ctaHref ? (
                      <a href={ctaHref} style={{ ...cfBtnSecondary, fontSize: 13, minHeight: 40 }}>
                        {ctaLabel}
                      </a>
                    ) : null}
                  </GlassPanel>
                );
              })}
            </GlassCardGrid>
          </section>
        ) : null}

        {serviceItems.length ? (
          <section style={cfSection} aria-labelledby="cipc-services-title">
            <p style={cfKicker}>Service summary</p>
            <h2 id="cipc-services-title" style={cfH2}>
              {safeStr(services.title) || 'Services we can help administer'}
            </h2>
            {safeStr(services.intro) ? <p style={cfBody}>{safeStr(services.intro)}</p> : null}
            <GlassCardGrid minColWidth={240} style={{ marginTop: 16 }}>
              {serviceItems.map((item, idx) => {
                const name = safeStr(item?.name) || `Service ${idx + 1}`;
                const detail = safeStr(item?.detail);
                return (
                  <GlassPanel key={`svc-${idx}`} as="article" variant={{ padding: 20, elevation: 1 }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 16.5, color: CF.text, letterSpacing: '-0.01em' }}>
                      {name}
                    </h3>
                    {detail ? <p style={{ ...cfBody, margin: 0, fontSize: 14 }}>{detail}</p> : null}
                  </GlassPanel>
                );
              })}
            </GlassCardGrid>
          </section>
        ) : null}

        {aboutParagraphs.length ? (
          <section style={cfSection} aria-labelledby="cipc-about-title">
            <p style={cfKicker}>Process</p>
            <h2 id="cipc-about-title" style={cfH2}>
              {safeStr(about.title) || 'How the email-first desk works'}
            </h2>
            <GlassPanel variant={{ padding: 24, elevation: 2 }} style={{ marginTop: 8 }}>
              {aboutParagraphs.map((para, idx) => (
                <p
                  key={`about-${idx}`}
                  style={{
                    ...cfBody,
                    marginBottom: idx === aboutParagraphs.length - 1 ? 0 : 12,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {para}
                </p>
              ))}
            </GlassPanel>
          </section>
        ) : null}

        {trustItems.length ? (
          <section style={cfSection} aria-labelledby="cipc-trust-title">
            <p style={cfKicker}>Trust</p>
            <h2 id="cipc-trust-title" style={cfH2}>
              {safeStr(trust.title) || 'What you can expect'}
            </h2>
            <GlassCardGrid minColWidth={220} style={{ marginTop: 16 }}>
              {trustItems.map((item, idx) => (
                <GlassPanel key={`trust-${idx}`} as="article" variant={{ padding: 20, elevation: 1 }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: 16, color: GLASS_TOKENS.accent }}>{safeStr(item?.name)}</h3>
                  <p style={{ ...cfBody, margin: 0, fontSize: 14 }}>{safeStr(item?.detail)}</p>
                </GlassPanel>
              ))}
            </GlassCardGrid>
          </section>
        ) : null}

        <section style={{ ...cfSection, marginTop: 48 }} aria-labelledby="cipc-cta-title">
          <GlassPanel
            variant={{
              fill: 'rgba(45,212,191,0.10)',
              border: 'rgba(45,212,191,0.30)',
              padding: 28,
              elevation: 2,
            }}
          >
            <p style={cfKicker}>Next step</p>
            <h2 id="cipc-cta-title" style={cfH2}>
              Ready to start with a clear email?
            </h2>
            <p style={cfBody}>
              Send a short summary of your company matter to{' '}
              <a href={`mailto:${contactEmail}`} style={{ color: CF.link, fontWeight: 600 }}>
                {contactEmail}
              </a>
              . Serah confirms scope before any filing work begins. No fees or deadlines are quoted until that review.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
              <a href={primaryCta.href} style={cfBtnPrimary}>
                {primaryCta.label}
              </a>
              {secondaryCtaLabel && secondaryCtaHref ? (
                <a href={secondaryCtaHref} style={cfBtnSecondary}>
                  {secondaryCtaLabel}
                </a>
              ) : null}
            </div>
          </GlassPanel>
        </section>
      </PublicMarketingPhotoGlassShell>
    </>
  );
}
