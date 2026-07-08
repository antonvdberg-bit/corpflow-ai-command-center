import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { buildLuxChangeConsoleChrome } from '../../lib/client/lux-change-console-theme.js';
import {
  LUX_OWNER_FEEDBACK_ACTIVE_BASELINE_BANNER,
  LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE,
  LUX_OWNER_FEEDBACK_HISTORICAL_ITEMS,
  LUX_OWNER_FEEDBACK_ITEMS,
  LUX_OWNER_FEEDBACK_NEXT_SLICE,
  LUX_OWNER_FEEDBACK_PRODUCT_CATEGORIES,
  LUX_OWNER_FEEDBACK_QUEUE_META,
  countLuxOwnerFeedbackAwaitingAnton,
  countLuxOwnerFeedbackByStatus,
  luxOwnerFeedbackCategoryLabel,
  luxOwnerFeedbackPriorityLabel,
  luxOwnerFeedbackStatusLabel,
} from '../../lib/client/lux-owner-feedback-queue.js';
import { changeTextContainStyle } from '../../lib/cmp/_lib/change-console-layout.js';

/**
 * /change/lux-feedback — LuxeMaurice AI new product feedback queue (operator control).
 *
 * Active baseline: /client/luxe-maurice-ai multi-channel private-access product.
 * Historical #529 / property-only items are separated — they do not drive the next slice.
 */

const STATUS_FILTERS = [
  'all',
  'queued',
  'in_progress',
  'blocked',
  'awaiting_client',
  'awaiting_anton',
  'responded',
];

/** @param {import('../../lib/client/lux-owner-feedback-queue.js').LuxOwnerFeedbackPriority} priority */
function priorityColor(priority, chrome) {
  if (priority === 'P0') return chrome.gold;
  if (priority === 'P1') return chrome.sand;
  return chrome.textMuted;
}

