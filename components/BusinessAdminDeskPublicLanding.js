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

const PAGE_TITLE = 'Business Admin Desk · Company administration support';
const PAGE_DESCRIPTION =
  'Business Admin Desk helps South African businesses and professional service providers with practical company administration, plus white-label and fractional support.';

const DIRECT_CONTACT = {
  label: "Tell us what's going on",
  subject: 'Business Admin Desk enquiry',
  body: `Hi Business Admin Desk,

I need help with a company-administration matter.

What has happened / what I need help with:

Company name:

You can reply to me on this email.`,
};

const PARTNER_CTA = {
  label: 'Discuss white-label / fractional support',
  href: '/partners',
};

const serviceLabels = [
  'Company registrations',
  'Director changes',
  'Registered-address changes',
  'Annual returns',
  'Beneficial ownership',
  'Company amendments',
  'Statutory records',
  'Ongoing administration',
];

export const BUSINESS_ADMIN_DESK_HEYGEN_EMBED_URL = 'https://app.heygen.com/embeds/24cebb01a1b240158c77771c103542da';

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
          <BusinessAdminDeskContactActions {...DIRECT_CONTACT} compact />
        </nav>

        <HeroGlassBlock
          eyebrow={
            <p style={{ ...cfKicker, marginBottom: 10 }}>
              {internalReview ? 'Internal review · not published' : 'Company administration, without the admin burden'}
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
              You run the business. We help with the administration.
            </h1>
          }
          lead={
            <p style={{ ...cfLead, marginBottom: 0, maxWidth: 760 }}>
              Practical, human company-administration support for your own business — or reliable white-label and fractional capacity behind your team, firm or service business.
            </p>
          }
          actions={
            <div style={{ marginTop: 18 }}>
              <BusinessAdminDeskContactActions
                {...DIRECT_CONTACT}
                secondary={<a href={PARTNER_CTA.href} style={cfBtnSecondary}>{PARTNER_CTA.label}</a>}
              />
            </div>
          }
        />

        <section style={{ ...cfSection, marginTop: 34 }} aria-labelledby="bad-video-title">
          <p style={cfKicker}>A quick introduction</p>
          <h2 id="bad-video-title" style={cfH2}>What Business Admin Desk is here to do</h2>
          <p style={{ ...cfBody, maxWidth: 780 }}>
            Watch the short overview first. It explains the service more clearly than a wall of compliance text.
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
              <h3 style={{ ...cfH2, fontSize: 21, marginBottom: 10 }}>Get the company administration handled</h3>
              <p style={{ ...cfBody, marginBottom: 16 }}>
                Tell us the company matter you are dealing with. We help clarify what is needed, scope the work and handle the agreed administration while keeping you informed.
              </p>
              <BusinessAdminDeskContactActions {...DIRECT_CONTACT} />
            </GlassPanel>

            <GlassPanel as="article" variant={{ padding: 24, elevation: 2 }}>
              <p style={{ ...cfKicker, marginBottom: 8 }}>For companies and service providers</p>
              <h3 style={{ ...cfH2, fontSize: 21, marginBottom: 10 }}>White-label or fractional admin capacity</h3>
              <p style={{ ...cfBody, marginBottom: 16 }}>
                Add experienced company-administration capacity without adding permanent headcount. We can work behind accounting, tax, advisory and other professional-service firms, or support an internal team that needs extra specialist capacity.
              </p>
              <a href={PARTNER_CTA.href} style={cfBtnSecondary}>{PARTNER_CTA.label}</a>
            </GlassPanel>
          </GlassCardGrid>
        </section>

        <section style={cfSection} aria-labelledby="bad-services-title">
          <p style={cfKicker}>What we help with</p>
          <h2 id="bad-services-title" style={cfH2}>Common company-administration matters</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
            {serviceLabels.map((label) => (
              <span
                key={label}
                style={{
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
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </section>

        <section style={cfSection} aria-labelledby="bad-process-title">
          <p style={cfKicker}>Simple process</p>
          <h2 id="bad-process-title" style={cfH2}>One clear step at a time</h2>
          <GlassCardGrid minColWidth={220} style={{ marginTop: 16 }}>
            {[
              ['1', 'Tell us what you need help with', 'Give us the situation in plain English. You do not need to diagnose the process first.'],
              ['2', 'We review and scope it', 'We confirm what information is needed, what we can handle and any boundaries before work begins.'],
              ['3', 'We handle the agreed administration', 'You receive clear status and next-step communication instead of being left to chase the process.'],
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
            <h2 id="bad-cta-title" style={cfH2}>Start with the problem, not the paperwork</h2>
            <p style={{ ...cfBody, maxWidth: 760 }}>
              If it is your own company, tell us what you need help with. If you need capacity behind your firm or team, tell us what work you want handled and how you want us to operate alongside you.
            </p>
            <div style={{ marginTop: 10 }}>
              <BusinessAdminDeskContactActions
                {...DIRECT_CONTACT}
                secondary={<a href={PARTNER_CTA.href} style={cfBtnSecondary}>{PARTNER_CTA.label}</a>}
              />
            </div>
          </GlassPanel>
        </section>
      </PublicMarketingPhotoGlassShell>
    </>
  );
}
