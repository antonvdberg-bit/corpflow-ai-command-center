import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { buildLuxChangeConsoleChrome } from '../../lib/client/lux-change-console-theme.js';
import {
  LUX_OWNER_FEEDBACK_ITEMS,
  LUX_OWNER_FEEDBACK_NEXT_SLICE,
  LUX_OWNER_FEEDBACK_QUEUE_META,
  countLuxOwnerFeedbackAwaitingAnton,
  countLuxOwnerFeedbackByStatus,
  luxOwnerFeedbackPriorityLabel,
  luxOwnerFeedbackStatusLabel,
} from '../../lib/client/lux-owner-feedback-queue.js';
import { changeTextContainStyle } from '../../lib/cmp/_lib/change-console-layout.js';

/**
 * /change/lux-feedback — LuxeMaurice owner feedback delivery queue (operator control).
 *
 * Config-backed from documented programme sources (#529, WBS, recovery audit, content sprint).
 * NOT live client-submitted runtime feedback. No DB/schema changes.
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
        <title>LuxeMaurice owner feedback queue · Change Console</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="Operator-facing LuxeMaurice owner feedback delivery queue. Config-backed control surface — not live client runtime."
        />
      </Head>

      <main style={chrome.pageInner}>
        <p style={{ margin: '0 0 8px', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: chrome.textLabel }}>
          Operator control · config-backed
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
          LuxeMaurice owner feedback queue
        </h1>
        <p style={{ margin: '0 0 18px', fontSize: 14, lineHeight: 1.65, color: chrome.textMuted, maxWidth: 760 }}>
          Visible delivery loop for Jan / LuxeMaurice owner concerns captured in programme docs and{' '}
          <strong style={{ color: chrome.text }}>{LUX_OWNER_FEEDBACK_QUEUE_META.programmeIssue}</strong>. Anton,
          Cursor, and ChatGPT use this desk to see status, proposed responses, and the next 2–6 hour slice — not
          scattered chat.
        </p>

        <div
          style={{
            ...chrome.subtleCard,
            marginBottom: 18,
            border: `1px solid ${chrome.goldDeep}`,
            background: 'rgba(201,169,98,0.08)',
            fontSize: 13,
            lineHeight: 1.6,
            color: chrome.text,
          }}
        >
          <strong>Data source:</strong>{' '}
          {LUX_OWNER_FEEDBACK_QUEUE_META.exactOwnerQuotesFound
            ? 'Exact owner/programme feedback was found in repo docs and GitHub #529 — items below are traced to source references.'
            : 'No exact owner quotes in repo — placeholder operator queue only.'}{' '}
          <strong>Not</strong> live client-submitted runtime. Update{' '}
          <span style={{ fontFamily: chrome.mono, fontSize: 12 }}>lib/client/lux-owner-feedback-queue.js</span> when
          new feedback is captured.
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          <Link href="/change" style={chrome.navPill('gold')}>
            ← Change Console
          </Link>
          <Link href="/client/recovery-roadmap" style={chrome.navPill('default')} target="_blank" rel="noopener noreferrer">
            Recovery review (client)
          </Link>
          <a
            href={`/change?id=${encodeURIComponent(LUX_OWNER_FEEDBACK_QUEUE_META.recoveryTicketId)}`}
            style={chrome.navPill('highlight')}
          >
            Recovery ticket
          </a>
        </div>

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
            Linked recovery ticket{' '}
            <span style={{ fontFamily: chrome.mono, fontSize: 11, color: chrome.text }}>
              {LUX_OWNER_FEEDBACK_QUEUE_META.recoveryTicketId}
            </span>
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
            <strong style={{ color: chrome.text }}>{awaitingAnton}</strong> open item(s) require Anton approval before
            client send, production deploy, or external comms. No item on this page auto-sends to Jan.
          </p>
          <ul style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: 13, color: chrome.textMuted, lineHeight: 1.65 }}>
            <li>Preview / internal operator review — no Anton gate for queue visibility itself.</li>
            <li>Client decision link mint — Anton approves send.</li>
            <li>Production deploy — Anton approves (per #529 governance).</li>
            <li>Jan email / ERPNext quotation — held until verified artifacts exist.</li>
          </ul>
        </section>

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

        <div style={{ display: 'grid', gap: 14 }}>
          {filteredItems.map((item) => (
            <article key={item.id} style={{ ...chrome.card, ...changeTextContainStyle() }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span style={{ fontFamily: chrome.mono, fontSize: 11, color: chrome.textMuted }}>{item.id}</span>
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
                <div style={{ fontSize: 11, color: chrome.textMuted }}>
                  Source: {item.sourceRef}
                </div>
              </div>
            </article>
          ))}
        </div>

        <footer style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${chrome.border}`, fontSize: 12, color: chrome.textMuted, lineHeight: 1.7 }}>
          <p style={{ margin: '0 0 8px' }}>
            Canonical doc: <span style={{ fontFamily: chrome.mono }}>docs/LUX/LUX_OWNER_FEEDBACK_DELIVERY_QUEUE.md</span>
            · Programme parent {LUX_OWNER_FEEDBACK_QUEUE_META.programmeIssue} · Last config update{' '}
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
