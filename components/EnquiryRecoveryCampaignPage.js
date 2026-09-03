import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { trackEvent } from '../lib/analytics/index.js';
import { MERCHANT_LEGAL_NAME } from '../lib/public/merchant-identity.js';
import { buildPublicPageMeta } from '../lib/public/corpflow-public-market.js';
import { LEAD_RESCUE_ENQUIRY_HREF } from '../lib/public/canonical-enquiry.js';
import {
  ENQUIRY_RECOVERY_DEPOSIT_LINE,
  ENQUIRY_RECOVERY_DIAGNOSIS_HASH,
  ENQUIRY_RECOVERY_FOUNDING_SLOTS,
  ENQUIRY_RECOVERY_NO_GUARANTEE_LINE,
  ENQUIRY_RECOVERY_OFFER_NAME,
  ENQUIRY_RECOVERY_PATH,
  ENQUIRY_RECOVERY_PREVIEW_LINE,
  ENQUIRY_RECOVERY_PRICE_LINE,
  ENQUIRY_RECOVERY_QUALIFICATION_LINE,
  ENQUIRY_RECOVERY_SCARCITY_LINE,
} from '../lib/public/enquiry-recovery-sprint.js';
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
const HERO_BASE = '/assets/visuals/lead-rescue-spa-sunset-hero-v1';

