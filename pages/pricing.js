import React, { useState } from 'react';
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

const products = {
  lead: 'Lead Rescue',
  website: 'Website Rescue',
  automation: 'Business automation',
};

const descriptions = {
  lead: 'For one business and one supported enquiry source, up to 500 enquiry records per month. We map the enquiry path, configure agreed capture and alerts, test it with you and obtain acceptance. Your team replies to prospects and closes sales.',
  website: 'Starting setup covers one premium landing page or a similarly bounded repair, mobile and enquiry-path checks, and two consolidated review rounds. Larger rebuilds, e-commerce and extra functions receive a separate quote.',
  automation: 'We scope your workflow and agree a fixed price for deliverables, testing and handover. Access, dependencies, acceptance and separate software costs are confirmed before work starts.',
};

export default function PricingPage() {
  const [product, setProduct] = useState('');
  const [currency, setCurrency] = useState('');
  const rate = APPROVED_REGIONAL_PRICES[currency];
  const title = products[product];
  const meta = buildPublicPageMeta({
    title: 'Service pricing',
    description:
      'Choose the business problem, review setup and optional monthly care, then request an assessment.',
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
      <HeroGlassBlock style={{ marginTop: 32 }}>
        <p>Standard business services</p>
        <h1>Make enquiries and website problems easier to act on.</h1>
        <p>
          Choose the problem you want to solve. Review the scope and regional fees, then ask us to
          confirm fit and delivery timing.
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
      </HeroGlassBlock>
      {product ? (
        <section style={{ marginTop: 32 }} aria-label="Selected service">
          <GlassPanel>
            <h2>{title}</h2>
            <p>{descriptions[product]}</p>
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
              compliance. No 24/7 staffed response is included.
            </p>
            <h3>Can I see an example?</h3>
            <p>
              <a href="/demo/website-rescue">View the fictional Website Rescue before/after example</a>.
              Examples illustrate a process, not a promised customer result.
            </p>
            <h3>Is this the Enquiry Recovery Sprint?</h3>
            <p>
              No. That is a separate scoped Mauritius recovery engagement. These standard fees do
              not reprice an accepted sprint quote.
            </p>
          </GlassPanel>
        </section>
      ) : null}
    </PublicMarketingPhotoGlassShell>
  );
}
