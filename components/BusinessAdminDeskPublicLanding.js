import React from 'react';
import Head from 'next/head';

import BusinessAdminDeskBrand, { BUSINESS_ADMIN_DESK_MARK_PATH } from './BusinessAdminDeskBrand.js';
import BusinessAdminDeskContactActions from './BusinessAdminDeskContactActions.js';
import BusinessAdminDeskSectionNav from './BusinessAdminDeskSectionNav.js';
import BusinessAdminDeskLegalFooter from './BusinessAdminDeskLegalFooter.js';
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

const PAGE_TITLE = 'Business Admin Desk · Software-managed company administration';
const PAGE_DESCRIPTION =
  'Business Admin Desk sells integrated, software-managed company-administration packages for South Africa. CorpFlowAI Ltd operates the service. Online checkout is not open yet.';

const DIRECT_CONTACT = {
  label: 'Ask about a package',
  subject: 'Business Admin Desk package question',
  body: `Hi Business Admin Desk,

I want to ask about a published company-administration package.

Package:

Company name:

You can reply to me on this email.`,
};

const PARTNER_CTA = {
  label: 'Discuss white-label / fractional support',
  href: '/partners',
};

const serviceLabels = [
  ['Company registrations', '/pricing#BAD-REG-ONBOARD-BUNDLE', '/pricing#BAD-REG-ONBOARD-BUNDLE'],
  ['Director changes', '/director-changes', '/pricing#BAD-DIRECTOR-APPT-RESIGN'],
  ['Registered-address changes', '/pricing#BAD-ADDRESS-CHANGE', '/pricing#BAD-ADDRESS-CHANGE'],
  ['Annual returns', '/annual-returns', '/pricing#BAD-ANNUAL-RETURN-BO-CURRENT'],
  ['Beneficial ownership', '/beneficial-ownership', '/pricing#BAD-BO-SIMPLE'],
  ['Company amendments', '/pricing#BAD-FYE-CHANGE', '/pricing#BAD-FYE-CHANGE'],
  ['Statutory records', '/pricing#BAD-SHARE-CERT-VERIFIED', '/pricing#BAD-SHARE-CERT-VERIFIED'],
  ['Existing-company onboarding', '/pricing#BAD-ONBOARD-EXISTING', '/pricing#BAD-ONBOARD-EXISTING'],
];

export const BUSINESS_ADMIN_DESK_HEYGEN_EMBED_URL = 'https://app.heygen.com/embeds/dd040650d267488485a7c2eb8188f592';

