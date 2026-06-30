import React from 'react';
import Head from 'next/head';

import { trackEvent } from '../lib/analytics/index.js';
import PublicSiteFooter from './PublicSiteFooter.js';
import PublicMarketingPhotoGlassShell from './beauty/PublicMarketingPhotoGlassShell.js';
import GlassPanel from './beauty/GlassPanel.js';
import GlassCardGrid from './beauty/GlassCardGrid.js';
import HeroGlassBlock from './beauty/HeroGlassBlock.js';
import CtaGlassBlock from './beauty/CtaGlassBlock.js';
import { GLASS_TOKENS } from '../lib/ui/glass.js';

/**
 * AI Lead Rescue — Mauritius property landing page.
 *
 * Niche-specific landing page for Mauritius property operators (real estate
 * agencies, villa rental operators, property managers, serviced apartments /
 * short-term rentals). The pan-vertical AI Lead Rescue page at `/lead-rescue`
 * is unchanged.
 *
 * Visual treatment — Human-First Beauty Layer (dark photo + glass):
 *  - Rendered on the shared `PublicMarketingPhotoGlassShell` (the same
 *    "photo + glass" system as Product A / `/product-a/us-clinics`) so every
 *    CorpFlowAI public surface reads as one consistent brand. See
 *    docs/marketing/CORPFLOW_VISUAL_STANDARD_HUMAN_FIRST_BEAUTY_LAYER.md and
 *    docs/marketing/CORPFLOW_BEAUTY_LAYER_ROLLOUT_PLAN_V1.md.
 *  - Hero background: a calm, premium Mauritius property reception interior,
 *    full-bleed and fixed under a gentle dark scrim; content sits on dark
 *    frosted-glass panels above it. Asset + provenance:
 *    data/visual-assets/lead-rescue-property-reception-hero.manifest.json.
 *    DRAFT placeholder asset (AI-generated, ~1024px) — replace with a
 *    provenance-confirmed >=2400px master before lifecycle.state=published.
 *  - The earlier light editorial layout (framed lagoon aside, NASA service-area
 *    map, cream/teal palette) is superseded by this dark glass system; the
 *    Mauritius copy, the operating-area content, and the intake contract are
 *    preserved verbatim.
 *
 * CTA wiring (no new env vars, no new schema) — UNCHANGED:
 *  - The intake form posts to the existing `/api/tenant/intake` handler in
 *    `lib/server/tenant-intake.js` with `meta.product = 'ai-lead-rescue'`,
 *    `meta.lead_rescue_variant = 'property-mauritius'`, `meta.property_segments`
 *    (array), `meta.property_segment` (legacy single string: the only chosen
 *    segment when exactly one is ticked, else `'multiple'`), and
 *    `meta.page = '/lead-rescue/property-mauritius'`. The operator alert path
 *    is unchanged.
 *
 * Doctrine compliance (unchanged):
 *  - Single offer rule preserved; only the launch pilot is advertised.
 *  - Mauritius-local payment framing permitted on this surface only (see
 *    `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *Mauritius property
 *    page localisation note*).
 *  - Required no-guarantee copy is present verbatim.
 *  - "We do not replace WhatsApp Business." is present verbatim in the hero.
 *  - CTA describes the buyer action ("Request the Mauritius property pilot
 *    outline") — no route-as-CTA wording.
 */

const HERO_BASE = '/assets/visuals/lead-rescue-property-reception-hero-v1';
const HERO_SOURCES = [
  { type: 'image/avif', media: '(max-width: 768px)', srcSet: `${HERO_BASE}-768.avif` },
  { type: 'image/webp', media: '(max-width: 768px)', srcSet: `${HERO_BASE}-768.webp` },
  { media: '(max-width: 768px)', srcSet: `${HERO_BASE}-768.jpg` },
  { type: 'image/avif', srcSet: `${HERO_BASE}.avif` },
  { type: 'image/webp', srcSet: `${HERO_BASE}.webp` },
];
const HERO_PRELOAD_SRCSET = `${HERO_BASE}-768.avif 768w, ${HERO_BASE}.avif 2400w`;

const accent = GLASS_TOKENS.accent; // canonical teal accent on dark glass
const champagne = '#e6c48f'; // warm secondary accent (harmonises with ctaWarm)

const text = GLASS_TOKENS.text; // #eef6ff
const muted = '#cdd9e6';
const faint = '#9fb2c4';
const hairline = 'rgba(255,255,255,0.12)';
const hairlineSoft = 'rgba(255,255,255,0.08)';
const subFill = 'rgba(255,255,255,0.05)';
const subFillStrong = 'rgba(255,255,255,0.07)';

