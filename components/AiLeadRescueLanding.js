import React, { useMemo, useState } from 'react';
import Head from 'next/head';

import PublicSiteFooter from './PublicSiteFooter.js';
import VisualAssetRenderer, { isAiGeneratedManifest } from './VisualAssetRenderer.js';
import AssetProvenanceDisclosure from './AssetProvenanceDisclosure.js';

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #06111f 0%, #0b1f33 45%, #101827 100%)',
    color: '#eef6ff',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  shell: { maxWidth: 1120, margin: '0 auto', padding: '42px 20px 56px' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.16)', borderRadius: 999, padding: '8px 12px', background: 'rgba(255,255,255,0.06)', color: '#c6d7ea', fontSize: 13 },
  hero: { marginTop: 44, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'start' },
  h1: { margin: 0, fontSize: 'clamp(38px, 7vw, 76px)', lineHeight: 0.96, letterSpacing: '-0.055em', maxWidth: 790 },
  lead: { marginTop: 20, fontSize: 'clamp(17px, 2vw, 22px)', lineHeight: 1.55, color: '#c9d8e8', maxWidth: 760 },
  card: { border: '1px solid rgba(255,255,255,0.13)', borderRadius: 26, background: 'rgba(255,255,255,0.07)', boxShadow: '0 24px 80px rgba(0,0,0,0.28)', padding: 22, backdropFilter: 'blur(14px)', transition: 'border-color 320ms ease, transform 320ms ease' },
  highlightCard: { border: '1px solid rgba(45,212,191,0.34)', borderRadius: 26, background: 'rgba(45,212,191,0.10)', boxShadow: '0 24px 80px rgba(0,0,0,0.28)', padding: 22, backdropFilter: 'blur(14px)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 },
  cta: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, padding: '13px 16px', border: 0, fontWeight: 800, cursor: 'pointer', textDecoration: 'none', transition: 'transform 220ms ease, box-shadow 220ms ease' },
  primary: { background: '#2dd4bf', color: '#031018' },
  secondary: { background: 'rgba(255,255,255,0.09)', color: '#eef6ff', border: '1px solid rgba(255,255,255,0.15)' },
  section: { marginTop: 28 },
  label: { fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7dd3fc', fontWeight: 800 },
  h2: { margin: '8px 0 0', fontSize: 30, letterSpacing: '-0.03em' },
  muted: { color: '#aebfd1', lineHeight: 1.65 },
  list: { margin: '14px 0 0', paddingLeft: 18, color: '#d6e4f2', lineHeight: 1.8 },
  tabButton: { borderRadius: 999, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#c9d8e8', padding: '10px 14px', fontWeight: 750, cursor: 'pointer' },
  activeTab: { background: '#2dd4bf', color: '#031018', borderColor: '#2dd4bf' },
  input: { width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.20)', color: '#eef6ff' },
  heroVisualFrame: {
    position: 'relative',
    marginTop: 36,
    borderRadius: 22,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.10)',
    background: '#06111f',
    aspectRatio: '16 / 10',
    boxShadow: '0 30px 90px rgba(0,0,0,0.35)',
  },
  heroVisualOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(6,17,31,0) 55%, rgba(6,17,31,0.55) 100%)',
    pointerEvents: 'none',
  },
  processVisualBand: {
    marginTop: 18,
    marginBottom: 4,
    borderRadius: 18,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#06111f',
  },
  dashboardVisualFrame: {
    marginTop: 18,
    borderRadius: 22,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.10)',
    background: '#0a1c2f',
    boxShadow: '0 20px 70px rgba(0,0,0,0.30)',
  },
  trustVisualBand: {
    marginTop: 22,
    borderRadius: 14,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#0b1f33',
  },
  provenanceFloating: {
    position: 'absolute',
    left: 14,
    bottom: 10,
    zIndex: 2,
  },
};

const regionCopy = {
  mauritius: {
    title: 'Mauritius businesses',
    price: 'from MUR 6,900',
    subtitle: 'Local invoice, MUR pricing, and SMB Mauritius payment path after intake review.',
    payments: ['Local invoice', 'MUR pricing', 'SMB Mauritius payment path'],
    cta: 'Start intake — Mauritius',
    path: 'SMB Mauritius / local invoice / MUR pricing',
  },
  international: {
    title: 'International businesses',
    price: 'from USD 150',
    subtitle: 'USD pricing and international payment route after intake review.',
    payments: ['USD pricing', 'PayPal / Wise / Google Pay where available', 'International payment route'],
    cta: 'Start intake — International',
    path: 'PayPal / Wise / Google Pay where available',
  },
};

