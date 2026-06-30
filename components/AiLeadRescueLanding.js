import React from 'react';
import Head from 'next/head';

import { trackEvent } from '../lib/analytics/index.js';
import PublicSiteFooter from './PublicSiteFooter.js';
import { formatCurrencyDisclosure } from '../lib/public/merchant-identity.js';
import VisualAssetRenderer, { isAiGeneratedManifest } from './VisualAssetRenderer.js';
import AssetProvenanceDisclosure from './AssetProvenanceDisclosure.js';
import PublicMarketingPhotoGlassShell from './beauty/PublicMarketingPhotoGlassShell.js';
import GlassPanel from './beauty/GlassPanel.js';
import GlassCardGrid from './beauty/GlassCardGrid.js';
import HeroGlassBlock from './beauty/HeroGlassBlock.js';
import CtaGlassBlock from './beauty/CtaGlassBlock.js';
import { GLASS_TOKENS } from '../lib/ui/glass.js';

// Human-First Beauty Layer hero. Full-bleed governed photograph (draft
// placeholder) — see data/visual-assets/lead-rescue-spa-sunset-hero.manifest.json
// for provenance + replacement note. Responsive AVIF/WebP/JPG derivatives
// (desktop + 768w mobile) under public/assets/visuals/.
const HERO_BASE = '/assets/visuals/lead-rescue-spa-sunset-hero-v1';
const HERO_SOURCES = [
  { type: 'image/avif', media: '(max-width: 768px)', srcSet: `${HERO_BASE}-768.avif` },
  { type: 'image/webp', media: '(max-width: 768px)', srcSet: `${HERO_BASE}-768.webp` },
  { media: '(max-width: 768px)', srcSet: `${HERO_BASE}-768.jpg` },
  { type: 'image/avif', srcSet: `${HERO_BASE}.avif` },
  { type: 'image/webp', srcSet: `${HERO_BASE}.webp` },
];
const HERO_PRELOAD_SRCSET = `${HERO_BASE}-768.avif 768w, ${HERO_BASE}.avif 2400w`;

const text = GLASS_TOKENS.text; // #eef6ff
const muted = '#c9d8e8';
const mutedBody = '#aebfd1';
const faint = '#9fb2c8';
const hairline = 'rgba(255,255,255,0.12)';
const subFill = 'rgba(255,255,255,0.05)';

