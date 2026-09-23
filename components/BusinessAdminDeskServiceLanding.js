import React from 'react';
import Head from 'next/head';

import BusinessAdminDeskBrand, { BUSINESS_ADMIN_DESK_MARK_PATH } from './BusinessAdminDeskBrand.js';
import BusinessAdminDeskContactActions from './BusinessAdminDeskContactActions.js';
import PublicMarketingPhotoGlassShell from './beauty/PublicMarketingPhotoGlassShell.js';
import HeroGlassBlock from './beauty/HeroGlassBlock.js';
import GlassPanel from './beauty/GlassPanel.js';
import GlassCardGrid from './beauty/GlassCardGrid.js';
import {
  buildPublicVisualHero,
  CORPFLOW_PUBLIC_HERO_SCRIM_DESKTOP,
} from '../lib/public/corpflow-public-visuals.js';
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

const configs = {
  'annual-returns': {
    title: 'Annual Returns',
    eyebrow: 'Annual Returns, without the admin headache',
    headline: 'You do not need to become an Annual Returns expert.',
    lead:
      'Tell us what is going on. We will help you work out what is needed, what we can handle, and whether anything needs separate attention first.',
    videoSrc: '/assets/business-admin-desk/annual-returns-without-admin-headache.mp4',
    videoTitle: 'Annual Returns — without the admin headache',
    videoSummary:
      'A short introduction to how Business Admin Desk helps you understand the next step and progress routine Annual Returns administration.',
    whatWeDo: [
      'We review what has happened and what information is needed.',
      'We identify anything that needs attention before routine filing can proceed.',
      'Once the matter is ready, we progress the agreed administration and keep the next step clear.',
    ],
    boundaries: [
      'Beneficial ownership or financial-statement matters that still need work are scoped separately.',
      'Historical deregistration, restoration, registry corrections and unusual entity types require separate review.',
      'Even if your company is dormant or not trading, Annual Return filing and other statutory obligations may still apply.',
    ],
    specialist:
      'If the company record is unusual, historical information conflicts, or a prerequisite is not complete, we stop the routine path and scope the additional work before proceeding.',
    ctaLabel: 'Ask us about your Annual Returns',
    subject: 'Business Admin Desk - Annual Returns help',
    body: `Hi Business Admin Desk,

I need help with an Annual Returns matter.

What has happened / what I need help with:

Company name:

You can reply to me on this email.`,
  },
  'director-changes': {
    title: 'Director Changes',
    eyebrow: 'Director administration',
    headline: 'Handle straightforward director changes without turning them into a project.',
    lead:
      'We help with routine director appointments, resignations and information updates where the company record and authority are clear.',
    whatWeDo: [
      'Clarify the change required and who is authorising it.',
      'Collect the information and supporting documents needed for the standard path.',
      'Prepare and progress the agreed director-change administration.',
      'Keep the matter status clear and provide completion evidence when available.',
    ],
    boundaries: [
      'Disputed removals, death-related changes and contested appointments are not treated as routine filings.',
      'Custom governance arrangements or unclear appointment authority require specialist review.',
      'Foreign-director and unusual identity scenarios are reviewed before a standard path is confirmed.',
      'We do not invent workarounds when a director or company record cannot complete the standard process.',
    ],
    specialist:
      'If the change is disputed, unusually structured, affected by historical records, or cannot follow the routine electronic path, we pause and scope the specialist route first.',
    ctaLabel: 'Tell us about the director change',
    subject: 'Business Admin Desk - Director Changes help',
    body: `Hi Business Admin Desk,

I need help with a director change.

What has happened / what I need help with:

Company name:

You can reply to me on this email.`,
  },
  'beneficial-ownership': {
    title: 'Beneficial Ownership',
    eyebrow: 'Ownership and control administration',
    headline: 'Make ownership information clear before the filing starts.',
    lead:
      'We support standard beneficial-ownership administration where the ownership and control structure is clear and the declared owners are straightforward to identify.',
    whatWeDo: [
      'Collect the company and ownership information needed for the standard path.',
      'Check that the ownership/control information supplied is complete enough to proceed.',
      'Prepare and progress the agreed standard-path administration when authority and information are complete.',
      'Keep evidence and next-step communication clear.',
    ],
    boundaries: [
      'We record client-declared facts; we do not invent or guess who a beneficial owner is.',
      'Trusts, juristic-person owners, layered structures, foreign ownership and unclear control require specialist review.',
      'Affected-company or disputed-control scenarios are not treated as routine standard-path work.',
      'Historical or inconsistent ownership filings are reviewed before any new filing is attempted.',
    ],
    specialist:
      'Complex ownership structures are deliberately escalated rather than flattened into a simple filing. We confirm the specialist scope before further work proceeds.',
    ctaLabel: 'Ask us about your ownership filing',
    subject: 'Business Admin Desk - Beneficial Ownership help',
    body: `Hi Business Admin Desk,

I need help with a Beneficial Ownership matter.

What has happened / what I need help with:

Company name:

You can reply to me on this email.`,
  },
};

