import React from 'react';
import Head from 'next/head';

import { trackEvent } from '../lib/analytics/index.js';
import { MERCHANT_LEGAL_NAME } from '../lib/public/merchant-identity.js';
import { buildPublicPageMeta, formatMur } from '../lib/public/corpflow-public-market.js';
import { buildDiscoveryCallMailto } from '../lib/public/rapid-delivery-offers.js';
import CorpFlowPublicFooter from './public/CorpFlowPublicFooter.js';
import CorpFlowPublicHeader from './public/CorpFlowPublicHeader.js';
import CorpFlowBrandMetadata from './public/CorpFlowBrandMetadata.js';
import DiscoveryIntakeForm from './public/DiscoveryIntakeForm.js';
import PublicMarketingPhotoGlassShell from './beauty/PublicMarketingPhotoGlassShell.js';
import GlassPanel from './beauty/GlassPanel.js';
import HeroGlassBlock from './beauty/HeroGlassBlock.js';
import { GLASS_TOKENS } from '../lib/ui/glass.js';
import { cfBtnPrimary } from './public/corpflow-public-styles.js';

const WEBSITE_RESCUE_FLAGSHIP_VIDEO = '/media/corpflowai/corpflowai-website-rescue-flagship-web-720p.mp4';
const text = GLASS_TOKENS.text;

