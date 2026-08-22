import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ProspectLegacyDeprecationBanner from '../../components/app/ProspectLegacyDeprecationBanner.js';
import {
  RAPID_DELIVERY_OFFER_SLUGS,
  getRapidDeliveryOffer,
} from '../../lib/public/rapid-delivery-offers.js';

/**
 * /change/revenue — First-revenue operator cockpit.
 *
 * Operator-facing (not a public marketing surface). One place to run the
 * manual sell → deliver cycle for the three rapid-delivery offers:
 *   offer → prospect → discovery → quote → deposit → verify → approve →
 *   deliver → feedback → release → maintenance.
 *
 * Boundaries (intentional):
 * - Live MUR discovery intakes persist to the existing `leads` table (product
 *   `corpflow-rapid-delivery`) and are operated at `/admin/rapid-delivery`.
 * - ERPNext remains the commercial system of record for invoices/quotes.
 * - Canonical prospect pipeline is `/app/pipeline` (Postgres `leads` +
 *   #721 canonical_stage). This page is a compatibility checklist only.
 * - Stage lanes below may still use browser localStorage as an optional
 *   personal checklist — never as the authoritative prospect list.
 * - No second CRM, no payment runtime, no automated email/WhatsApp/SMS outreach
 *   (outreach requires separate Anton approval).
 *
 * Canonical process: docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md
 */

const MONTH_END_TARGET = 'MUR 150,000–200,000 by month-end';

const LOCAL_STORAGE_KEY = 'corpflow.revenue.cockpit.v1';

/** 11 status lanes, in order, each tied to the manual template that drives it. */
const STAGES = [
  { id: 'prospect', label: 'Prospect identified', template: 'prospect-discovery-email.md' },
  { id: 'discovery', label: 'Discovery booked', template: 'discovery-call-script.md' },
  { id: 'quote', label: 'Quote prepared', template: 'quote-email.md' },
  { id: 'deposit-requested', label: 'Deposit requested', template: 'deposit-request.md' },
  { id: 'deposit-proof', label: 'Deposit proof received', template: '(client sends proof of payment)' },
  { id: 'deposit-verified', label: 'Deposit manually verified', template: 'deposit-received-manual-verification.md' },
  { id: 'approval', label: 'Approval to proceed', template: 'approval-to-proceed.md' },
  { id: 'delivery', label: 'Delivery in progress', template: '(24–72h visible output; build)' },
  { id: 'preview', label: 'Preview feedback', template: 'preview-feedback-request.md' },
  { id: 'release', label: 'Release approved', template: 'production-release-approval.md' },
  { id: 'maintenance', label: 'Maintenance offered', template: 'maintenance-offer.md' },
];

/** Sample prospects only — clearly labelled. Authoritative records live in ERPNext. */
const DEFAULT_PROSPECTS = [
  { id: 'sample-1', name: 'Sample — Grand Baie boutique hotel', offer: 'ai-lead-rescue', stage: 1 },
  { id: 'sample-2', name: 'Sample — Tamarin real-estate agency', offer: 'premium-landing-page-rescue', stage: 3 },
  { id: 'sample-3', name: 'Sample — Flic-en-Flac spa & wellness', offer: 'customer-reputation-recovery', stage: 5 },
];

const OFFERS = RAPID_DELIVERY_OFFER_SLUGS.map((slug) => getRapidDeliveryOffer(slug)).filter(Boolean);

/** Repo docs (not web-served). Shown as reference paths, not links. */
const REPO_DOC_LINKS = [
  { path: 'docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md', note: 'Canonical manual sell/deliver process' },
  { path: 'docs/revenue/templates/', note: '10 operator templates (discovery → maintenance)' },
  { path: 'docs/revenue/MAURITIUS_PAID_PILOT_SALES_PACK_V1.md', note: 'Mauritius sales pack' },
  { path: 'docs/revenue/MAURITIUS_DISCOVERY_AND_FOLLOW_UP_SEQUENCE_V1.md', note: 'Discovery + follow-up sequence' },
];

/** ERPNext-first operating docs present in the repo. */
const ERPNEXT_DOC_LINKS = [
  {
    path: 'docs/operations/ERPNEXT_FIRST_REVENUE_OPERATING_SYSTEM_EVALUATION.md',
    note: 'ERPNext as the first-revenue operating system (system of record)',
  },
  { path: 'docs/finance/ERPNEXT_SANDBOX_PLAN_V1.md', note: 'ERPNext accounting sandbox plan' },
  { path: 'docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md', note: 'ERPNext sandbox install runbook' },
];

