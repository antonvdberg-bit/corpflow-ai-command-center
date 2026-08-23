/**
 * Local Slice 1 proof server — separate Core and Tenant environments.
 * Usage: node scripts/slice1-local-proof-server.mjs
 *   http://127.0.0.1:4788/app/tenant?proof=1
 *   http://127.0.0.1:4788/app/core?proof=1
 */
import http from 'node:http';
import { URL } from 'node:url';

import {
  handleAppComponentExpose,
  handleAppComponentReview,
  handleAppRequestDetail,
  handleAppRequestsList,
  handleAppShell,
} from '../lib/app/handlers.js';
import { resetRequestStore } from '../lib/app/request-store.js';

const PORT = Number(process.env.SLICE1_PROOF_PORT || 4788);

function sendHtml(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function makeRes(nodeRes) {
  return {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      const body = JSON.stringify(payload);
      nodeRes.writeHead(this.statusCode || 200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      nodeRes.end(body);
      return this;
    },
    statusCode: 200,
  };
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    return {};
  }
}

function buildBootstrap(forcedEnv) {
  const envLiteral = forcedEnv === 'core' ? 'core' : forcedEnv === 'tenant' ? 'tenant' : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CorpFlowAI Slice 1 proof</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Serif:wght@500;600&display=swap" rel="stylesheet" />
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font-family: "DM Sans", system-ui, sans-serif; }
    #root { min-height: 100vh; }
  </style>
