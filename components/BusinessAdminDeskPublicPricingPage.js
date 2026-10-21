import React from 'react';
import Head from 'next/head';

import BusinessAdminDeskBrand, { BUSINESS_ADMIN_DESK_MARK_PATH } from './BusinessAdminDeskBrand.js';
import BusinessAdminDeskContactActions from './BusinessAdminDeskContactActions.js';
import BusinessAdminDeskLegalFooter from './BusinessAdminDeskLegalFooter.js';
import BusinessAdminDeskPackageTable from './BusinessAdminDeskPackageTable.js';
import GlassPanel from './beauty/GlassPanel.js';
import HeroGlassBlock from './beauty/HeroGlassBlock.js';
import PublicMarketingPhotoGlassShell from './beauty/PublicMarketingPhotoGlassShell.js';
import {
  BAD_CHECKOUT_NOTE,
  BAD_PACKAGE_MODEL_NOTE,
  BAD_STATUTORY_FEE_NOTE,
  BUSINESS_ADMIN_DESK_PUBLIC_ORIGIN,
} from '../lib/public/business-admin-desk-packages.js';
import { buildPublicVisualHero } from '../lib/public/corpflow-public-visuals.js';
import { CF, cfBody, cfH2, cfKicker, cfLead } from './public/corpflow-public-styles.js';

const PAGE_TITLE = 'Business Admin Desk · Package prices';
const PAGE_DESCRIPTION =
  'One-time ZAR service fees for Business Admin Desk company-administration packages. Government and statutory fees are separate. Online checkout is not available.';

const linkStyle = { color: '#7dd3fc' };

export default function BusinessAdminDeskPublicPricingPage() {
  const visualHero = buildPublicVisualHero('process');
  return (
    <>
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={`${BUSINESS_ADMIN_DESK_PUBLIC_ORIGIN}/pricing`} />
        <link rel="icon" href={BUSINESS_ADMIN_DESK_MARK_PATH} type="image/svg+xml" />
      </Head>
      <PublicMarketingPhotoGlassShell
        pageClassName="business-admin-desk-pricing"
        maxWidth={1120}
        hero={visualHero}
        scrimTone="dark"
        footer={
          <div>
            <BusinessAdminDeskBrand compact href="/" />
            <p style={{ ...cfBody, margin: '8px 0 0', fontSize: 13.5 }}>
              Business Admin Desk is a service brand operated by CorpFlowAI Ltd. {BAD_CHECKOUT_NOTE}
            </p>
            <BusinessAdminDeskLegalFooter />
          </div>
        }
      >
        <nav aria-label="Business Admin Desk" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
          <BusinessAdminDeskBrand subtitle="Package prices · South Africa" href="/" priority />
          <a href="/" style={linkStyle}>Home</a>
        </nav>
        <HeroGlassBlock
          eyebrow={<p style={{ ...cfKicker, marginBottom: 10 }}>One-time service fees · ZAR</p>}
          title={
            <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(34px, 6vw, 52px)', lineHeight: 1.05, color: CF.text, maxWidth: 760 }}>
              Published package prices
            </h1>
          }
          lead={
            <p style={{ ...cfLead, marginBottom: 0, maxWidth: 760 }}>
              {BAD_PACKAGE_MODEL_NOTE} {BAD_CHECKOUT_NOTE}
            </p>
          }
        />
        <GlassPanel variant={{ padding: 22, elevation: 2 }} style={{ marginTop: 28, minWidth: 0 }}>
          <h2 style={cfH2}>Nine approved packages</h2>
          <p style={cfBody}>{BAD_STATUTORY_FEE_NOTE}</p>
          <p style={cfBody}>
            Whether these ZAR amounts include VAT is an open commercial decision. It is marked on the terms page and is not decided here.
          </p>
          <BusinessAdminDeskPackageTable />
        </GlassPanel>
        <GlassPanel variant={{ padding: 22, elevation: 1 }} style={{ marginTop: 20 }}>
          <h2 style={{ ...cfH2, fontSize: 22 }}>Before you instruct a package</h2>
          <ul style={{ ...cfBody, paddingLeft: 20 }}>
            <li>Confirm the company and the information the package needs.</li>
            <li>Confirm the service fee and any separate government or statutory fee in writing.</li>
            <li>Work outside these nine packages, including complex structures and cleanup, is quoted separately.</li>
            <li>No authority approval or turnaround is guaranteed.</li>
          </ul>
          <p style={cfBody}>
            <a href="/terms" style={linkStyle}>Terms</a>
            {' · '}
            <a href="/privacy" style={linkStyle}>Privacy</a>
            {' · '}
            <a href="/refund-policy" style={linkStyle}>Refund / cancellation</a>
            {' · '}
            <a href="mailto:info@businessadmindesk.co.za" style={linkStyle}>info@businessadmindesk.co.za</a>
          </p>
          <BusinessAdminDeskContactActions
            label="Ask about a package"
            subject="Business Admin Desk package question"
            body={`Hi Business Admin Desk,

I have a question about a published package.

Package code:

Company name:

You can reply to me on this email.`}
          />
        </GlassPanel>
      </PublicMarketingPhotoGlassShell>
    </>
  );
}
