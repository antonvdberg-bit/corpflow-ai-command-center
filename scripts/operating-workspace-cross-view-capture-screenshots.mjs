/**
 * #1219 local proof HTML + optional Playwright screenshots.
 * Serves handler-backed Operating Workspace pages on 127.0.0.1:4791.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import {
  handleAppActionQueue,
  handleAppClientDetail,
  handleAppClients,
  handleAppCommercial,
  handleAppDelivery,
  handleAppOverview,
} from '../lib/app/handlers.js';
import { OVERVIEW_LIST_ERROR_BODY, OVERVIEW_LIST_ERROR_TITLE } from '../lib/app/staff-workspace-load-state.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';

const PORT = Number(process.env.OW_CROSS_VIEW_PORT || 4791);
const OUT = path.resolve('artifacts/operating-workspace-cross-view-1219');
fs.mkdirSync(OUT, { recursive: true });

function mockRes() {
  const state = { statusCode: 0, body: null };
  return {
    state,
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(payload) {
      state.body = payload;
      return this;
    },
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout(title, body) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>
:root{color-scheme:dark}
body{margin:0;font-family:system-ui,sans-serif;background:#0b1220;color:#e8eef7}
.cf-app-chrome{padding:14px 20px;border-bottom:1px solid #334155;background:#0b1220}
.cf-app-brand{font-weight:700}
.cf-app-main{max-width:1080px;margin:0 auto;padding:24px 16px 64px}
.cf-app-panel{border:1px solid #334155;background:#121c30;border-radius:14px;padding:20px;margin-bottom:16px}
.cf-app-h1{margin:0 0 8px;font-size:1.5rem}
.cf-app-lead,.cf-app-muted{color:#94a3b8}
.cf-app-btn{display:inline-block;margin:6px 8px 0 0;padding:8px 12px;border-radius:8px;border:1px solid #475569;color:#e8eef7;text-decoration:none}
.cf-app-btn[data-primary=true]{background:#38bdf8;color:#04201c;border-color:transparent}
.cf-app-error{color:#f87171}
.cf-app-overview-counts{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:14px}
.cf-app-overview-count{border:1px solid #334155;border-radius:12px;padding:12px;color:inherit;text-decoration:none}
table{width:100%;border-collapse:collapse;font-size:.9rem}
th,td{text-align:left;padding:8px;border-bottom:1px solid #1e293b;vertical-align:top}
</style></head><body>
<header class="cf-app-chrome" data-testid="app-chrome"><div class="cf-app-brand">CorpFlowAI Operating Workspace</div></header>
<main class="cf-app-main">${body}</main>
</body></html>`;
}

async function payload(handler, url) {
  const res = mockRes();
  await handler({ method: 'GET', url, headers: {} }, res);
  return res.state.body || {};
}

function overviewHtml(data, { error } = {}) {
  if (error) {
    return layout(
      'Overview error',
      `<section class="cf-app-panel" data-testid="app-core-overview-error" data-load-kind="error">
        <h1 class="cf-app-h1">${escapeHtml(OVERVIEW_LIST_ERROR_TITLE)}</h1>
        <p class="cf-app-error">${escapeHtml(OVERVIEW_LIST_ERROR_BODY)}</p>
        <p class="cf-app-muted" data-testid="app-core-overview-error-code">overview_503</p>
        <a class="cf-app-btn" data-primary="true" href="/app/core?proof=1">Retry</a>
      </section>`,
    );
  }
  const counts = data.counts || {};
  const items = Object.values(data.sections || {}).flatMap((s) => (Array.isArray(s.items) ? s.items : []));
  return layout(
    'Overview',
    `<section class="cf-app-panel" data-testid="operating-overview">
      <h1 class="cf-app-h1">What needs attention</h1>
      <p class="cf-app-lead">Highest-value exceptions from existing Prospects, Clients, Commercial and Delivery records.</p>
      <p class="cf-app-muted">Data source <code>${escapeHtml(data.data_source)}</code></p>
      <div class="cf-app-overview-counts">
        ${Object.entries(counts)
          .map(([k, v]) => `<a class="cf-app-overview-count" data-testid="overview-count-${k}" href="#">${v}<br/>${escapeHtml(k)}</a>`)
          .join('')}
      </div>
    </section>
    <section class="cf-app-panel"><h2>Exceptions</h2><ul>${items
      .slice(0, 12)
      .map(
        (item) =>
          `<li data-testid="overview-item-${escapeHtml(item.id)}"><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a> · ${escapeHtml(item.kind)} · ${escapeHtml(item.href)}</li>`,
      )
      .join('')}</ul></section>`,
  );
}

function tablePage(title, testId, rowsHtml) {
  return layout(title, `<section class="cf-app-panel" data-testid="${testId}"><h1 class="cf-app-h1">${escapeHtml(title)}</h1>${rowsHtml}</section>`);
}

const prevNode = process.env.NODE_ENV;
const prevVercel = process.env.VERCEL_ENV;
process.env.NODE_ENV = 'development';
delete process.env.VERCEL_ENV;
resetProspectFixtureStore();

const overview = await payload(handleAppOverview, '/api/app/overview?proof=1&env=core');
const queue = await payload(handleAppActionQueue, '/api/app/queue?proof=1&env=core&filter=all');
const clients = await payload(handleAppClients, '/api/app/clients?proof=1&env=core');
const client = await payload(handleAppClientDetail, '/api/app/client?proof=1&env=core&id=cmp_ada_spa_synthetic');
const commercial = await payload(handleAppCommercial, '/api/app/commercial?proof=1&env=core&filter=needs_attention');
const delivery = await payload(handleAppDelivery, '/api/app/delivery?proof=1&env=core&filter=all');

const pages = {
  '/app/core': overviewHtml(overview),
  '/app/core?proof=1': overviewHtml(overview),
  '/app/core?error=1': overviewHtml(overview, { error: true }),
  '/app/queue': tablePage(
    'Prospect Action Queue',
    'action-queue',
    `<table><thead><tr><th>Prospect</th><th>Owner</th><th>Next action</th><th>Open</th></tr></thead><tbody>${(queue.prospects || [])
      .slice(0, 8)
      .map(
        (row) =>
          `<tr data-testid="queue-row-${escapeHtml(row.id)}"><td>${escapeHtml(row.organisation_name || row.id)}</td><td>${escapeHtml(row.owner)}</td><td>${escapeHtml(row.next_action)}</td><td><a href="${escapeHtml(row.shared_detail_path)}">${escapeHtml(row.shared_detail_path)}</a></td></tr>`,
      )
      .join('')}</tbody></table>`,
  ),
  '/app/clients/cmp_ada_spa_synthetic': tablePage(
    'Client summary',
    'client-summary',
    `<p>company_id <code>${escapeHtml(client.client?.company_id)}</code></p>
     <p>Owner ${escapeHtml(client.client?.record_owner)}</p>
     <p>Next action ${escapeHtml(client.client?.next_action)}</p>
     <p>Prospect <a href="/app/prospects/syn-772-lr-ada">/app/prospects/syn-772-lr-ada</a></p>
     <p>Commercial <a href="/app/commercial">/app/commercial</a></p>
     <p>Delivery <a href="/app/delivery">/app/delivery</a></p>`,
  ),
  '/app/commercial': tablePage(
    'Commercial',
    'commercial-summary',
    `<table><thead><tr><th>Prospect</th><th>State</th><th>Owner</th><th>Next action</th></tr></thead><tbody>${(commercial.rows || [])
      .slice(0, 8)
      .map(
        (row) =>
          `<tr data-testid="commercial-row-${escapeHtml(row.id)}"><td>${escapeHtml(row.client_label || row.prospect_id)}</td><td>${escapeHtml(row.commercial_state)}</td><td>${escapeHtml(row.owner)}</td><td>${escapeHtml(row.next_action)}</td></tr>`,
      )
      .join('')}</tbody></table>`,
  ),
  '/app/delivery': tablePage(
    'Delivery',
    'delivery-summary',
    `<table><thead><tr><th>Client</th><th>Owner</th><th>Blocker</th><th>Next action</th><th>Evidence</th></tr></thead><tbody>${(delivery.items || [])
      .slice(0, 8)
      .map(
        (row) =>
          `<tr data-testid="delivery-row-${escapeHtml(row.id)}"><td>${escapeHtml(row.client_business)}</td><td>${escapeHtml(row.owner)}</td><td>${escapeHtml(row.current_blocker)}</td><td>${escapeHtml(row.next_action)}</td><td><a href="${escapeHtml(row.links?.prospect || '/app/delivery')}">${escapeHtml(row.links?.prospect || '/app/delivery')}</a></td></tr>`,
      )
      .join('')}</tbody></table>`,
  ),
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const key = `${url.pathname}${url.search}`;
  const html = pages[key] || pages[url.pathname];
  if (!html) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

if (process.argv.includes('--serve-only')) {
  console.log(`proof server http://127.0.0.1:${PORT}/app/core?proof=1`);
} else {
  let captured = false;
  try {
    const { chromium } = await import('playwright');
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
    } catch {
      browser = await chromium.launch({ headless: true, channel: 'chrome' });
    }
    const shots = [
      ['overview-desktop.png', '/app/core?proof=1', { width: 1440, height: 900 }],
      ['overview-mobile.png', '/app/core?proof=1', { width: 390, height: 844 }],
      ['overview-error-desktop.png', '/app/core?error=1', { width: 1440, height: 900 }],
      ['overview-error-mobile.png', '/app/core?error=1', { width: 390, height: 844 }],
      ['queue-desktop.png', '/app/queue', { width: 1440, height: 900 }],
      ['queue-mobile.png', '/app/queue', { width: 390, height: 844 }],
      ['client-desktop.png', '/app/clients/cmp_ada_spa_synthetic', { width: 1440, height: 900 }],
      ['client-mobile.png', '/app/clients/cmp_ada_spa_synthetic', { width: 390, height: 844 }],
      ['commercial-desktop.png', '/app/commercial', { width: 1440, height: 900 }],
      ['commercial-mobile.png', '/app/commercial', { width: 390, height: 844 }],
      ['delivery-desktop.png', '/app/delivery', { width: 1440, height: 900 }],
      ['delivery-mobile.png', '/app/delivery', { width: 390, height: 844 }],
    ];
    for (const [name, route, viewport] of shots) {
      const page = await browser.newPage({ viewport });
      await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.screenshot({ path: path.join(OUT, name), fullPage: true });
      await page.close();
      console.log('wrote', name);
    }
    await browser.close();
    captured = true;
  } catch (err) {
    console.warn('screenshot capture skipped:', err instanceof Error ? err.message : err);
  }
  server.close();
  process.env.NODE_ENV = prevNode;
  if (prevVercel == null) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = prevVercel;
  fs.writeFileSync(
    path.join(OUT, 'screenshots.json'),
    JSON.stringify({ captured, port: PORT, out: OUT }, null, 2),
  );
  if (!captured) process.exitCode = 0;
}