</head>
<body>
  <div id="root">Loading Slice 1 proof…</div>
  <script type="module">
    const FORCED = ${JSON.stringify(envLiteral)};
    const params = new URLSearchParams(location.search);
    if (!params.get('proof')) params.set('proof', '1');
    let environment = FORCED || (params.get('env') || params.get('scope') || 'tenant');
    if (environment !== 'core' && environment !== 'tenant') environment = 'tenant';
    params.set('env', environment);
    params.set('scope', environment);
    if (environment === 'tenant') params.set('tenant_id', 'corpflowai');
    const qs = params.toString();

    const CORE = {
      '--app-bg0':'#0b1220','--app-bg1':'#152238','--app-panel':'rgba(18,28,48,0.92)',
      '--app-panel-border':'rgba(148,163,184,0.28)','--app-text':'#e8eef7','--app-muted':'#94a3b8',
      '--app-accent':'#38bdf8','--app-accent-soft':'rgba(56,189,248,0.14)','--app-warn':'#fbbf24',
      '--app-ok':'#34d399','--app-danger':'#f87171',
      '--app-stripe':'repeating-linear-gradient(135deg, rgba(56,189,248,0.08) 0 12px, transparent 12px 24px)'
    };
    const TENANT = {
      '--app-bg0':'#071a18','--app-bg1':'#0f2f2a','--app-panel':'rgba(12,36,32,0.94)',
      '--app-panel-border':'rgba(45,212,191,0.28)','--app-text':'#ecfdf8','--app-muted':'#99b8b0',
      '--app-accent':'#2dd4bf','--app-accent-soft':'rgba(45,212,191,0.16)','--app-warn':'#fbbf24',
      '--app-ok':'#6ee7b7','--app-danger':'#fb7185',
      '--app-stripe':'radial-gradient(ellipse at 20% 0%, rgba(45,212,191,0.18), transparent 55%)'
    };

    const css = \`
      .cf-app-root{min-height:100vh;color:var(--app-text);background:var(--app-stripe),linear-gradient(165deg,var(--app-bg0),var(--app-bg1) 55%,var(--app-bg0));}
      .cf-app-chrome{position:sticky;top:0;display:flex;flex-wrap:wrap;gap:12px 20px;justify-content:space-between;align-items:center;padding:14px 20px;border-bottom:1px solid var(--app-panel-border);background:color-mix(in srgb,var(--app-bg0) 88%,transparent);backdrop-filter:blur(10px)}
      .cf-app-brand{font-family:"IBM Plex Serif",Georgia,serif;font-weight:600;font-size:1.15rem}
      .cf-app-meta{display:flex;flex-wrap:wrap;gap:8px}
      .cf-app-chip{display:inline-flex;gap:6px;padding:6px 10px;border:1px solid var(--app-panel-border);border-radius:8px;background:var(--app-panel);font-size:.78rem;color:var(--app-muted)}
      .cf-app-chip strong{color:var(--app-text)}
      .cf-app-chip[data-tone=accent]{border-color:var(--app-accent);background:var(--app-accent-soft);color:var(--app-text)}
      .cf-app-main{max-width:1080px;margin:0 auto;padding:28px 18px 64px}
      .cf-app-scope-row{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:22px}
      .cf-app-scope-btn{border:1px solid var(--app-panel-border);background:var(--app-panel);color:var(--app-text);border-radius:10px;padding:12px 16px;font:inherit;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}
      .cf-app-scope-btn[data-active=true]{border-color:var(--app-accent);background:var(--app-accent-soft);box-shadow:0 0 0 1px var(--app-accent)}
      .cf-app-panel{border:1px solid var(--app-panel-border);background:var(--app-panel);border-radius:14px;padding:20px 18px;margin-bottom:16px}
      .cf-app-h1{font-family:"IBM Plex Serif",Georgia,serif;font-size:clamp(1.35rem,2.4vw,1.75rem);margin:0 0 8px}
      .cf-app-lead{margin:0;color:var(--app-muted);line-height:1.45;max-width:62ch}
      .cf-app-progress{display:grid;gap:8px;margin-top:16px}
      .cf-app-progress-bar{height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}
      .cf-app-progress-fill{height:100%;background:linear-gradient(90deg,var(--app-accent),color-mix(in srgb,var(--app-accent) 55%,white))}
      .cf-app-grid{display:grid;gap:12px;margin-top:18px}
      .cf-app-comp{border:1px solid var(--app-panel-border);border-radius:12px;padding:14px;background:rgba(0,0,0,.12)}
      .cf-app-comp[data-attention=true]{border-color:var(--app-warn)}
      .cf-app-comp-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;margin-bottom:8px}
      .cf-app-comp-title{margin:0;font-size:1rem;font-weight:650}
      .cf-app-badge{font-size:.72rem;font-weight:600;text-transform:uppercase;padding:4px 8px;border-radius:6px;background:var(--app-accent-soft)}
      .cf-app-badge[data-kind=viewonly]{background:rgba(148,163,184,.18)}
      .cf-app-muted{color:var(--app-muted);font-size:.9rem}
      .cf-app-kv{display:grid;grid-template-columns:minmax(120px,180px) 1fr;gap:6px 12px;font-size:.9rem;margin-top:10px}
      .cf-app-kv dt{color:var(--app-muted);margin:0}
      .cf-app-kv dd{margin:0;word-break:break-word}
      .cf-app-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
      .cf-app-btn{border:1px solid var(--app-panel-border);background:transparent;color:var(--app-text);border-radius:8px;padding:8px 12px;font:inherit;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}
      .cf-app-btn[data-primary=true]{background:var(--app-accent);border-color:transparent;color:#04201c}
      @media (max-width:640px){.cf-app-kv{grid-template-columns:1fr}}
    \`;

    const theme = environment === 'core' ? CORE : TENANT;
    const shell = await fetch('/api/app/shell?' + qs).then(r => r.json());
    const listQs = qs + (environment === 'core' ? '&view=global' : '');
    const listJson = await fetch('/api/app/requests?' + listQs).then(r => r.json());
    const listRows = Array.isArray(listJson.requests) ? listJson.requests : [];
    const detail = await fetch('/api/app/request?' + qs + '&id=' + encodeURIComponent((shell.canonical_request_id||shell.synthetic_request_id))).then(r => r.json());
    const req = detail.request || {};
    const pct = (req.progress && req.progress.percent) || 0;
    const comps = Array.isArray(req.components) ? req.components : [];
    const envLabel = environment === 'core' ? 'Core' : 'Tenant — CorpFlowAI';
    const styleVars = Object.entries(theme).map(([k,v]) => k + ':' + v).join(';');

    let menu = '';
    if (environment === 'core') {
      menu = \`
        <nav class="cf-app-scope-row" data-testid="core-menu">
          <span class="cf-app-scope-btn">My Work</span>
          <span class="cf-app-scope-btn">Tenants</span>
          <span class="cf-app-scope-btn" data-active="true">Requests</span>
          <a class="cf-app-scope-btn" href="/change">Delivery</a>
          <span class="cf-app-scope-btn">Approvals</span>
          <span class="cf-app-scope-btn">Releases</span>
          <a class="cf-app-scope-btn" href="/change">Operations</a>
        </nav>\`;
    } else {
      menu = \`
        <nav class="cf-app-scope-row" data-testid="tenant-menu">
          <span class="cf-app-scope-btn" data-active="true">Requests &amp; Progress</span>
          <a class="cf-app-scope-btn" href="/change">Service &amp; change</a>
        </nav>\`;
    }

    const listHtml = listRows.map(r => \`
      <article class="cf-app-comp" data-testid="list-\${escapeHtml(r.request_id||'')}">
        <div class="cf-app-comp-head">
          <h2 class="cf-app-comp-title">\${escapeHtml(r.title||r.request_id||'')}</h2>
          <span class="cf-app-badge">\${escapeHtml(String(r.status||r.progress_percent||'—'))}</span>
        </div>
        <p class="cf-app-muted" style="margin:0">Tenant · \${escapeHtml(r.tenant_id||'—')} · Next · \${escapeHtml(r.next_action||'—')}</p>
      </article>\`).join('');

    let body = '';
    if (environment === 'tenant') {
      body = \`
        <section class="cf-app-panel" data-testid="tenant-request-list">
          <h1 class="cf-app-h1">Requests &amp; Progress</h1>
          <p class="cf-app-lead">Tenant-scoped queue · client-safe only</p>
          <div class="cf-app-grid">\${listHtml}</div>
        </section>
        <section class="cf-app-panel" data-testid="tenant-requests-progress">
          <h1 class="cf-app-h1">\${escapeHtml(req.title||'')}</h1>
          <p class="cf-app-lead">\${escapeHtml(req.outcome||'')}</p>
          <div class="cf-app-progress" data-testid="tenant-progress">
            <div class="cf-app-muted">Overall progress · <strong style="color:var(--app-text)">\${pct}%</strong></div>
            <div class="cf-app-progress-bar"><div class="cf-app-progress-fill" style="width:\${pct}%"></div></div>
            <div class="cf-app-muted">Next action · \${escapeHtml(req.next_action||'—')}</div>
            <div class="cf-app-muted">Blocker · \${escapeHtml(req.client_safe_blocker||'None')}</div>
          </div>
          <div class="cf-app-grid">
            \${comps.map(c => \`
              <article class="cf-app-comp" data-attention="\${c.attention_required?'true':'false'}" data-testid="tenant-comp-\${escapeHtml(c.key)}" data-exposed="\${c.exposed_for_client_review?'true':'false'}">
                <div class="cf-app-comp-head">
                  <h2 class="cf-app-comp-title">\${escapeHtml(c.title||'')}</h2>
                  <span class="cf-app-badge" data-kind="\${c.exposed_for_client_review?'review':'viewonly'}">\${c.exposed_for_client_review?'Review open':'View only'}</span>
                </div>
                <p class="cf-app-muted" style="margin:0">\${escapeHtml(c.client_safe_summary||'')}</p>
                <p class="cf-app-muted">Component state · \${escapeHtml(c.client_safe_status||'')}</p>
                \${c.exposed_for_client_review ? '<div class="cf-app-actions" data-testid="tenant-review-controls-'+escapeHtml(c.key)+'"><button class="cf-app-btn" data-primary="true">Approve</button><button class="cf-app-btn">Amend</button><button class="cf-app-btn">Reject</button></div>' : '<p class="cf-app-muted" data-testid="tenant-viewonly-'+escapeHtml(c.key)+'">This component is not open for client review.</p>'}
              </article>\`).join('')}
          </div>
        </section>\`;
    } else {
      body = \`
        <section class="cf-app-panel" data-testid="core-request-list">
          <h1 class="cf-app-h1">Requests</h1>
          <p class="cf-app-lead">Global queue · tenant filter ready · production-shaped adapters</p>
          <div class="cf-app-actions" data-testid="core-request-filters">
            <span class="cf-app-muted">Tenant filter · All / corpflowai / cursor-test</span>
            <span class="cf-app-muted">Status · Waiting party</span>
          </div>
          <div class="cf-app-grid">\${listHtml}</div>
        </section>
        <section class="cf-app-panel" data-testid="core-request-work">
          <h1 class="cf-app-h1">\${escapeHtml(req.title||'')}</h1>
          <p class="cf-app-lead">\${escapeHtml(req.outcome||'')}</p>
          <dl class="cf-app-kv">
            <dt>Canonical request id</dt><dd data-testid="core-request-id">\${escapeHtml(req.request_id||'')}</dd>
            <dt>Tenant</dt><dd>\${escapeHtml(req.tenant_id||'')}</dd>
            <dt>Internal blocker</dt><dd>\${escapeHtml(req.internal_blocker||'None')}</dd>
            <dt>Progress</dt><dd>\${pct}%</dd>
          </dl>
          <div class="cf-app-grid" data-testid="core-components">
            \${comps.map(c => \`
              <article class="cf-app-comp" data-testid="core-comp-\${escapeHtml(c.key)}">
                <div class="cf-app-comp-head">
                  <h3 class="cf-app-comp-title">\${escapeHtml(c.title||'')}</h3>
                  <span class="cf-app-badge">\${c.exposed_for_client_review?'Exposed':'Internal'}</span>
                </div>
                <dl class="cf-app-kv">
                  <dt>Task ref</dt><dd>\${escapeHtml(c.internal_task_ref||'—')}</dd>
                  <dt>Evidence</dt><dd>\${escapeHtml((c.internal_evidence_refs||[]).join(', ')||'—')}</dd>
                  <dt>GitHub (Core)</dt><dd>\${c.github ? ('PR #'+c.github.pr_number+' · '+String(c.github.commit_sha||'').slice(0,12)) : '—'}</dd>
                </dl>
                <div class="cf-app-actions" data-testid="core-expose-controls-\${escapeHtml(c.key)}">
                  <button class="cf-app-btn" data-primary="true">Expose for client review</button>
                  <button class="cf-app-btn">Hide from client review</button>
                </div>
              </article>\`).join('')}
          </div>
          <div class="cf-app-preview" data-testid="core-client-preview">
            <h2 style="font-size:1.05rem;margin:0 0 8px">Client projection preview</h2>
            <p class="cf-app-muted" style="margin:0">Same canonical id · \${escapeHtml(req.request_id||'')} · progress \${pct}%</p>
          </div>
          <div class="cf-app-preview" data-testid="core-internal-refs">
            <h2 style="font-size:1.05rem;margin:0 0 8px">Internal work / evidence references</h2>
            <p class="cf-app-muted" style="margin:0">Promotion / technical lead visible in Core only</p>
          </div>
        </section>\`;
    }

    document.getElementById('root').innerHTML = \`
      <style>\${css}</style>
      <div class="cf-app-root" data-scope="\${environment}" data-environment="\${environment}" style="\${styleVars}" data-testid="slice1-proof-root">
        <header class="cf-app-chrome" data-testid="app-chrome">
          <div class="cf-app-brand">CorpFlowAI</div>
          <div class="cf-app-meta">
            <span class="cf-app-chip" data-tone="accent">Environment · <strong>\${envLabel}</strong></span>
            <span class="cf-app-chip">Tenant · <strong>\${environment==='tenant'?'CorpFlowAI':'—'}</strong></span>
            <span class="cf-app-chip">Role · <strong>\${escapeHtml(shell.actor?.role||'')}</strong></span>
            <span class="cf-app-chip">Proof mode</span>
          </div>
        </header>
        <main class="cf-app-main">
          \${menu}
          <p class="cf-app-muted">Separate auth · production-shaped fixtures · no ScopeSwitcher · no external send</p>
          <p class="cf-app-muted"><a class="cf-app-btn" href="/app/core?proof=1">Core proof</a> <a class="cf-app-btn" href="/app/tenant?proof=1">Tenant proof</a> <a class="cf-app-btn" href="/app">Chooser</a></p>
          \${body}
        </main>
      </div>\`;

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    }
  </script>
</body>
</html>`;
}

