import React from 'react';
import Link from 'next/link';
import CorpFlowPublicPhotoShell from '../components/public/CorpFlowPublicPhotoShell.js';
import CustomerServiceContact from '../components/CustomerServiceContact.js';
import DiscoveryIntakeForm from '../components/public/DiscoveryIntakeForm.js';
import RareExclusiveContentPage from '../components/RareExclusiveContentPage.js';
import { policyStyles as ps } from '../components/PublicPolicyLayout.js';
import { buildGeneralDiscoveryMailto, buildPublicPageMeta } from '../lib/public/corpflow-public-market.js';
import { resolveCanonicalEnquiryQuery } from '../lib/public/canonical-enquiry.js';
import { ENQUIRY_RECOVERY_DIAGNOSIS_HREF, ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL } from '../lib/public/enquiry-recovery-sprint.js';
import { luxOrApexPageProps } from '../lib/client/lux-host-page-props.js';

const h1 = {
  margin: '16px 0 8px',
  fontSize: 'clamp(28px, 4.6vw, 38px)',
  letterSpacing: '-0.03em',
  lineHeight: 1.15,
  color: '#eef6ff',
};
const updated = { color: '#9fb2c8', fontSize: 13, marginBottom: 24 };

/**
 * /contact — host-aware.
 * - lux.corpflowai.com → Rare & Exclusive Collection contact / advisory path
 * - apex / other → CorpFlowAI discovery contact
 */
export default function ContactPage({
  luxMode = false,
  seoHost = '',
  defaultBuyerNeed = '',
  defaultServicePath = '',
  defaultOfferSlug = '',
  lockedOffer = false,
} = {}) {
  if (luxMode) {
    return <RareExclusiveContentPage pageId="contact" seoHost={seoHost} />;
  }

  const discoveryMailto = buildGeneralDiscoveryMailto();
  const meta = buildPublicPageMeta({
    title: 'Contact',
    description:
      'Request a 15-minute diagnosis with CorpFlowAI about quiet enquiries, website rescue, or a bounded operating improvement. No automatic outreach from this form.',
    path: '/contact',
    ogImage: '/assets/visuals/corpflow-contact-hero.jpg',
  });
  const lockedEnquiryRecovery = lockedOffer && defaultOfferSlug === 'ai-lead-rescue';
  const lockedWebsiteRescue = lockedOffer && defaultOfferSlug === 'premium-landing-page-rescue';

  return (
    <CorpFlowPublicPhotoShell
      meta={meta}
      visualKey="contact"
      maxWidth={800}
      headerCta={{ label: ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL, href: ENQUIRY_RECOVERY_DIAGNOSIS_HREF }}
    >
      <h1 style={h1}>Contact</h1>
      <p style={updated}>
        Submit a qualified enquiry. You receive an on-screen reference immediately. Scope and commercial details are
        confirmed in writing before any invoice. Nothing is sent automatically to email, WhatsApp or SMS.
      </p>

      <section style={ps.section} id="discovery" data-canonical-enquiry>
        <DiscoveryIntakeForm
          heading={
            lockedEnquiryRecovery
              ? ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL
              : lockedWebsiteRescue
                ? 'Request Website Rescue'
                : ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL
          }
          defaultBuyerNeed={defaultBuyerNeed || undefined}
          defaultServicePath={defaultServicePath || undefined}
          defaultOfferSlug={defaultOfferSlug || undefined}
          lockedOffer={lockedOffer}
          lockedOfferLabel={
            lockedEnquiryRecovery ? 'Enquiry Recovery Sprint' : lockedWebsiteRescue ? 'Website Rescue' : undefined
          }
        />
        <p style={{ ...ps.p, marginTop: 16 }}>
          Prefer email?{' '}
          <a href={discoveryMailto} style={{ color: '#7dd3fc' }}>
            Open mail client
          </a>{' '}
          (no automatic reference id).
        </p>
      </section>

      <section style={ps.section} data-contact-support-block>
        <h2 style={ps.h2}>Support</h2>
        <CustomerServiceContact />
        <p style={ps.p}>
          Complaints are acknowledged in writing within two working days. See the{' '}
          <Link href="/refund-policy" style={{ color: '#7dd3fc' }}>
            refund and cancellation policy
          </Link>
          . Existing clients may use{' '}
          <Link href="/login" style={{ color: '#7dd3fc' }}>
            client login
          </Link>
          .
        </p>
      </section>
    </CorpFlowPublicPhotoShell>
  );
}

export async function getServerSideProps({ req, query }) {
  const base = luxOrApexPageProps(req);
  const enquiry = resolveCanonicalEnquiryQuery(query);
  return {
    ...base,
    props: {
      ...base.props,
      ...enquiry,
    },
  };
}
