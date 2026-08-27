import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { trackEvent } from '../lib/analytics/index.js';
import { MERCHANT_LEGAL_NAME } from '../lib/public/merchant-identity.js';
import {
  OFFER_FAQ_BY_SLUG,
  OFFER_NOT_INCLUDED_BY_SLUG,
  buildPublicPageMeta,
  formatMur,
} from '../lib/public/corpflow-public-market.js';
import { buildDiscoveryCallMailto } from '../lib/public/rapid-delivery-offers.js';
import { canonicalEnquiryHref } from '../lib/public/canonical-enquiry.js';
import CorpFlowPublicFooter from './public/CorpFlowPublicFooter.js';
import CorpFlowPublicHeader from './public/CorpFlowPublicHeader.js';
import CorpFlowBrandMetadata from './public/CorpFlowBrandMetadata.js';
import DiscoveryIntakeForm from './public/DiscoveryIntakeForm.js';
import PublicMarketingPhotoGlassShell from './beauty/PublicMarketingPhotoGlassShell.js';
import GlassPanel from './beauty/GlassPanel.js';
import GlassCardGrid from './beauty/GlassCardGrid.js';
import HeroGlassBlock from './beauty/HeroGlassBlock.js';
import CtaGlassBlock from './beauty/CtaGlassBlock.js';
import { GLASS_TOKENS } from '../lib/ui/glass.js';
import { cfBtnPrimary, cfBtnSecondary } from './public/corpflow-public-styles.js';
import PublishingVideoSection from './public/PublishingVideoSection.js';
import { getVideosForOffer } from '../lib/public/insights-content.js';

const text = GLASS_TOKENS.text;
const muted = '#cdd9e6';
const faint = '#9fb2c4';