const c = {
  bg: '#06111f',
  panel: 'rgba(255,255,255,0.035)',
  panelBorder: 'rgba(255,255,255,0.10)',
  text: '#eef6ff',
  textDim: '#aebfd1',
  textFaint: '#9fb2c8',
  accent: '#7dd3fc',
  good: '#2dd4bf',
  warn: '#fbbf24',
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #06111f 0%, #0b1f33 45%, #101827 100%)',
    color: c.text,
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  shell: { maxWidth: 1240, margin: '0 auto', padding: '32px 20px 64px' },
  kicker: { fontSize: 11.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: c.accent, margin: '0 0 8px' },
  h1: { margin: '0 0 6px', fontSize: 'clamp(26px, 4vw, 34px)', letterSpacing: '-0.02em', lineHeight: 1.15 },
  sub: { color: c.textDim, fontSize: 15, lineHeight: 1.6, margin: '0 0 20px', maxWidth: 760 },
  targetBanner: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    background: 'linear-gradient(135deg, rgba(45,212,191,0.12), rgba(125,211,252,0.10))',
    border: '1px solid rgba(45,212,191,0.30)',
    borderRadius: 16,
    padding: '16px 20px',
    margin: '0 0 22px',
  },
  targetLabel: { fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.textFaint },
  targetValue: { fontSize: 'clamp(18px, 2.6vw, 24px)', fontWeight: 800, color: c.good },
  boundary: {
    background: 'rgba(251,191,36,0.06)',
    border: '1px solid rgba(251,191,36,0.28)',
    borderRadius: 16,
    padding: '16px 20px',
    margin: '0 0 28px',
    fontSize: 14,
    lineHeight: 1.7,
    color: '#f3e6c4',
  },
  sectionLabel: { fontSize: 11.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: c.accent, margin: '28px 0 12px' },
  offerGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, minWidth: 0 },
  offerCard: {
    background: c.panel,
    border: `1px solid ${c.panelBorder}`,
    borderRadius: 16,
    padding: '20px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minWidth: 0,
  },
  offerTitle: { fontSize: 16.5, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' },
  offerPrice: { fontSize: 14, fontWeight: 700, color: c.good },
  offerMeta: { fontSize: 13, color: c.textDim, lineHeight: 1.6, margin: 0 },
  offerLink: {
    marginTop: 'auto',
    color: c.accent,
    textDecoration: 'none',
    fontSize: 13.5,
    fontWeight: 600,
    paddingTop: 6,
  },
  boardControls: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', margin: '0 0 14px' },
  input: {
    flex: '1 1 240px',
    minWidth: 0,
    background: 'rgba(2,6,23,0.5)',
    border: `1px solid ${c.panelBorder}`,
    borderRadius: 10,
    color: c.text,
    padding: '10px 12px',
    fontSize: 14,
  },
  select: {
    background: 'rgba(2,6,23,0.5)',
    border: `1px solid ${c.panelBorder}`,
    borderRadius: 10,
    color: c.text,
    padding: '10px 12px',
    fontSize: 14,
  },
  btn: {
    background: 'linear-gradient(135deg, rgba(45,212,191,0.18), rgba(125,211,252,0.16))',
    border: '1px solid rgba(125,211,252,0.35)',
    borderRadius: 10,
    color: c.text,
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnGhost: {
    background: 'transparent',
    border: `1px solid ${c.panelBorder}`,
    borderRadius: 10,
    color: c.textDim,
    padding: '10px 16px',
    fontSize: 13,
    cursor: 'pointer',
  },
  laneScroll: { display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 },
  lane: {
    flex: '0 0 240px',
    background: 'rgba(2,6,23,0.35)',
    border: `1px solid ${c.panelBorder}`,
    borderRadius: 14,
    padding: '12px 12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 140,
  },
  laneHead: { fontSize: 13, fontWeight: 800, color: c.text, lineHeight: 1.3 },
  laneNum: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    borderRadius: 999,
    background: 'rgba(125,211,252,0.18)',
    color: c.accent,
    fontSize: 11,
    fontWeight: 800,
    marginRight: 6,
  },
  laneTemplate: { fontSize: 11, color: c.textFaint, lineHeight: 1.45, margin: 0, wordBreak: 'break-word' },
  card: {
    background: c.panel,
    border: `1px solid ${c.panelBorder}`,
    borderRadius: 10,
    padding: '10px 10px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  cardName: { fontSize: 12.5, fontWeight: 700, lineHeight: 1.35, wordBreak: 'break-word' },
  cardOffer: { fontSize: 10.5, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' },
  cardBtns: { display: 'flex', gap: 6, marginTop: 2 },
  moveBtn: {
    flex: 1,
    background: 'rgba(2,6,23,0.55)',
    border: `1px solid ${c.panelBorder}`,
    borderRadius: 8,
    color: c.textDim,
    padding: '4px 0',
    fontSize: 12,
    cursor: 'pointer',
  },
  linkList: { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 },
  linkRow: {
    background: c.panel,
    border: `1px solid ${c.panelBorder}`,
    borderRadius: 12,
    padding: '12px 14px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: 12.5,
    color: c.accent,
    wordBreak: 'break-all',
  },
  linkNote: { fontSize: 12.5, color: c.textFaint },
  footer: { marginTop: 44, paddingTop: 20, borderTop: `1px solid ${c.panelBorder}`, fontSize: 12.5, color: c.textFaint, lineHeight: 1.7 },
};

function offerTitleForSlug(slug) {
  const offer = getRapidDeliveryOffer(slug);
  return offer ? offer.title : slug;
}

export default function RevenueOperatorCockpit() {
  const [prospects, setProspects] = useState(DEFAULT_PROSPECTS);
  const [hydrated, setHydrated] = useState(false);
  const [newName, setNewName] = useState('');
  const [newOffer, setNewOffer] = useState(RAPID_DELIVERY_OFFER_SLUGS[0]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setProspects(parsed);
      }
    } catch {
      /* ignore — UI-only state */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prospects));
    } catch {
      /* ignore — UI-only state */
    }
  }, [prospects, hydrated]);

  const byStage = useMemo(() => {
    const groups = STAGES.map(() => []);
    for (const p of prospects) {
      const idx = Math.max(0, Math.min(STAGES.length - 1, Number(p.stage) || 0));
      groups[idx].push(p);
    }
    return groups;
  }, [prospects]);

  function move(id, delta) {
    setProspects((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, stage: Math.max(0, Math.min(STAGES.length - 1, (Number(p.stage) || 0) + delta)) }
          : p,
      ),
    );
  }

  function addProspect(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setProspects((prev) => [
      ...prev,
      { id: `p-${Date.now()}`, name, offer: newOffer, stage: 0 },
    ]);
    setNewName('');
  }

  function resetBoard() {
    setProspects(DEFAULT_PROSPECTS);
  }

  return (
    <div style={styles.page}>
      <Head>
        <title>Revenue operator cockpit · CorpFlowAI</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="Operator-facing revenue delivery cockpit. ERPNext is the system of record; this page is the selling/operator wrapper only."
        />
      </Head>

      <main style={styles.shell}>
        <p style={styles.kicker}>Operator cockpit · not a public page</p>
        <h1 style={styles.h1}>First-revenue operator cockpit</h1>
        <ProspectLegacyDeprecationBanner routePath="/change/revenue" />
        <p style={styles.sub}>
          One place to run the manual cycle: offer → prospect → discovery → quote → deposit request →
          deposit proof → manual verification → approval → delivery → preview feedback → release →
          maintenance. Every step is driven by a template in <span style={styles.code}>docs/revenue/templates/</span>.
        </p>

        <div style={styles.targetBanner}>
          <span style={styles.targetLabel}>Current target</span>
          <span style={styles.targetValue}>{MONTH_END_TARGET}</span>
        </div>

        <div
          style={{ ...styles.boundary, borderColor: 'rgba(45,212,191,0.35)' }}
          data-market-enquiry-handoff
        >
          <strong>CorpFlowAI market enquiries (#699)</strong> persist on the existing{' '}
          <code style={styles.code}>leads</code> table. Canonical operator queue is the{' '}
          <Link href="/app/prospects" style={{ color: c.good, fontWeight: 700 }}>
            Operating Workspace · Prospect Operations
          </Link>{' '}
          (<code style={styles.code}>/app/prospects</code>) — staff/Core only, not Tenant{' '}
          <code style={styles.code}>/change</code>. Temporary product desks:{' '}
          <Link href="/admin/rapid-delivery" style={{ color: c.good, fontWeight: 700 }}>
            /admin/rapid-delivery
          </Link>{' '}
          and{' '}
          <Link href="/admin/lead-rescue" style={{ color: c.good, fontWeight: 700 }}>
            /admin/lead-rescue
          </Link>
          . Each enquiry shows source, contact, selected offer, problem/outcome, timing, status,
          next action, notes, and a <strong>copy-ready response draft</strong> — no live
          email/WhatsApp/SMS send. This <code style={styles.code}>/change/revenue</code> page is a
          compatibility checklist, not the enquiry CRM.
        </div>

        <div style={styles.boundary} data-testid="revenue-cockpit-canonical-notice">
          <strong>Canonical Prospect Pipeline:</strong>{' '}
          <Link href="/app/pipeline" style={{ color: c.good, fontWeight: 700 }}>
            Operating Workspace · /app/pipeline
          </Link>
          . That board uses the same Postgres prospect records as Prospect Operations. The 11-lane
          board below is an <em>optional personal checklist in this browser only</em> — not the
          operator CRM and not a second pipeline.
        </div>

        <div style={styles.boundary}>
          <strong>ERPNext is the system of record.</strong> CRM, quotations, onboarding documents,
          deposit/payment records, projects, feedback, release approvals, and maintenance are recorded
          authoritatively in ERPNext. <strong>CorpFlowAI is only the selling/operator wrapper.</strong>{' '}
          The board below is an <em>operator checklist — record authoritative data in ERPNext.</em> Lane
          state is stored in this browser only; it is not a database and carries no payment, email,
          WhatsApp, or SMS runtime.
        </div>

        {/* Offers */}
        <p style={styles.sectionLabel}>Three active offers</p>
        <div style={styles.offerGrid}>
          {OFFERS.map((offer) => (
            <div key={offer.slug} style={styles.offerCard}>
              <h2 style={styles.offerTitle}>{offer.title}</h2>
              <div style={styles.offerPrice}>from MUR {offer.startingPriceMur.toLocaleString('en-US')}</div>
              <p style={styles.offerMeta}>{offer.depositNote}</p>
              <p style={styles.offerMeta}>Visible output within 24–72 hours after deposit clearance.</p>
              <Link href={offer.path} style={styles.offerLink}>
                Open {offer.path} →
              </Link>
            </div>
          ))}
        </div>

        {/* Optional personal checklist — not canonical */}
        <p style={styles.sectionLabel}>Optional checklist — 11 status lanes (this browser only)</p>

        <form style={styles.boardControls} onSubmit={addProspect}>
          <input
            style={styles.input}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Add a prospect (UI-only label; record in ERPNext)"
            aria-label="New prospect name"
          />
          <select
            style={styles.select}
            value={newOffer}
            onChange={(e) => setNewOffer(e.target.value)}
            aria-label="Offer for new prospect"
          >
            {RAPID_DELIVERY_OFFER_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {offerTitleForSlug(slug)}
              </option>
            ))}
          </select>
          <button type="submit" style={styles.btn}>
            Add to lane 1
          </button>
          <button type="button" style={styles.btnGhost} onClick={resetBoard}>
            Reset sample board
          </button>
        </form>

        <div style={styles.laneScroll}>
          {STAGES.map((stage, idx) => (
            <div key={stage.id} style={styles.lane}>
              <div style={styles.laneHead}>
                <span style={styles.laneNum}>{idx + 1}</span>
                {stage.label}
              </div>
              <p style={styles.laneTemplate}>{stage.template}</p>
              {byStage[idx].map((p) => (
                <div key={p.id} style={styles.card}>
                  <span style={styles.cardName}>{p.name}</span>
                  <span style={styles.cardOffer}>{offerTitleForSlug(p.offer)}</span>
                  <div style={styles.cardBtns}>
                    <button
                      type="button"
                      style={styles.moveBtn}
                      onClick={() => move(p.id, -1)}
                      disabled={idx === 0}
                      aria-label={`Move ${p.name} back`}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      style={styles.moveBtn}
                      onClick={() => move(p.id, 1)}
                      disabled={idx === STAGES.length - 1}
                      aria-label={`Move ${p.name} forward`}
                    >
                      →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Playbook + templates */}
        <p style={styles.sectionLabel}>Playbook &amp; templates (in repository)</p>
        <ul style={styles.linkList}>
          {REPO_DOC_LINKS.map((d) => (
            <li key={d.path} style={styles.linkRow}>
              <span style={styles.code}>{d.path}</span>
              <span style={styles.linkNote}>{d.note}</span>
            </li>
          ))}
        </ul>

        {/* ERPNext-first docs */}
        <p style={styles.sectionLabel}>ERPNext-first operating docs (system of record)</p>
        <ul style={styles.linkList}>
          {ERPNEXT_DOC_LINKS.map((d) => (
            <li key={d.path} style={styles.linkRow}>
              <span style={styles.code}>{d.path}</span>
              <span style={styles.linkNote}>{d.note}</span>
            </li>
          ))}
        </ul>

        <footer style={styles.footer}>
          <p style={{ margin: '0 0 6px' }}>
            <strong>Non-actions honoured on this surface:</strong> no custom CRM, no payment runtime, no
            email/WhatsApp/SMS runtime, no database or schema changes, no secrets, no external outreach,
            no paid tools. All sends and verifications are manual and operator-approved.
          </p>
          <p style={{ margin: 0 }}>
            Authoritative records: ERPNext. Public offer pages:{' '}
            <Link href="/offers/ai-lead-rescue" style={{ color: c.accent }}>
              /offers/ai-lead-rescue
            </Link>
            {', '}
            <Link href="/offers/premium-landing-page-rescue" style={{ color: c.accent }}>
              /offers/premium-landing-page-rescue
            </Link>
            {', '}
            <Link href="/offers/customer-reputation-recovery" style={{ color: c.accent }}>
              /offers/customer-reputation-recovery
            </Link>
            .
          </p>
        </footer>
      </main>
    </div>
  );
}

export async function getStaticProps() {
  return { props: {} };
}
