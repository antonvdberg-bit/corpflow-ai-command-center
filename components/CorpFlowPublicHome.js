import React from 'react';

import CorpFlowPublicPhotoShell from './public/CorpFlowPublicPhotoShell.js';
import PublicHero from './public/PublicHero.js';
import OutcomeSection from './public/OutcomeSection.js';
import PublicCtaBand from './public/PublicCtaBand.js';
import PublicTrustBand from './public/PublicTrustBand.js';
import {
  buildPublicPageMeta,
  CORPflow_BUYER_FIT,
  CORPflow_HOMEPAGE_HERO,
} from '../lib/public/corpflow-public-market.js';
import {
  ENQUIRY_RECOVERY_IMPLEMENTATION_LINE,
  ENQUIRY_RECOVERY_OFFER_NAME,
  ENQUIRY_RECOVERY_PRICE_LINE,
  ENQUIRY_RECOVERY_QUALIFICATION_LINE,
  ENQUIRY_RECOVERY_SCARCITY_LINE,
  LEAD_RESCUE_PUBLIC_PAYMENT_LINE,
} from '../lib/public/enquiry-recovery-sprint.js';
import { shouldEmitCorpFlowBrandAssets } from '../lib/public/corpflow-brand-assets.js';
import { MERCHANT_LEGAL_NAME } from '../lib/public/merchant-identity.js';
import { cfBody, CF } from './public/corpflow-public-styles.js';

const FLAGSHIP_VIDEO_PATH = '/media/corpflowai/corpflowai-flagship-homepage-final-1080p.mp4';
const HOME_SECTION_SPACING = { marginTop: 64 };

const meta = buildPublicPageMeta({
  title: 'Stop losing valuable enquiries after first contact',
  description: `${MERCHANT_LEGAL_NAME} is a software and workflow automation company. Lead Rescue helps selected businesses recover valuable enquiries that have gone quiet. ${ENQUIRY_RECOVERY_PRICE_LINE}. Request a 15-minute diagnosis.`,
  path: '/',
  ogImage: '/assets/visuals/corpflow-home-hero.jpg',
});

function FlagshipVideoSection() {
  return (
    <section aria-labelledby="corpflow-flagship-video-title" style={{ marginTop: 64 }}>
      <p style={{ margin: 0, color: CF.link, fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        See the problem
      </p>
      <h2 id="corpflow-flagship-video-title" style={{ margin: '8px 0 18px', color: CF.text, fontSize: 'clamp(23px, 3vw, 30px)', letterSpacing: '-0.02em' }}>
        Quiet enquiries are a commercial problem
      </h2>
      <div style={{ aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: 18, border: '1px solid rgba(125,211,252,0.22)', background: '#020b14', boxShadow: '0 24px 64px rgba(2, 6, 23, 0.28)' }}>
        <video aria-label="CorpFlowAI briefing on recovering quiet enquiries" title="Quiet enquiries are a commercial problem" controls playsInline preload="metadata" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}>
          <source src={FLAGSHIP_VIDEO_PATH} type="video/mp4" />
          Your browser does not support HTML5 video. <a href={FLAGSHIP_VIDEO_PATH}>Open the CorpFlowAI briefing video</a>.
        </video>
      </div>
    </section>
  );
}

export default function CorpFlowPublicHome({ host = null, search = null }) {
  const showFlagshipVideo = shouldEmitCorpFlowBrandAssets(host, { search });

  return (
    <CorpFlowPublicPhotoShell meta={meta} visualKey="home" headerCta={CORPflow_HOMEPAGE_HERO.primaryCta} brandHost={host} brandSearch={search}>
      <PublicHero {...CORPflow_HOMEPAGE_HERO} />

      {showFlagshipVideo ? <FlagshipVideoSection /> : null}

      <OutcomeSection id="commercial-focus" label="The company" title={`${MERCHANT_LEGAL_NAME} builds software and workflow automation`} style={HOME_SECTION_SPACING}>
        <p style={cfBody}>
          {MERCHANT_LEGAL_NAME} is the registered software and workflow automation company behind this website. The current standard packages configure enquiry capture, follow-up visibility, a bounded website path, or an agreed automation workflow — then hand that working setup to you.
        </p>
        <p style={{ ...cfBody, margin: 0 }}>
          The live standard offer is {ENQUIRY_RECOVERY_OFFER_NAME} — {ENQUIRY_RECOVERY_PRICE_LINE}. {ENQUIRY_RECOVERY_SCARCITY_LINE}
        </p>
      </OutcomeSection>

      <OutcomeSection label="What the software does" title={`${ENQUIRY_RECOVERY_OFFER_NAME} — ${ENQUIRY_RECOVERY_PRICE_LINE}`} style={HOME_SECTION_SPACING}>
        <p style={cfBody}>{ENQUIRY_RECOVERY_IMPLEMENTATION_LINE}</p>
        <p style={cfBody}>{CORPflow_BUYER_FIT.body}</p>
        <p style={{ ...cfBody, margin: 0 }}>{LEAD_RESCUE_PUBLIC_PAYMENT_LINE}</p>
      </OutcomeSection>

      <OutcomeSection label="What happens when you click" title="A 15-minute diagnosis — not a commitment to buy" style={HOME_SECTION_SPACING}>
        <p style={cfBody}>
          We look at where enquiries arrive, where follow-up becomes difficult to see, and whether a recovered enquiry is valuable enough to justify the standard Lead Rescue setup. If there is a real Lead Rescue case, we send a written offer. If there is not, we tell you.
        </p>
        <p style={{ ...cfBody, margin: 0 }}>{ENQUIRY_RECOVERY_QUALIFICATION_LINE}</p>
      </OutcomeSection>

      <OutcomeSection
        id="software-foundation"
        label="What you receive"
        title="A configured system you can keep using"
        style={{ marginTop: 32 }}
      >
        <p style={cfBody}>
          Lead Rescue, Website Rescue and bounded automation are software packages: agreed capture or page behaviour, alerts or enquiry paths, testing, and handover. Setup and support that belong in the written package stay in that package. Ongoing care is a separate choice after acceptance.
        </p>
        <p style={{ ...cfBody, margin: 0 }}>
          We do not replace your existing tools unless that work is specifically scoped, and we do not claim a capability that is not in the written package.
        </p>
      </OutcomeSection>

      <div style={{ marginTop: 24 }}>
        <PublicTrustBand>
          <p style={{ ...cfBody, margin: 0, color: '#eef6ff' }}>
            Mauritius-based software and workflow automation. Controlled delivery. No guaranteed-revenue claims. Existing tools stay in place unless a replacement is specifically scoped.
          </p>
        </PublicTrustBand>
      </div>

      <div style={{ marginTop: 16 }}>
        <PublicCtaBand
          title={`See whether Lead Rescue fits — ${ENQUIRY_RECOVERY_PRICE_LINE}.`}
          body={`${ENQUIRY_RECOVERY_SCARCITY_LINE} ${LEAD_RESCUE_PUBLIC_PAYMENT_LINE}`}
          primaryCta={CORPflow_HOMEPAGE_HERO.primaryCta}
        />
      </div>
    </CorpFlowPublicPhotoShell>
  );
}