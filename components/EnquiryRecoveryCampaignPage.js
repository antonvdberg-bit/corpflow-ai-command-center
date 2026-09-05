import React from 'react';
import Head from 'next/head';

import { trackEvent } from '../lib/analytics/index.js';
import { MERCHANT_LEGAL_NAME } from '../lib/public/merchant-identity.js';
import { buildPublicPageMeta } from '../lib/public/corpflow-public-market.js';
import {
  ENQUIRY_RECOVERY_DIAGNOSIS_HASH,
  ENQUIRY_RECOVERY_FOUNDING_SLOTS,
  ENQUIRY_RECOVERY_IMPLEMENTATION_LINE,
  ENQUIRY_RECOVERY_LOSS_LINE,
  ENQUIRY_RECOVERY_NO_GUARANTEE_LINE,
  ENQUIRY_RECOVERY_OFFER_NAME,
  ENQUIRY_RECOVERY_PATH,
  ENQUIRY_RECOVERY_PRICE_LINE,
  ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL,
  ENQUIRY_RECOVERY_QUALIFICATION_LINE,
  ENQUIRY_RECOVERY_SCARCITY_LINE,
  LEAD_RESCUE_PUBLIC_PAYMENT_LINE,
} from '../lib/public/enquiry-recovery-sprint.js';
import CorpFlowPublicFooter from './public/CorpFlowPublicFooter.js';
import CorpFlowPublicHeader from './public/CorpFlowPublicHeader.js';
import CorpFlowBrandMetadata from './public/CorpFlowBrandMetadata.js';
import DiscoveryIntakeForm from './public/DiscoveryIntakeForm.js';
import PublicMarketingPhotoGlassShell from './beauty/PublicMarketingPhotoGlassShell.js';
import GlassPanel from './beauty/GlassPanel.js';
import HeroGlassBlock from './beauty/HeroGlassBlock.js';
import CtaGlassBlock from './beauty/CtaGlassBlock.js';
import { GLASS_TOKENS } from '../lib/ui/glass.js';
import { cfBtnPrimary } from './public/corpflow-public-styles.js';

const text = GLASS_TOKENS.text;
const muted = '#cdd9e6';
const faint = '#9fb2c4';
const HERO_BASE = '/assets/visuals/lead-rescue-spa-sunset-hero-v1';
const section = { marginTop: 64 };

