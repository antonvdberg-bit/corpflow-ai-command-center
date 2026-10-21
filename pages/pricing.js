import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';

import {
  APPROVED_REGIONAL_PRICES,
  STANDARD_PACKAGE_PAYMENT_NOTE,
} from '../lib/public/regional-service-pricing.js';
import { CUSTOMER_SERVICE_EMAIL } from '../lib/public/merchant-identity.js';
import { buildPublicPageMeta } from '../lib/public/corpflow-public-market.js';
import CorpFlowPublicHeader from '../components/public/CorpFlowPublicHeader.js';
import CorpFlowPublicFooter from '../components/public/CorpFlowPublicFooter.js';
import PublicMarketingPhotoGlassShell from '../components/beauty/PublicMarketingPhotoGlassShell.js';
import GlassPanel from '../components/beauty/GlassPanel.js';
import HeroGlassBlock from '../components/beauty/HeroGlassBlock.js';
import { cfBtnPrimary, cfBtnSecondary } from '../components/public/corpflow-public-styles.js';
import BusinessAdminDeskPricingReviewPage from '../components/BusinessAdminDeskPricingReviewPage.js';
import BusinessAdminDeskPublicPricingPage from '../components/BusinessAdminDeskPublicPricingPage.js';
import { resolveBusinessAdminDeskSurface } from '../lib/public/business-admin-desk-packages.js';
import { normalizeHostname } from '../lib/server/cipc-desk-runtime.js';

const products = {
  lead: 'Lead Rescue',
  website: 'Website Rescue',
  automation: 'Business automation',
};

const productLinks = {
  lead: { href: '/lead-rescue', label: 'Explore Lead Rescue' },
  website: { href: '/website-rescue', label: 'Explore Website Rescue' },
  automation: { href: '/contact#discovery', label: 'Discuss your automation workflow' },
};

const descriptions = {
  lead: 'Software for one business and one supported enquiry source, up to 500 enquiry records per month. It maps the enquiry path, configures agreed capture and alerts, and is tested with you before acceptance. Your team replies to prospects and closes sales.',
  website: 'Starting setup covers one premium landing page or a similarly bounded website repair, mobile and enquiry-path checks, and two consolidated review rounds. Larger rebuilds, e-commerce and extra functions receive a separate quote.',
  automation: 'A configured workflow with agreed outcomes, testing and handover. The written quote states milestones, access, dependencies, acceptance and any separate software costs before work starts.',
};