const CHOOSER = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>CorpFlowAI app · choose environment</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=IBM+Plex+Serif:wght@600&display=swap" rel="stylesheet"/>
<style>
body{margin:0;font-family:"DM Sans",system-ui,sans-serif;background:linear-gradient(165deg,#0b1220,#152238);color:#e8eef7;min-height:100vh}
main{max-width:720px;margin:0 auto;padding:48px 18px}
h1{font-family:"IBM Plex Serif",Georgia,serif}
a{display:inline-block;margin:8px 8px 0 0;padding:12px 16px;border-radius:10px;background:#38bdf8;color:#04201c;font-weight:600;text-decoration:none}
a.secondary{background:transparent;border:1px solid rgba(148,163,184,.4);color:#e8eef7}
p{color:#94a3b8;line-height:1.45}
</style></head>
<body>
<main data-testid="app-entry-chooser">
  <h1>Choose environment</h1>
  <p>Core and Tenant are separately authenticated. No shared ScopeSwitcher.</p>
  <a href="/app/core?proof=1" data-testid="enter-core">Open Core proof</a>
  <a class="secondary" href="/app/tenant?proof=1" data-testid="enter-tenant">Open Tenant — CorpFlowAI proof</a>
</main>
</body></html>`;

resetRequestStore();
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const server = http.createServer(async (req, nodeRes) => {
  const u = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const path = u.pathname.replace(/\/$/, '') || '/';

  if (path === '/app' || path === '/') {
    return sendHtml(nodeRes, CHOOSER);
  }
  if (path === '/app/core') {
    return sendHtml(nodeRes, buildBootstrap('core'));
  }
  if (path === '/app/tenant') {
    return sendHtml(nodeRes, buildBootstrap('tenant'));
  }

  /** @type {any} */
  const fakeReq = {
    method: req.method || 'GET',
    url: req.url,
    headers: req.headers,
    query: Object.fromEntries(u.searchParams.entries()),
    body: undefined,
  };
  if (req.method === 'POST' || req.method === 'PUT') {
    fakeReq.body = await readJson(req);
  }
  const res = makeRes(nodeRes);

  if (path === '/api/app/shell') return handleAppShell(fakeReq, res);
  if (path === '/api/app/requests') return handleAppRequestsList(fakeReq, res);
  if (path === '/api/app/request' || path === '/api/app/requests/detail') {
    return handleAppRequestDetail(fakeReq, res);
  }
  if (path === '/api/app/component-review') return handleAppComponentReview(fakeReq, res);
  if (path === '/api/app/component-expose') return handleAppComponentExpose(fakeReq, res);

  nodeRes.writeHead(404, { 'Content-Type': 'application/json' });
  nodeRes.end(JSON.stringify({ ok: false, error: 'not_found', path }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Slice 1 proof server http://127.0.0.1:${PORT}/app/tenant?proof=1`);
  console.log(`                     http://127.0.0.1:${PORT}/app/core?proof=1`);
});