export default function BusinessAdminDeskPublicLanding({ videoEmbedUrl = BUSINESS_ADMIN_DESK_HEYGEN_EMBED_URL, internalReview = false }) {
  const visualHero = buildPublicVisualHero('process');

  return (
    <>
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <meta name="robots" content={internalReview ? 'noindex,nofollow' : 'index,follow'} />
        {!internalReview ? <link rel="canonical" href="https://businessadmindesk.co.za/" /> : null}
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        <meta property="og:image" content="/assets/visuals/corpflow-process-hero.jpg" />
        <meta name="theme-color" content="#06111f" />
        <link rel="icon" href={BUSINESS_ADMIN_DESK_MARK_PATH} type="image/svg+xml" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media (max-width: 768px) {
                .business-admin-desk-public [data-cf-public-scrim] {
                  background: linear-gradient(180deg, rgba(3,15,34,0.92) 0%, rgba(3,15,34,0.84) 62%, rgba(3,15,34,0.74) 100%) !important;
                }
              }
              .bad-video-wrap iframe {
                width: 100%;
                aspect-ratio: 16 / 9;
                display: block;
                border: 0;
                border-radius: 18px;
                background: #020817;
              }
            `,
          }}
        />
      </Head>

      <PublicMarketingPhotoGlassShell
        pageClassName="business-admin-desk-public"
        maxWidth={1120}
        hero={visualHero}
        scrimTone="dark"
        scrimStyle={{ background: CORPFLOW_PUBLIC_HERO_SCRIM_DESKTOP }}
        publicScrimHook
        footer={
          <div>
            <div style={{ marginBottom: 8 }}>
              <BusinessAdminDeskBrand compact href="/" />
            </div>
            <p style={{ ...cfBody, margin: 0, fontSize: 13.5 }}>
              Business Admin Desk is a service brand operated by CorpFlowAI Ltd. Integrated company-administration packages for South Africa. Not a government or regulatory service, and not a law firm.
            </p>
            <BusinessAdminDeskLegalFooter internalReview={internalReview} />
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
          <BusinessAdminDeskBrand subtitle="Integrated packages · South Africa" priority />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <a href="/pricing" style={cfBtnSecondary}>Pricing</a>
            <BusinessAdminDeskContactActions {...DIRECT_CONTACT} compact internalReview={internalReview} />
          </div>
        </nav>

        {internalReview ? <BusinessAdminDeskSectionNav currentPath="/" /> : null}

        <HeroGlassBlock
          eyebrow={
            <p style={{ ...cfKicker, marginBottom: 10 }}>
              {internalReview ? 'Internal review · not published' : 'Integrated packages · South Africa'}
            </p>
          }
          title={
            <h1
              style={{
                margin: '0 0 12px',
                fontSize: 'clamp(34px, 6vw, 54px)',
                lineHeight: 1.04,
                letterSpacing: '-0.035em',
                color: CF.text,
                maxWidth: 760,
              }}
            >
              Company administration, managed as one process.
            </h1>
          }
          lead={
            <p style={{ ...cfLead, marginBottom: 0, maxWidth: 760 }}>
              Business Admin Desk sells integrated, software-managed end-to-end packages. Software workflow management and controlled human execution are parts of the same workflow. The package list and one-time fees are published. Online checkout and fully automated filing are not live on this website.
            </p>
          }
          actions={
            <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
              <a href="/pricing" style={cfBtnPrimary}>See package prices</a>
              <BusinessAdminDeskContactActions
                {...DIRECT_CONTACT}
                internalReview={internalReview}
                priority={false}
              />
            </div>
          }
        />

        <section style={{ ...cfSection, marginTop: 34 }} aria-labelledby="bad-video-title">
          <p style={cfKicker}>A quick introduction</p>
          <h2 id="bad-video-title" style={cfH2}>What Business Admin Desk is here to do</h2>
          <p style={{ ...cfBody, maxWidth: 780 }}>
            The short video introduces the service. The current offer is the integrated package list on the pricing page. The video is not a claim that automated filing or online checkout is live.
          </p>

          <GlassPanel variant={{ padding: 14, elevation: 2 }} style={{ marginTop: 14 }}>
            <div className="bad-video-wrap">
              <iframe
                src={videoEmbedUrl}
                title="Business Admin Desk — Clear Company Administration"
                allow="encrypted-media; fullscreen"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </GlassPanel>
        </section>

        <section style={cfSection} aria-labelledby="bad-audience-title">
          <p style={cfKicker}>Two ways we can help</p>
          <h2 id="bad-audience-title" style={cfH2}>Your business, or capacity behind your business</h2>
          <GlassCardGrid minColWidth={300} style={{ marginTop: 16 }}>
            <GlassPanel as="article" variant={{ padding: 24, elevation: 2 }}>
              <p style={{ ...cfKicker, marginBottom: 8 }}>For individual businesses</p>
              <h3 style={{ ...cfH2, fontSize: 21, marginBottom: 10 }}>Choose a published package</h3>
              <p style={{ ...cfBody, marginBottom: 16 }}>
                Start with a named package and its one-time service fee. Government and statutory fees are charged separately. We confirm the company and the information required before any work starts.
              </p>
              <a href="/pricing" style={cfBtnPrimary}>See package prices</a>
            </GlassPanel>

            <GlassPanel as="article" variant={{ padding: 24, elevation: 2 }}>
              <p style={{ ...cfKicker, marginBottom: 8 }}>For companies and service providers</p>
              <h3 style={{ ...cfH2, fontSize: 21, marginBottom: 10 }}>White-label or fractional admin capacity</h3>
              <p style={{ ...cfBody, marginBottom: 16 }}>
                The same integrated packages can sit behind a firm or an internal team. Partner and portfolio rates are confirmed in writing. They are not an automatic discount, and online checkout is not open.
              </p>
              <a href={PARTNER_CTA.href} style={cfBtnSecondary}>{PARTNER_CTA.label}</a>
            </GlassPanel>
          </GlassCardGrid>
        </section>

        <section style={cfSection} aria-labelledby="bad-services-title">
          <p style={cfKicker}>What we help with</p>
          <h2 id="bad-services-title" style={cfH2}>Common company-administration matters</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
            {serviceLabels.map(([label, reviewHref, publicHref]) => {
              const chipStyle = {
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 38,
                padding: '9px 13px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.08)',
                color: CF.text,
                fontSize: 13.5,
                fontWeight: 650,
                textDecoration: 'none',
              };
              const href = internalReview ? reviewHref : publicHref;
              return <a key={label} href={href} style={chipStyle}>{label}</a>;
            })}
          </div>
        </section>

        <section style={cfSection} aria-labelledby="bad-process-title">
          <p style={cfKicker}>Simple process</p>
          <h2 id="bad-process-title" style={cfH2}>One clear step at a time</h2>
          <GlassCardGrid minColWidth={220} style={{ marginTop: 16 }}>
            {[
              ['1', 'Choose a package', 'Review the published one-time service fee and what that package covers.'],
              ['2', 'Confirm the instruction', 'We agree the company, the information required, the service fee and any separate government or statutory fee before work starts.'],
              ['3', 'Carry out the agreed package', 'Software-managed steps and controlled human checks belong to the same workflow. We confirm status with you. This website does not yet run fully automated filing or a live card checkout.'],
            ].map(([number, title, detail]) => (
              <GlassPanel key={number} as="article" variant={{ padding: 20, elevation: 1 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: 12,
                    background: 'rgba(45,212,191,0.18)',
                    color: '#8ff3e5',
                    fontWeight: 800,
                  }}
                >
                  {number}
                </div>
                <h3 style={{ margin: '0 0 8px', color: CF.text, fontSize: 16.5 }}>{title}</h3>
                <p style={{ ...cfBody, margin: 0, fontSize: 14 }}>{detail}</p>
              </GlassPanel>
            ))}
          </GlassCardGrid>
        </section>

        <section style={{ ...cfSection, marginTop: 48 }} aria-labelledby="bad-cta-title">
          <GlassPanel
            variant={{
              fill: 'rgba(45,212,191,0.10)',
              border: 'rgba(45,212,191,0.30)',
              padding: 28,
              elevation: 2,
            }}
          >
            <p style={cfKicker}>Next step</p>
            <h2 id="bad-cta-title" style={cfH2}>See the package before you instruct us</h2>
            <p style={{ ...cfBody, maxWidth: 760 }}>
              Start with the published package and fee. If the matter sits outside those packages, ask us and we will confirm whether it needs a separate quote. Online checkout is not available.
            </p>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
              <a href="/pricing" style={cfBtnPrimary}>See package prices</a>
              <BusinessAdminDeskContactActions
                {...DIRECT_CONTACT}
                internalReview={internalReview}
                priority={false}
                secondary={<a href={PARTNER_CTA.href} style={cfBtnSecondary}>{PARTNER_CTA.label}</a>}
              />
            </div>
          </GlassPanel>
        </section>
      </PublicMarketingPhotoGlassShell>
    </>
  );
}