export default function PricingPage({ host = '' }) {
  const surface = resolveBusinessAdminDeskSurface(host);
  if (surface === 'staging') {
    return <BusinessAdminDeskPricingReviewPage />;
  }
  if (surface === 'public') {
    return <BusinessAdminDeskPublicPricingPage />;
  }
  const [product, setProduct] = useState('');
  const [currency, setCurrency] = useState('');
  const detailsRef = useRef(null);
  useEffect(() => {
    if (!product || !detailsRef.current) return;
    const details = detailsRef.current;
    details.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    details.focus({ preventScroll: true });
  }, [product]);
  const rate = APPROVED_REGIONAL_PRICES[currency];
  const title = products[product];
  const meta = buildPublicPageMeta({
    title: 'Software package pricing',
    description:
      'CorpFlowAI Ltd software and workflow automation packages. Choose Lead Rescue, Website Rescue or business automation, review the approved regional price, then request an assessment.',
    path: '/pricing',
    ogImage: '/assets/visuals/lead-rescue-property-reception-hero-v1.jpg',
  });
  const money = (value) => `${currency} ${value.toLocaleString('en-US')}`;
  const care =
    product === 'lead'
      ? 'Monthly care: supported automated health checks, internal exception triage on working days, weekly review, a monthly recap and up to 60 minutes of agreed improvements. Automated cadence is confirmed for your installation before purchase.'
      : 'Monthly care: one supported site of up to five pages, weekly health checks, monthly enquiry-path and technical search checks, a report and up to 60 minutes of minor improvements.';
  const mailto =
    `mailto:${CUSTOMER_SERVICE_EMAIL}?subject=` +
    encodeURIComponent(`Assessment request — ${title || 'CorpFlowAI'}`) +
    '&body=' +
    encodeURIComponent(
      `Please assess my fit for the standard ${title || 'service'} package.\nMarket/currency: ${currency}\nBusiness name:\nWebsite or workflow:\nProblem and desired outcome:\nTiming:\n`,
    );

  return (
    <PublicMarketingPhotoGlassShell
      maxWidth={1120}
      scrimTone="dark"
      hero={{
        base: '/assets/visuals/lead-rescue-property-reception-hero-v1',
        objectPosition: 'center 35%',
        alt: '',
      }}
      footer={<CorpFlowPublicFooter />}
    >
      <Head>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={meta.canonical} />
      </Head>
      <CorpFlowPublicHeader />
      <HeroGlassBlock style={{ marginTop: 32, minWidth: 0, boxSizing: 'border-box' }}>
        <p>CorpFlowAI Ltd · software and workflow automation</p>
        <h1 style={{ overflowWrap: 'anywhere' }}>
          Make enquiries and website problems easier to act on.
        </h1>
        <p style={{ overflowWrap: 'anywhere' }}>
          These are the current configured software packages. Choose one, review the approved regional
          price and what is included, then ask us to confirm fit and delivery timing.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
          {Object.entries(products).map(([key, label]) => (
            <button
              type="button"
              key={key}
              aria-pressed={product === key}
              style={product === key ? cfBtnPrimary : cfBtnSecondary}
              onClick={() => {
                setProduct(key);
                setCurrency('');
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p role="status" aria-live="polite" style={{ marginTop: 14 }}>
          {product ? `${products[product]} selected. Review the package details below.` : 'Select a service to explore its scope and pricing.'}
        </p>
      </HeroGlassBlock>
      {product ? (
        <section ref={detailsRef} tabIndex={-1} style={{ marginTop: 32, minWidth: 0, outlineOffset: 8 }} aria-label="Selected service">
          <GlassPanel style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            <h2>{title}</h2>
            <p>{descriptions[product]}</p>
            <p>
              <a href={productLinks[product].href}>{productLinks[product].label}</a>
            </p>
            <label htmlFor="pricing-market">Where is your business based?</label>
            <select
              id="pricing-market"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              style={{
                display: 'block',
                marginTop: 12,
                padding: 12,
                maxWidth: '100%',
                background: '#132c45',
                color: 'white',
              }}
            >
              <option value="">Select your market</option>
              {Object.entries(APPROVED_REGIONAL_PRICES).map(([code, price]) => (
                <option key={code} value={code}>
                  {price.market} — {code}
                </option>
              ))}
            </select>
            <p>
              Another market? <a href="/contact#discovery">Ask for a quote</a>.
            </p>
            {rate ? (
              <div aria-live="polite" style={{ marginTop: 20 }}>
                {product === 'automation' ? (
                  <p>
                    <strong>Starting project scope from {money(rate.automationFrom)}.</strong> Your
                    written quote specifies the accepted outcomes and milestones.
                  </p>
                ) : (
                  <>
                    <p>
                      <strong>
                        {product === 'website' ? 'Setup from ' : 'Setup: '}
                        {money(product === 'lead' ? rate.leadSetup : rate.websiteSetup)}
                      </strong>
                    </p>
                    <p>
                      <strong>
                        Optional monthly care:{' '}
                        {money(product === 'lead' ? rate.leadMonthly : rate.websiteMonthly)} / month
                      </strong>
                    </p>
                    <p>{care}</p>
                    <p>
                      Standard setup: 50% before work; balance before agreed release or handover.
                      Monthly care is billed in advance after explicit opt-in.
                    </p>
                  </>
                )}
                <p>{STANDARD_PACKAGE_PAYMENT_NOTE}</p>
                <a href={mailto} style={cfBtnPrimary}>
                  Request an assessment
                </a>
              </div>
            ) : null}
          </GlassPanel>
          <GlassPanel style={{ marginTop: 24 }}>
            <h2>What happens next</h2>
            <ol>
              <li>We check your environment, access and the change needed.</li>
              <li>We agree scope, timing, price and acceptance.</li>
              <li>We implement, test and show you the result.</li>
              <li>After acceptance, you choose whether to continue monthly care.</li>
            </ol>
            <h3>What is separate?</h3>
            <p>
              Paid media, third-party licences, hosting changes, major new work and after-hours
              support are quoted separately. We do not guarantee rankings, revenue or complete legal
              compliance. Round-the-clock response is not included. Support follows the hours in the
              written package.
            </p>
            <p>
              <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> ·{' '}
              <a href="/refund-policy">Refund / cancellation</a> · <a href="/delivery-policy">Delivery</a> ·{' '}
              <a href="/payment-security">Payment security</a> · <a href="/contact">Contact</a>
            </p>
            <p>
              These are CorpFlowAI service prices. Business Admin Desk packages are published separately at{' '}
              <a href="https://businessadmindesk.co.za/pricing">businessadmindesk.co.za/pricing</a>.
            </p>
            <h3>Can I see an example?</h3>
            <p>
              <a href="/demo/website-rescue">View the fictional Website Rescue before/after example</a>.
              Examples illustrate a process, not a promised customer result.
            </p>
              <h3>Does this change my accepted quote?</h3>
            <p>
              No. Existing accepted quotations keep their agreed terms. New work uses the permanent
              regional package prices shown here.
            </p>
          </GlassPanel>
        </section>
      ) : null}
    </PublicMarketingPhotoGlassShell>
  );
}

export function getServerSideProps({ req }) {
  const host = normalizeHostname(req?.headers?.host);
  return { props: { host } };
}