const styles = {
  label: { fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7dd3fc', fontWeight: 800 },
  h1: {
    margin: '14px 0 0',
    fontSize: 'clamp(34px, 5.8vw, 58px)',
    lineHeight: 1.04,
    letterSpacing: '-0.04em',
    maxWidth: 760,
    color: text,
  },
  lead: { marginTop: 20, fontSize: 'clamp(17px, 1.9vw, 21px)', lineHeight: 1.55, color: muted, maxWidth: 720 },
  section: { marginTop: 28 },
  h2: { margin: '8px 0 0', fontSize: 'clamp(24px, 3vw, 30px)', letterSpacing: '-0.03em', color: text },
  muted: { color: '#bccdde', lineHeight: 1.65, margin: '12px 0 0' },
  list: { margin: '14px 0 0', paddingLeft: 18, color: '#e0ecf7', lineHeight: 1.8 },
  priceBox: {
    marginTop: 16,
    padding: '14px 16px',
    borderRadius: 14,
    background: 'rgba(45,212,191,0.10)',
    border: '1px solid rgba(45,212,191,0.28)',
    color: '#d6f5ef',
    lineHeight: 1.6,
  },
  note: { marginTop: 14, fontSize: 14, color: faint, lineHeight: 1.65, maxWidth: 720 },
  link: { color: '#7dd3fc', textDecoration: 'none' },
  faqItem: { marginTop: 16 },
  faqQ: { fontWeight: 700, color: text, margin: '0 0 6px' },
  faqA: { margin: 0, color: muted, lineHeight: 1.65, fontSize: 14.5 },
};

/**
 * Shared rapid-delivery offer surface for /offers/* routes and named
 * specialist landings (e.g. `/website-rescue`).
 * CTA: in-page discovery form — no runtime email send, no payment collection.
 *
 * @param {{
 *   offer: import('../lib/public/rapid-delivery-offers.js').RapidDeliveryOffer,
 *   buyerFacingName?: string,
 *   pathOverride?: string,
 * }} props
 */
export default function RapidDeliveryOfferPage({ offer, buyerFacingName, pathOverride }) {
  const mailtoHref = buildDiscoveryCallMailto(offer);
  const lockedEnquiryHref = canonicalEnquiryHref({ offer: offer.slug });
  const pagePath = pathOverride || offer.path;
  const publicTitle = buyerFacingName || offer.title;
  const meta = buildPublicPageMeta({
    title: publicTitle,
    description: offer.metaDescription,
    path: pagePath,
    ogImage: `${offer.heroBase}.jpg`,
  });
  const faq = OFFER_FAQ_BY_SLUG[offer.slug] || [];
  const notIncluded = OFFER_NOT_INCLUDED_BY_SLUG[offer.slug] || [];
  const offerVideos = getVideosForOffer(offer.slug);

  const heroBase = offer.heroBase;
  const heroSources = [
    { type: 'image/avif', media: '(max-width: 768px)', srcSet: `${heroBase}-768.avif` },
    { type: 'image/webp', media: '(max-width: 768px)', srcSet: `${heroBase}-768.webp` },
    { media: '(max-width: 768px)', srcSet: `${heroBase}-768.jpg` },
    { type: 'image/avif', srcSet: `${heroBase}.avif` },
    { type: 'image/webp', srcSet: `${heroBase}.webp` },
  ];
  const heroPreloadSrcSet = `${heroBase}-768.avif 768w, ${heroBase}.avif 2400w`;

  function handleCtaClick(location) {
    trackEvent('revenue_offer_cta_click', { props: { offer: offer.slug, location } });
  }

  const footer = (
    <CorpFlowPublicFooter
      extra={`${offer.title} — ${MERCHANT_LEGAL_NAME}. Discovery call only on this page; no card or banking details collected here. Deposit and quote follow manual review.`}
    />
  );

  return (
    <>
      <CorpFlowBrandMetadata />
      <Head>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={meta.canonical} />
        <meta property="og:title" content={meta.ogTitle} />
        <meta property="og:description" content={meta.ogDescription} />
        <meta property="og:url" content={meta.ogUrl} />
        <meta property="og:image" content={meta.ogImage} />
        <meta name="twitter:card" content={meta.twitterCard} />
      </Head>

      <PublicMarketingPhotoGlassShell
        pageClassName={`revenue-offer-${offer.slug}`}
        maxWidth={1120}
        scrimTone="dark"
        footer={footer}
        hero={{
          base: heroBase,
          sources: heroSources,
          preloadSrcSet: heroPreloadSrcSet,
          objectPosition: offer.heroObjectPosition || 'center 40%',
          alt: `${offer.title} — CorpFlowAI delivery sprint`,
        }}
      >
        <CorpFlowPublicHeader cta={{ label: 'Request discovery', href: '#discovery' }} />

        <GlassCardGrid minColWidth={300} gap={24} style={{ marginTop: 32, alignItems: 'start' }}>
          <HeroGlassBlock>
            <div style={styles.label}>
              {buyerFacingName || 'Rapid visible delivery · Mauritius'}
            </div>
            <h1 style={styles.h1}>{offer.headline}</h1>
            {buyerFacingName ? (
              <p style={{ ...styles.note, marginTop: 12, maxWidth: 720 }}>
                A bounded landing-page rescue with a working enquiry path — not a months-long
                rebuild.
              </p>
            ) : null}
            <p style={styles.lead}>{offer.subhead}</p>
            <div style={styles.priceBox}>
              <strong>Starting from {formatMur(offer.startingPriceMur)}</strong>
              <div style={{ marginTop: 6, fontSize: 14, opacity: 0.95 }}>
                Final scope confirmed after discovery. Third-party fees quoted separately where applicable.
              </div>
              <div style={{ marginTop: 6, fontSize: 14, opacity: 0.95 }}>
                Deposit: {offer.depositNote} · {offer.deliveryTimeline.split('.')[0]}.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
              <a
                style={{ ...cfBtnPrimary, boxShadow: GLASS_TOKENS.ctaWarmShadow, background: GLASS_TOKENS.ctaWarm, color: GLASS_TOKENS.ctaWarmText }}
                href="#discovery"
                onClick={() => handleCtaClick('hero_primary')}
              >
                Request discovery
              </a>
              <Link href={lockedEnquiryHref} style={cfBtnSecondary} onClick={() => handleCtaClick('hero_secondary')}>
                Open contact page
              </Link>
            </div>
          </HeroGlassBlock>

          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 22, elevation: 2 }}>
            <div style={styles.label}>Business outcome</div>
            <h2 style={styles.h2}>What changes when this sprint lands</h2>
            <p style={styles.muted}>{offer.outcome}</p>
          </GlassPanel>
        </GlassCardGrid>

        {offer.demoPath ? (
          <div style={styles.section} data-website-rescue-proof>
            <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 24, elevation: 2 }}>
              <div style={styles.label}>Proof · see it working</div>
              <h2 style={styles.h2}>See a synthetic before and after</h2>
              <p style={styles.muted}>
                Walk a fictional business from a weak landing page to a clearer mobile enquiry path.
                No private client names or private operator systems on this demo.
              </p>
              <div style={{ marginTop: 16 }}>
                <Link
                  href={offer.demoPath}
                  style={{ ...cfBtnSecondary }}
                  onClick={() => handleCtaClick('proof_demo')}
                >
                  Open the Website Rescue demo
                </Link>
              </div>
            </GlassPanel>
          </div>
        ) : null}

        <div style={styles.section}>
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 24, elevation: 2 }}>
            <div style={styles.label}>Who this is for</div>
            <ul style={styles.list}>
              {offer.audience.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </GlassPanel>
        </div>

        <div style={styles.section}>
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 24, elevation: 2 }}>
            <div style={styles.label}>What is delivered</div>
            <h2 style={styles.h2}>Visible output within 24–72 hours</h2>
            <ul style={styles.list}>
              {offer.deliveredOutputs.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </GlassPanel>
        </div>

        <div style={styles.section}>
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 24, elevation: 2 }}>
            <div style={styles.label}>What is not included</div>
            <ul style={styles.list}>
              {notIncluded.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </GlassPanel>
        </div>

        {offer.beforeAfter ? (
          <GlassCardGrid minColWidth={280} gap={20} style={{ marginTop: 28 }}>
            <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 22, elevation: 2 }}>
              <div style={styles.label}>Before</div>
              <h2 style={styles.h2}>Typical starting point</h2>
              <ul style={styles.list}>
                {offer.beforeAfter.before.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </GlassPanel>
            <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 22, elevation: 2 }}>
              <div style={styles.label}>After</div>
              <h2 style={styles.h2}>What this rescue delivers</h2>
              <ul style={styles.list}>
                {offer.beforeAfter.after.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {offer.demoPath ? (
                <p style={styles.note}>
                  Prefer a walkthrough?{' '}
                  <Link
                    href={offer.demoPath}
                    style={styles.link}
                    onClick={() => handleCtaClick('demo_example')}
                  >
                    Open the fictional before/after demo
                  </Link>
                  .
                </p>
              ) : null}
            </GlassPanel>
          </GlassCardGrid>
        ) : null}

        <GlassCardGrid minColWidth={280} gap={20} style={{ marginTop: 28 }}>
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 22, elevation: 2 }}>
            <div style={styles.label}>How the engagement works</div>
            <p style={styles.muted}>
              Discovery call → written quote → 50% MUR deposit (manual bank transfer) → manual bank verification →
              approval to proceed → visible delivery → preview feedback → release approval. Currency and payment
              instructions are confirmed in writing on the invoice before you pay.
            </p>
          </GlassPanel>
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 22, elevation: 2 }}>
            <div style={styles.label}>Deposit requirement</div>
            <p style={styles.muted}>{offer.depositNote}</p>
          </GlassPanel>
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 22, elevation: 2 }}>
            <div style={styles.label}>Delivery timeline</div>
            <p style={styles.muted}>{offer.deliveryTimeline}</p>
          </GlassPanel>
        </GlassCardGrid>

        <div style={styles.section}>
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 24, elevation: 2 }}>
            <div style={styles.label}>What you provide</div>
            <ul style={styles.list}>
              {offer.clientProvides.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </GlassPanel>
        </div>

        <div style={styles.section}>
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 24, elevation: 2 }}>
            <div style={styles.label}>Proof · rapid visible delivery</div>
            <p style={styles.muted}>{offer.proofLanguage}</p>
          </GlassPanel>
        </div>

        <PublishingVideoSection
          videos={offerVideos}
          title="Video briefings for this sprint"
          body="Short practical briefings related to this offer are being prepared. Approved YouTube videos will appear here without changing the page structure."
          compact
        />

        <div style={styles.section}>
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 24, elevation: 2 }}>
            <div style={styles.label}>Frequently asked questions</div>
            {faq.map((item) => (
              <div key={item.q} style={styles.faqItem}>
                <p style={styles.faqQ}>{item.q}</p>
                <p style={styles.faqA}>{item.a}</p>
              </div>
            ))}
          </GlassPanel>
        </div>

        <div style={styles.section} id="discovery">
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 24, elevation: 2 }}>
            <DiscoveryIntakeForm
              defaultOfferSlug={offer.slug}
              lockedOffer
              lockedOfferLabel={buyerFacingName || undefined}
              heading={`Request discovery — ${buyerFacingName || offer.title}`}
            />
            <p style={styles.note}>
              Prefer email?{' '}
              <a href={mailtoHref} style={styles.link} onClick={() => handleCtaClick('mailto_fallback')}>
                Open mail client
              </a>{' '}
              (no automatic reference id).
            </p>
          </GlassPanel>
        </div>

        <div style={styles.section}>
          <CtaGlassBlock>
            <div style={styles.label}>Next step</div>
            <h2 style={styles.h2}>Submit the discovery form above</h2>
            <p style={styles.muted}>
              You receive an on-screen reference immediately. We confirm fit, scope, deposit, and timeline before any
              invoice.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
              <a
                style={{ ...cfBtnPrimary, background: GLASS_TOKENS.ctaWarm, color: GLASS_TOKENS.ctaWarmText, boxShadow: GLASS_TOKENS.ctaWarmShadow }}
                href="#discovery"
                onClick={() => handleCtaClick('footer_primary')}
              >
                Jump to discovery form
              </a>
              <Link href="/" style={cfBtnSecondary} onClick={() => handleCtaClick('footer_secondary')}>
                View all sprints
              </Link>
            </div>
          </CtaGlassBlock>
        </div>
      </PublicMarketingPhotoGlassShell>
    </>
  );
}
