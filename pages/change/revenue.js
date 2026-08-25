import Head from 'next/head';
import Link from 'next/link';
import {
  RAPID_DELIVERY_OFFER_SLUGS,
  getRapidDeliveryOffer,
} from '../../lib/public/rapid-delivery-offers.js';

/**
 * /change/revenue — retired first-revenue cockpit (#1074).
 *
 * Canonical prospect pipeline is /app/pipeline (Core / Operating Workspace).
 * This page is a retirement notice. It must not keep a localStorage Kanban or
 * any alternate prospect/status model. /change itself remains canonical.
 *
 * Mixed/unauthenticated on purpose: a hard redirect into /app/pipeline would
 * send Tenant users into a Core-only surface.
 */

const OFFERS = RAPID_DELIVERY_OFFER_SLUGS.map((slug) => getRapidDeliveryOffer(slug)).filter(Boolean);

const REPO_DOC_LINKS = [
  { path: 'docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md', note: 'Canonical manual sell/deliver process' },
  { path: 'docs/revenue/templates/', note: '10 operator templates (discovery → maintenance)' },
  { path: 'docs/revenue/MAURITIUS_PAID_PILOT_SALES_PACK_V1.md', note: 'Mauritius sales pack' },
  { path: 'docs/revenue/MAURITIUS_DISCOVERY_AND_FOLLOW_UP_SEQUENCE_V1.md', note: 'Discovery + follow-up sequence' },
];

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
  shell: { maxWidth: 840, margin: '0 auto', padding: '32px 20px 64px' },
  kicker: { fontSize: 11.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: c.accent, margin: '0 0 8px' },
  h1: { margin: '0 0 6px', fontSize: 'clamp(26px, 4vw, 34px)', letterSpacing: '-0.02em', lineHeight: 1.15 },
  sub: { color: c.textDim, fontSize: 15, lineHeight: 1.6, margin: '0 0 20px', maxWidth: 760 },
  notice: {
    background: 'rgba(45,212,191,0.08)',
    border: '1px solid rgba(45,212,191,0.35)',
    borderRadius: 16,
    padding: '16px 20px',
    margin: '0 0 18px',
    fontSize: 14,
    lineHeight: 1.7,
    color: '#d1fae5',
  },
  boundary: {
    background: 'rgba(251,191,36,0.06)',
    border: '1px solid rgba(251,191,36,0.28)',
    borderRadius: 16,
    padding: '16px 20px',
    margin: '0 0 18px',
    fontSize: 14,
    lineHeight: 1.7,
    color: '#f3e6c4',
  },
  sectionLabel: { fontSize: 11.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: c.accent, margin: '28px 0 12px' },
  offerGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, minWidth: 0 },
  offerCard: {
    background: c.panel,
    border: `1px solid ${c.panelBorder}`,
    borderRadius: 16,
    padding: '16px 18px',
    minWidth: 0,
  },
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 12.5,
    background: 'rgba(2,6,23,0.55)',
    padding: '1px 6px',
    borderRadius: 6,
  },
  linkList: { listStyle: 'none', margin: 0, padding: 0 },
  linkRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    padding: '8px 0',
    borderBottom: `1px solid ${c.panelBorder}`,
    fontSize: 13.5,
  },
  linkNote: { color: c.textFaint },
  footer: { marginTop: 28, color: c.textFaint, fontSize: 13, lineHeight: 1.6 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 10, margin: '8px 0 0' },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 14px',
    borderRadius: 10,
    background: 'rgba(45,212,191,0.18)',
    border: '1px solid rgba(45,212,191,0.45)',
    color: c.good,
    fontWeight: 700,
    textDecoration: 'none',
    fontSize: 14,
  },
  btnGhost: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 14px',
    borderRadius: 10,
    background: 'transparent',
    border: `1px solid ${c.panelBorder}`,
    color: c.accent,
    fontWeight: 650,
    textDecoration: 'none',
    fontSize: 14,
  },
};

