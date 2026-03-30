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
 * Optional: data-cmp-locale="es" (or rely on navigator.language) for UI + clarification language.
 */
(function () {
  'use strict';

  function normalizeBubbleLocale(raw) {
    var s = String(raw || '')
      .trim()
      .toLowerCase()
      .replace(/_/g, '-');
    if (!s) return 'en';
    if (s.indexOf('es') === 0) return 'es';
    if (s.indexOf('fr') === 0) return 'fr';
    if (s.indexOf('de') === 0) return 'de';
    if (s.indexOf('pt') === 0) return 'pt';
    return 'en';
  }

  /**
   * Client UI strings (CMP bubble). Server-side clarification questions use the same locale via `ai-interview`.
   * @type {Record<string, Record<string, string>>}
   */
  var BUBBLE_UI = {
    en: {
      fabOpen: 'Request a change',
      dialogTitle: 'Change request',
      stage1Title: 'Stage 1 — Describe the change',
      stage1Label: 'What do you want to change?',
      placeholderDesc: 'Be specific: page, behavior, deadline, constraints…',
      submitAnalyze: 'Submit & analyze',
      stage3Title: 'Clarification',
      stage3Hint:
        'Review these prompts—then continue to the cost and impact estimate.',
      questionHeading: 'Question {n}',
      continueEstimate: 'Continue to estimate',
      startOver: 'Start over',
      stage4Title: 'AI analysis & cost',
      impact: 'Impact',
      risks: 'Risks',
      cost: 'Cost',
      fullMarket: 'Full market value (audit)',
      yourPrice: 'Your price',
      demoTag: ' (demo)',
      approveBuild: 'Approve & start build',
      approving: 'Approving…',
      stage5Ok: 'Build approved. Workflow updated in Baserow; sandbox branch automation runs next.',
      stage5Title: 'Complete',
      stage5Hint: 'Your change request is recorded. You can open a new request anytime.',
      newRequest: 'New request',
      analyzingTitle: 'AI is analyzing…',
      analyzingHint: 'Preparing clarification questions.',
      errNeedDesc: 'Please describe what you want to change.',
      errMissingTicket: 'Missing request or ticket. Start over.',
      loadingEstimate: 'Loading estimate…',
    },
    es: {
      fabOpen: 'Solicitar un cambio',
      dialogTitle: 'Solicitud de cambio',
      stage1Title: 'Etapa 1 — Describa el cambio',
      stage1Label: '¿Qué desea cambiar?',
      placeholderDesc: 'Sea específico: página, comportamiento, plazo, restricciones…',
      submitAnalyze: 'Enviar y analizar',
      stage3Title: 'Aclaraciones',
      stage3Hint: 'Revise estas preguntas y luego continúe al coste y al impacto.',
      questionHeading: 'Pregunta {n}',
      continueEstimate: 'Continuar al estimado',
      startOver: 'Empezar de nuevo',
      stage4Title: 'Análisis y coste (IA)',
      impact: 'Impacto',
      risks: 'Riesgos',
      cost: 'Coste',
      fullMarket: 'Valor de mercado completo (auditoría)',
      yourPrice: 'Su precio',
      demoTag: ' (demo)',
      approveBuild: 'Aprobar e iniciar build',
      approving: 'Aprobando…',
      stage5Ok: 'Build aprobado. Baserow actualizado; automatización de rama sandbox en curso.',
      stage5Title: 'Listo',
      stage5Hint: 'Su solicitud quedó registrada. Puede abrir una nueva cuando quiera.',
      newRequest: 'Nueva solicitud',
      analyzingTitle: 'La IA está analizando…',
      analyzingHint: 'Preparando preguntas de aclaración.',
      errNeedDesc: 'Describa qué desea cambiar.',
      errMissingTicket: 'Falta la solicitud o el ticket. Empiece de nuevo.',
      loadingEstimate: 'Cargando estimación…',
    },
    fr: {
      fabOpen: 'Demander un changement',
      dialogTitle: 'Demande de changement',
      stage1Title: 'Étape 1 — Décrire le changement',
      stage1Label: 'Que souhaitez-vous modifier ?',
      placeholderDesc: 'Soyez précis : page, comportement, délai, contraintes…',
      submitAnalyze: 'Envoyer et analyser',
      stage3Title: 'Clarifications',
      stage3Hint: 'Lisez ces questions, puis passez au coût et à l’impact.',
      questionHeading: 'Question {n}',
      continueEstimate: "Continuer vers l'estimation",
      startOver: 'Recommencer',
      stage4Title: 'Analyse IA & coût',
      impact: 'Impact',
      risks: 'Risques',
      cost: 'Coût',
      fullMarket: 'Valeur marché complète (audit)',
      yourPrice: 'Votre prix',
      demoTag: ' (démo)',
      approveBuild: 'Approuver et lancer le build',
      approving: 'Approbation…',
      stage5Ok: 'Build approuvé. Baserow mis à jour ; branche sandbox en cours.',
      stage5Title: 'Terminé',
      stage5Hint: 'Votre demande est enregistrée. Vous pouvez en ouvrir une autre.',
      newRequest: 'Nouvelle demande',
      analyzingTitle: "L'IA analyse…",
      analyzingHint: 'Préparation des questions de clarification.',
      errNeedDesc: 'Décrivez ce que vous voulez modifier.',
      errMissingTicket: 'Demande ou ticket manquant. Recommencez.',
      loadingEstimate: "Chargement de l'estimation…",
    },
    de: {
      fabOpen: 'Änderung anfragen',
      dialogTitle: 'Änderungsanfrage',
      stage1Title: 'Schritt 1 — Änderung beschreiben',
      stage1Label: 'Was möchten Sie ändern?',
      placeholderDesc: 'Bitte konkret: Seite, Verhalten, Deadline, Rahmenbedingungen…',
      submitAnalyze: 'Senden & analysieren',
      stage3Title: 'Klärung',
      stage3Hint: 'Fragen prüfen—dann weiter zu Kosten und Auswirkung.',
      questionHeading: 'Frage {n}',
      continueEstimate: 'Weiter zur Schätzung',
      startOver: 'Neu starten',
      stage4Title: 'KI-Analyse & Kosten',
      impact: 'Auswirkung',
      risks: 'Risiken',
      cost: 'Kosten',
      fullMarket: 'Voller Marktwert (Audit)',
      yourPrice: 'Ihr Preis',
      demoTag: ' (Demo)',
      approveBuild: 'Freigeben & Build starten',
      approving: 'Wird freigegeben…',
      stage5Ok: 'Build freigegeben. Baserow aktualisiert; Sandbox-Branch-Automation folgt.',
      stage5Title: 'Fertig',
      stage5Hint: 'Ihre Anfrage ist gespeichert. Sie können jederzeit eine neue starten.',
      newRequest: 'Neue Anfrage',
      analyzingTitle: 'KI analysiert…',
      analyzingHint: 'Klärungsfragen werden vorbereitet.',
      errNeedDesc: 'Bitte beschreiben Sie die gewünschte Änderung.',
      errMissingTicket: 'Anfrage oder Ticket fehlt. Neu starten.',
      loadingEstimate: 'Schätzung wird geladen…',
    },
    pt: {
      fabOpen: 'Solicitar alteração',
      dialogTitle: 'Solicitação de alteração',
      stage1Title: 'Etapa 1 — Descreva a alteração',
      stage1Label: 'O que você quer mudar?',
      placeholderDesc: 'Seja específico: página, comportamento, prazo, restrições…',
      submitAnalyze: 'Enviar e analisar',
      stage3Title: 'Esclarecimentos',
      stage3Hint: 'Revise as perguntas—depois continue para custo e impacto.',
      questionHeading: 'Pergunta {n}',
      continueEstimate: 'Continuar para estimativa',
      startOver: 'Recomeçar',
      stage4Title: 'Análise IA e custo',
      impact: 'Impacto',
      risks: 'Riscos',
      cost: 'Custo',
      fullMarket: 'Valor de mercado total (auditoria)',
      yourPrice: 'Seu preço',
      demoTag: ' (demo)',
      approveBuild: 'Aprovar e iniciar build',
      approving: 'Aprovando…',
      stage5Ok: 'Build aprovado. Baserow atualizado; automação do branch sandbox em seguida.',
      stage5Title: 'Concluído',
      stage5Hint: 'Sua solicitação foi registrada. Você pode abrir outra quando quiser.',
      newRequest: 'Nova solicitação',
      analyzingTitle: 'A IA está analisando…',
      analyzingHint: 'Preparando perguntas de esclarecimento.',
      errNeedDesc: 'Descreva o que deseja alterar.',
      errMissingTicket: 'Falta solicitação ou ticket. Recomece.',
      loadingEstimate: 'Carregando estimativa…',
    },
  };

  var STORAGE_TICKET = 'cmp_ticket_id';
  var STORAGE_SESSION = 'cmp_session_v1';
  var STORAGE_ADMIN_TOKEN = 'cmp_admin_session_token';

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

    var locAttr = (s && s.getAttribute('data-cmp-locale')) || '';
    var locNav = '';
    try {
      locNav = (typeof navigator !== 'undefined' && (navigator.language || navigator.userLanguage)) || '';
    } catch (eLoc) {}
    var locale = normalizeBubbleLocale(locAttr || locNav);

    return { apiBase: apiBase, clientId: clientId, isDemo: isDemo, tier: tier, locale: locale };
  }

  var CONFIG = readConfig();

  function t(key) {
    var pack = BUBBLE_UI[CONFIG.locale] || BUBBLE_UI.en;
    var v = pack[key] || BUBBLE_UI.en[key] || key;
    return v;
  }

  function tq(key, n) {
    return String(t(key)).replace(/\{n\}/g, String(n));
  }

  function readAdminToken() {
    // 1) Prefer persisted admin token (recommended).
    try {
      var t = localStorage.getItem(STORAGE_ADMIN_TOKEN);
      if (t) return t;
    } catch (e0) {}

    // 2) Optional: allow embedding token via script tag attribute.
    try {
      var s = document.currentScript;
      if (!s) s = document.querySelector('script[src*="bubble.js"]');
      if (s) {
        var a =
          s.getAttribute('data-cmp-session-token') ||
          s.getAttribute('data-cmp-admin-session-token') ||
          s.getAttribute('data-cmp-admin-token') ||
          '';
        if (a) return a;
      }
    } catch (e1) {}

    return '';
  }

  var ADMIN_SESSION_TOKEN = readAdminToken();

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
      '  <button type="button" class="cmp-fab" id="cmpFab" aria-label="' +
        escapeHtml(t('fabOpen')) +
        '" title="' +
        escapeHtml(t('fabOpen')) +
        '">+</button>',
      '  <div class="cmp-panel" id="cmpPanel" role="dialog" aria-modal="true" aria-labelledby="cmpTitle">',
      '    <div class="cmp-head">',
      '      <h2 id="cmpTitle">' + escapeHtml(t('dialogTitle')) + '</h2>',
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

    fetch(cmpActionUrl('ticket-get', 'id=' + encodeURIComponent(tid)), {
      headers: {
        'x-session-token': ADMIN_SESSION_TOKEN || '',
        'x-client-id': CONFIG.clientId || '',
      },
    })
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
        '<div class="cmp-stage-label">' +
        escapeHtml(t('stage1Title')) +
        '</div>' +
        '<label class="cmp-stage-label" for="cmpDesc" style="text-transform:none;letter-spacing:0;color:var(--cmp-text);font-size:13px;">' +
        escapeHtml(t('stage1Label')) +
        '</label>' +
        '<textarea id="cmpDesc" class="cmp-textarea" placeholder="' +
        escapeHtml(t('placeholderDesc')) +
        '">' +
        escapeHtml(state.description || '') +
        '</textarea>' +
        '<button type="button" class="cmp-btn cmp-btn-primary" id="cmpSubmitRequest">' +
        escapeHtml(t('submitAnalyze')) +
        '</button>' +
        ticketFooter();
      return;
    }

    if (state.stage === 3 && state.questions && state.questions.length >= 3) {
      var qs = state.questions
        .slice(0, 3)
        .map(function (q, i) {
          return (
            '<div class="cmp-card"><h3>' +
            escapeHtml(tq('questionHeading', i + 1)) +
            '</h3><p>' +
            escapeHtml(q) +
            '</p></div>'
          );
        })
        .join('');
      bodyEl.innerHTML =
        banner +
        '<div class="cmp-stage-label">' +
        escapeHtml(t('stage3Title')) +
        '</div>' +
        '<p style="margin:0 0 12px;color:var(--cmp-muted);font-size:13px;">' +
        escapeHtml(t('stage3Hint')) +
        '</p>' +
        qs +
        '<button type="button" class="cmp-btn cmp-btn-primary" id="cmpContinueToCost">' +
        escapeHtml(t('continueEstimate')) +
        '</button>' +
        '<button type="button" class="cmp-btn cmp-btn-ghost" id="cmpNewRequest">' +
        escapeHtml(t('startOver')) +
        '</button>' +
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
        '<div class="cmp-stage-label">' +
        escapeHtml(t('stage4Title')) +
        '</div>' +
        '<div class="cmp-card"><h3>' +
        escapeHtml(t('impact')) +
        '</h3><p>' +
        escapeHtml(stripMdBold(imp.summary || '')) +
        '</p></div>' +
        '<div class="cmp-card"><h3>' +
        escapeHtml(t('risks')) +
        '</h3><p>' +
        escapeHtml(risks || '—') +
        '</p></div>' +
        '<div class="cmp-card"><h3>' +
        escapeHtml(t('cost')) +
        '</h3>' +
        '<div class="cmp-row"><span>' +
        escapeHtml(t('fullMarket')) +
        '</span><span>$' +
        formatMoney(cost.full_market_value_usd) +
        ' USD</span></div>' +
        '<div class="cmp-row"><span>' +
        escapeHtml(t('yourPrice')) +
        (cost.is_demo ? escapeHtml(t('demoTag')) : '') +
        '</span><span>$' +
        formatMoney(cost.displayed_client_usd) +
        ' USD</span></div></div>' +
        '<button type="button" class="cmp-btn cmp-btn-primary" id="cmpApproveBuild">' +
        escapeHtml(t('approveBuild')) +
        '</button>' +
        '<button type="button" class="cmp-btn cmp-btn-ghost" id="cmpNewRequest">' +
        escapeHtml(t('startOver')) +
        '</button>' +
        ticketFooter();
      return;
    }

    if (state.stage === 5) {
      bodyEl.innerHTML =
        (state.buildOk
          ? '<div class="cmp-banner cmp-banner-ok">' + escapeHtml(t('stage5Ok')) + '</div>'
          : banner) +
        '<div class="cmp-stage-label">' +
        escapeHtml(t('stage5Title')) +
        '</div>' +
        '<p style="margin:0;color:var(--cmp-muted);font-size:13px;">' +
        escapeHtml(t('stage5Hint')) +
        '</p>' +
        '<button type="button" class="cmp-btn cmp-btn-primary" id="cmpNewRequest">' +
        escapeHtml(t('newRequest')) +
        '</button>' +
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
      '<div><strong style="color:var(--cmp-text);">' +
      escapeHtml(t('analyzingTitle')) +
      '</strong><br />' +
      escapeHtml(t('analyzingHint')) +
      '</div>' +
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
      st.error = t('errNeedDesc');
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
      headers: { 'Content-Type': 'application/json', 'x-session-token': ADMIN_SESSION_TOKEN || '' },
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
          headers: { 'Content-Type': 'application/json', 'x-session-token': ADMIN_SESSION_TOKEN || '' },
          body: JSON.stringify({ description: description, locale: CONFIG.locale }),
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
      st.error = t('errMissingTicket');
      setState(st);
      renderStage(bodyEl, st);
      return;
    }

    var btn = bodyEl.querySelector('#cmpContinueToCost');
    if (btn) {
      btn.disabled = true;
      btn.textContent = t('loadingEstimate');
    }

    fetch(cmpActionUrl('costing-preview'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': ADMIN_SESSION_TOKEN || '' },
      body: JSON.stringify({
        description: description,
        ticketId: tid,
        is_demo: CONFIG.isDemo,
        tier: CONFIG.tier,
        client_id: CONFIG.clientId || undefined,
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
    var st = getState();
    var tid = getTicketId();
    if (!tid) {
      st.error = 'Missing ticket id.';
      setState(st);
      renderStage(bodyEl, st);
      return;
    }

    var btn = bodyEl.querySelector('#cmpApproveBuild');
    if (btn) {
      btn.disabled = true;
      btn.textContent = t('approving');
    }

    fetch(cmpActionUrl('approve-build'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': ADMIN_SESSION_TOKEN || '' },
      body: JSON.stringify({
        ticket_id: tid,
        client_id: CONFIG.clientId || undefined,
        tier: CONFIG.tier,
        is_demo: CONFIG.isDemo,
        description: (st.description || '').trim(),
      }),
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

  async function verifyAndMaybeMount() {
    // Dormant Gate: keep bubble fully hidden until session token is verified.
    try {
      var token = ADMIN_SESSION_TOKEN || '';
      var r = await fetch(cmpActionUrl('session-verify', 'token=' + encodeURIComponent(token)), {
        method: 'GET',
      });
      if (r && r.ok) {
        var j = await r.json().catch(function () {
          return null;
        });
        if (j && j.ok) mount();
      }
    } catch (e) {
      // Stay hidden on any verification error.
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verifyAndMaybeMount);
  } else {
    verifyAndMaybeMount();
  }
})();
