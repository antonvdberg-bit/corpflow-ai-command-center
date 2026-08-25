import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import DiscoveryIntakeForm from './public/DiscoveryIntakeForm.js';
import CorpFlowPublicFooter from './public/CorpFlowPublicFooter.js';
import CorpFlowBrandMetadata from './public/CorpFlowBrandMetadata.js';
import { GLASS_TOKENS } from '../lib/ui/glass.js';
import { cfBtnPrimary, cfBtnSecondary } from './public/corpflow-public-styles.js';

/**
 * Fictional Website Rescue before/after demo for sales conversations.
 * No private client data. Public SKU remains Premium Landing Page Rescue.
 */

const HERO_BASE = '/assets/visuals/lead-rescue-property-reception-hero-v1';

const DEMO_BUSINESS = {
  name: 'Harbour Hospitality Supplies',
  tagline: 'Hotel linen, amenities, and restock — delivered on schedule.',
  audience: 'Hotels, guesthouses, and restaurant operators who need reliable stock without chasing suppliers.',
};

const BEFORE_PAINS = [
  'Homepage looks like a 2012 brochure — offer buried under dense paragraphs.',
  'No clear mobile call-to-action; phone numbers compete with outdated banners.',
  'Product categories listed as plain text; buyers cannot request a quote in one step.',
  'Enquiry form broken or missing — messages go nowhere.',
];

const AFTER_OUTPUTS = [
  'One clear offer headline and a single primary CTA: Request a stock quote.',
  'Mobile-ready layout with product categories that support the enquiry path.',
  'Proof strip (delivery rhythm, account contact) without invented metrics.',
  'Working enquiry capture routed for operator follow-up.',
];

const PRODUCTS = [
  { title: 'Guest linen packs', note: 'Sheets, towels, and bath sets for room turns.' },
  { title: 'In-room amenities', note: 'Toiletries and restock kits for housekeeping.' },
  { title: 'F&B disposables', note: 'Napkins, wraps, and service consumables.' },
];

const font =
  '"Source Serif 4", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const sans =
  '"Source Sans 3", "Segoe UI", ui-sans-serif, system-ui, sans-serif';

const styles = {
  page: {
    minHeight: '100vh',
    color: '#f4f7fb',
    fontFamily: sans,
    background: '#0a121c',
  },
  ribbon: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    padding: '10px 16px',
    background: 'rgba(8, 14, 24, 0.92)',
    borderBottom: '1px solid rgba(255,255,255,0.12)',
    fontSize: 13,
    lineHeight: 1.45,
    color: '#c5d4e4',
    backdropFilter: 'blur(10px)',
  },
  shell: {
    maxWidth: 1080,
    margin: '0 auto',
    padding: '28px 18px 64px',
  },
  label: {
    fontSize: 12,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#7dd3fc',
    fontWeight: 800,
  },
  h1: {
    margin: '12px 0 0',
    fontFamily: font,
    fontSize: 'clamp(32px, 5.4vw, 52px)',
    lineHeight: 1.08,
    letterSpacing: '-0.03em',
    maxWidth: 720,
  },
  lead: {
    marginTop: 16,
    fontSize: 'clamp(16px, 1.8vw, 19px)',
    lineHeight: 1.55,
    color: '#cdd9e6',
    maxWidth: 640,
  },
  toggleRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 22,
  },
  panel: {
    marginTop: 22,
    padding: '22px 20px',
    borderRadius: GLASS_TOKENS.glassRadius,
    background: GLASS_TOKENS.glassFill,
    border: `1px solid ${GLASS_TOKENS.glassBorder}`,
    boxShadow: '0 18px 50px rgba(0,0,0,0.28)',
    backdropFilter: `blur(${GLASS_TOKENS.glassBlur})`,
  },
  beforeFrame: {
    marginTop: 18,
    padding: 16,
    borderRadius: 4,
    background: '#d8d2c4',
    color: '#222',
    fontFamily: 'Times New Roman, Times, serif',
    border: '2px solid #999',
    boxShadow: 'inset 0 0 0 1px #eee',
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 14,
    marginTop: 18,
  },
  productItem: {
    padding: '14px 14px 16px',
    borderTop: '1px solid rgba(255,255,255,0.22)',
  },
  list: {
    margin: '12px 0 0',
    paddingLeft: 18,
    color: '#e0ecf7',
    lineHeight: 1.75,
  },
  ctaRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 22,
  },
  muted: { color: '#bccdde', lineHeight: 1.65, margin: '12px 0 0' },
};

function ToggleButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        ...cfBtnSecondary,
        border: active ? '1px solid rgba(45,212,191,0.55)' : cfBtnSecondary.border,
        background: active ? 'rgba(45,212,191,0.16)' : cfBtnSecondary.background,
        color: active ? '#d6f5ef' : cfBtnSecondary.color,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function BeforeView() {
  return (
    <div style={styles.panel} data-demo-view="before">
      <div style={styles.label}>Before · typical failing brochure site</div>
      <h2 style={{ ...styles.h1, fontSize: 'clamp(26px, 4vw, 36px)' }}>What buyers often land on</h2>
      <p style={styles.muted}>
        Fictional example only — shaped like a hospitality-supplies brochure that under-sells the offer.
      </p>
      <div style={styles.beforeFrame} aria-label="Outdated site mock">
        <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>Welcome to our website!!!!</div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{DEMO_BUSINESS.name}</div>
        <p style={{ fontSize: 13, lineHeight: 1.45 }}>
          We have been supplying hotels for many years with many products including linen and other items. Please
          call for more information. Click here. Click here. Special promotion!!!
        </p>
        <p style={{ fontSize: 12 }}>
          Products: linen towels soap shampoo cups plates paper · About us · Gallery · News · Links · Sitemap
        </p>
        <div style={{ marginTop: 10, fontSize: 12, color: '#444' }}>
          [Flash banner placeholder] &nbsp; Contact: see footer &nbsp; Best viewed in Internet Explorer
        </div>
      </div>
      <ul style={{ ...styles.list, color: '#fca5a5' }}>
        {BEFORE_PAINS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function AfterView() {
  return (
    <div style={styles.panel} data-demo-view="after">
      <div
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.16)',
          backgroundImage: `linear-gradient(180deg, rgba(8,12,20,0.35), rgba(8,12,20,0.72)), url(${HERO_BASE}.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
          padding: '28px 22px 26px',
        }}
      >
        <div style={styles.label}>After · rescued landing (demo)</div>
        <h2 style={{ ...styles.h1, marginTop: 10 }}>{DEMO_BUSINESS.name}</h2>
        <p style={styles.lead}>{DEMO_BUSINESS.tagline}</p>
        <p style={{ ...styles.muted, maxWidth: 560 }}>{DEMO_BUSINESS.audience}</p>
        <div style={styles.ctaRow}>
          <a href="#demo-enquiry" style={{ ...cfBtnPrimary, background: GLASS_TOKENS.ctaWarm, color: GLASS_TOKENS.ctaWarmText, boxShadow: GLASS_TOKENS.ctaWarmShadow }}>
            Request a stock quote
          </a>
          <a href="#demo-products" style={cfBtnSecondary}>
            View supply categories
          </a>
        </div>
      </div>

      <div id="demo-products" style={{ marginTop: 20 }}>
        <div style={styles.label}>Product presentation</div>
        <div style={styles.productGrid}>
          {PRODUCTS.map((p) => (
            <div key={p.title} style={styles.productItem}>
              <div style={{ fontFamily: font, fontSize: 20, letterSpacing: '-0.02em' }}>{p.title}</div>
              <p style={{ margin: '8px 0 0', color: '#bccdde', lineHeight: 1.5 }}>{p.note}</p>
            </div>
          ))}
        </div>
      </div>

      <ul style={styles.list}>
        {AFTER_OUTPUTS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <p style={{ ...styles.muted, fontSize: 14 }}>
        Optional next step for many buyers: connect this enquiry path to{' '}
        <Link href="/lead-rescue" style={{ color: '#7dd3fc' }}>
          Lead Rescue
        </Link>{' '}
        (separate engagement) so follow-up stays visible after the form submit.
      </p>
    </div>
  );
}

export default function WebsiteRescueDemo() {
  const [view, setView] = useState('after');

  return (
    <>
      <CorpFlowBrandMetadata />
      <Head>
        <title>Website Rescue demo — fictional before/after | CorpFlowAI</title>
        <meta
          name="description"
          content="Fictional Website Rescue before/after demo for Premium Landing Page Rescue. No private client data. Request discovery on the live offer page."
        />
        <meta name="robots" content="noindex,nofollow" />
        <link rel="canonical" href="https://corpflowai.com/demo/website-rescue" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div style={styles.page} data-website-rescue-demo>
        <div style={styles.ribbon} role="note">
          <strong style={{ color: '#eef6ff' }}>Demo only.</strong> Fictional hospitality-supplies business for sales
          conversations. Not a live client site. Public offer:{' '}
          <Link href="/website-rescue" style={{ color: '#7dd3fc' }}>
            Website Rescue
          </Link>
          .
        </div>

        <div style={styles.shell}>
          <div style={styles.label}>CorpFlowAI · Website Rescue demonstration</div>
          <h1 style={styles.h1}>From outdated brochure to a clear enquiry path</h1>
          <p style={styles.lead}>
            Walk the before/after shape in under five minutes, then send prospects to discovery on the named Website Rescue page.
            No SEO, traffic, or revenue guarantees.
          </p>

          <div style={styles.toggleRow} role="group" aria-label="Before or after view">
            <ToggleButton active={view === 'before'} onClick={() => setView('before')}>
              Show before
            </ToggleButton>
            <ToggleButton active={view === 'after'} onClick={() => setView('after')}>
              Show after
            </ToggleButton>
            <Link href="/website-rescue" style={cfBtnPrimary}>
              Open sellable offer page
            </Link>
          </div>

          {view === 'before' ? <BeforeView /> : <AfterView />}

          <div style={{ ...styles.panel, marginTop: 28 }} id="demo-enquiry">
            <div style={styles.label}>Enquiry capture · discovery intake</div>
            <p style={styles.muted}>
              Use this form to practice the intake path. It routes as a Website Rescue discovery on the existing
              landing-rescue SKU (same operator desk as the public offer). Do not enter real private client credentials
              or personal data.
            </p>
            <div style={{ marginTop: 16 }}>
              <DiscoveryIntakeForm
                defaultOfferSlug="premium-landing-page-rescue"
                lockedOffer
                heading="Request discovery — Website Rescue"
              />
            </div>
          </div>

          <div style={{ ...styles.panel, marginTop: 22 }}>
            <div style={styles.label}>Operator close</div>
            <p style={styles.muted}>
              Recommended path for most first clients: <strong style={{ color: '#eef6ff' }}>T1 Landing Rescue</strong>{' '}
              (from MUR 45,000) → 50% deposit → assets → 24–72h preview → written approval → production. Brochure or
              rebuild scopes are operator-quoted extensions.
            </p>
            <div style={styles.ctaRow}>
              <Link href="/website-rescue#discovery" style={cfBtnPrimary}>
                Go to discovery CTA
              </Link>
              <Link href="/website-rescue" style={cfBtnSecondary}>
                Read offer details
              </Link>
            </div>
          </div>
        </div>

        <CorpFlowPublicFooter extra="Website Rescue demo — fictional example. No private client information. Discovery only; no payment collected on this page." />
      </div>
    </>
  );
}