export default function BusinessAdminDeskServiceLanding({
  serviceKey,
  internalReview = false,
}) {
  const cfg = configs[serviceKey] || configs['annual-returns'];
  const route = `/${serviceKey}`;
  const pageTitle = `Business Admin Desk · ${cfg.title}`;
  const description = `${cfg.title} support from Business Admin Desk — clear, practical company administration for South African businesses.`;
  const visualHero = buildPublicVisualHero('services') || buildPublicVisualHero('process');
  const contact = { label: cfg.ctaLabel, subject: cfg.subject, body: cfg.body };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta name="robots" content={internalReview ? 'noindex,nofollow' : 'index,follow'} />
        {!internalReview ? <link rel="canonical" href={`https://businessadmindesk.co.za${route}`} /> : null}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta name="theme-color" content="#06111f" />
        <link rel="icon" href={BUSINESS_ADMIN_DESK_MARK_PATH} type="image/svg+xml" />
      </Head>

      <PublicMarketingPhotoGlassShell
        pageClassName="business-admin-desk-service"
        maxWidth={1080}
        hero={visualHero}
        scrimTone="dark"
        scrimStyle={{ background: CORPFLOW_PUBLIC_HERO_SCRIM_DESKTOP }}
        publicScrimHook
        footer={
          <div>
            <div style={{ marginBottom: 8 }}><BusinessAdminDeskBrand compact href="/" /></div>
            <p style={{ ...cfBody, margin: 0, fontSize: 13.5 }}>
              Independent company-administration support. Not a government or regulatory service, and not a law firm.
            </p>
          </div>
        }
      >
        <nav
          aria-label="Business Admin Desk"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 20,
          }}
        >
          <BusinessAdminDeskBrand subtitle="Company administration · South Africa" priority />
          <BusinessAdminDeskContactActions {...contact} compact />
        </nav>

        <HeroGlassBlock
          eyebrow={
            <p style={{ ...cfKicker, marginBottom: 10 }}>
              {internalReview ? `Internal review · ${cfg.eyebrow}` : cfg.eyebrow}
            </p>
          }
          title={
            <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(34px, 6vw, 52px)', lineHeight: 1.05, color: CF.text, maxWidth: 790 }}>
              {cfg.headline}
            </h1>
          }
          lead={<p style={{ ...cfLead, marginBottom: 0, maxWidth: 780 }}>{cfg.lead}</p>}
          actions={
            <div style={{ marginTop: 18 }}>
              <BusinessAdminDeskContactActions
                {...contact}
                secondary={<a href="/partners" style={cfBtnSecondary}>Need white-label / fractional support?</a>}
              />
            </div>
          }
        />

        {cfg.videoSrc ? (
          <section style={cfSection} aria-labelledby="service-video-title">
            <p style={cfKicker}>A quick introduction</p>
            <h2 id="service-video-title" style={cfH2}>{cfg.videoTitle}</h2>
            <p style={{ ...cfBody, maxWidth: 760, marginBottom: 16 }}>{cfg.videoSummary}</p>
            <GlassPanel variant={{ padding: 10, elevation: 2 }}>
              <video
                controls
                preload="metadata"
                playsInline
                aria-label={cfg.videoTitle}
                style={{ width: '100%', display: 'block', borderRadius: 16, background: '#020817' }}
              >
                <source src={cfg.videoSrc} type="video/mp4" />
                Your browser does not support embedded video.
              </video>
            </GlassPanel>
            <div style={{ marginTop: 16 }}>
              <BusinessAdminDeskContactActions {...contact} />
            </div>
          </section>
        ) : null}

        <section style={cfSection} aria-labelledby="service-help-title">
          <p style={cfKicker}>What we help with</p>
          <h2 id="service-help-title" style={cfH2}>{cfg.title} support</h2>
          <GlassCardGrid minColWidth={240} style={{ marginTop: 16 }}>
            {cfg.whatWeDo.map((item, idx) => (
              <GlassPanel key={item} as="article" variant={{ padding: 20, elevation: 1 }}>
                <div style={{ color: '#8ff3e5', fontWeight: 800, marginBottom: 8 }}>{idx + 1}</div>
                <p style={{ ...cfBody, margin: 0 }}>{item}</p>
              </GlassPanel>
            ))}
          </GlassCardGrid>
        </section>

        <section style={cfSection} aria-labelledby="service-boundaries-title">
          <p style={cfKicker}>Clear boundaries</p>
          <h2 id="service-boundaries-title" style={cfH2}>What is scoped separately</h2>
          <GlassPanel variant={{ padding: 24, elevation: 2 }} style={{ marginTop: 14 }}>
            <ul style={{ margin: 0, paddingLeft: 20, color: CF.text }}>
              {cfg.boundaries.map((item) => (
                <li key={item} style={{ marginBottom: 10, lineHeight: 1.6 }}>{item}</li>
              ))}
            </ul>
          </GlassPanel>
        </section>

        <section style={cfSection} aria-labelledby="service-specialist-title">
          <p style={cfKicker}>When the matter is not routine</p>
          <h2 id="service-specialist-title" style={cfH2}>We stop and scope before guessing</h2>
          <GlassPanel variant={{ padding: 24, elevation: 2 }} style={{ marginTop: 14 }}>
            <p style={{ ...cfBody, margin: 0 }}>{cfg.specialist}</p>
          </GlassPanel>
        </section>

        <section style={{ ...cfSection, marginTop: 46 }} aria-labelledby="service-cta-title">
          <GlassPanel
            variant={{
              fill: 'rgba(45,212,191,0.10)',
              border: 'rgba(45,212,191,0.30)',
              padding: 28,
              elevation: 2,
            }}
          >
            <p style={cfKicker}>Next step</p>
            <h2 id="service-cta-title" style={cfH2}>Start with the situation, not the paperwork</h2>
            <p style={{ ...cfBody, maxWidth: 760 }}>
              Tell us what has happened and what you are trying to achieve. We will review the matter, confirm the scope and explain the next step before work begins.
            </p>
            <BusinessAdminDeskContactActions {...contact} />
          </GlassPanel>
        </section>
      </PublicMarketingPhotoGlassShell>
    </>
  );
}