const styles = {
  label: { fontSize: 11.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#7dd3fc', fontWeight: 700 },
  h1: {
    margin: '10px 0 0',
    fontSize: 'clamp(34px, 5.8vw, 56px)',
    lineHeight: 1.05,
    letterSpacing: '-0.04em',
    maxWidth: 820,
    color: text,
  },
  h2: { margin: '8px 0 0', fontSize: 'clamp(23px, 3vw, 30px)', letterSpacing: '-0.03em', color: text },
  body: { margin: '12px 0 0', color: '#cdd9e6', lineHeight: 1.68, fontSize: 'clamp(16px, 1.8vw, 18px)', maxWidth: 760 },
  note: { margin: '12px 0 0', color: '#9fb2c4', lineHeight: 1.6, fontSize: 14, maxWidth: 760 },
  price: {
    marginTop: 18,
    padding: '14px 16px',
    borderRadius: 14,
    background: 'rgba(45,212,191,0.10)',
    border: '1px solid rgba(45,212,191,0.28)',
    color: '#d6f5ef',
    lineHeight: 1.55,
    maxWidth: 720,
  },
  bullets: { margin: '14px 0 0', paddingLeft: 20, color: '#dbe7f5', lineHeight: 1.75, fontSize: 15.5 },
  link: { color: '#7dd3fc', textDecoration: 'none' },
};

export default function WebsiteRescueConversionPage({ offer }) {
  const publicTitle = 'Website Rescue';
  const pagePath = '/website-rescue';
  const primaryCtaLabel = 'Request discovery';
  const priceHeading = offer.priceIsFixed
    ? `${formatMur(offer.startingPriceMur)} fixed`
    : `Starting from ${formatMur(offer.startingPriceMur)}`;
  const mailtoHref = buildDiscoveryCallMailto({ ...offer, title: publicTitle });
  const meta = buildPublicPageMeta({
    title: publicTitle,
    description: offer.metaDescription.split(offer.title).join(publicTitle),
    path: pagePath,
    ogImage: `${offer.heroBase}.jpg`,
  });

  const heroBase = offer.heroBase;
  const heroSources = [
    { type: 'image/avif', media: '(max-width: 768px)', srcSet: `${heroBase}-768.avif` },
    { type: 'image/webp', media: '(max-width: 768px)', srcSet: `${heroBase}-768.webp` },
    { media: '(max-width: 768px)', srcSet: `${heroBase}-768.jpg` },
    { type: 'image/avif', srcSet: `${heroBase}.avif` },
    { type: 'image/webp', srcSet: `${heroBase}.webp` },
  ];

  function handleCtaClick(location) {
    trackEvent('revenue_offer_cta_click', { props: { offer: offer.slug, location } });
  }

  const footer = (
    <CorpFlowPublicFooter
      extra={`${publicTitle} — ${MERCHANT_LEGAL_NAME}. Discovery only on this page; no card or banking details collected here. Quote and deposit follow manual review.`}
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
        pageClassName="website-rescue-conversion-preview"
        maxWidth={1120}
        scrimTone="dark"
        footer={footer}
        hero={{
          base: heroBase,
          sources: heroSources,
          preloadSrcSet: `${heroBase}-768.avif 768w, ${heroBase}.avif 2400w`,
          objectPosition: offer.heroObjectPosition || 'center 40%',
          alt: 'Website Rescue — CorpFlowAI',
        }}
      >
        <CorpFlowPublicHeader cta={{ label: primaryCtaLabel, href: '#discovery' }} />

        <HeroGlassBlock style={{ marginTop: 32, maxWidth: 860 }}>
          <div style={styles.label}>Website Rescue</div>
          <h1 style={styles.h1}>{offer.headline}</h1>
          <p style={styles.body}>
            If your website no longer represents the business you have become, we rebuild the path that matters most:
            helping the right visitor understand you, trust you and take the next step.
          </p>
          <div style={styles.price}>
            <strong>{priceHeading}</strong>
            <div style={{ marginTop: 6, fontSize: 14 }}>
              50% deposit to start. First visible preview targeted within 24–72 hours after deposit clearance and receipt of the agreed content/assets.
            </div>
          </div>
          <div style={{ marginTop: 22 }}>
            <a
              href="#discovery"
              style={{ ...cfBtnPrimary, background: GLASS_TOKENS.ctaWarm, color: GLASS_TOKENS.ctaWarmText, boxShadow: GLASS_TOKENS.ctaWarmShadow }}
              onClick={() => handleCtaClick('hero_primary')}
            >
              Request discovery
            </a>
          </div>
        </HeroGlassBlock>

        <section style={{ marginTop: 56 }} aria-labelledby="website-rescue-proof-title">
          <div style={styles.label}>Why this matters now</div>
          <h2 id="website-rescue-proof-title" style={styles.h2}>A website is no longer only a website</h2>
          <p style={styles.body}>
            It still needs to work beautifully for people. Increasingly, search engines, AI assistants and connected systems also need to understand what your business does and how someone can act on it.
          </p>
          <div
            style={{
              marginTop: 20,
              aspectRatio: '16 / 9',
              overflow: 'hidden',
              borderRadius: 18,
              border: '1px solid rgba(125,211,252,0.22)',
              background: '#020b14',
              boxShadow: '0 24px 64px rgba(2,6,23,0.30)',
              maxWidth: 900,
            }}
          >
            <video
              controls
              playsInline
              preload="metadata"
              title="CorpFlowAI Website Rescue flagship brand briefing"
              aria-label="CorpFlowAI Website Rescue flagship brand briefing"
              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
            >
              <source src={WEBSITE_RESCUE_FLAGSHIP_VIDEO} type="video/mp4" />
              Your browser does not support HTML5 video.
            </video>
          </div>
          <p style={styles.note}>Human-ready. Machine-ready. Business-ready.</p>
        </section>

        <section style={{ marginTop: 56 }} aria-labelledby="website-rescue-result-title">
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 24, elevation: 2 }}>
            <div style={styles.label}>What you are buying</div>
            <h2 id="website-rescue-result-title" style={styles.h2}>A clearer route from arrival to enquiry</h2>
            <ul style={styles.bullets}>
              <li>A professional, mobile-ready landing experience that clearly explains your offer.</li>
              <li>A single, obvious enquiry path instead of competing calls to action.</li>
              <li>Structured business information that is easier for people, search and future approved AI/system connections to understand.</li>
            </ul>
            {offer.demoPath ? (
              <p style={styles.note}>
                Want to see the idea before speaking to us?{' '}
                <a href={offer.demoPath} style={styles.link} onClick={() => handleCtaClick('demo_example')}>
                  View the fictional before/after example
                </a>.
              </p>
            ) : null}
          </GlassPanel>
        </section>

        <section style={{ marginTop: 56 }} id="discovery" aria-labelledby="website-rescue-discovery-title">
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 26, elevation: 2 }}>
            <div style={styles.label}>Next step</div>
            <h2 id="website-rescue-discovery-title" style={styles.h2}>Tell us what has changed in your business</h2>
            <p style={styles.body}>
              We will confirm whether Website Rescue is the right scope before anything is invoiced. No automatic email, WhatsApp or SMS is sent from this form.
            </p>
            <div style={{ marginTop: 22 }}>
              <DiscoveryIntakeForm
                defaultOfferSlug={offer.slug}
                lockedOffer
                lockedOfferLabel="Website Rescue"
                heading="Request discovery — Website Rescue"
              />
            </div>
            <p style={styles.note}>
              Prefer email?{' '}
              <a href={mailtoHref} style={styles.link} onClick={() => handleCtaClick('mailto_fallback')}>
                Open your mail client
              </a>.
            </p>
          </GlassPanel>
        </section>
      </PublicMarketingPhotoGlassShell>
    </>
  );
}