function RegionCard({ active, region, onSelect }) {
  const c = regionCopy[region];
  return (
    <div
      className="lr-region-card"
      style={{ ...styles.card, outline: active ? '2px solid #2dd4bf' : 'none' }}
    >
      <div style={styles.label}>{region === 'mauritius' ? 'Domestic route' : 'International route'}</div>
      <h3 style={{ margin: '8px 0 0', fontSize: 24 }}>{c.title}</h3>
      <div style={{ marginTop: 8, color: '#2dd4bf', fontWeight: 850, fontSize: 22 }}>{c.price}</div>
      <p style={styles.muted}>{c.subtitle}</p>
      <ul style={styles.list}>
        {c.payments.map((p) => <li key={p}>{p}</li>)}
      </ul>
      <button type="button" onClick={() => onSelect(region)} style={{ ...styles.cta, ...styles.primary, marginTop: 16, width: '100%' }} className="lr-cta-primary">
        {c.cta}
      </button>
    </div>
  );
}

/**
 * Render a single AI Lead Rescue slot from a governed manifest.
 *
 * Rules mirror the homepage `HomepageSlot`:
 * - If `manifest` is null/undefined, returns `null` (slot collapses).
 * - AI-generated manifests render an `AssetProvenanceDisclosure`
 *   beside or below the asset; client-/CorpFlowAI-owned manifests
 *   render no disclosure.
 * - Above-fold slots can opt into `eager` loading; everything else
 *   uses the renderer's `loading="lazy"` default.
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
 * @param {{ host?: string, leadRescueAssets?: LeadRescueAssetSelection | null }} props
 */