const styles = {
  label: { fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7dd3fc', fontWeight: 800 },
  h1: { margin: '14px 0 0', fontSize: 'clamp(34px, 5.8vw, 58px)', lineHeight: 1.02, letterSpacing: '-0.045em', maxWidth: 820, color: text },
  h2: { margin: '8px 0 0', fontSize: 'clamp(24px, 3vw, 31px)', letterSpacing: '-0.03em', color: text },
  lead: { marginTop: 20, fontSize: 'clamp(17px, 1.9vw, 21px)', lineHeight: 1.58, color: muted, maxWidth: 760 },
  body: { color: '#bccdde', lineHeight: 1.7, margin: '12px 0 0', maxWidth: 820 },
  list: { margin: '16px 0 0', paddingLeft: 20, color: '#e0ecf7', lineHeight: 1.85 },
  price: { marginTop: 22, padding: '18px 20px', borderRadius: 16, background: 'rgba(45,212,191,0.10)', border: '1px solid rgba(45,212,191,0.28)', color: '#d6f5ef', lineHeight: 1.65 },
  note: { marginTop: 14, fontSize: 14, color: faint, lineHeight: 1.65, maxWidth: 760 },
};

const QUALIFICATION = [
  'You already receive meaningful enquiries.',
  'One successful conversion is materially valuable.',
  'Follow-up is not always consistent after first contact.',
  'The owner or commercial manager can join the diagnosis.',
];

export default function EnquiryRecoveryCampaignPage() {
  const meta = buildPublicPageMeta({
    title: 'Lead Rescue',
    description: 'Lead Rescue helps selected Mauritius businesses identify and recover valuable enquiries that have gone quiet. MUR 85,000 fixed. Maximum three clients. Request a 15-minute diagnosis.',
    path: ENQUIRY_RECOVERY_PATH,
    ogImage: `${HERO_BASE}.jpg`,
  });

  const diagnosisHref = `#${ENQUIRY_RECOVERY_DIAGNOSIS_HASH}`;
  const primaryCtaStyle = { ...cfBtnPrimary, boxShadow: GLASS_TOKENS.ctaWarmShadow, background: GLASS_TOKENS.ctaWarm, color: GLASS_TOKENS.ctaWarmText };
  const heroSources = [
    { type: 'image/avif', media: '(max-width: 768px)', srcSet: `${HERO_BASE}-768.avif` },
    { type: 'image/webp', media: '(max-width: 768px)', srcSet: `${HERO_BASE}-768.webp` },
    { media: '(max-width: 768px)', srcSet: `${HERO_BASE}-768.jpg` },
    { type: 'image/avif', srcSet: `${HERO_BASE}.avif` },
    { type: 'image/webp', srcSet: `${HERO_BASE}.webp` },
  ];

  function handleCtaClick(location) {
    trackEvent('lr_primary_cta_click', { props: { location } });
    trackEvent('revenue_offer_cta_click', { props: { offer: 'ai-lead-rescue', location } });
  }

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
        pageClassName="lead-rescue-campaign"
        maxWidth={1120}
        scrimTone="dark"
        footer={<CorpFlowPublicFooter extra={`${ENQUIRY_RECOVERY_OFFER_NAME} — ${MERCHANT_LEGAL_NAME}, Mauritius. ${LEAD_RESCUE_PUBLIC_PAYMENT_LINE} ${ENQUIRY_RECOVERY_NO_GUARANTEE_LINE}`} />}
        hero={{ base: HERO_BASE, sources: heroSources, preloadSrcSet: `${HERO_BASE}-768.avif 768w, ${HERO_BASE}.avif 2400w`, objectPosition: 'center 38%', alt: '' }}
      >
        <CorpFlowPublicHeader
          nav={[
            { href: '/', label: 'Home' },
            { href: '/about', label: 'About' },
            { href: '/contact', label: 'Contact' },
          ]}
          cta={{ label: ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL, href: diagnosisHref }}
        />

        <HeroGlassBlock style={{ marginTop: 34 }}>
          <div style={styles.label}>Lead Rescue · Mauritius · selected businesses</div>
          <h1 style={styles.h1}>Some of your best enquiries probably didn&apos;t say no. They just stopped being followed up.</h1>
          <p style={styles.lead}>{ENQUIRY_RECOVERY_LOSS_LINE}</p>
          <div style={styles.price}>
            <strong style={{ fontSize: 19 }}>{ENQUIRY_RECOVERY_OFFER_NAME} · {ENQUIRY_RECOVERY_PRICE_LINE}</strong>
            <div style={{ marginTop: 6 }}>{ENQUIRY_RECOVERY_SCARCITY_LINE}</div>
            <div style={{ marginTop: 6, fontSize: 14 }}>{LEAD_RESCUE_PUBLIC_PAYMENT_LINE}</div>
          </div>
          <div style={{ marginTop: 24 }}>
            <a style={primaryCtaStyle} href={diagnosisHref} data-testid="lead-rescue-canonical-cta" onClick={() => handleCtaClick('hero')}>
              {ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL}
            </a>
          </div>
        </HeroGlassBlock>

        <section style={section}>
          <GlassPanel>
            <div style={styles.label}>What Lead Rescue does</div>
            <h2 style={styles.h2}>Find the gap between first contact and a real commercial decision.</h2>
            <p style={styles.body}>
              Enquiries already arrive through your website, WhatsApp, phone, Facebook, email, or staff. The problem is what happens afterwards. Lead Rescue identifies where valuable conversations go quiet, makes ownership and follow-up visible, and gives the business a controlled recovery path.
            </p>
            <p style={styles.body}>{ENQUIRY_RECOVERY_IMPLEMENTATION_LINE}</p>
          </GlassPanel>
        </section>

        <section style={section}>
          <GlassPanel>
            <div style={styles.label}>The challenge</div>
            <h2 style={styles.h2}>MUR 85,000 only makes sense when a recovered enquiry is worth recovering.</h2>
            <ul style={styles.list}>
              {QUALIFICATION.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <p style={styles.note}>{ENQUIRY_RECOVERY_QUALIFICATION_LINE}</p>
          </GlassPanel>
        </section>

        <section style={section}>
          <GlassPanel>
            <div style={styles.label}>What happens when you click</div>
            <h2 style={styles.h2}>One short diagnosis. No payment. No software commitment.</h2>
            <p style={styles.body}>
              We spend 15 minutes understanding where enquiries arrive, where follow-up becomes difficult to see, and whether the economics justify intervention. If there is a real recovery problem, we send a written Lead Rescue offer. If there is not, we tell you.
            </p>
          </GlassPanel>
        </section>

        <section style={section} id={ENQUIRY_RECOVERY_DIAGNOSIS_HASH}>
          <GlassPanel>
            <DiscoveryIntakeForm
              defaultOfferSlug="ai-lead-rescue"
              lockedOffer
              lockedOfferLabel={ENQUIRY_RECOVERY_OFFER_NAME}
              heading={ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL}
            />
            <p style={styles.note}>{LEAD_RESCUE_PUBLIC_PAYMENT_LINE}</p>
          </GlassPanel>
        </section>

        <section style={section}>
          <CtaGlassBlock>
            <div style={styles.label}>Three client positions</div>
            <h2 style={styles.h2}>If a lost enquiry can be worth more than the fee, the diagnosis is the next step.</h2>
            <p style={styles.body}>{ENQUIRY_RECOVERY_NO_GUARANTEE_LINE}</p>
            <div style={{ marginTop: 20 }}>
              <a style={primaryCtaStyle} href={diagnosisHref} onClick={() => handleCtaClick('footer')}>
                {ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL}
              </a>
            </div>
          </CtaGlassBlock>
        </section>
      </PublicMarketingPhotoGlassShell>
    </>
  );
}
