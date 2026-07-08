import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { trackEvent } from '../lib/analytics/index.js';
import { MERCHANT_LEGAL_NAME } from '../lib/public/merchant-identity.js';
import { buildDiscoveryCallMailto } from '../lib/public/rapid-delivery-offers.js';
import PublicSiteFooter from './PublicSiteFooter.js';
import PublicMarketingPhotoGlassShell from './beauty/PublicMarketingPhotoGlassShell.js';
import GlassPanel from './beauty/GlassPanel.js';
import GlassCardGrid from './beauty/GlassCardGrid.js';
import HeroGlassBlock from './beauty/HeroGlassBlock.js';
import CtaGlassBlock from './beauty/CtaGlassBlock.js';
import { GLASS_TOKENS } from '../lib/ui/glass.js';

const text = GLASS_TOKENS.text;
const muted = '#cdd9e6';
const faint = '#9fb2c4';

const styles = {
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  brandMark: { fontWeight: 900, fontSize: 22, color: text },
  brandSub: { color: muted, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2 },
  navLink: {
    background: 'rgba(255,255,255,0.10)',
    color: text,
    border: '1px solid rgba(255,255,255,0.18)',
    padding: '9px 14px',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 700,
    textDecoration: 'none',
  },
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
  label: { fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7dd3fc', fontWeight: 800 },
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
  cta: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: '13px 18px',
    border: 0,
    fontWeight: 800,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  primary: { background: GLASS_TOKENS.ctaWarm, color: GLASS_TOKENS.ctaWarmText, boxShadow: GLASS_TOKENS.ctaWarmShadow },
  secondary: { background: 'rgba(255,255,255,0.12)', color: text, border: '1px solid rgba(255,255,255,0.20)' },
  note: { marginTop: 14, fontSize: 14, color: faint, lineHeight: 1.65, maxWidth: 720 },
  link: { color: '#7dd3fc', textDecoration: 'none' },
};

function formatMur(amount) {
  return `MUR ${amount.toLocaleString('en-US')}`;
}

/**
 * Shared rapid-delivery offer surface for /offers/* routes.
 * CTA: mailto discovery call — no runtime email send, no payment collection on page.
 *
 * @param {{ offer: import('../lib/public/rapid-delivery-offers.js').RapidDeliveryOffer }} props
 */
export default function RapidDeliveryOfferPage({ offer }) {
  const mailtoHref = buildDiscoveryCallMailto(offer);
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
    <PublicSiteFooter
      flush
      extra={`${offer.title} — ${MERCHANT_LEGAL_NAME}. Discovery call only on this page; no card or banking details collected here. Deposit and quote follow manual review.`}
    />
  );

  return (
    <>
      <Head>
        <title>{offer.title} · CorpFlowAI</title>
        <meta name="description" content={offer.metaDescription} />
        <link rel="canonical" href={`https://corpflowai.com${offer.path}`} />
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
          alt: '',
        }}
      >
        <nav style={styles.nav}>
          <div>
            <div style={styles.brandMark}>CorpFlowAI</div>
            <div style={styles.brandSub}>{offer.pageLabel}</div>
          </div>
          <a
            style={styles.navLink}
            href={mailtoHref}
            onClick={() => handleCtaClick('nav')}
          >
            Request Discovery Call
          </a>
        </nav>

        <GlassCardGrid minColWidth={300} gap={24} style={{ marginTop: 44, alignItems: 'start' }}>
          <HeroGlassBlock>
            <div style={styles.label}>Rapid visible delivery · Mauritius</div>
            <h1 style={styles.h1}>{offer.headline}</h1>
            <p style={styles.lead}>{offer.subhead}</p>
            <div style={styles.priceBox}>
              <strong>From {formatMur(offer.startingPriceMur)}</strong>
              <div style={{ marginTop: 6, fontSize: 14, opacity: 0.95 }}>
                Deposit: {offer.depositNote} · Timeline: {offer.deliveryTimeline.split('.')[0]}.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
              <a
                style={{ ...styles.cta, ...styles.primary }}
                href={mailtoHref}
                onClick={() => handleCtaClick('hero_primary')}
              >
                Request Discovery Call
              </a>
              <Link href="/contact" style={{ ...styles.cta, ...styles.secondary }} onClick={() => handleCtaClick('hero_secondary')}>
                Contact page
              </Link>
            </div>
          </HeroGlassBlock>

          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 22, elevation: 2 }}>
            <div style={styles.label}>Business outcome</div>
            <h2 style={styles.h2}>What changes when this sprint lands</h2>
            <p style={styles.muted}>{offer.outcome}</p>
          </GlassPanel>
        </GlassCardGrid>

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
            <div style={styles.label}>Visible output · 24–72 hours</div>
            <h2 style={styles.h2}>What you receive in the first delivery window</h2>
            <ul style={styles.list}>
              {offer.deliveredOutputs.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </GlassPanel>
        </div>

        <GlassCardGrid minColWidth={280} gap={20} style={{ marginTop: 28 }}>
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 22, elevation: 2 }}>
            <div style={styles.label}>Starting price</div>
            <p style={{ ...styles.muted, marginTop: 8, fontSize: 22, fontWeight: 800, color: text }}>
              From {formatMur(offer.startingPriceMur)}
            </p>
            <p style={styles.muted}>Final quote confirmed after discovery. No guaranteed revenue or lead-volume promises.</p>
          </GlassPanel>
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 22, elevation: 2 }}>
            <div style={styles.label}>Deposit requirement</div>
            <p style={styles.muted}>{offer.depositNote}</p>
            <p style={styles.muted}>Work commences only after manual bank verification of cleared funds.</p>
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
            <p style={styles.note}>
              CorpFlowAI helps businesses stop losing leads, customers, reputation, and revenue because digital operations
              are too slow, fragmented, or invisible.
            </p>
          </GlassPanel>
        </div>

        <div style={styles.section}>
          <CtaGlassBlock>
            <div style={styles.label}>Next step</div>
            <h2 style={styles.h2}>Request a discovery call</h2>
            <p style={styles.muted}>
              Tell us your business name, how customers reach you today, and which problem hurts most. We will confirm fit,
              scope, deposit, and timeline before any invoice.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
              <a
                style={{ ...styles.cta, ...styles.primary }}
                href={mailtoHref}
                onClick={() => handleCtaClick('footer_primary')}
              >
                Request Discovery Call
              </a>
              <Link href="/contact" style={{ ...styles.cta, ...styles.secondary }} onClick={() => handleCtaClick('footer_secondary')}>
                General contact
              </Link>
            </div>
            <p style={styles.note}>
              Prefer email without opening your mail app? Visit{' '}
              <Link href="/contact" style={styles.link}>
                /contact
              </Link>{' '}
              and reference {offer.title} in your message.
            </p>
          </CtaGlassBlock>
        </div>
      </PublicMarketingPhotoGlassShell>
    </>
  );
}