const styles = {
  label: { fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7dd3fc', fontWeight: 800 },
  h1: {
    margin: '14px 0 0',
    fontSize: 'clamp(32px, 5.4vw, 52px)',
    lineHeight: 1.06,
    letterSpacing: '-0.04em',
    maxWidth: 760,
    color: text,
  },
  lead: { marginTop: 18, fontSize: 'clamp(17px, 1.9vw, 21px)', lineHeight: 1.55, color: muted, maxWidth: 720 },
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

const QUALIFICATION = [
  'You already receive meaningful enquiries',
  'One successful conversion is materially valuable',
  'Follow-up is not always consistent after first contact',
  'Enquiries arrive through more than one channel or person',
  'The owner or commercial manager will take part in the diagnosis',
  'Required access and assets can be provided quickly',
];

const FAQ = [
  {
    q: 'Is this a CRM, chatbot, or marketing package?',
    a: 'No. This is a bounded engagement to identify and recover valuable enquiries that have gone quiet. We do not ask you to replace the tools you already use.',
  },
  {
    q: 'Do you guarantee recovered revenue?',
    a: ENQUIRY_RECOVERY_NO_GUARANTEE_LINE,
  },
  {
    q: 'When does the 72-hour preview clock start?',
    a: ENQUIRY_RECOVERY_PREVIEW_LINE,
  },
  {
    q: 'Why only three founding clients?',
    a: 'Delivery capacity is limited. We take on cases only where the economics justify the engagement.',
  },
];

/**
 * Buyer-facing campaign for the live Enquiry Recovery Sprint.
 * Used on `/enquiry-recovery`, `/lead-rescue`, and aileadrescue.corpflowai.com.
 *
 * @param {{ host?: string, search?: string, leadRescueAssets?: unknown }} props
 */
export default function EnquiryRecoveryCampaignPage() {
  const meta = buildPublicPageMeta({
    title: ENQUIRY_RECOVERY_OFFER_NAME,
    description:
      'Some of your best enquiries probably did not say no — they stopped being followed up. CorpFlowAI helps selected Mauritius businesses identify and recover valuable quiet enquiries. Maximum three founding-client positions. Request a 15-minute diagnosis.',
    path: ENQUIRY_RECOVERY_PATH,
    ogImage: `${HERO_BASE}.jpg`,
  });

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

  const offerVideos = getVideosForOffer('ai-lead-rescue');
  const diagnosisHref = `#${ENQUIRY_RECOVERY_DIAGNOSIS_HASH}`;
  const primaryCtaStyle = {
    ...cfBtnPrimary,
    boxShadow: GLASS_TOKENS.ctaWarmShadow,
    background: GLASS_TOKENS.ctaWarm,
    color: GLASS_TOKENS.ctaWarmText,
  };

  const footer = (
    <CorpFlowPublicFooter
      extra={`${ENQUIRY_RECOVERY_OFFER_NAME} — ${MERCHANT_LEGAL_NAME}, Mauritius. Diagnosis first; no card or banking details on this page. ${ENQUIRY_RECOVERY_NO_GUARANTEE_LINE}`}
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
        <meta name="twitter:description" content={meta.ogDescription} />
      </Head>

      <PublicMarketingPhotoGlassShell
        pageClassName="enquiry-recovery-campaign"
        maxWidth={1120}
        scrimTone="dark"
        footer={footer}
        hero={{
          base: HERO_BASE,
          sources: heroSources,
          preloadSrcSet: `${HERO_BASE}-768.avif 768w, ${HERO_BASE}.avif 2400w`,
          objectPosition: 'center 38%',
          alt: 'Quiet professional reception — enquiry follow-up is a commercial problem, not an AI demo',
        }}
      >
        <CorpFlowPublicHeader cta={{ label: 'Request a 15-minute diagnosis', href: diagnosisHref }} />

        <GlassCardGrid minColWidth={300} gap={24} style={{ marginTop: 32, alignItems: 'start' }}>
          <HeroGlassBlock>
            <div style={styles.label}>Mauritius · selected owner-led businesses</div>
            <h1 style={styles.h1}>Some of your best enquiries probably didn&apos;t say no. They just stopped being followed up.</h1>
            <p style={styles.lead}>
              You already paid to generate the enquiry. CorpFlowAI helps selected Mauritius businesses identify and
              recover valuable enquiries that have gone quiet — before they disappear from revenue.
            </p>
            <p style={styles.muted}>{ENQUIRY_RECOVERY_SCARCITY_LINE}</p>
            <div style={styles.priceBox}>
              <strong>
                {ENQUIRY_RECOVERY_OFFER_NAME} · {ENQUIRY_RECOVERY_PRICE_LINE}
              </strong>
              <div style={{ marginTop: 6, fontSize: 14 }}>{ENQUIRY_RECOVERY_DEPOSIT_LINE}</div>
              <div style={{ marginTop: 6, fontSize: 14 }}>Maximum {ENQUIRY_RECOVERY_FOUNDING_SLOTS} founding-client slots.</div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
              <a
                style={primaryCtaStyle}
                href={diagnosisHref}
                data-testid="lead-rescue-canonical-cta"
                onClick={() => handleCtaClick('hero')}
              >
                Request a 15-minute diagnosis
              </a>
              <Link
                href={LEAD_RESCUE_ENQUIRY_HREF}
                style={cfBtnSecondary}
                onClick={() => trackEvent('lr_secondary_cta_click', { props: { location: 'hero' } })}
              >
                Prefer the contact form
              </Link>
            </div>
          </HeroGlassBlock>

          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 22, elevation: 2 }}>
            <div style={styles.label}>Commercial problem</div>
            <h2 style={styles.h2}>How this helps you make or recover money</h2>
            <p style={styles.muted}>
              Enquiries already arrive — website, WhatsApp, phone, Facebook, email, or a staff member. The leak is
              usually after first contact: follow-up becomes inconsistent, ownership is unclear, and a high-value
              conversation goes quiet.
            </p>
            <p style={styles.muted}>{ENQUIRY_RECOVERY_QUALIFICATION_LINE}</p>
          </GlassPanel>
        </GlassCardGrid>

        <div style={styles.section}>
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 24, elevation: 2 }}>
            <div style={styles.label}>Who this is for</div>
            <h2 style={styles.h2}>Owner-led Mauritius service businesses, roughly 5–30 staff</h2>
            <ul style={styles.list}>
              <li>Professional and technical services</li>
              <li>Real estate, property, and high-value home or commercial services</li>
              <li>Boutique hospitality, tours, and experience businesses with direct enquiries</li>
            </ul>
            <p style={styles.note}>
              CorpFlowAI is Mauritius-based. We work with selected businesses. We are not selling generic marketing,
              and we are not selling “AI”. We do not require you to replace everything you already use.
            </p>
          </GlassPanel>
        </div>

        <div style={styles.section}>
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 24, elevation: 2 }}>
            <div style={styles.label}>Qualification</div>
            <h2 style={styles.h2}>You need to qualify — capacity is limited on purpose</h2>
            <ul style={styles.list}>
              {QUALIFICATION.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </GlassPanel>
        </div>

        <div style={styles.section}>
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 24, elevation: 2 }}>
            <div style={styles.label}>What you buy</div>
            <h2 style={styles.h2}>A fixed, bounded engagement — diagnosis, written offer, then deposit</h2>
            <ul style={styles.list}>
              <li>A short commercial diagnosis of whether recovery is worth doing</li>
              <li>A written offer if the case qualifies</li>
              <li>{ENQUIRY_RECOVERY_PRICE_LINE}</li>
              <li>{ENQUIRY_RECOVERY_DEPOSIT_LINE}</li>
              <li>{ENQUIRY_RECOVERY_PREVIEW_LINE}</li>
            </ul>
            <p style={styles.note}>{ENQUIRY_RECOVERY_NO_GUARANTEE_LINE}</p>
          </GlassPanel>
        </div>

        <div style={styles.section} id="faq">
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 24, elevation: 2 }}>
            <div style={styles.label}>Questions buyers actually ask</div>
            {FAQ.map((item) => (
              <div key={item.q} style={styles.faqItem}>
                <p style={styles.faqQ}>{item.q}</p>
                <p style={styles.faqA}>{item.a}</p>
              </div>
            ))}
          </GlassPanel>
        </div>

        <PublishingVideoSection
          videos={offerVideos}
          title="See the commercial problem, then the diagnosis"
          body="Short briefings on recovering quiet enquiries. This is not a generic AI demo. Diagnosis still starts with the form below."
          compact
        />

        <div style={styles.section} id={ENQUIRY_RECOVERY_DIAGNOSIS_HASH}>
          <GlassPanel variant={{ fill: GLASS_TOKENS.glassFill, padding: 24, elevation: 2 }}>
            <DiscoveryIntakeForm
              defaultOfferSlug="ai-lead-rescue"
              lockedOffer
              lockedOfferLabel={ENQUIRY_RECOVERY_OFFER_NAME}
              heading="Request a 15-minute diagnosis"
            />
            <p style={styles.note}>
              Built by a Mauritius-based operating-systems team. No payment is taken on this page. We confirm fit in
              conversation, then send a written offer if the economics justify the engagement.
            </p>
          </GlassPanel>
        </div>

        <div style={styles.section}>
          <CtaGlassBlock>
            <div style={styles.label}>Next step</div>
            <h2 style={styles.h2}>Request a 15-minute diagnosis</h2>
            <p style={styles.muted}>
              Tell us how enquiries arrive today and where follow-up is hardest to see. If the case does not qualify,
              we will say so.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
              <a style={primaryCtaStyle} href={diagnosisHref} onClick={() => handleCtaClick('footer')}>
                Request a 15-minute diagnosis
              </a>
              <Link href="/" style={cfBtnSecondary}>
                CorpFlowAI home
              </Link>
            </div>
          </CtaGlassBlock>
        </div>
      </PublicMarketingPhotoGlassShell>
    </>
  );
}