/** @param {import('../../lib/client/lux-owner-feedback-queue.js').LuxOwnerFeedbackItem} item */
function FeedbackCard({ item, chrome, muted = false }) {
  return (
    <article
      key={item.id}
      style={{
        ...chrome.card,
        ...changeTextContainStyle(),
        opacity: muted ? 0.82 : 1,
        border: muted ? `1px solid ${chrome.borderStone}` : chrome.card.border,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={{ fontFamily: chrome.mono, fontSize: 11, color: chrome.textMuted }}>{item.id}</span>
        <span style={{ ...chrome.badge('property_media'), fontSize: 10 }}>
          {luxOwnerFeedbackCategoryLabel(item.category)}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: priorityColor(item.priority, chrome),
            letterSpacing: '0.06em',
          }}
        >
          {luxOwnerFeedbackPriorityLabel(item.priority)}
        </span>
        <span style={{ ...chrome.badge('programme'), fontSize: 10 }}>{luxOwnerFeedbackStatusLabel(item.status)}</span>
        {item.antonApprovalRequired ? (
          <span style={{ ...chrome.badge('crm_leads'), fontSize: 10 }}>Anton approval required</span>
        ) : null}
      </div>

      <h2 style={{ margin: '10px 0 6px', fontSize: 15, fontWeight: 750, color: chrome.text, lineHeight: 1.45 }}>
        {item.feedback}
      </h2>

      <div style={{ display: 'grid', gap: 10, marginTop: 12, fontSize: 13, lineHeight: 1.55 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', color: chrome.textLabel }}>
            Affected surface
          </div>
          <div style={{ color: chrome.textMuted }}>{item.affectedSurface}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', color: chrome.textLabel }}>
            Proposed response
          </div>
          <div style={{ color: chrome.text }}>{item.proposedResponse}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', color: chrome.textLabel }}>
            Next visible fix
          </div>
          <div style={{ color: chrome.sand }}>{item.nextVisibleFix}</div>
        </div>
        {item.previewEvidenceLink ? (
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', color: chrome.textLabel }}>
              Preview evidence
            </div>
            <a href={item.previewEvidenceLink} style={{ color: chrome.link, fontSize: 13, wordBreak: 'break-all' }}>
              {item.previewEvidenceLink}
            </a>
          </div>
        ) : null}
        <div style={{ fontSize: 11, color: chrome.textMuted }}>Source: {item.sourceRef}</div>
      </div>
    </article>
  );
}

export default function LuxOwnerFeedbackQueuePage() {
  const chrome = useMemo(() => buildLuxChangeConsoleChrome(), []);
  const [statusFilter, setStatusFilter] = useState('all');

  const statusCounts = useMemo(() => countLuxOwnerFeedbackByStatus(), []);
  const awaitingAnton = useMemo(() => countLuxOwnerFeedbackAwaitingAnton(), []);

  const filteredItems = useMemo(() => {
    if (statusFilter === 'all') return LUX_OWNER_FEEDBACK_ITEMS;
    return LUX_OWNER_FEEDBACK_ITEMS.filter((item) => item.status === statusFilter);
  }, [statusFilter]);

  return (
    <div style={{ minHeight: '100vh', background: chrome.shellBg }}>
      <Head>
        <title>{LUX_OWNER_FEEDBACK_QUEUE_META.pageTitle} · Change Console</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="Operator-facing LuxeMaurice AI new product feedback queue. Active baseline: /client/luxe-maurice-ai."
        />
      </Head>

      <main style={chrome.pageInner}>
        <p style={{ margin: '0 0 8px', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: chrome.textLabel }}>
          Operator control · config-backed · new product baseline
        </p>
        <h1
          style={{
            margin: '0 0 10px',
            fontFamily: chrome.fontDisplay,
            fontSize: 'clamp(1.6rem, 3vw, 2.1rem)',
            fontWeight: 400,
            color: chrome.heroDeep,
            letterSpacing: -0.3,
          }}
        >
          {LUX_OWNER_FEEDBACK_QUEUE_META.pageTitle}
        </h1>
        <p style={{ margin: '0 0 18px', fontSize: 14, lineHeight: 1.65, color: chrome.textMuted, maxWidth: 760 }}>
          Visible delivery loop for the <strong style={{ color: chrome.text }}>new LuxeMaurice AI</strong> multi-channel
          private-access product at{' '}
          <strong style={{ color: chrome.gold }}>{LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}</strong>. Anton, Cursor,
          and ChatGPT use this desk for status, proposed responses, and the next 2–6 hour slice.
        </p>

        <div
          style={{
            ...chrome.card,
            marginBottom: 18,
            border: `2px solid ${chrome.gold}`,
            background: 'rgba(201,169,98,0.12)',
            fontSize: 14,
            lineHeight: 1.6,
            color: chrome.text,
            fontWeight: 650,
          }}
        >
          {LUX_OWNER_FEEDBACK_ACTIVE_BASELINE_BANNER}
        </div>

        <div
          style={{
            ...chrome.subtleCard,
            marginBottom: 18,
            fontSize: 13,
            lineHeight: 1.6,
            color: chrome.textMuted,
          }}
        >
          <strong style={{ color: chrome.text }}>Historical context:</strong>{' '}
          {LUX_OWNER_FEEDBACK_QUEUE_META.historicalContextIssue} is the old recovery programme — kept below for reference
          only. {LUX_OWNER_FEEDBACK_QUEUE_META.prSlice} delivers this new-product feedback queue. Update{' '}
          <span style={{ fontFamily: chrome.mono, fontSize: 12 }}>lib/client/lux-owner-feedback-queue.js</span> when new
          owner feedback is captured.
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          <Link href="/change" style={chrome.navPill('gold')}>
            ← Change Console
          </Link>
          <Link href={LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE} style={chrome.navPill('highlight')} target="_blank" rel="noopener noreferrer">
            LuxeMaurice AI product
          </Link>
          <Link href={`${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}/buyer`} style={chrome.navPill('default')} target="_blank" rel="noopener noreferrer">
            Buyer access flow
          </Link>
          <Link href={`${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}/crm`} style={chrome.navPill('default')} target="_blank" rel="noopener noreferrer">
            Advisor CRM preview
          </Link>
        </div>

        <section style={{ ...chrome.subtleCard, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: chrome.textLabel }}>
            New product categories
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {LUX_OWNER_FEEDBACK_PRODUCT_CATEGORIES.map((cat) => (
              <span key={cat.key} style={{ ...chrome.badge('property'), fontSize: 10 }}>
                {cat.label}
              </span>
            ))}
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 22 }}>
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} style={{ ...chrome.subtleCard, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: chrome.textLabel }}>
                {luxOwnerFeedbackStatusLabel(/** @type {any} */ (status))}
              </div>
              <div style={{ marginTop: 4, fontSize: 22, fontWeight: 800, color: chrome.text }}>{count}</div>
            </div>
          ))}
        </div>

        <section style={{ ...chrome.card, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: chrome.textLabel }}>
            Next 2–6 hour delivery slice
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: chrome.textMuted, lineHeight: 1.55 }}>
            Active product surface{' '}
            <span style={{ fontFamily: chrome.mono, fontSize: 11, color: chrome.text }}>
              {LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}
            </span>
            — not the old property-only site.
          </div>
          <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
            {LUX_OWNER_FEEDBACK_NEXT_SLICE.map((step) => (
              <div
                key={step.hours}
                style={{
                  ...chrome.subtleCard,
                  borderLeft: `3px solid ${step.antonGate ? chrome.gold : chrome.borderStone}`,
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: chrome.gold }}>{step.hours}</span>
                  {step.antonGate ? (
                    <span style={{ ...chrome.badge('active_client'), fontSize: 10 }}>Anton approval gate</span>
                  ) : null}
                </div>
                <div style={{ marginTop: 6, fontSize: 14, fontWeight: 750, color: chrome.text }}>{step.title}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: chrome.textMuted }}>
                  Owner: {step.owner} · Outcome: {step.outcome}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...chrome.card, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: chrome.textLabel }}>
            Approval gate summary
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.6, color: chrome.textMuted }}>
            <strong style={{ color: chrome.text }}>{awaitingAnton}</strong> open new-product item(s) require Anton
            approval before client send or production deploy. No item on this page auto-sends to Jan.
          </p>
        </section>

        <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: chrome.textLabel }}>
          Active new-product feedback
        </div>
        <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              style={chrome.pill(statusFilter === filter)}
            >
              {filter === 'all' ? 'All' : luxOwnerFeedbackStatusLabel(/** @type {any} */ (filter))}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 14, marginBottom: 28 }}>
          {filteredItems.map((item) => (
            <FeedbackCard key={item.id} item={item} chrome={chrome} />
          ))}
        </div>

        <section style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: chrome.textLabel, marginBottom: 8 }}>
            Historical / legacy Lux context
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: chrome.textMuted, lineHeight: 1.6, maxWidth: 720 }}>
            Old property-only site and #529 recovery items. <strong style={{ color: chrome.text }}>Do not drive</strong>{' '}
            the next delivery slice unless they directly affect the new LuxeMaurice AI product.
          </p>
          <div style={{ display: 'grid', gap: 14 }}>
            {LUX_OWNER_FEEDBACK_HISTORICAL_ITEMS.map((item) => (
              <FeedbackCard key={item.id} item={item} chrome={chrome} muted />
            ))}
          </div>
        </section>

        <footer style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${chrome.border}`, fontSize: 12, color: chrome.textMuted, lineHeight: 1.7 }}>
          <p style={{ margin: '0 0 8px' }}>
            Canonical doc: <span style={{ fontFamily: chrome.mono }}>docs/LUX/LUX_OWNER_FEEDBACK_DELIVERY_QUEUE.md</span>
            · {LUX_OWNER_FEEDBACK_QUEUE_META.historicalContextIssue} historical only ·{' '}
            {LUX_OWNER_FEEDBACK_QUEUE_META.prSlice} new product baseline · Last config update{' '}
            {LUX_OWNER_FEEDBACK_QUEUE_META.lastUpdated}.
          </p>
          <p style={{ margin: 0 }}>
            Non-actions: no production deploy, no env/secrets, no DB/schema, no email/WhatsApp/SMS runtime, no client
            outreach from this page.
          </p>
        </footer>
      </main>
    </div>
  );
}

export async function getServerSideProps({ req, resolvedUrl }) {
  const { getSessionFromRequest } = await import('../../lib/server/session.js');
  const { buildCorpflowHostContext } = await import('../../lib/server/host-tenant-context.js');
  const { readActingTenantId, readSessionUserId } = await import(
    '../../lib/cmp/_lib/cmp-membership-enforcement.js'
  );
  const { resolveChangeConsoleSsrGate } = await import('../../lib/server/change-console-ssr-gate.js');
  const { cfg } = await import('../../lib/server/runtime-config.js');
  const { PrismaClient } = await import('@prisma/client');

  const sess = getSessionFromRequest(req);
  const userId = readSessionUserId(sess);
  if (!userId) return { props: {} };

  const ctx = buildCorpflowHostContext(req);
  if (ctx.surface !== 'tenant' || !ctx.host) return { props: {} };

  let hostTenantId = ctx.tenant_id != null ? String(ctx.tenant_id).trim() : '';
  const prisma = new PrismaClient();
  try {
    const row = await prisma.tenantHostname.findUnique({
      where: { host: ctx.host },
      select: { tenantId: true, enabled: true },
    });
    if (row?.enabled === true && row.tenantId) {
      hostTenantId = String(row.tenantId).trim();
    }
  } catch {
    /* best-effort */
  } finally {
    await prisma.$disconnect().catch(() => {});
  }

  const nextPath =
    typeof resolvedUrl === 'string' && resolvedUrl.startsWith('/') ? resolvedUrl : '/change/lux-feedback';

  const gate = resolveChangeConsoleSsrGate({
    userId,
    sessionTyp: sess?.payload?.typ,
    surface: ctx.surface,
    hostTenantId: hostTenantId || null,
    actingTenantId: readActingTenantId(sess),
    nextPath,
    coreHostsEnv: cfg('CORPFLOW_CORE_HOSTS', ''),
  });

  if (gate.kind === 'redirect') {
    return {
      redirect: {
        destination: gate.destination,
        permanent: false,
      },
    };
  }

  return { props: {} };
}
