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

const PARTNER_CONTACT = {
  label: 'Discuss white-label / fractional support',
  subject: 'Business Admin Desk - White-label / fractional support',
  body: `Hi Business Admin Desk,

We are looking for additional company-administration capacity.

Our business / firm:

The type of support we need:

Approximate volume or immediate requirement:

Please contact me to discuss.`,
};

export default function BusinessAdminDeskPartnerLanding({ internalReview = false }) {
  const pageTitle = 'Business Admin Desk · White-label and fractional support';
  const description =
    'White-label and fractional company-administration support for South African accounting, tax, advisory and professional-service firms.';
  const visualHero = buildPublicVisualHero('services') || buildPublicVisualHero('process');

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta name="robots" content={internalReview ? 'noindex,nofollow' : 'index,follow'} />
        {!internalReview ? <link rel="canonical" href="https://businessadmindesk.co.za/partners" /> : null}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta name="theme-color" content="#06111f" />
        <link rel="icon" href={BUSINESS_ADMIN_DESK_MARK_PATH} type="image/svg+xml" />
      </Head>

      <PublicMarketingPhotoGlassShell
        pageClassName="business-admin-desk-partners"
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
          <BusinessAdminDeskContactActions {...PARTNER_CONTACT} compact />
        </nav>

        <HeroGlassBlock
          eyebrow={
            <p style={{ ...cfKicker, marginBottom: 10 }}>
              {internalReview ? 'Internal review · partner support' : 'For companies and service providers'}
            </p>
          }
          title={
            <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(34px, 6vw, 52px)', lineHeight: 1.05, color: CF.text, maxWidth: 820 }}>
              Specialist company-administration capacity behind your firm.
            </h1>
          }
          lead={
            <p style={{ ...cfLead, marginBottom: 0, maxWidth: 800 }}>
              Add experienced white-label or fractional capacity without adding permanent headcount — while your firm keeps the client relationship.
            </p>
          }
          actions={
            <div style={{ marginTop: 18 }}>
              <BusinessAdminDeskContactActions
                {...PARTNER_CONTACT}
                secondary={<a href="/" style={cfBtnSecondary}>Need help with your own company?</a>}
              />
            </div>
          }
        />

        <section style={cfSection} aria-labelledby="partner-fit-title">
          <p style={cfKicker}>Who this is for</p>
          <h2 id="partner-fit-title" style={cfH2}>Capacity for firms that already have the clients</h2>
          <GlassCardGrid minColWidth={280} style={{ marginTop: 16 }}>
            {[
              ['Accounting and tax firms', 'Add company-administration capacity when client needs extend beyond the work your core team wants to carry.'],
              ['Advisory and professional-service firms', 'Keep the client relationship while specialist administration is handled behind your service.'],
              ['Internal company teams', 'Use fractional capacity when workload spikes or specialist administration does not justify a permanent role.'],
            ].map(([title, detail]) => (
              <GlassPanel key={title} as="article" variant={{ padding: 22, elevation: 1 }}>
                <h3 style={{ margin: '0 0 8px', color: CF.text, fontSize: 17 }}>{title}</h3>
                <p style={{ ...cfBody, margin: 0 }}>{detail}</p>
              </GlassPanel>
            ))}
          </GlassCardGrid>
        </section>

        <section style={cfSection} aria-labelledby="partner-work-title">
          <p style={cfKicker}>What we can sit behind</p>
          <h2 id="partner-work-title" style={cfH2}>Practical company-administration support</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
            {[
              'Company administration',
              'Annual returns',
              'Beneficial ownership',
              'Director and shareholder changes',
              'Statutory records',
              'Resolutions and minutes',
              'Governance and compliance calendars',
            ].map((label) => (
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

        <section style={cfSection} aria-labelledby="partner-method-title">
          <p style={cfKicker}>How it works</p>
          <h2 id="partner-method-title" style={cfH2}>Use us as overflow, fractional or white-label capacity</h2>
          <GlassCardGrid minColWidth={220} style={{ marginTop: 16 }}>
            {[
              ['1', 'Send the matter or workload', 'Refer one matter, a backlog, or an ongoing category of work.'],
              ['2', 'Agree the operating boundary', 'We confirm scope, presentation, client-contact rules and evidence expectations before work begins.'],
              ['3', 'We work behind your chosen model', 'Delivery can sit behind your firm, support your internal team, or use a named specialist where you prefer.'],
              ['4', 'You keep the relationship', 'Status and completion evidence return to your firm in the agreed format.'],
            ].map(([n, title, detail]) => (
              <GlassPanel key={n} as="article" variant={{ padding: 20, elevation: 1 }}>
                <div style={{ color: '#8ff3e5', fontWeight: 800, marginBottom: 8 }}>{n}</div>
                <h3 style={{ margin: '0 0 8px', color: CF.text, fontSize: 16.5 }}>{title}</h3>
                <p style={{ ...cfBody, margin: 0 }}>{detail}</p>
              </GlassPanel>
            ))}
          </GlassCardGrid>
        </section>

        <section style={cfSection} aria-labelledby="partner-boundary-title">
          <p style={cfKicker}>Commercial boundary</p>
          <h2 id="partner-boundary-title" style={cfH2}>Scoped before work starts</h2>
          <GlassPanel variant={{ padding: 24, elevation: 2 }} style={{ marginTop: 14 }}>
            <p style={{ ...cfBody, margin: 0 }}>
              White-label and fractional support is agreed around the work you actually need. We do not publish a generic fee table, promise filing outcomes, or take over your client relationship by default.
            </p>
          </GlassPanel>
        </section>

        <section style={{ ...cfSection, marginTop: 46 }} aria-labelledby="partner-cta-title">
          <GlassPanel
            variant={{
              fill: 'rgba(45,212,191,0.10)',
              border: 'rgba(45,212,191,0.30)',
              padding: 28,
              elevation: 2,
            }}
          >
            <p style={cfKicker}>Next step</p>
            <h2 id="partner-cta-title" style={cfH2}>Tell us where your team needs capacity</h2>
            <p style={{ ...cfBody, maxWidth: 760 }}>
              A short description of the workload, client volume or service gap is enough to start. We will confirm whether the fit is sensible and how the support could operate behind your business.
            </p>
            <BusinessAdminDeskContactActions {...PARTNER_CONTACT} />
          </GlassPanel>
        </section>
      </PublicMarketingPhotoGlassShell>
    </>
  );
}
