/**
 * Desktop + mobile evidence for #1071 Operating Workspace overview.
 * Fixture/proof harness HTML using the same app-theme CSS and overview structure.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { APP_SHELL_CSS, CORE_THEME, themeStyleVars } from '../components/app/app-theme.js';
import { CORE_NAV_ITEMS } from '../lib/app/constants.js';
import { fixtureClientRows, projectClientSummaries } from '../lib/app/clients-workspace.js';
import {
  fixtureProspectLeadRows,
  projectProspectWorkbenchRows,
} from '../lib/app/prospect-operations-workspace.js';
import { buildOperatingOverviewPayload } from '../lib/app/operating-overview.js';
import { projectCoreRequestList } from '../lib/app/project.js';
import { listAppRequests, resetRequestStore } from '../lib/app/request-store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../artifacts/issue-1071-screenshots');
fs.mkdirSync(OUT, { recursive: true });

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function styleAttr(vars) {
  return Object.entries(vars)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

function navMarkup(active) {
  return CORE_NAV_ITEMS.map((item) => {
    const href = item.href || '#';
    const isActive = item.id === active;
    return `<a class="cf-app-scope-btn" data-active="${isActive ? 'true' : 'false'}" href="${escapeHtml(href)}">${escapeHtml(item.label)}</a>`;
  }).join('');
}

function countCards(counts) {
  const cards = [
    ['needs_action_now', 'Needs action now', counts.needs_action_now],
    ['overdue_prospects', 'Overdue prospects', counts.overdue_prospects],
    ['stalled_prospects', 'Stalled prospects', counts.stalled_prospects],
    ['client_commercial_blockers', 'Client commercial blockers', counts.client_commercial_blockers],
    ['deliveries_blocked', 'Deliveries blocked', counts.deliveries_blocked],
    ['deliveries_awaiting_review', 'Awaiting review', counts.deliveries_awaiting_review],
    ['deliveries_awaiting_protected_approval', 'Awaiting protected approval', counts.deliveries_awaiting_protected_approval],
    ['today_my_work', 'Today / My Work', counts.today_my_work],
  ];
  return cards
    .map(([id, label, value]) => {
      const n = Number(value || 0);
      return `<a class="cf-app-count-card" data-testid="overview-count-${id}" ${n > 0 ? 'data-tone="warn"' : ''} href="#">
        <div class="cf-app-count-value">${n}</div>
        <div class="cf-app-count-label">${escapeHtml(label)}</div>
      </a>`;
    })
    .join('');
}

function sectionHtml(key, section) {
  const items = Array.isArray(section?.items) ? section.items : [];
  const count = Number(section?.count || 0);
  const list = items.length
    ? `<ul class="cf-app-exception-list">${items
        .map(
          (item) => `<li data-testid="overview-item-${key}-${escapeHtml(item.id)}">
            <div><strong>${escapeHtml(item.title)}</strong><div class="cf-app-muted">${escapeHtml(item.reason)}</div></div>
            <a class="cf-app-btn" href="${escapeHtml(item.href)}">Open</a>
          </li>`,
        )
        .join('')}</ul>`
    : `<p class="cf-app-lead" data-testid="overview-section-empty-${key}">None recorded.</p>`;
  return `<section class="cf-app-panel" data-testid="overview-section-${key}">
    <h2 class="cf-app-h2">${escapeHtml(section?.title || key)}</h2>
    <p class="cf-app-muted">${count} recorded · <a href="${escapeHtml(section?.href || '#')}">Open canonical list</a></p>
    ${list}
  </section>`;
}

function overviewInner(payload) {
  const counts = payload.counts || {};
  const sections = payload.sections || {};
  const total =
    Number(counts.needs_action_now || 0) +
    Number(counts.client_commercial_blockers || 0) +
    Number(counts.deliveries_blocked || 0) +
    Number(counts.deliveries_awaiting_review || 0) +
    Number(counts.deliveries_awaiting_protected_approval || 0);
  const openNext = payload.open_next;
  const openNextHtml = openNext
    ? `<div class="cf-app-actions" data-testid="overview-open-next">
         <a class="cf-app-btn" data-primary="true" href="${escapeHtml(openNext.href)}">Open next: ${escapeHtml(openNext.label)}</a>
         <span class="cf-app-muted">${escapeHtml(openNext.reason)}</span>
       </div>`
    : `<p class="cf-app-muted" data-testid="overview-open-next-empty">Nothing in the recorded workspace records currently needs operator attention.</p>`;
  const emptyOrSections = total
    ? ['needs_action', 'overdue_prospects', 'stalled_prospects', 'client_commercial_blockers', 'deliveries_blocked', 'deliveries_awaiting_review', 'deliveries_awaiting_protected_approval']
        .map((key) => sectionHtml(key, sections[key]))
        .join('')
    : `<section class="cf-app-panel" data-testid="overview-empty">
         <h2 class="cf-app-h2">No exceptions recorded</h2>
         <p class="cf-app-lead">Existing Prospect, Client and Delivery records are visible, and none currently match overdue, stalled, commercial-blocker, or delivery-attention predicates. Canonical desks remain available.</p>
         <div class="cf-app-actions">
           <a class="cf-app-btn" href="/app/queue">Action Queue</a>
           <a class="cf-app-btn" href="/app/prospects">Prospects</a>
           <a class="cf-app-btn" href="/app/clients">Clients</a>
           <a class="cf-app-btn" href="/change">Delivery / Change</a>
         </div>
       </section>`;
  return `<section class="cf-app-panel" data-testid="operating-overview">
    <h1 class="cf-app-h1">Operating Workspace overview</h1>
    <p class="cf-app-lead">One staff landing for what needs attention now across Prospects, Clients, Commercial references and Delivery. Counts and short lists only — open the canonical route for the full table.</p>
    <p class="cf-app-muted" data-testid="overview-data-source">Data source <code>${escapeHtml(payload.data_source)}</code> · existing workspace records only</p>
    <div class="cf-app-overview-counts" data-testid="overview-counts">${countCards(counts)}</div>
    ${openNextHtml}
  </section>${emptyOrSections}`;
}

function pageHtml(inner, title) {
  const vars = themeStyleVars(CORE_THEME);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${APP_SHELL_CSS}</style>
</head>
<body>
  <div class="cf-app-root" data-environment="core" data-workspace="operating" style="${styleAttr(vars)}">
    <header class="cf-app-chrome" data-testid="app-chrome">
      <div class="cf-app-brand">CorpFlowAI</div>
      <div class="cf-app-meta">
        <span class="cf-app-chip" data-tone="accent">Workspace · <strong>CorpFlowAI Operating Workspace</strong></span>
        <span class="cf-app-chip">Tenant · <strong>—</strong></span>
        <span class="cf-app-chip">Role · <strong>core_operator</strong></span>
        <span class="cf-app-chip">Proof mode</span>
      </div>
    </header>
    <main class="cf-app-main">
      <nav class="cf-app-scope-row" data-testid="core-menu">${navMarkup('overview')}</nav>
      ${inner}
    </main>
  </div>
</body>
</html>`;
}

resetRequestStore();
const prospects = projectProspectWorkbenchRows(fixtureProspectLeadRows());
const populated = buildOperatingOverviewPayload({
  prospects,
  clients: projectClientSummaries(fixtureClientRows(), prospects),
  requests: projectCoreRequestList(listAppRequests()),
  data_sources: { prospects: 'fixture', clients: 'fixture', requests: 'fixture' },
  proof_mode: true,
});
const empty = buildOperatingOverviewPayload({
  prospects: [],
  clients: [],
  requests: [],
  data_sources: { prospects: 'fixture', clients: 'fixture', requests: 'fixture' },
  proof_mode: true,
});

fs.writeFileSync(path.join(OUT, 'overview-populated.html'), pageHtml(overviewInner(populated), 'Overview populated'));
fs.writeFileSync(path.join(OUT, 'overview-empty.html'), pageHtml(overviewInner(empty), 'Overview empty'));

const browser = await chromium.launch({ headless: true });
try {
  async function shot(name, file, viewport) {
    const page = await browser.newPage({ viewport });
    await page.goto(`file://${path.join(OUT, file)}`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForSelector('[data-testid="operating-overview"]', { timeout: 10000 });
    const dest = path.join(OUT, name);
    await page.screenshot({ path: dest, fullPage: true });
    await page.close();
    console.log('wrote', dest);
  }
  await shot('overview-desktop.png', 'overview-populated.html', { width: 1440, height: 900 });
  await shot('overview-mobile.png', 'overview-populated.html', { width: 390, height: 844 });
  await shot('overview-empty-desktop.png', 'overview-empty.html', { width: 1440, height: 900 });
  await shot('overview-empty-mobile.png', 'overview-empty.html', { width: 390, height: 844 });
} finally {
  await browser.close();
}

fs.writeFileSync(
  path.join(OUT, 'README.md'),
  [
    '# #1071 Operating Workspace overview — desktop/mobile evidence',
    '',
    'Fixture/proof harness render of the canonical `/app/core` overview using the Operating Workspace theme.',
    'Not live corpflow_test (awaiting merge + Vercel Production deploy).',
    '',
    '| File | Viewport | State |',
    '| ---- | -------- | ----- |',
    '| `overview-desktop.png` | 1440×900 | Populated exceptions |',
    '| `overview-mobile.png` | 390×844 | Populated exceptions |',
    '| `overview-empty-desktop.png` | 1440×900 | Empty / none recorded |',
    '| `overview-empty-mobile.png` | 390×844 | Empty / none recorded |',
    '',
  ].join('\n'),
);

console.log('Issue 1071 screenshots complete:', OUT);