const styles = {
  nav: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 16, flexWrap: 'wrap',
  },
  brandMark: { fontWeight: 800, fontSize: 20, letterSpacing: '0.01em', color: text },
  brandSub: { color: '#cdd9e6', fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 2 },
  cta: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, padding: '13px 18px', border: 0, fontWeight: 800,
    cursor: 'pointer', textDecoration: 'none', fontSize: 15, letterSpacing: '0.01em',
  },
  primary: { background: GLASS_TOKENS.ctaWarm, color: GLASS_TOKENS.ctaWarmText, boxShadow: GLASS_TOKENS.ctaWarmShadow },
  secondary: { background: 'rgba(255,255,255,0.12)', color: text, border: '1px solid rgba(255,255,255,0.20)' },
  navLink: { background: 'rgba(255,255,255,0.10)', color: text, border: '1px solid rgba(255,255,255,0.18)', padding: '9px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: 'none' },
  eyebrow: { fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: accent, fontWeight: 800 },
  h1: { margin: '14px 0 0', fontSize: 'clamp(36px, 5.6vw, 60px)', lineHeight: 1.04, letterSpacing: '-0.035em', color: text, maxWidth: 760 },
  h1Accent: { color: accent, fontStyle: 'italic', fontWeight: 500 },
  lead: { marginTop: 20, fontSize: 'clamp(17px, 1.7vw, 20px)', lineHeight: 1.55, color: muted, maxWidth: 720 },
  trustLine: { marginTop: 22, paddingLeft: 16, borderLeft: `2px solid ${accent}`, fontSize: 16, color: text, lineHeight: 1.55, maxWidth: 660, fontWeight: 500 },
  ctaRow: { display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 },
  section: { marginTop: 28 },
  sectionLabel: { fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#7dd3fc', fontWeight: 800, marginBottom: 10 },
  h2: { margin: 0, fontSize: 'clamp(26px, 3.2vw, 36px)', lineHeight: 1.16, letterSpacing: '-0.025em', fontWeight: 600, maxWidth: 760, color: text },
  body: { marginTop: 16, color: muted, lineHeight: 1.65, fontSize: 16, maxWidth: 720 },

  workflowBand: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 14, marginTop: 28 },
  workflowStep: {
    background: subFill, border: `1px solid ${hairline}`, padding: '20px 18px 18px',
    borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', minHeight: 210,
  },
  workflowStepIconWrap: {
    width: 52, height: 52, borderRadius: 12, background: 'rgba(45,212,191,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid rgba(45,212,191,0.22)`,
  },
  workflowStepIndex: { fontSize: 10, letterSpacing: '0.24em', color: champagne, fontWeight: 800 },
  workflowStepTitle: { fontSize: 15, color: text, fontWeight: 700, lineHeight: 1.3 },
  workflowStepBody: { color: muted, fontSize: 13, lineHeight: 1.55, marginTop: 'auto' },

  cockpitHeader: {
    padding: '4px 2px 16px', borderBottom: `1px solid ${hairline}`,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 0,
  },
  cockpitTitleStack: { display: 'flex', flexDirection: 'column', gap: 2 },
  cockpitTitle: { fontSize: 14, color: text, fontWeight: 700, letterSpacing: '0.01em' },
  cockpitSubtitle: { fontSize: 12, color: faint },
  cockpitTag: { fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', background: 'rgba(230,196,143,0.16)', color: champagne, padding: '4px 8px', borderRadius: 6, fontWeight: 800 },
  cockpitMetricsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 16 },
  cockpitMetric: { background: subFill, border: `1px solid ${hairlineSoft}`, padding: '14px 16px', borderRadius: 12 },
  cockpitMetricLabel: { fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: faint, fontWeight: 700 },
  cockpitMetricValue: { fontSize: 26, color: text, fontWeight: 700, marginTop: 6, letterSpacing: '-0.02em' },
  cockpitTableHead: {
    padding: '16px 4px 10px', marginTop: 8,
    display: 'grid', gridTemplateColumns: '1.5fr 0.95fr 0.8fr 0.85fr 0.6fr', gap: 12,
    fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: faint, fontWeight: 700,
    borderBottom: `1px solid ${hairline}`,
  },
  cockpitRow: {
    padding: '14px 4px', borderBottom: `1px solid ${hairlineSoft}`,
    display: 'grid', gridTemplateColumns: '1.5fr 0.95fr 0.8fr 0.85fr 0.6fr', gap: 12, alignItems: 'center', fontSize: 14,
  },
  cockpitName: { color: text, fontWeight: 600 },
  cockpitMeta: { color: muted, fontSize: 13 },
  cockpitAssignee: { display: 'inline-flex', alignItems: 'center', gap: 8, color: text, fontSize: 13 },
  cockpitAssigneeAvatar: {
    width: 22, height: 22, borderRadius: '50%', background: 'rgba(45,212,191,0.16)', color: accent,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800,
    border: `1px solid rgba(45,212,191,0.28)`, flex: '0 0 auto',
  },
  badge: { fontSize: 11, letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 6, fontWeight: 700, display: 'inline-block' },
  badgeNew: { background: 'rgba(45,212,191,0.16)', color: '#5eead4' },
  badgeReplied: { background: 'rgba(230,196,143,0.18)', color: champagne },
  badgeFollowup: { background: 'rgba(255,255,255,0.10)', color: text },
  badgeBooked: { background: 'rgba(125,211,252,0.18)', color: '#7dd3fc' },
  cockpitFootnote: { padding: '14px 2px 0', fontSize: 12, color: faint, lineHeight: 1.55, marginTop: 6 },

  segments: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginTop: 28 },
  segmentCard: { background: subFill, border: `1px solid ${hairline}`, padding: '24px 22px', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 8 },
  segmentLabel: { fontSize: 10, letterSpacing: '0.22em', color: accent, textTransform: 'uppercase', fontWeight: 800 },
  segmentTitle: { fontSize: 18, color: text, fontWeight: 700, lineHeight: 1.35 },
  segmentBody: { color: muted, fontSize: 14, lineHeight: 1.6 },

  operatingArea: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.05fr)', gap: 24, marginTop: 28, alignItems: 'stretch' },
  operatingAreaMapWrap: { position: 'relative', borderRadius: 14, overflow: 'hidden', minHeight: 280, border: `1px solid ${hairline}`, background: 'rgba(6,17,31,0.6)' },
  operatingAreaMap: { width: '100%', height: '100%', display: 'block', objectFit: 'cover', objectPosition: 'center center' },
  operatingAreaCredit: {
    position: 'absolute', right: 12, bottom: 10, color: 'rgba(238,246,255,0.82)', fontSize: 10, letterSpacing: '0.10em',
    background: 'rgba(6,17,31,0.6)', padding: '4px 8px', borderRadius: 6,
  },
  operatingAreaBody: { display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' },
  operatingAreaSection: { display: 'flex', flexDirection: 'column', gap: 10 },
  operatingAreaDivider: { height: 1, background: hairline, margin: '2px 0' },
  operatingAreaHeading: { fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#7dd3fc', fontWeight: 800 },
  operatingAreaText: { color: text, fontSize: 15, lineHeight: 1.6, fontWeight: 400 },
  operatingAreaTowns: { display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 12, color: muted, letterSpacing: '0.04em' },
  operatingAreaTown: { display: 'inline-flex', alignItems: 'center', gap: 6 },
  operatingAreaTownDot: { width: 4, height: 4, borderRadius: '50%', background: champagne },

  trustList: { marginTop: 24, border: `1px solid ${hairline}`, borderRadius: 16, overflow: 'hidden' },
  trustItem: {
    display: 'grid', gridTemplateColumns: 'minmax(160px, 0.7fr) minmax(0, 1.5fr)', gap: 24,
    padding: '20px 22px', borderBottom: `1px solid ${hairlineSoft}`, alignItems: 'baseline',
  },
  trustItemTitle: { fontSize: 15, color: text, fontWeight: 700, letterSpacing: '0.005em' },
  trustItemBody: { fontSize: 14, color: muted, lineHeight: 1.6 },

  pricingCard: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 28, alignItems: 'start', marginTop: 8 },
  pricingNumber: { fontSize: 40, color: text, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1, whiteSpace: 'nowrap' },
  pricingLabel: { fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: faint, fontWeight: 700, marginTop: 8 },
  pricingBody: { color: muted, fontSize: 15, lineHeight: 1.6 },
  paymentSteps: { marginTop: 20, padding: '20px 22px', background: subFill, border: `1px solid ${hairline}`, borderRadius: 16 },
  paymentStepsHeading: { fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#7dd3fc', fontWeight: 800, marginBottom: 16 },
  paymentList: { margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 24px' },
  paymentListItem: { display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14, color: muted, lineHeight: 1.5 },
  paymentListBullet: { width: 6, height: 6, borderRadius: '50%', background: champagne, flex: '0 0 auto', marginTop: 7 },
  paymentListLabel: { color: text, fontWeight: 700 },
  continuationNote: { marginTop: 18, padding: '14px 18px', background: 'rgba(45,212,191,0.10)', borderLeft: `2px solid ${accent}`, borderRadius: 8, fontSize: 13, color: text, lineHeight: 1.6, maxWidth: 760 },

  formGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 18 },
  input: {
    width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(0,0,0,0.28)', color: text, fontFamily: 'inherit', fontSize: 14,
  },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', border: `1px solid ${hairline}`, background: subFill, borderRadius: 12 },
  formGroupLabel: { fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: faint, fontWeight: 700, padding: 0 },
  formGroupHint: { fontSize: 12, color: faint, lineHeight: 1.5 },
  checkboxGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px 16px' },
  checkboxItem: { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: muted, lineHeight: 1.4, cursor: 'pointer' },
  checkboxControl: { width: 16, height: 16, marginTop: 2, accentColor: accent, flex: '0 0 auto' },
  formNote: { fontSize: 12, color: faint, lineHeight: 1.55, marginTop: 14 },
  noGuarantee: { marginTop: 12, padding: '14px 18px', background: 'rgba(230,196,143,0.10)', borderLeft: `2px solid ${champagne}`, borderRadius: 8, fontSize: 13, color: text, lineHeight: 1.55, maxWidth: 640 },
};

const workflowSteps = [
  {
    index: '01',
    iconKey: 'channels',
    title: 'Channel intake',
    body: 'WhatsApp, Facebook, website forms, listing portals, and missed calls — every enquiry route you already use.',
  },
  {
    index: '02',
    iconKey: 'log',
    title: 'Lead log',
    body: 'A single, time-stamped record per enquiry. No duplicate, no lost message, no "did anyone reply?".',
  },
  {
    index: '03',
    iconKey: 'alert',
    title: 'Owner / operator alert',
    body: 'The right person is told the moment a new enquiry lands — no waiting for the next inbox check.',
  },
  {
    index: '04',
    iconKey: 'board',
    title: 'Follow-up board',
    body: 'Open enquiries, replies sent, viewings scheduled, and stale leads — all visible without chasing colleagues.',
  },
  {
    index: '05',
    iconKey: 'summary',
    title: 'Daily summary',
    body: 'A short morning view: new enquiries, follow-ups due, and what slipped past 48 hours without a reply.',
  },
];

function WorkflowStepIcon({ iconKey }) {
  const stroke = '#eef6ff';
  const mark = '#e6c48f';
  switch (iconKey) {
    case 'channels':
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="2.4" fill={stroke} />
          <circle cx="22" cy="9" r="2.4" fill={stroke} />
          <circle cx="9" cy="22" r="2.4" fill={stroke} />
          <circle cx="22" cy="22" r="2.4" fill={stroke} />
          <circle cx="16" cy="16" r="3" fill={mark} />
        </svg>
      );
    case 'log':
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <rect x="5" y="7" width="22" height="18" rx="1" stroke={stroke} strokeWidth="1.4" />
          <line x1="8.5" y1="12" x2="23.5" y2="12" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="8.5" y1="16" x2="20" y2="16" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="8.5" y1="20" x2="22" y2="20" stroke={mark} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'alert':
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <path d="M16 6 L25 18 H7 L16 6 Z" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
          <line x1="16" y1="11" x2="16" y2="15" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="16" cy="22.5" r="1.4" fill={mark} />
          <line x1="16" y1="18" x2="16" y2="20.5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'board':
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <rect x="5" y="8" width="6" height="16" rx="1" stroke={stroke} strokeWidth="1.4" />
          <rect x="13" y="8" width="6" height="16" rx="1" stroke={stroke} strokeWidth="1.4" />
          <rect x="21" y="8" width="6" height="16" rx="1" stroke={stroke} strokeWidth="1.4" />
          <rect x="6.5" y="9.5" width="3" height="3" fill={mark} rx="0.6" />
          <rect x="14.5" y="13" width="3" height="3" fill={stroke} rx="0.6" opacity="0.7" />
          <rect x="22.5" y="17" width="3" height="3" fill={stroke} rx="0.6" opacity="0.4" />
        </svg>
      );
    case 'summary':
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <line x1="6" y1="10" x2="26" y2="10" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="6" y1="16" x2="22" y2="16" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="6" y1="22" x2="18" y2="22" stroke={mark} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

const cockpitMetrics = [
  { label: 'New today', value: '4' },
  { label: 'Awaiting reply', value: '2' },
  { label: 'Viewings booked', value: '1' },
  { label: 'Stale > 48h', value: '0' },
];

const cockpitRows = [
  {
    name: 'EXAMPLE: 4-bed villa enquiry — Tamarin',
    meta: 'WhatsApp · Buyer · EUR budget',
    when: '08:42 today',
    assignee: 'AR',
    assigneeName: 'EXAMPLE: A. Ramdoyal',
    badgeStyle: 'badgeNew',
    badgeText: 'New',
  },
  {
    name: 'EXAMPLE: Long-let inquiry — Grand Baie',
    meta: 'Website form · Tenant · 12 mo',
    when: 'Yesterday',
    assignee: 'JF',
    assigneeName: 'EXAMPLE: J. Fanchette',
    badgeStyle: 'badgeReplied',
    badgeText: 'Replied',
  },
  {
    name: 'EXAMPLE: Site visit request — Black River',
    meta: 'Facebook DM · Buyer · weekend',
    when: 'Yesterday',
    assignee: 'FD',
    assigneeName: 'EXAMPLE: Front desk',
    badgeStyle: 'badgeBooked',
    badgeText: 'Viewing',
  },
  {
    name: 'EXAMPLE: Serviced apt — 6-night stay — Flic en Flac',
    meta: 'Listing portal · Guest · Aug',
    when: '2 days ago',
    assignee: '—',
    assigneeName: 'EXAMPLE: Unassigned',
    badgeStyle: 'badgeFollowup',
    badgeText: 'Follow-up',
  },
];

const segmentOptions = [
  { value: 'real_estate_agency', label: 'Real estate agency' },
  { value: 'villa_rental', label: 'Villa rental operator' },
  { value: 'property_manager', label: 'Property manager' },
  { value: 'serviced_apartment_str', label: 'Serviced apartments / short-term rentals' },
  { value: 'commercial_property', label: 'Commercial / office space' },
  { value: 'other_property', label: 'Other property' },
];

const operatingAreaTowns = [
  'Cap Malheureux', 'Grand Baie', 'Pereybère', 'Trou aux Biches', 'Pointe aux Cannoniers',
  'Port Louis', 'Tamarin', 'Black River', 'Flic en Flac', 'Le Morne',
];

const segments = [
  {
    label: 'Real estate agencies',
    title: 'Agency front desk + agent inboxes, one workflow.',
    body: 'Buyer enquiries, viewing requests, and listing portal leads logged once and routed to the right agent — without changing how your agents already use WhatsApp and email.',
  },
  {
    label: 'Villa rental operators',
    title: 'Every enquiry on a property is captured, even on weekends.',
    body: 'Direct enquiries from the website, Facebook, and listing portals are logged with the property reference and the requested dates, so nothing is forgotten between Monday morning and a quiet Saturday.',
  },
  {
    label: 'Property managers',
    title: 'Owner alerts, tenant follow-ups, and contractor requests in one log.',
    body: 'Routine enquiries (move-in, move-out, maintenance) and one-off owner conversations get a record so handovers between staff or seasons do not lose context.',
  },
  {
    label: 'Serviced apartments / short-term rentals',
    title: 'Booking enquiries from multiple channels, captured before they cool.',
    body: 'WhatsApp, listing portal messages, and direct site enquiries are alerted and logged together so a guest who messages on three platforms does not get three uncoordinated answers.',
  },
];

const trustBoundaries = [
  {
    title: 'No revenue guarantees',
    body: 'We do not promise more leads. We help make sure existing enquiries are captured, visible, and followed up.',
  },
  {
    title: 'No CRM rebuild',
    body: 'Your sales process, agent allocation, and existing tools stay as they are. We do not migrate you onto a new CRM.',
  },
  {
    title: 'No replacement of WhatsApp, website, or sales process',
    body: 'WhatsApp Business, your website, your listing portal accounts, and your agent workflow are unchanged. We sit alongside them.',
  },
  {
    title: 'No transaction handling',
    body: 'We do not collect payments, hold deposits, or sign agreements on your behalf. The lead workflow ends at "ready to talk".',
  },
  {
    title: 'No tenant or buyer PII beyond the lead log',
    body: 'We capture the contact information you would already write down: name, channel, basic enquiry detail, follow-up status. No identity documents, no banking detail, no tenancy history.',
  },
];

export default function AiLeadRescuePropertyMauritiusLanding({ host = '' }) {
  async function submitLead(e) {
    e.preventDefault();
    trackEvent('lr_property_intake_submit_attempt');
    const form = e.currentTarget;
    const fd = new FormData(form);

    const propertySegments = fd.getAll('property_segment').map((v) => String(v).trim()).filter(Boolean);
    if (propertySegments.length === 0) {
      alert('Please select at least one property segment that fits your operation.');
      return;
    }

    const payload = {
      name: String(fd.get('name') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      intent: String(fd.get('message') || '').trim(),
      meta: {
        product: 'ai-lead-rescue',
        lead_rescue_variant: 'property-mauritius',
        business_name: String(fd.get('business_name') || '').trim(),
        property_segments: propertySegments,
        property_segment: propertySegments.length === 1 ? propertySegments[0] : 'multiple',
        lead_sources: String(fd.get('lead_sources') || '').trim(),
        host,
        page: '/lead-rescue/property-mauritius',
      },
    };
    try {
      const r = await fetch('/api/tenant/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('intake_failed');
      trackEvent('lr_property_intake_submit_success');
      alert('Thank you. We will send the Mauritius property pilot outline to your email within 2 business hours.');
      form.reset();
    } catch {
      alert('Could not submit the request. Please contact us at support@corpflowai.com or try again shortly.');
    }
  }

  const footer = (
    <PublicSiteFooter
      flush
      extra="AI Lead Rescue Mauritius property edition is powered by CorpFlowAI. The launch pilot is invoiced as the MUR equivalent of USD 150 on a local pro-forma after intake review; this page collects intake only, does not collect card or banking details, and does not create any automated subscription. Calls in English; written workflow supports French summaries and French enquiry handling on request, with reviewed replies."
    />
  );

  return (
    <>
      <Head>
        <title>AI Lead Rescue for Mauritius property operators · CorpFlowAI</title>
        <meta
          name="description"
          content="A 48-hour pilot for Mauritius property operators that captures, alerts, and tracks enquiries from WhatsApp, Facebook, website forms, listing portals, and calls — without replacing WhatsApp Business or your CRM."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://corpflowai.com/lead-rescue/property-mauritius" />
      </Head>

      <PublicMarketingPhotoGlassShell
        pageClassName="lr-property-page"
        maxWidth={1080}
        scrimTone="dark"
        footer={footer}
        hero={{
          base: HERO_BASE,
          sources: HERO_SOURCES,
          preloadSrcSet: HERO_PRELOAD_SRCSET,
          objectPosition: 'center 42%',
          alt: '',
        }}
      >
        <nav style={styles.nav} aria-label="Primary">
          <div>
            <div style={styles.brandMark}>AI Lead Rescue</div>
            <div style={styles.brandSub}>Mauritius property edition</div>
          </div>
          <a
            href="#pilot-outline"
            style={styles.navLink}
            onClick={() => trackEvent('lr_property_primary_cta_click', { props: { location: 'nav' } })}
          >
            Request the pilot outline
          </a>
        </nav>

        <section style={{ marginTop: 40 }}>
          <HeroGlassBlock style={{ maxWidth: 820 }}>
            <div style={styles.eyebrow}>Mauritius property operations</div>
            <h1 style={styles.h1}>
              Property enquiries do not get lost on purpose. <span style={styles.h1Accent}>They get lost between channels.</span>
            </h1>
            <p style={styles.lead}>
              Property enquiries often arrive through WhatsApp, Facebook, website forms, listing portals, and calls — but after the first reply, follow-up can become hard to see. The enquiry that quietly walks to another agency is usually the one no one realised was still waiting for a reply.
            </p>
            <p style={styles.trustLine}>
              We do not replace WhatsApp Business. We make sure the enquiries inside it are logged, visible, and followed up.
            </p>
            <div style={styles.ctaRow}>
              <a
                href="#pilot-outline"
                style={{ ...styles.cta, ...styles.primary }}
                className="lr-property-cta-primary"
                onClick={() => trackEvent('lr_property_primary_cta_click', { props: { location: 'hero' } })}
              >
                Request the Mauritius property pilot outline
              </a>
              <a
                href="#how-it-works"
                style={{ ...styles.cta, ...styles.secondary }}
                className="lr-property-cta-secondary"
                onClick={() => trackEvent('lr_property_secondary_cta_click', { props: { location: 'hero' } })}
              >
                See how it works
              </a>
            </div>
          </HeroGlassBlock>
        </section>

        <section id="how-it-works" style={styles.section}>
          <GlassPanel>
            <div style={styles.sectionLabel}>The workflow</div>
            <h2 style={styles.h2}>From channel to follow-up, on one accountable surface.</h2>
            <p style={styles.body}>
              Five steps, all visible. WhatsApp, Facebook, the website form, listing portals, and calls flow into one lead log. The owner or operator is alerted. A follow-up board shows what has been replied to, what is awaiting a response, and what has gone cold. A short daily summary keeps everyone honest about the leads that quietly slipped past forty-eight hours.
            </p>
            <div style={styles.workflowBand} className="lr-property-workflow-band">
              {workflowSteps.map((step) => (
                <div key={step.index} style={styles.workflowStep} className="lr-property-workflow-step">
                  <div style={styles.workflowStepIconWrap} aria-hidden="true">
                    <WorkflowStepIcon iconKey={step.iconKey} />
                  </div>
                  <div style={styles.workflowStepIndex}>STEP {step.index}</div>
                  <div style={styles.workflowStepTitle}>{step.title}</div>
                  <div style={styles.workflowStepBody}>{step.body}</div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </section>

        <section style={styles.section} aria-labelledby="cockpit-heading">
          <GlassPanel>
            <div style={styles.sectionLabel}>What you see every morning</div>
            <h2 id="cockpit-heading" style={styles.h2}>A calm operator view, not another dashboard to manage.</h2>
            <p style={styles.body}>
              The view below is an illustrative example. Your actual operator view shows the enquiries from your channels, with the same restraint: new leads first, follow-ups due next, and the few that have slipped past two days flagged so they do not stay forgotten.
            </p>
            <div
              style={{ marginTop: 24, background: subFillStrong, border: `1px solid ${hairline}`, borderRadius: 16, padding: '18px 20px' }}
              role="figure"
              aria-label="Illustrative example of the property operator view, showing fake demonstration leads only"
            >
              <div style={styles.cockpitHeader}>
                <div style={styles.cockpitTitleStack}>
                  <div style={styles.cockpitTitle}>Daily summary · 09:00</div>
                  <div style={styles.cockpitSubtitle}>Property operator view</div>
                </div>
                <span style={styles.cockpitTag}>Illustrative example</span>
              </div>
              <div style={styles.cockpitMetricsRow}>
                {cockpitMetrics.map((m) => (
                  <div key={m.label} style={styles.cockpitMetric}>
                    <div style={styles.cockpitMetricLabel}>{m.label}</div>
                    <div style={styles.cockpitMetricValue}>{m.value}</div>
                  </div>
                ))}
              </div>
              <div style={styles.cockpitTableHead} className="lr-property-cockpit-thead">
                <div>Enquiry</div>
                <div>Source</div>
                <div>When</div>
                <div>Assigned to</div>
                <div>Status</div>
              </div>
              {cockpitRows.map((row) => (
                <div key={row.name} style={styles.cockpitRow} className="lr-property-cockpit-row">
                  <div style={styles.cockpitName}>{row.name}</div>
                  <div style={styles.cockpitMeta}>{row.meta}</div>
                  <div style={styles.cockpitMeta}>{row.when}</div>
                  <div style={styles.cockpitAssignee}>
                    <span style={styles.cockpitAssigneeAvatar} aria-hidden="true">{row.assignee}</span>
                    <span>{row.assigneeName}</span>
                  </div>
                  <div>
                    <span style={{ ...styles.badge, ...styles[row.badgeStyle] }}>{row.badgeText}</span>
                  </div>
                </div>
              ))}
              <div style={styles.cockpitFootnote}>
                Demonstration data. No real prospects, properties, or contacts are shown. Names prefixed <code>EXAMPLE:</code> are fabricated for illustration.
              </div>
            </div>
          </GlassPanel>
        </section>

        <section style={styles.section}>
          <GlassPanel>
            <div style={styles.sectionLabel}>Who this is for</div>
            <h2 style={styles.h2}>Property operators who already get the enquiries — they just need the workflow that keeps them.</h2>
            <div style={styles.segments} className="lr-property-segments-grid">
              {segments.map((seg) => (
                <article key={seg.label} style={styles.segmentCard} className="lr-property-segment">
                  <div style={styles.segmentLabel}>{seg.label}</div>
                  <div style={styles.segmentTitle}>{seg.title}</div>
                  <div style={styles.segmentBody}>{seg.body}</div>
                </article>
              ))}
            </div>
          </GlassPanel>
        </section>

        <section style={styles.section} aria-labelledby="operating-area-heading">
          <GlassPanel>
            <div style={styles.sectionLabel}>Operating in Mauritius</div>
            <h2 id="operating-area-heading" style={styles.h2}>Where we run the pilot — and how the workflow handles language.</h2>
            <div style={styles.operatingArea} className="lr-property-operating-area">
              <div style={styles.operatingAreaMapWrap}>
                <picture>
                  <source
                    type="image/webp"
                    srcSet="/assets/visuals/lead-rescue-property-map-640.webp 640w, /assets/visuals/lead-rescue-property-map-1024.webp 1024w, /assets/visuals/lead-rescue-property-map-1600.webp 1600w"
                    sizes="(max-width: 720px) 100vw, 480px"
                  />
                  <img
                    src="/assets/visuals/lead-rescue-property-map-1024.jpg"
                    alt="Real public-domain NASA satellite image of the island of Mauritius, viewed from above. The island fills most of the frame, surrounded by deep navy ocean. The mountainous green interior, paler coastal plains, and turquoise lagoon along the coast are clearly visible. Some natural cloud cover crosses the island. Used as a service-area illustration; no roads or place names overlaid."
                    width="1024"
                    height="1465"
                    style={styles.operatingAreaMap}
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
                <span style={styles.operatingAreaCredit}>
                  Public domain · NASA / NASA World Wind
                </span>
              </div>
              <div style={styles.operatingAreaBody}>
                <div style={styles.operatingAreaSection}>
                  <div style={styles.operatingAreaHeading}>Service area</div>
                  <p style={styles.operatingAreaText}>
                    The pilot is run for property operators on the North and West coast — Cap Malheureux through Grand Baie, Port Louis, Tamarin, Black River, and down to Le Morne. Other parts of the island on request.
                  </p>
                  <div style={styles.operatingAreaTowns} aria-label="Towns covered by the pilot">
                    {operatingAreaTowns.map((town) => (
                      <span key={town} style={styles.operatingAreaTown}>
                        <span style={styles.operatingAreaTownDot} aria-hidden="true" />
                        {town}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={styles.operatingAreaDivider} />
                <div style={styles.operatingAreaSection}>
                  <div style={styles.operatingAreaHeading}>Language</div>
                  <p style={styles.operatingAreaText}>
                    Calls are easiest in English, but the written workflow can support French lead summaries and French enquiry handling where required. Customer-facing replies are reviewed before sending.
                  </p>
                </div>
              </div>
            </div>
          </GlassPanel>
        </section>

        <section style={styles.section}>
          <GlassPanel>
            <div style={styles.sectionLabel}>What this is not</div>
            <h2 style={styles.h2}>Honest limits — so you know exactly what you are buying.</h2>
            <div style={styles.trustList}>
              {trustBoundaries.map((item) => (
                <div key={item.title} style={styles.trustItem} className="lr-property-trust-list-item">
                  <div style={styles.trustItemTitle}>{item.title}</div>
                  <div style={styles.trustItemBody}>{item.body}</div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </section>

        <section style={styles.section}>
          <GlassPanel>
            <div style={styles.sectionLabel}>Pricing &amp; path</div>
            <h2 style={styles.h2}>One launch pilot. Local pro-forma. No card on the page.</h2>
            <div style={styles.pricingCard}>
              <div>
                <div style={styles.pricingNumber}>USD 150</div>
                <div style={styles.pricingLabel}>Launch pilot · invoiced as the MUR equivalent</div>
              </div>
              <div style={styles.pricingBody}>
                Submitting the form does not commit you to payment. After we review your intake within two business hours, we issue a local pro-forma invoice in Mauritian rupees — the MUR equivalent of USD 150 at the day&rsquo;s rate, with the final MUR amount confirmed on the invoice itself. You pay by bank transfer to a Mauritius bank account, share the proof of payment, and the 48-hour setup begins only after we manually confirm receipt. No card details, no online checkout, and no automated subscription on this page.
              </div>
            </div>
            <div style={styles.paymentSteps} aria-label="How payment works on the Mauritius property pilot">
              <div style={styles.paymentStepsHeading}>How payment works</div>
              <ul style={styles.paymentList} className="lr-property-payment-list">
                <li style={styles.paymentListItem}>
                  <span style={styles.paymentListBullet} aria-hidden="true" />
                  <span><span style={styles.paymentListLabel}>Intake review first</span> — within two business hours of submitting the form.</span>
                </li>
                <li style={styles.paymentListItem}>
                  <span style={styles.paymentListBullet} aria-hidden="true" />
                  <span><span style={styles.paymentListLabel}>No card or banking details on this page</span> — and no online checkout.</span>
                </li>
                <li style={styles.paymentListItem}>
                  <span style={styles.paymentListBullet} aria-hidden="true" />
                  <span><span style={styles.paymentListLabel}>Local pro-forma invoice</span> — issued in MUR, with the day&rsquo;s rate noted.</span>
                </li>
                <li style={styles.paymentListItem}>
                  <span style={styles.paymentListBullet} aria-hidden="true" />
                  <span><span style={styles.paymentListLabel}>Bank transfer</span> — to a Mauritius bank account.</span>
                </li>
                <li style={styles.paymentListItem}>
                  <span style={styles.paymentListBullet} aria-hidden="true" />
                  <span><span style={styles.paymentListLabel}>Proof of payment shared manually</span> — email or WhatsApp is fine.</span>
                </li>
                <li style={styles.paymentListItem}>
                  <span style={styles.paymentListBullet} aria-hidden="true" />
                  <span><span style={styles.paymentListLabel}>Setup starts after manual confirmation</span> — never automatically.</span>
                </li>
              </ul>
            </div>
            <p style={styles.continuationNote}>
              If you choose to continue after the pilot, ongoing monitoring is quoted separately after review. There is no auto-renewal, and no monthly figure is published on this page.
            </p>
          </GlassPanel>
        </section>

        <section id="pilot-outline" style={styles.section}>
          <CtaGlassBlock style={{ maxWidth: 720 }}>
            <div style={styles.sectionLabel}>Final step</div>
            <h2 style={styles.h2}>Request the Mauritius property pilot outline.</h2>
            <p style={styles.body}>
              Tell us your business, the property segment you operate in, and where your enquiries arrive today. We send the pilot outline within two business hours.
            </p>
            <form onSubmit={submitLead} style={styles.formGrid} aria-label="Mauritius property pilot outline request">
              <input required name="business_name" placeholder="Business name" style={styles.input} autoComplete="organization" />
              <fieldset style={styles.formGroup} className="lr-property-form-group">
                <legend style={styles.formGroupLabel}>Property segment · select all that apply</legend>
                <div style={styles.checkboxGrid} className="lr-property-checkbox-grid">
                  {segmentOptions.map((opt) => (
                    <label key={opt.value} style={styles.checkboxItem} className="lr-property-checkbox-item">
                      <input
                        type="checkbox"
                        name="property_segment"
                        value={opt.value}
                        style={styles.checkboxControl}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                <div style={styles.formGroupHint}>
                  Many Mauritius property operators run more than one of these in parallel — tick every segment that fits.
                </div>
              </fieldset>
              <input required name="name" placeholder="Your name" style={styles.input} autoComplete="name" />
              <input required type="email" name="email" placeholder="Email" style={styles.input} autoComplete="email" />
              <input name="phone" placeholder="Phone or WhatsApp (optional)" style={styles.input} autoComplete="tel" />
              <input name="lead_sources" placeholder="Where do enquiries arrive today? (e.g. WhatsApp, website, Facebook, listing portal, calls)" style={styles.input} />
              <textarea required name="message" rows="3" placeholder="What follow-up problem should we fix first?" style={styles.input} />
              <button type="submit" style={{ ...styles.cta, ...styles.primary }} className="lr-property-cta-primary" onClick={() => trackEvent('lr_property_primary_cta_click', { props: { location: 'final' } })}>
                Request the Mauritius property pilot outline
              </button>
            </form>
            <p style={styles.formNote}>
              Submitting this form does not commit you to payment. There is no automated subscription, no online checkout, and no card or banking details on this page. We review fit first, then confirm the local pro-forma invoice and the setup steps. The pilot is manually onboarded after payment is confirmed by bank transfer. We only store what is needed to run the lead log: business name, contact name, channel, and basic enquiry detail.
            </p>
            <p style={styles.noGuarantee}>
              We do not guarantee new revenue. We help make sure existing enquiries are captured, visible, and followed up.
            </p>
          </CtaGlassBlock>
        </section>
      </PublicMarketingPhotoGlassShell>

      <style jsx global>{`
        @media (prefers-reduced-motion: no-preference) {
          .lr-property-cta-primary {
            transition: transform 220ms ease, box-shadow 220ms ease, filter 220ms ease;
          }
          .lr-property-cta-primary:hover {
            transform: translateY(-1px);
            filter: brightness(1.03);
            box-shadow: 0 16px 38px rgba(150, 100, 28, 0.5);
          }
          .lr-property-cta-secondary {
            transition: border-color 220ms ease, background 220ms ease;
          }
          .lr-property-cta-secondary:hover {
            border-color: rgba(255, 255, 255, 0.42);
            background: rgba(255, 255, 255, 0.18);
          }
          .lr-property-segment {
            transition: border-color 280ms ease, transform 280ms ease, background 280ms ease;
          }
          .lr-property-segment:hover {
            transform: translateY(-1px);
            border-color: rgba(45, 212, 191, 0.4);
            background: rgba(255, 255, 255, 0.08);
          }
          .lr-property-workflow-step {
            transition: border-color 260ms ease, background 260ms ease, transform 260ms ease;
          }
          .lr-property-workflow-step:hover {
            transform: translateY(-1px);
            border-color: rgba(45, 212, 191, 0.4);
            background: rgba(255, 255, 255, 0.08);
          }
          .lr-property-operating-area picture img {
            animation: lrPropFadeIn 1100ms ease-out 220ms both;
          }
          @keyframes lrPropFadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        }

        .lr-property-trust-list-item:last-child {
          border-bottom: 0 !important;
        }
        .lr-property-cockpit-row:last-of-type {
          border-bottom: 0;
        }

        .lr-property-checkbox-item:hover span {
          color: #ffffff;
        }

        @media (max-width: 1100px) {
          .lr-property-workflow-band {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 900px) {
          .lr-property-operating-area {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .lr-property-operating-area picture img {
            aspect-ratio: 4 / 3;
            object-fit: cover;
          }
        }
        @media (max-width: 720px) {
          .lr-property-segments-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .lr-property-workflow-band {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .lr-property-checkbox-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .lr-property-payment-list {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .lr-property-trust-list-item {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 6px !important;
            padding: 18px 20px !important;
          }
          .lr-property-cockpit-thead {
            display: none !important;
          }
          .lr-property-cockpit-row {
            grid-template-columns: 1fr 0.7fr !important;
            row-gap: 6px;
          }
          .lr-property-cockpit-row > div:nth-child(2),
          .lr-property-cockpit-row > div:nth-child(3),
          .lr-property-cockpit-row > div:nth-child(4) {
            grid-column: 1 / -1;
            font-size: 12px;
          }
        }
        @media (max-width: 540px) {
          .lr-property-workflow-band {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .lr-property-pricing-card {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </>
  );
}