export default function ChangeRevenueRetiredPage() {
  return (
    <div style={styles.page}>
      <Head>
        <title>Revenue cockpit retired · CorpFlowAI</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="This localStorage revenue board is retired. Canonical pipeline is Operating Workspace /app/pipeline."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={styles.shell}>
        <p style={styles.kicker}>Retired operator surface · not a public page</p>
        <h1 style={styles.h1}>First-revenue cockpit retired</h1>
        <p style={styles.sub}>
          The browser checklist that used to live here is gone. It was never the prospect CRM.
          Authoritative pipeline records are Postgres <span style={styles.code}>leads</span> on the
          Operating Workspace.
        </p>

        <div
          style={styles.notice}
          data-testid="legacy-route-retirement-notice"
          data-legacy-status="RETIRED"
        >
          <strong>Canonical Prospect Pipeline:</strong>{' '}
          <Link href="/app/pipeline" style={{ color: c.good, fontWeight: 700 }}>
            Operating Workspace · /app/pipeline
          </Link>
          . That board uses the same Postgres prospect records as Prospect Operations. This URL keeps
          a notice only — no localStorage cards, no alternate status model.
          <div style={styles.actions}>
            <Link href="/app/pipeline" style={styles.btn}>
              Open Prospect Pipeline
            </Link>
            <Link href="/app/queue" style={styles.btnGhost}>
              Action Queue
            </Link>
            <Link href="/app/workbench" style={styles.btnGhost}>
              Workbench
            </Link>
          </div>
          <p style={{ margin: '12px 0 0', color: c.textDim, fontSize: 13 }}>
            <code style={styles.code}>/app/pipeline</code>, <code style={styles.code}>/app/queue</code>,
            and <code style={styles.code}>/app/workbench</code> are staff / Core only. Tenant Workspace
            stays on <code style={styles.code}>/change</code>.
          </p>
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
          <code style={styles.code}>/change</code>. Former product desks{' '}
          <code style={styles.code}>/admin/rapid-delivery</code> and{' '}
          <code style={styles.code}>/admin/lead-rescue</code> now redirect into that workspace.
        </div>

        <div style={styles.boundary} data-testid="revenue-cockpit-canonical-notice">
          <strong>ERPNext remains the commercial system of record.</strong> Quotations, invoices,
          deposits, and maintenance live there. CorpFlowAI is the selling/operator wrapper. No payment,
          email, WhatsApp, or SMS runtime on this page.
        </div>

        <p style={styles.sectionLabel}>Public offer pages (unchanged)</p>
        <div style={styles.offerGrid}>
          {OFFERS.map((offer) => (
            <div key={offer.slug} style={styles.offerCard}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{offer.title}</div>
              <div style={{ color: c.good, fontSize: 13, marginBottom: 8 }}>
                from MUR {offer.startingPriceMur.toLocaleString('en-US')}
              </div>
              <Link href={offer.path} style={{ color: c.accent, fontSize: 13.5, fontWeight: 600 }}>
                Open {offer.path} →
              </Link>
            </div>
          ))}
        </div>

        <p style={styles.sectionLabel}>Playbook &amp; templates (in repository)</p>
        <ul style={styles.linkList}>
          {REPO_DOC_LINKS.map((d) => (
            <li key={d.path} style={styles.linkRow}>
              <span style={styles.code}>{d.path}</span>
              <span style={styles.linkNote}>{d.note}</span>
            </li>
          ))}
        </ul>

        <p style={styles.sectionLabel}>ERPNext-first operating docs</p>
        <ul style={styles.linkList}>
          {ERPNEXT_DOC_LINKS.map((d) => (
            <li key={d.path} style={styles.linkRow}>
              <span style={styles.code}>{d.path}</span>
              <span style={styles.linkNote}>{d.note}</span>
            </li>
          ))}
        </ul>

        <footer style={styles.footer}>
          <p style={{ margin: 0 }}>
            Wave 1 status: <strong>RETIRED</strong> (localStorage pipeline removed). /change remains
            the canonical tenant service/change surface.
          </p>
        </footer>
      </main>
    </div>
  );
}

export async function getStaticProps() {
  return { props: {} };
}