export default function AiLeadRescueLanding({ host = '', leadRescueAssets }) {
  const [region, setRegion] = useState('');
  const selected = useMemo(() => (region ? regionCopy[region] : null), [region]);

  const assets = leadRescueAssets || null;
  const heroAsset = assets ? assets.lead_rescue_hero : null;
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
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get('name') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      intent: String(fd.get('message') || '').trim(),
      meta: {
        product: 'ai-lead-rescue',
        region_path: region || 'not_selected',
        business_name: String(fd.get('business_name') || '').trim(),
        lead_sources: String(fd.get('lead_sources') || '').trim(),
        preferred_payment_path: selected ? selected.path : 'not_selected',
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
      alert('Thank you — your AI Lead Rescue intake was submitted. We will contact you shortly.');
      form.reset();
      setRegion('');
    } catch {
      alert('Could not submit the intake. Please contact us directly or try again shortly.');
    }
  }

  return (
    <div style={styles.page}>
      <Head>
        <title>AI Lead Rescue · Powered by CorpFlowAI</title>
        <meta name="description" content="48-hour lead capture, instant alerts, follow-up logging, and daily lead summaries for small businesses. Intake-first, no card details on this site." />
        {socialImageUrl ? (
          <>
            <meta property="og:type" content="website" />
            <meta property="og:title" content="AI Lead Rescue · Powered by CorpFlowAI" />
            <meta property="og:description" content="48-hour lead capture, instant alerts, follow-up logging, and daily lead summaries for small businesses." />
            <meta property="og:image" content={socialImageUrl} />
            <meta property="og:url" content="https://corpflowai.com/lead-rescue" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="AI Lead Rescue · Powered by CorpFlowAI" />
            <meta name="twitter:description" content="48-hour lead capture, instant alerts, follow-up logging, and daily lead summaries for small businesses." />
            <meta name="twitter:image" content={socialImageUrl} />
          </>
        ) : null}
      </Head>
      <main style={styles.shell}>
        <nav style={styles.nav}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>AI Lead Rescue</div>
            <div style={{ color: '#9fb2c8', fontSize: 13 }}>Powered by CorpFlowAI</div>
          </div>
          <a style={{ ...styles.cta, ...styles.secondary }} href="#intake" className="lr-cta-secondary">Start the 48-hour setup</a>
        </nav>

        <section style={styles.hero}>
          <div>
            <span style={styles.badge}>48-hour setup · lead capture · instant alerts · follow-up board</span>
            <h1 style={styles.h1}>Stop losing leads because follow-up is too slow.</h1>
            <p style={styles.lead}>
              AI Lead Rescue captures new enquiries, alerts the owner/operator, logs every lead in a simple follow-up board, and sends a daily summary — without rebuilding your website or forcing you into a CRM.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
              <a style={{ ...styles.cta, ...styles.primary }} href="#intake" className="lr-cta-primary">Start my 48-hour setup</a>
              <a style={{ ...styles.cta, ...styles.secondary }} href="#how-it-works" className="lr-cta-secondary">See how it works</a>
            </div>
          </div>

          <aside style={styles.card} className="lr-region-card">
            <div style={styles.label}>Launch offer</div>
            <h2 style={{ ...styles.h2, fontSize: 28 }}>48-hour pilot setup from $150 / MUR 6,900</h2>
            <ul style={styles.list}>
              <li>Connect one lead source: form, email, WhatsApp/manual intake, or Google Form</li>
              <li>Instant owner/operator alert</li>
              <li>Google Sheet lead log</li>
              <li>Simple follow-up status board</li>
              <li>Daily lead summary</li>
              <li>7 days of pilot monitoring</li>
            </ul>
            <p style={{ ...styles.muted, fontSize: 13 }}>
              First pilots are intentionally simple: no CRM rebuild, no website rebuild, no long strategy project.
            </p>
          </aside>
        </section>

        {heroAsset ? (
          <LeadRescueSlot
            manifest={heroAsset}
            slotId="lead_rescue_hero"
            eager
            wrapperStyle={styles.heroVisualFrame}
            rendererStyle={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            overlay={<div style={styles.heroVisualOverlay} aria-hidden="true" />}
            className="lr-hero-visual"
            provenanceWrapperStyle={styles.provenanceFloating}
          />
        ) : null}

        <section style={styles.section}>
          <div style={styles.highlightCard}>
            <div style={styles.label}>Who this is for</div>
            <h2 style={styles.h2}>This is for you if:</h2>
            <ul style={styles.list}>
              <li>You receive enquiries through your website, WhatsApp, email, Facebook, or listings</li>
              <li>Leads sometimes get missed, delayed, or forgotten</li>
              <li>You do not want to rebuild your website or CRM</li>
              <li>You want a simple daily view of new leads and follow-ups</li>
              <li>One missed enquiry could cost more than the setup fee</li>
            </ul>
          </div>
        </section>

        <section id="how-it-works" style={styles.section}>
          <div style={styles.label}>What happens in 48 hours</div>
          <h2 style={styles.h2}>A lightweight rescue system, not a long software project.</h2>

          {processAsset ? (
            <LeadRescueSlot
              manifest={processAsset}
              slotId="lead_rescue_process"
              wrapperStyle={styles.processVisualBand}
              rendererStyle={{ width: '100%', height: 'auto', display: 'block' }}
              className="lr-process-visual"
            />
          ) : null}

          <div style={{ ...styles.grid, marginTop: 16 }}>
            <div style={styles.card} className="lr-step-card">
              <div style={styles.label}>Step 1</div>
              <h3>Connect one lead source</h3>
              <p style={styles.muted}>We start with what you already use: your website form, email inbox, WhatsApp/manual intake, or a lightweight Google Form.</p>
            </div>
            <div style={styles.card} className="lr-step-card">
              <div style={styles.label}>Step 2</div>
              <h3>Alert and log every enquiry</h3>
              <p style={styles.muted}>New enquiries are logged and pushed to the business owner or operator so follow-up can happen quickly.</p>
            </div>
            <div style={styles.card} className="lr-step-card">
              <div style={styles.label}>Step 3</div>
              <h3>Daily summary and follow-up board</h3>
              <p style={styles.muted}>A daily summary keeps the owner aware of open leads, stale follow-ups, and missed opportunities.</p>
            </div>
          </div>
        </section>

        {dashboardAsset ? (
          <section style={styles.section}>
            <div style={styles.label}>What you see every morning</div>
            <h2 style={styles.h2}>A calm, restrained operator view — not another dashboard to manage.</h2>
            <p style={styles.muted}>
              Representational example only — counts, initials, and entries are illustrative, not live data. The real operator view shows your enquiries with the same restraint: new leads, follow-ups due, and a daily summary you can read in a minute.
            </p>
            <LeadRescueSlot
              manifest={dashboardAsset}
              slotId="lead_rescue_dashboard"
              wrapperStyle={styles.dashboardVisualFrame}
              rendererStyle={{ width: '100%', height: 'auto', display: 'block' }}
              className="lr-dashboard-visual"
            />
          </section>
        ) : null}

        <section style={styles.section}>
          <div style={styles.card} className="lr-region-card">
            <div style={styles.label}>Reassurance</div>
            <h2 style={styles.h2}>Not another complicated CRM.</h2>
            <p style={styles.muted}>
              AI Lead Rescue is intentionally lightweight. It does not replace your website, CRM, WhatsApp, or sales process. It simply makes sure new enquiries are captured, alerted, logged, and followed up.
            </p>
          </div>

          {trustAsset ? (
            <LeadRescueSlot
              manifest={trustAsset}
              slotId="lead_rescue_trust_band"
              wrapperStyle={styles.trustVisualBand}
              rendererStyle={{ width: '100%', height: 'auto', display: 'block' }}
              className="lr-trust-visual"
            />
          ) : null}
        </section>

        <section id="payment-paths" style={styles.section}>
          <div style={styles.label}>Region and invoice route</div>
          <h2 style={styles.h2}>Start with the same 48-hour setup. Choose your region at intake.</h2>
          <p style={styles.muted}>
            We support Mauritius and international businesses with separate payment and invoice routes after your intake is reviewed.
          </p>
          <div style={{ ...styles.grid, marginTop: 16 }}>
            <RegionCard region="mauritius" active={region === 'mauritius'} onSelect={setRegion} />
            <RegionCard region="international" active={region === 'international'} onSelect={setRegion} />
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.highlightCard}>
            <div style={styles.label}>Payment after intake review</div>
            <p style={{ ...styles.muted, margin: 0 }}>
              Payment is handled after intake review. You do not enter card or banking details on this page. Mauritius businesses receive the local invoice/MUR route. International businesses receive the USD route through PayPal, Wise, or Google Pay where available.
            </p>
          </div>
        </section>

        <section id="intake" style={styles.section}>
          <div style={{ ...styles.card, maxWidth: 760 }}>
            <div style={styles.label}>Final CTA</div>
            <h2 style={styles.h2}>{selected ? `${selected.title}: ${selected.price}` : 'Start your AI Lead Rescue intake'}</h2>
            <p style={styles.muted}>
              {selected
                ? `Selected payment route: ${selected.payments.join(' / ')}.`
                : 'Select your business location so we can route the correct pricing and payment path.'}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {Object.keys(regionCopy).map((r) => (
                <button key={r} type="button" onClick={() => setRegion(r)} style={{ ...styles.tabButton, ...(region === r ? styles.activeTab : {}) }}>
                  {regionCopy[r].title}
                </button>
              ))}
            </div>
            <form onSubmit={submitLead} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              <input required name="business_name" placeholder="Business name" style={styles.input} />
              <input required name="name" placeholder="Your name" style={styles.input} />
              <input required type="email" name="email" placeholder="Email" style={styles.input} />
              <input name="phone" placeholder="Phone / WhatsApp" style={styles.input} />
              <input name="lead_sources" placeholder="Where do leads arrive now? Website, email, WhatsApp, Facebook..." style={styles.input} />
              <textarea required name="message" rows="4" placeholder="What lead follow-up problem should we fix first?" style={styles.input} />
              <button type="submit" style={{ ...styles.cta, ...styles.primary }} className="lr-cta-primary">Request AI Lead Rescue setup</button>
            </form>
            <p style={{ ...styles.muted, fontSize: 12 }}>
              Payment links/invoice details are issued after intake review. Do not enter card or banking details on this page.
            </p>
            <p style={{ ...styles.muted, fontSize: 12 }}>
              We do not guarantee new revenue. We help make sure existing enquiries are captured, visible, and followed up.
            </p>
          </div>
        </section>

        <PublicSiteFooter extra="AI Lead Rescue is powered by CorpFlowAI. Payment paths are separated for Mauritius and international clients. This page collects intake only; payment is handled through the appropriate route after review." />
      </main>

      <style jsx global>{`
        @media (prefers-reduced-motion: no-preference) {
          .lr-hero-visual img,
          .lr-hero-visual video {
            animation: lrHeroSettle 1600ms ease-out both;
          }
          @keyframes lrHeroSettle {
            from { opacity: 0; transform: scale(1.025); }
            to   { opacity: 1; transform: scale(1); }
          }

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
            transition: transform 280ms ease, border-color 280ms ease, box-shadow 280ms ease;
          }
          .lr-step-card:hover,
          .lr-region-card:hover {
            transform: translateY(-2px);
            border-color: rgba(125, 211, 252, 0.35);
            box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
          }

          .lr-cta-primary,
          .lr-cta-secondary {
            transition: transform 220ms ease, box-shadow 220ms ease;
          }
          .lr-cta-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 12px 32px rgba(45, 212, 191, 0.28);
          }
          .lr-cta-secondary:hover {
            transform: translateY(-1px);
            box-shadow: 0 12px 32px rgba(125, 211, 252, 0.18);
          }
        }

        @media (max-width: 600px) {
          .lr-hero-visual {
            aspect-ratio: 4 / 3;
          }
        }
      `}</style>
    </div>
  );
}