const styles = {
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 999, padding: '8px 13px', background: 'rgba(255,255,255,0.08)', color: '#dbe7f3', fontSize: 13, fontWeight: 600,
  },
  h1: { margin: '16px 0 0', fontSize: 'clamp(36px, 6.4vw, 68px)', lineHeight: 0.98, letterSpacing: '-0.05em', maxWidth: 760, color: text },
  lead: { marginTop: 20, fontSize: 'clamp(17px, 1.9vw, 21px)', lineHeight: 1.55, color: muted, maxWidth: 720 },
  builtBy: { marginTop: 14, fontSize: 14, color: faint, maxWidth: 720 },
  cta: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, padding: '13px 18px', border: 0, fontWeight: 800, cursor: 'pointer', textDecoration: 'none', fontSize: 15 },
  primary: { background: GLASS_TOKENS.ctaWarm, color: GLASS_TOKENS.ctaWarmText, boxShadow: GLASS_TOKENS.ctaWarmShadow },
  secondary: { background: 'rgba(255,255,255,0.12)', color: text, border: '1px solid rgba(255,255,255,0.20)' },
  navLink: { background: 'rgba(255,255,255,0.10)', color: text, border: '1px solid rgba(255,255,255,0.18)', padding: '9px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: 'none' },
  section: { marginTop: 28 },
  label: { fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7dd3fc', fontWeight: 800 },
  h2: { margin: '8px 0 0', fontSize: 'clamp(24px, 3vw, 32px)', letterSpacing: '-0.03em', color: text },
  h3: { margin: '0 0 6px', fontSize: 17, color: text, letterSpacing: '-0.01em' },
  muted: { color: mutedBody, lineHeight: 1.65 },
  list: { margin: '14px 0 0', paddingLeft: 18, color: '#d6e4f2', lineHeight: 1.8 },
  offerList: { margin: '14px 0 0', paddingLeft: 18, color: '#e0ecf7', lineHeight: 1.8 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 },
  stepCard: { background: subFill, border: `1px solid ${hairline}`, borderRadius: 16, padding: 20 },
  input: { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(0,0,0,0.28)', color: text, fontFamily: 'inherit', fontSize: 14 },
  visualFrame: { marginTop: 18, borderRadius: 16, overflow: 'hidden', border: `1px solid ${hairline}`, background: 'rgba(6,17,31,0.5)', position: 'relative' },
  visualBand: { marginTop: 16, borderRadius: 14, overflow: 'hidden', border: `1px solid ${hairline}`, background: 'rgba(6,17,31,0.5)' },
  provenanceFloating: { position: 'absolute', left: 14, bottom: 10, zIndex: 2 },
  link: { color: '#7dd3fc' },
};

/**
 * Render a single AI Lead Rescue mid-page slot from a governed manifest.
 *
 * - If `manifest` is null/undefined, returns `null` (slot collapses).
 * - AI-generated manifests render an `AssetProvenanceDisclosure`;
 *   client-/CorpFlowAI-owned manifests render no disclosure.
 */
function LeadRescueSlot({
  manifest,
  slotId,
  eager = false,
  wrapperStyle,
  rendererStyle,
  overlay,
  provenanceWrapperStyle,
  className,
}) {
  if (!manifest) return null;
  return (
    <div data-slot-id={slotId} style={wrapperStyle} className={className}>
      <VisualAssetRenderer manifest={manifest} eager={eager} style={rendererStyle} />
      {overlay || null}
      {isAiGeneratedManifest(manifest) ? (
        <div style={provenanceWrapperStyle}>
          <AssetProvenanceDisclosure manifest={manifest} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * @typedef {import('../lib/visualAssets/selectLeadRescueAssets.js').LeadRescueAssetSelection} LeadRescueAssetSelection
 */

/**
 * AI Lead Rescue landing page.
 *
 * Single-offer page (per `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` §
 * AI Lead Rescue doctrine, *Single offer rule*): one offer — the
 * `AI Lead Rescue Setup — USD 150 launch pilot`, invoiced after intake review.
 * Currency, invoice route, and payment provider are operator decisions made
 * after intake review and communicated to the buyer on the invoice — never
 * a buyer decision on this landing page. The intake form posts to
 * `/api/tenant/intake`; the server-side handler in `lib/server/tenant-intake.js`
 * still accepts `meta.region_path` and `meta.preferred_payment_path` for
 * backward compatibility, but this page no longer asks the buyer to choose
 * a region or payment route.
 *
 * Visual: Human-First Beauty Layer (dark photo + glass) on the shared
 * `PublicMarketingPhotoGlassShell` — the same system as Product A and the
 * Mauritius property page. The hero is a full-bleed governed photograph
 * (draft placeholder, see lead-rescue-spa-sunset-hero.manifest.json); the
 * mid-page process / dashboard / trust visuals remain governed slots.
 *
 * @param {{ host?: string, leadRescueAssets?: LeadRescueAssetSelection | null }} props
 */
export default function AiLeadRescueLanding({ host = '', leadRescueAssets }) {
  const assets = leadRescueAssets || null;
  const processAsset = assets ? assets.lead_rescue_process : null;
  const dashboardAsset = assets ? assets.lead_rescue_dashboard : null;
  const trustAsset = assets ? assets.lead_rescue_trust_band : null;
  const socialAsset = assets ? assets.lead_rescue_social_card : null;

  const socialImageUrl = (() => {
    if (!socialAsset) return null;
    const src = socialAsset.source;
    if (!src || typeof src !== 'object') return null;
    if (src.type === 'repo' && typeof src.path === 'string' && src.path.startsWith('/')) {
      return `https://corpflowai.com${src.path}`;
    }
    if (typeof src.url === 'string' && /^https:\/\//.test(src.url)) {
      return src.url;
    }
    return null;
  })();

  async function submitLead(e) {
    e.preventDefault();
    trackEvent('lr_intake_submit_attempt');
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get('name') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      intent: String(fd.get('message') || '').trim(),
      meta: {
        product: 'ai-lead-rescue',
        business_name: String(fd.get('business_name') || '').trim(),
        lead_sources: String(fd.get('lead_sources') || '').trim(),
        host,
        page: '/lead-rescue',
      },
    };
    try {
      const r = await fetch('/api/tenant/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('intake_failed');
      trackEvent('lr_intake_submit_success');
      alert('Thank you — your AI Lead Rescue intake was submitted. We will contact you shortly.');
      form.reset();
    } catch {
      alert('Could not submit the intake. Please contact us directly or try again shortly.');
    }
  }

  const footer = (
    <PublicSiteFooter
      flush
      extra="AI Lead Rescue is powered by CorpFlowAI. The USD 150 launch pilot is invoiced after intake review; this page collects intake only and does not collect card or banking details."
    />
  );

  return (
    <>
      <Head>
        <title>AI Lead Rescue · Powered by CorpFlowAI</title>
        <meta
          name="description"
          content="USD 150 launch pilot. 48-hour setup that captures new enquiries, alerts the owner, logs every lead, and surfaces follow-ups daily — invoiced after intake review."
        />
        {socialImageUrl ? (
          <>
            <meta property="og:type" content="website" />
            <meta property="og:title" content="AI Lead Rescue · Powered by CorpFlowAI" />
            <meta property="og:description" content="USD 150 launch pilot. 48-hour setup for lead capture, instant alerts, follow-up logging, and daily summaries." />
            <meta property="og:image" content={socialImageUrl} />
            <meta property="og:url" content="https://corpflowai.com/lead-rescue" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="AI Lead Rescue · Powered by CorpFlowAI" />
            <meta name="twitter:description" content="USD 150 launch pilot. 48-hour setup for lead capture, instant alerts, follow-up logging, and daily summaries." />
            <meta name="twitter:image" content={socialImageUrl} />
          </>
        ) : null}
      </Head>

      <PublicMarketingPhotoGlassShell
        pageClassName="lr-page"
        maxWidth={1120}
        scrimTone="dark"
        footer={footer}
        hero={{
          base: HERO_BASE,
          sources: HERO_SOURCES,
          preloadSrcSet: HERO_PRELOAD_SRCSET,
          objectPosition: 'center 60%',
          alt: '',
        }}
      >
        <nav style={styles.nav}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>AI Lead Rescue</div>
            <div style={{ color: '#cdd9e6', fontSize: 13 }}>Powered by CorpFlowAI</div>
          </div>
          <a
            style={styles.navLink}
            href="#intake"
            className="lr-cta-secondary"
            onClick={() => trackEvent('lr_primary_cta_click', { props: { location: 'nav' } })}
          >Start my 48-hour setup</a>
        </nav>

        <GlassCardGrid minColWidth={300} gap={24} style={{ marginTop: 44, alignItems: 'start' }}>
          <HeroGlassBlock>
            <span style={styles.badge}>USD 150 launch pilot · 48-hour setup · no card on this page</span>
            <h1 style={styles.h1}>Stop losing leads because follow-up is too slow.</h1>
            <p style={styles.lead}>
              WhatsApp messages you missed. Website enquiries with no reply. Facebook DMs that slipped past. That is the gap — AI Lead Rescue captures new enquiries, alerts the owner or operator, logs every lead, and surfaces follow-ups daily, without rebuilding your website or forcing a CRM migration.
            </p>
            <p style={styles.builtBy}>
              Built by a Mauritius-based operating-systems team.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
              <a
                style={{ ...styles.cta, ...styles.primary }}
                href="#intake"
                className="lr-cta-primary"
                onClick={() => trackEvent('lr_primary_cta_click', { props: { location: 'hero' } })}
              >Start my 48-hour setup</a>
              <a
                style={{ ...styles.cta, ...styles.secondary }}
                href="#how-it-works"
                className="lr-cta-secondary"
                onClick={() => trackEvent('lr_secondary_cta_click')}
              >See how it works</a>
            </div>
          </HeroGlassBlock>

          <GlassPanel variant={{ elevation: 1 }} className="lr-region-card">
            <div style={styles.label}>Launch offer</div>
            <h2 style={{ ...styles.h2, fontSize: 26 }}>USD 150 launch pilot · 48-hour setup</h2>
            <ul style={styles.offerList}>
              <li>One lead source connected (form, email, WhatsApp, or Google Form)</li>
              <li>Instant owner / operator alert</li>
              <li>Google Sheet lead log</li>
              <li>Simple follow-up status board</li>
              <li>Daily lead summary</li>
              <li>7 days of pilot monitoring</li>
            </ul>
            <p style={{ ...styles.muted, fontSize: 13 }}>
              Invoiced after we review your intake. No card or banking details on this page.
            </p>
          </GlassPanel>
        </GlassCardGrid>

        <section style={styles.section}>
          <GlassPanel variant={{ fill: 'rgba(45,212,191,0.10)', border: 'rgba(45,212,191,0.34)' }}>
            <div style={styles.label}>Who this is for</div>
            <h2 style={styles.h2}>This is for you if:</h2>
            <ul style={styles.list}>
              <li>You receive enquiries through your website, WhatsApp, email, Facebook, or listings</li>
              <li>Leads sometimes get missed, delayed, or forgotten</li>
              <li>You do not want to rebuild your website or CRM</li>
              <li>You want a simple daily view of new leads and follow-ups</li>
              <li>One missed enquiry could cost more than the setup fee</li>
            </ul>
          </GlassPanel>
        </section>

        <section style={styles.section}>
          <GlassPanel>
            <div style={styles.label}>What problem we solve</div>
            <h2 style={styles.h2}>Most small businesses do not lose leads because they lack a website.</h2>
            <p style={styles.muted}>
              They lose leads because enquiries arrive in different places and follow-up depends on memory. AI Lead Rescue makes the work visible: capture the enquiry, alert the right person, log the record, track the next step, and summarize what still needs attention.
            </p>
          </GlassPanel>
        </section>

        <section id="how-it-works" style={styles.section}>
          <GlassPanel>
            <div style={styles.label}>How the setup works</div>
            <h2 style={styles.h2}>A lightweight rescue system, not a long software project.</h2>

            {processAsset ? (
              <LeadRescueSlot
                manifest={processAsset}
                slotId="lead_rescue_process"
                wrapperStyle={styles.visualBand}
                rendererStyle={{ width: '100%', height: 'auto', display: 'block' }}
                className="lr-process-visual"
              />
            ) : null}

            <div style={{ ...styles.grid, marginTop: 18 }}>
              <div style={styles.stepCard} className="lr-step-card">
                <div style={styles.label}>Step 1</div>
                <h3 style={styles.h3}>Connect one lead source</h3>
                <p style={styles.muted}>We start with what you already use: your website form, email inbox, WhatsApp / manual intake, or a lightweight Google Form.</p>
              </div>
              <div style={styles.stepCard} className="lr-step-card">
                <div style={styles.label}>Step 2</div>
                <h3 style={styles.h3}>Alert and log every enquiry</h3>
                <p style={styles.muted}>New enquiries are logged and pushed to the business owner or operator so follow-up can happen quickly.</p>
              </div>
              <div style={styles.stepCard} className="lr-step-card">
                <div style={styles.label}>Step 3</div>
                <h3 style={styles.h3}>Daily summary and follow-up board</h3>
                <p style={styles.muted}>A daily summary keeps the owner aware of open leads, stale follow-ups, and missed opportunities.</p>
              </div>
            </div>
          </GlassPanel>
        </section>

        <section style={styles.section}>
          <GlassPanel>
            <div style={styles.label}>What we need from you</div>
            <h2 style={styles.h2}>Four small inputs to start the 48-hour pilot.</h2>
            <ul style={styles.list}>
              <li>The one lead source we should plug in first.</li>
              <li>The owner or operator destination for alerts (Telegram or email).</li>
              <li>One named contact on your side for the 48-hour setup window.</li>
              <li>Approval on the USD 150 invoice we send after we review your intake.</li>
            </ul>
          </GlassPanel>
        </section>

        <section style={styles.section}>
          <GlassPanel>
            <div style={styles.label}>What happens after intake</div>
            <h2 style={styles.h2}>Four steps from form to live pilot.</h2>
            <div style={{ ...styles.grid, marginTop: 18 }}>
              <div style={styles.stepCard} className="lr-step-card">
                <div style={styles.label}>Step 1</div>
                <h3 style={styles.h3}>We review your intake</h3>
                <p style={styles.muted}>Within 2 business hours of submission. We confirm the right first lead source and the alert destination.</p>
              </div>
              <div style={styles.stepCard} className="lr-step-card">
                <div style={styles.label}>Step 2</div>
                <h3 style={styles.h3}>We email a USD invoice</h3>
                <p style={styles.muted}>USD 150 launch pilot. The agreed payment route is on the invoice — no card details on this page.</p>
              </div>
              <div style={styles.stepCard} className="lr-step-card">
                <div style={styles.label}>Step 3</div>
                <h3 style={styles.h3}>You pay; the 48-hour clock starts</h3>
                <p style={styles.muted}>Once payment lands, we begin the setup. You get daily updates during the build.</p>
              </div>
              <div style={styles.stepCard} className="lr-step-card">
                <div style={styles.label}>Step 4</div>
                <h3 style={styles.h3}>Live pilot + 7-day monitoring</h3>
                <p style={styles.muted}>Lead source connected, alerts live, log running, daily summary delivered. We watch for the first week.</p>
              </div>
            </div>
          </GlassPanel>
        </section>

        {dashboardAsset ? (
          <section style={styles.section}>
            <GlassPanel>
              <div style={styles.label}>What you see every morning</div>
              <h2 style={styles.h2}>A calm, restrained operator view — not another dashboard to manage.</h2>
              <p style={styles.muted}>
                Representational example only — counts, initials, and entries are illustrative, not live data. The real operator view shows your enquiries with the same restraint: new leads, follow-ups due, and a daily summary you can read in a minute.
              </p>
              <LeadRescueSlot
                manifest={dashboardAsset}
                slotId="lead_rescue_dashboard"
                wrapperStyle={styles.visualFrame}
                rendererStyle={{ width: '100%', height: 'auto', display: 'block' }}
                className="lr-dashboard-visual"
              />
            </GlassPanel>
          </section>
        ) : null}

        <section style={styles.section}>
          <GlassPanel className="lr-region-card">
            <div style={styles.label}>Reassurance</div>
            <h2 style={styles.h2}>Not another complicated CRM.</h2>
            <p style={styles.muted}>
              AI Lead Rescue is intentionally lightweight. It does not replace your website, CRM, WhatsApp, or sales process. It simply makes sure new enquiries are captured, alerted, logged, and followed up.
            </p>

            {trustAsset ? (
              <LeadRescueSlot
                manifest={trustAsset}
                slotId="lead_rescue_trust_band"
                wrapperStyle={styles.visualBand}
                rendererStyle={{ width: '100%', height: 'auto', display: 'block' }}
                className="lr-trust-visual"
              />
            ) : null}
          </GlassPanel>
        </section>

        <section style={styles.section}>
          <GlassPanel>
            <div style={styles.label}>What is not included</div>
            <h2 style={styles.h2}>What this 48-hour pilot will not do.</h2>
            <ul style={styles.list}>
              <li>No website rebuild.</li>
              <li>No CRM migration.</li>
              <li>No paid ads, SEO, or copywriting work.</li>
              <li>No multi-channel outbound campaigns.</li>
            </ul>
          </GlassPanel>
        </section>

        <section style={styles.section}>
          <GlassPanel>
            <div style={styles.label}>What is not guaranteed</div>
            <h2 style={styles.h2}>Honest limits.</h2>
            <p style={styles.muted}>
              We do not guarantee new revenue. We do not promise more leads. We help make sure existing enquiries are captured, visible, and followed up. Results depend on your business, your enquiry volume, and how you act on what becomes visible.
            </p>
          </GlassPanel>
        </section>

        <section id="payment-paths" style={styles.section}>
          <GlassPanel>
            <div style={styles.label}>How payment works</div>
            <h2 style={styles.h2}>One USD 150 invoice, sent after we review your intake.</h2>
            <ul style={styles.list}>
              <li>Submit intake on this page — no card or banking details collected here.</li>
              <li>We review your intake and confirm scope.</li>
              <li>We email a USD invoice with the agreed payment route.</li>
              <li>You pay; the 48-hour setup clock starts.</li>
            </ul>
            <p style={{ ...styles.muted, fontSize: 13 }}>
              The payment route on the invoice is decided after intake review, not by you on this page.
            </p>
            <p style={{ ...styles.muted, fontSize: 13 }}>
              {formatCurrencyDisclosure()} Service questions:{' '}
              <a href="mailto:support@corpflowai.com" style={styles.link}>support@corpflowai.com</a>{' '}
              (acknowledged within two working days). Payment security:{' '}
              <a href="/payment-security" style={styles.link}>/payment-security</a>.
            </p>
          </GlassPanel>
        </section>

        <section id="intake" style={styles.section}>
          <CtaGlassBlock style={{ maxWidth: 760 }}>
            <div style={styles.label}>Final CTA</div>
            <h2 style={styles.h2}>Start your AI Lead Rescue intake</h2>
            <p style={styles.muted}>
              Tell us your business, where leads arrive today, and the follow-up problem you want fixed first. We review every intake within 2 business hours.
            </p>
            <form onSubmit={submitLead} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginTop: 16 }}>
              <input required name="business_name" placeholder="Business name" style={styles.input} />
              <input required name="name" placeholder="Your name" style={styles.input} />
              <input required type="email" name="email" placeholder="Email" style={styles.input} />
              <input name="phone" placeholder="Phone / WhatsApp" style={styles.input} />
              <input name="lead_sources" placeholder="Where do leads arrive now? Website, email, WhatsApp, Facebook..." style={styles.input} />
              <textarea required name="message" rows="4" placeholder="What lead follow-up problem should we fix first?" style={styles.input} />
              <button type="submit" style={{ ...styles.cta, ...styles.primary }} className="lr-cta-primary">Request AI Lead Rescue setup</button>
            </form>
            <p style={{ ...styles.muted, fontSize: 12, marginTop: 12 }}>
              Payment links and invoice details are issued after intake review. Do not enter card or banking details on this page.
            </p>
            <p style={{ ...styles.muted, fontSize: 12 }}>
              We do not guarantee new revenue. We help make sure existing enquiries are captured, visible, and followed up.
            </p>
          </CtaGlassBlock>
        </section>
      </PublicMarketingPhotoGlassShell>

      <style jsx global>{`
        @media (prefers-reduced-motion: no-preference) {
          .lr-process-visual,
          .lr-trust-visual,
          .lr-dashboard-visual {
            animation: lrFadeIn 900ms ease-out 180ms both;
          }
          @keyframes lrFadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          .lr-step-card,
          .lr-region-card {
            transition: transform 280ms ease, border-color 280ms ease, background 280ms ease;
          }
          .lr-step-card:hover {
            transform: translateY(-2px);
            border-color: rgba(125, 211, 252, 0.4);
            background: rgba(255, 255, 255, 0.08);
          }

          .lr-cta-primary {
            transition: transform 220ms ease, box-shadow 220ms ease, filter 220ms ease;
          }
          .lr-cta-primary:hover {
            transform: translateY(-1px);
            filter: brightness(1.03);
            box-shadow: 0 16px 38px rgba(150, 100, 28, 0.5);
          }
          .lr-cta-secondary {
            transition: transform 220ms ease, border-color 220ms ease, background 220ms ease;
          }
          .lr-cta-secondary:hover {
            transform: translateY(-1px);
            border-color: rgba(255, 255, 255, 0.42);
            background: rgba(255, 255, 255, 0.18);
          }
        }
      `}</style>
    </>
  );
}
