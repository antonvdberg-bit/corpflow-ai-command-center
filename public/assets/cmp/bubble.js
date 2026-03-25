/**
 * CorpFlow CMP — floating change-request bubble (vanilla JS, single script tag).
 * Style isolation: Shadow DOM + prefixed class names. No dependency on host page CSS.
 *
 * Usage:
 *   <script src="/assets/cmp/bubble.js" defer></script>
 *
 * Path-based defaults (Vercel routes): / → internal tier + demo pricing; /legal → enterprise;
 * /lux → premium. Optional data-cmp-tier / data-cmp-is-demo on the tag override those defaults.
 * Optional: data-cmp-api-base="https://your-deployment.vercel.app" for cross-origin API.
 */
(function () {
  'use strict';

  var STORAGE_TICKET = 'cmp_ticket_id';
  var STORAGE_SESSION = 'cmp_session_v1';

  // ---------------------------------------------------------------------------
  // CONFIG (from the executing <script> element + pathname branding)
  // Deployed routes: / → internal tier + demo; /legal → enterprise; /lux → premium.
  // data-* attributes override when explicitly set on the script tag.
  // ---------------------------------------------------------------------------
  function pathnameBranding() {
    var p = '';
    try {
      p = (typeof location !== 'undefined' && location.pathname) ? String(location.pathname) : '';
    } catch (e) {}
    if (p.length > 1 && p.charAt(p.length - 1) === '/') p = p.slice(0, -1);
    if (p === '/legal') return { tier: 'enterprise', isDemo: false };
    if (p === '/lux') return { tier: 'premium', isDemo: false };
    if (p === '' || p === '/') return { tier: 'internal', isDemo: true };
    return null;
  }

  function readConfig() {
    var s = document.currentScript;
    if (!s) {
      s = document.querySelector('script[src*="bubble.js"]');
    }
    var apiBase = (s && s.getAttribute('data-cmp-api-base')) || '';
    apiBase = String(apiBase).replace(/\/$/, '');
    var clientId = (s && s.getAttribute('data-cmp-client-id')) || '';
    var pb = pathnameBranding();

    var isDemoAttr = s && s.getAttribute('data-cmp-is-demo');
    var isDemoExplicit = isDemoAttr !== null && isDemoAttr !== '';
    var isDemo = isDemoExplicit
      ? String(isDemoAttr).toLowerCase() === 'true'
      : pb
        ? pb.isDemo
        : false;

    var tierAttr = s && s.getAttribute('data-cmp-tier');
    var tierExplicit = tierAttr !== null && tierAttr !== '';
    var tier = tierExplicit
      ? tierAttr
      : pb
        ? pb.tier
        : 'standard';
    if (['standard', 'premium', 'enterprise', 'internal'].indexOf(tier) === -1) tier = 'standard';

    return { apiBase: apiBase, clientId: clientId, isDemo: isDemo, tier: tier };
  }

  var CONFIG = readConfig();

  function apiUrl(path) {
    if (CONFIG.apiBase) return CONFIG.apiBase + path;
    return path;
  }

  /** Single CMP router; query preserved (Vercel rewrites that add ?action= drop the original query string). */
  function cmpActionUrl(action, extraQuery) {
    var u = '/api/cmp/router?action=' + encodeURIComponent(action);
    if (extraQuery) u += '&' + extraQuery;
    return apiUrl(u);
  }

  // ---------------------------------------------------------------------------
  // INITIAL RENDER / MOUNT
  // 1) Ensure single instance via id guard.
  // 2) Append a fixed-position host on <body> (no layout shift of page content).
  // 3) Open Shadow DOM so global site CSS cannot style or break inner UI.
  // 4) Inject a single <style> block (scoped to the shadow tree only).
  // 5) Build FAB + slide-over panel shell; wire open/close.
  // 6) hydrateFromStorage() restores ticket id + wizard stage after refresh.
  // ---------------------------------------------------------------------------
  function mount() {
    if (document.getElementById('cmp-bubble-host')) return;

    var host = document.createElement('div');
    host.id = 'cmp-bubble-host';
    host.setAttribute('aria-live', 'polite');
    host.style.cssText =
      'position:fixed;bottom:0;right:0;z-index:2147483646;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;';

    var shadow = host.attachShadow({ mode: 'open' });

    var style = document.createElement('style');
    style.textContent = getScopedCss();
    shadow.appendChild(style);

    var root = el('div', 'cmp-root');
    root.innerHTML = getShellHtml();
    shadow.appendChild(root);

    document.body.appendChild(host);

    var existingTid = getTicketId();
    if (existingTid) {
      try {
        localStorage.setItem(STORAGE_TICKET, existingTid);
      } catch (e2) {}
    }

    wireUi(root);
    hydrateFromStorage(root);
  }

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function getScopedCss() {
    return [
      ':host, .cmp-root { all: initial; }',
      '.cmp-root {',
      '  --cmp-bg:#0f172a;--cmp-panel:#111827;--cmp-border:rgba(148,163,184,.25);',
      '  --cmp-text:#e2e8f0;--cmp-muted:#94a3b8;--cmp-accent:#38bdf8;--cmp-accent2:#0ea5e9;',
      '  --cmp-danger:#f87171;--cmp-radius:14px;--cmp-shadow:0 24px 80px rgba(0,0,0,.45);',
      '  font-size:14px;line-height:1.45;color:var(--cmp-text);box-sizing:border-box;',
      '}',
      '.cmp-root *, .cmp-root *::before, .cmp-root *::after { box-sizing:border-box; }',
      '.cmp-layer { pointer-events:none; width:min(420px,calc(100vw - 32px)); margin:0 20px 20px auto; }',
      '.cmp-layer * { pointer-events:auto; }',
      '.cmp-fab {',
      '  pointer-events:auto; float:right; width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;',
      '  background:linear-gradient(145deg,var(--cmp-accent),var(--cmp-accent2));color:#0f172a;font-weight:800;',
      '  font-size:20px;box-shadow:var(--cmp-shadow);display:flex;align-items:center;justify-content:center;',
      '  transition:transform .2s ease, box-shadow .2s ease;margin-bottom:12px;',
      '}',
      '.cmp-fab:hover { transform:translateY(-2px); }',
      '.cmp-fab:focus-visible { outline:2px solid var(--cmp-accent); outline-offset:3px; }',
      '.cmp-panel {',
      '  clear:both; display:none; flex-direction:column; max-height:min(72vh,640px);',
      '  background:var(--cmp-panel); border:1px solid var(--cmp-border); border-radius:var(--cmp-radius);',
      '  box-shadow:var(--cmp-shadow); overflow:hidden;',
      '}',
      '.cmp-panel.cmp-open { display:flex; }',
      '.cmp-head { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid var(--cmp-border); background:rgba(15,23,42,.6); }',
      '.cmp-head h2 { margin:0; font-size:15px; font-weight:700; letter-spacing:.02em; }',
      '.cmp-close { background:transparent;border:none;color:var(--cmp-muted);cursor:pointer;font-size:18px;padding:4px 8px;border-radius:8px;}',
      '.cmp-close:hover { color:var(--cmp-text); background:rgba(148,163,184,.12); }',
      '.cmp-body { padding:16px; overflow-y:auto; flex:1; }',
      '.cmp-stage-label { font-size:11px; text-transform:uppercase; letter-spacing:.12em; color:var(--cmp-muted); margin-bottom:10px; }',
      '.cmp-textarea { width:100%; min-height:120px; resize:vertical; padding:12px 14px; border-radius:10px; border:1px solid var(--cmp-border); background:#0b1220; color:var(--cmp-text); font:inherit; }',
      '.cmp-textarea:focus { outline:none; border-color:var(--cmp-accent); box-shadow:0 0 0 1px var(--cmp-accent); }',
      '.cmp-btn { width:100%; margin-top:12px; padding:12px 16px; border-radius:10px; border:none; font-weight:700; cursor:pointer; font-size:13px; letter-spacing:.04em; text-transform:uppercase; }',
      '.cmp-btn-primary { background:linear-gradient(145deg,var(--cmp-accent),var(--cmp-accent2)); color:#0f172a; }',
      '.cmp-btn-primary:disabled { opacity:.5; cursor:not-allowed; }',
      '.cmp-btn-ghost { background:transparent; color:var(--cmp-muted); margin-top:8px; text-transform:none; letter-spacing:0; font-weight:600; }',
      '.cmp-card { background:#0b1220; border:1px solid var(--cmp-border); border-radius:12px; padding:12px 14px; margin-bottom:10px; }',
      '.cmp-card h3 { margin:0 0 6px; font-size:12px; text-transform:uppercase; letter-spacing:.1em; color:var(--cmp-muted); }',
      '.cmp-card p { margin:0; color:var(--cmp-text); font-size:13px; white-space:pre-wrap; }',
      '.cmp-row { display:flex; justify-content:space-between; gap:12px; font-size:13px; margin:6px 0; }',
      '.cmp-row span:first-child { color:var(--cmp-muted); }',
      '.cmp-banner { font-size:12px; padding:10px 12px; border-radius:10px; margin-bottom:12px; }',
      '.cmp-banner-error { background:rgba(248,113,113,.12); color:var(--cmp-danger); border:1px solid rgba(248,113,113,.35); }',
      '.cmp-banner-ok { background:rgba(52,211,153,.1); color:#6ee7b7; border:1px solid rgba(52,211,153,.3); }',
      '.cmp-ticket { font-size:11px; color:var(--cmp-muted); margin-top:8px; word-break:break-all; }',
      '.cmp-analyzing { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; padding:24px 8px; text-align:center; color:var(--cmp-muted); font-size:13px; }',
      '.cmp-pulse { width:44px;height:44px;border-radius:50%;border:3px solid rgba(56,189,248,.25);border-top-color:var(--cmp-accent);animation:cmpSpin .9s linear infinite;}',
      '@keyframes cmpSpin { to { transform: rotate(360deg); } }',
    ].join('');
  }

  function getShellHtml() {
    return [
      '<div class="cmp-layer">',
      '  <button type="button" class="cmp-fab" id="cmpFab" aria-label="Open change request" title="Request a change">+</button>',
      '  <div class="cmp-panel" id="cmpPanel" role="dialog" aria-modal="true" aria-labelledby="cmpTitle">',
      '    <div class="cmp-head">',
      '      <h2 id="cmpTitle">Change request</h2>',
      '      <button type="button" class="cmp-close" id="cmpClose" aria-label="Close">&times;</button>',
      '    </div>',
      '    <div class="cmp-body" id="cmpBody"></div>',
      '  </div>',
      '</div>',
    ].join('');
  }

  function wireUi(root) {
    var fab = root.querySelector('#cmpFab');
    var panel = root.querySelector('#cmpPanel');
    var closeBtn = root.querySelector('#cmpClose');
    var bodyEl = root.querySelector('#cmpBody');

    fab.addEventListener('click', function () {
      panel.classList.add('cmp-open');
      renderStage(bodyEl, getState());
    });
    closeBtn.addEventListener('click', function () {
      panel.classList.remove('cmp-open');
    });

    bodyEl.addEventListener('click', function (ev) {
      var t = ev.target;
      if (t && t.id === 'cmpSubmitRequest') submitRequest(bodyEl);
      if (t && t.id === 'cmpContinueToCost') continueToCost(bodyEl);
      if (t && t.id === 'cmpApproveBuild') approveBuild(bodyEl);
      if (t && t.id === 'cmpNewRequest') resetSession(bodyEl);
    });
  }

  function getState() {
    try {
      var raw = localStorage.getItem(STORAGE_SESSION);
      if (raw) {
        var s = JSON.parse(raw);
        if (s.stage === 2 && s.preview) s.stage = 4;
        return s;
      }
    } catch (e) {}
    return { stage: 1, description: '', preview: null, buildOk: false, questions: null };
  }

  function setState(next) {
    localStorage.setItem(STORAGE_SESSION, JSON.stringify(next));
  }

  function getCookie(name) {
    var parts = ('; ' + document.cookie).split('; ' + name + '=');
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
    return '';
  }

  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie =
      name +
      '=' +
      encodeURIComponent(value) +
      ';path=/;expires=' +
      d.toUTCString() +
      ';SameSite=Lax';
  }

  function clearCookie(name) {
    document.cookie = name + '=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT;SameSite=Lax';
  }

  function getTicketId() {
    try {
      var fromLs = localStorage.getItem(STORAGE_TICKET);
      if (fromLs) return fromLs;
    } catch (e) {}
    return getCookie(STORAGE_TICKET) || '';
  }

  function setTicketId(id) {
    try {
      if (id) localStorage.setItem(STORAGE_TICKET, id);
      else localStorage.removeItem(STORAGE_TICKET);
    } catch (e) {}
    if (id) setCookie(STORAGE_TICKET, id, 90);
    else clearCookie(STORAGE_TICKET);
  }

  function hydrateFromStorage(root) {
    var bodyEl = root.querySelector('#cmpBody');
    var tid = getTicketId();
    if (!tid) return;

    fetch(cmpActionUrl('ticket-get', 'id=' + encodeURIComponent(tid)))
      .then(function (r) {
        if (!r.ok) throw new Error('Ticket not found');
        return r.json();
      })
      .then(function () {
        var st = getState();
        if (st.stage < 3 && st.description && !st.questions) st.stage = 1;
        setState(st);
        if (bodyEl && root.querySelector('#cmpPanel').classList.contains('cmp-open')) {
          renderStage(bodyEl, getState());
        }
      })
      .catch(function () {
        setTicketId('');
        setState({ stage: 1, description: '', preview: null, buildOk: false, questions: null });
        if (bodyEl && root.querySelector('#cmpPanel').classList.contains('cmp-open')) {
          renderStage(bodyEl, getState());
        }
      });
  }

  function resetSession(bodyEl) {
    setTicketId('');
    setState({ stage: 1, description: '', preview: null, buildOk: false, questions: null });
    renderStage(bodyEl, getState());
  }

  function stripMdBold(s) {
    return String(s || '').replace(/\*\*(.+?)\*\*/g, '$1');
  }

  function renderStage(bodyEl, state) {
    var err = state.error || '';
    var banner = err
      ? '<div class="cmp-banner cmp-banner-error" role="alert">' + escapeHtml(err) + '</div>'
      : '';

    if (state.stage === 1) {
      bodyEl.innerHTML =
        banner +
        '<div class="cmp-stage-label">Stage 1 — Describe the change</div>' +
        '<label class="cmp-stage-label" for="cmpDesc" style="text-transform:none;letter-spacing:0;color:var(--cmp-text);font-size:13px;">What do you want to change?</label>' +
        '<textarea id="cmpDesc" class="cmp-textarea" placeholder="Be specific: page, behavior, deadline, constraints…">' +
        escapeHtml(state.description || '') +
        '</textarea>' +
        '<button type="button" class="cmp-btn cmp-btn-primary" id="cmpSubmitRequest">Submit &amp; analyze</button>' +
        ticketFooter();
      return;
    }

    if (state.stage === 3 && state.questions && state.questions.length >= 3) {
      var qs = state.questions
        .slice(0, 3)
        .map(function (q, i) {
          return (
            '<div class="cmp-card"><h3>Question ' +
            (i + 1) +
            '</h3><p>' +
            escapeHtml(q) +
            '</p></div>'
          );
        })
        .join('');
      bodyEl.innerHTML =
        banner +
        '<div class="cmp-stage-label">Clarification</div>' +
        '<p style="margin:0 0 12px;color:var(--cmp-muted);font-size:13px;">Review these prompts—then continue to the cost and impact estimate.</p>' +
        qs +
        '<button type="button" class="cmp-btn cmp-btn-primary" id="cmpContinueToCost">Continue to estimate</button>' +
        '<button type="button" class="cmp-btn cmp-btn-ghost" id="cmpNewRequest">Start over</button>' +
        ticketFooter();
      return;
    }

    if (state.stage === 4 && state.preview) {
      var p = state.preview;
      var imp = p.impact || {};
      var cost = p.cost || {};
      var risks = (imp.technical_risks || [])
        .map(function (r) {
          return '• ' + r.area + ' (' + r.severity + '): ' + r.mitigation;
        })
        .join('\n');
      bodyEl.innerHTML =
        banner +
        '<div class="cmp-stage-label">AI analysis &amp; cost</div>' +
        '<div class="cmp-card"><h3>Impact</h3><p>' +
        escapeHtml(stripMdBold(imp.summary || '')) +
        '</p></div>' +
        '<div class="cmp-card"><h3>Risks</h3><p>' +
        escapeHtml(risks || '—') +
        '</p></div>' +
        '<div class="cmp-card"><h3>Cost</h3>' +
        '<div class="cmp-row"><span>Full market value (audit)</span><span>$' +
        formatMoney(cost.full_market_value_usd) +
        ' USD</span></div>' +
        '<div class="cmp-row"><span>Your price' +
        (cost.is_demo ? ' (demo)' : '') +
        '</span><span>$' +
        formatMoney(cost.displayed_client_usd) +
        ' USD</span></div></div>' +
        '<button type="button" class="cmp-btn cmp-btn-primary" id="cmpApproveBuild">Approve &amp; start build</button>' +
        '<button type="button" class="cmp-btn cmp-btn-ghost" id="cmpNewRequest">Start over</button>' +
        ticketFooter();
      return;
    }

    if (state.stage === 5) {
      bodyEl.innerHTML =
        (state.buildOk
          ? '<div class="cmp-banner cmp-banner-ok">Build approved. Workflow updated in Baserow; sandbox branch automation runs next.</div>'
          : banner) +
        '<div class="cmp-stage-label">Complete</div>' +
        '<p style="margin:0;color:var(--cmp-muted);font-size:13px;">Your change request is recorded. You can open a new request anytime.</p>' +
        '<button type="button" class="cmp-btn cmp-btn-primary" id="cmpNewRequest">New request</button>' +
        ticketFooter();
      return;
    }

    resetSession(bodyEl);
  }

  function ticketFooter() {
    var tid = getTicketId();
    return tid ? '<p class="cmp-ticket">Ticket ID: ' + escapeHtml(tid) + '</p>' : '';
  }

  function renderAnalyzing(bodyEl) {
    bodyEl.innerHTML =
      '<div class="cmp-analyzing" role="status" aria-live="polite">' +
      '<div class="cmp-pulse" aria-hidden="true"></div>' +
      '<div><strong style="color:var(--cmp-text);">AI is analyzing…</strong><br />Preparing clarification questions.</div>' +
      '</div>';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatMoney(n) {
    var x = Number(n);
    if (isNaN(x)) return '—';
    return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function submitRequest(bodyEl) {
    var ta = bodyEl.querySelector('#cmpDesc');
    var description = ta ? ta.value.trim() : '';
    if (!description) {
      var st = getState();
      st.error = 'Please describe what you want to change.';
      setState(st);
      renderStage(bodyEl, st);
      return;
    }

    var st0 = getState();
    st0.error = '';
    st0.description = description;
    setState(st0);

    renderAnalyzing(bodyEl);

    fetch(cmpActionUrl('ticket-create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: description,
        client_id: CONFIG.clientId || undefined,
      }),
    })
      .then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) throw new Error(j.error || 'Ticket create failed');
          return j;
        });
      })
      .then(function (created) {
        var ticketId = created.ticket_id;
        setTicketId(ticketId);
        return fetch(cmpActionUrl('ai-interview'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: description }),
        }).then(function (r) {
          return r.json().then(function (j) {
            if (!r.ok) throw new Error(j.error || 'Interview failed');
            return j;
          });
        });
      })
      .then(function (interview) {
        var qs = interview.questions;
        if (!qs || qs.length < 3) throw new Error('Invalid clarification response');
        var next = getState();
        next.stage = 3;
        next.description = description;
        next.questions = [qs[0], qs[1], qs[2]];
        next.preview = null;
        next.error = '';
        setState(next);
        renderStage(bodyEl, next);
      })
      .catch(function (e) {
        var next = getState();
        next.error = e.message || 'Request failed';
        next.stage = 1;
        next.description = description;
        next.questions = null;
        setState(next);
        renderStage(bodyEl, next);
      });
  }

  function continueToCost(bodyEl) {
    var st = getState();
    var description = (st.description || '').trim();
    var tid = getTicketId();
    if (!description || !tid) {
      st.error = 'Missing request or ticket. Start over.';
      setState(st);
      renderStage(bodyEl, st);
      return;
    }

    var btn = bodyEl.querySelector('#cmpContinueToCost');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Loading estimate…';
    }

    fetch(cmpActionUrl('costing-preview'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: description,
        ticketId: tid,
        is_demo: CONFIG.isDemo,
        tier: CONFIG.tier,
      }),
    })
      .then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) throw new Error(j.error || 'Costing preview failed');
          return j;
        });
      })
      .then(function (preview) {
        var next = getState();
        next.stage = 4;
        next.preview = preview;
        next.error = '';
        setState(next);
        renderStage(bodyEl, next);
      })
      .catch(function (e) {
        var next = getState();
        next.error = e.message || 'Costing preview failed';
        setState(next);
        renderStage(bodyEl, next);
      });
  }

  function approveBuild(bodyEl) {
    var tid = getTicketId();
    if (!tid) {
      var st = getState();
      st.error = 'Missing ticket id.';
      setState(st);
      renderStage(bodyEl, st);
      return;
    }

    var btn = bodyEl.querySelector('#cmpApproveBuild');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Approving…';
    }

    fetch(cmpActionUrl('approve-build'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id: tid }),
    })
      .then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) throw new Error(j.error || 'Approve failed');
          return j;
        });
      })
      .then(function () {
        var next = getState();
        next.stage = 5;
        next.buildOk = true;
        next.error = '';
        setState(next);
        renderStage(bodyEl, next);
      })
      .catch(function (e) {
        var next = getState();
        next.error = e.message || 'Approve failed';
        setState(next);
        renderStage(bodyEl, next);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
