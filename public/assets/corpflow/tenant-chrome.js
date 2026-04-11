/**
 * Host-scoped tenant chrome: reads GET /api/tenant/site and applies theme + optional titles.
 * Use on static pages (/change, /lux-guide, /login) that should match the tenant marketing draft.
 *
 * Sets on document.documentElement: --cf-accent, --cf-accent-rgb, --cf-tenant-bg, --cf-tenant-text, --cf-tenant-muted
 * Adds body class: cf-tenant-skin
 * Dispatches: window dispatchEvent(new CustomEvent('cf-tenant-site', { detail: { site, tenant_id, tenant } }))
 */
(function () {
  function hexToRgbTriplet(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return '212 175 55';
    const n = parseInt(m[1], 16);
    return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
  }

  function setIfPresent(id, text) {
    const el = document.getElementById(id);
    if (!el || text == null || String(text).trim() === '') return;
    el.textContent = String(text);
  }

  function showEl(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function pathKind() {
    try {
      const p = String(location.pathname || '').replace(/\/+$/, '') || '/';
      if (p === '/login' || p.endsWith('/login')) return 'login';
      if (p === '/change' || p.endsWith('/change')) return 'change';
      if (p === '/lux-guide' || p.endsWith('/lux-guide')) return 'guide';
      return 'other';
    } catch {
      return 'other';
    }
  }

  /** On tenant hosts, marketing languages (FR/RU) stay on `/` only — briefs stay in English here. */
  function lockChangeConsoleLocale() {
    const loc = document.getElementById('locale');
    if (!loc) return;
    const lbl = loc.closest('label');
    if (lbl && lbl.firstChild && lbl.firstChild.nodeType === Node.TEXT_NODE) {
      lbl.firstChild.textContent = 'Brief language ';
    }
    loc.innerHTML = '<option value="en">English</option>';
    loc.value = 'en';
    loc.disabled = true;
    if (!document.getElementById('localeTenantHint')) {
      const hint = document.createElement('div');
      hint.id = 'localeTenantHint';
      hint.className = 'text-[10px] text-slate-500 mt-1 leading-snug';
      hint.textContent =
        'This console uses English for tickets and chat. French/Russian for the public site are chosen on the homepage only.';
      const lbl = loc.closest('label');
      if (lbl) lbl.appendChild(hint);
    }
  }

  function tenantSiteApiUrl() {
    try {
      const p = new URLSearchParams(window.location.search).get('cf_preview');
      const t = p != null ? String(p).trim() : '';
      if (t) return '/api/tenant/site?cf_preview=' + encodeURIComponent(t);
    } catch (_) {}
    return '/api/tenant/site';
  }

  async function init() {
    try {
      const kindEarly = pathKind();
      if (kindEarly === 'login') {
        try {
          const cr = await fetch('/api/ui/context', { credentials: 'same-origin' });
          const cj = await cr.json().catch(() => ({}));
          if (String(cj.login_route || '') === 'onboarding') {
            document.documentElement.dataset.cfLoginMode = 'onboarding';
            document.body.classList.add('cf-login-onboarding');
            document.title = 'Workspace setup';
            return;
          }
        } catch (_) {
          /* fall through to tenant/site */
        }
      }
      const r = await fetch(tenantSiteApiUrl(), { method: 'GET' });
      const j = await r.json().catch(() => ({}));
      if (!j.tenant_id || !j.site) return;

      const site = j.site;
      const tenant = j.tenant && typeof j.tenant === 'object' ? j.tenant : null;
      const t = site.theme && typeof site.theme === 'object' ? site.theme : {};
      const primary = t.primary || '#d4af37';
      const bg = t.background || '#0a0a0a';
      const text = t.text || '#f5f5f5';
      const muted = t.muted || '#bdbdbd';
      const rgb = hexToRgbTriplet(primary);

      const root = document.documentElement;
      root.style.setProperty('--cf-accent', primary);
      root.style.setProperty('--cf-accent-rgb', rgb);
      root.style.setProperty('--cf-tenant-bg', bg);
      root.style.setProperty('--cf-tenant-text', text);
      root.style.setProperty('--cf-tenant-muted', muted);

      document.body.classList.add('cf-tenant-skin');

      const hero = site.hero && typeof site.hero === 'object' ? site.hero : {};
      const meta = site.meta && typeof site.meta === 'object' ? site.meta : {};
      const kind = pathKind();

      if (kind === 'login') {
        document.body.classList.add('cf-tenant-client-login');
        const simpleClient = document.getElementById('clientSimpleLogin');
        const isClientSimpleUi =
          document.documentElement.dataset.cfLoginMode === 'client' ||
          (simpleClient && !simpleClient.classList.contains('hidden'));
        const displayName =
          (tenant && tenant.name && String(tenant.name).trim()) ||
          (hero.title && String(hero.title).trim()) ||
          (j.tenant_id && String(j.tenant_id)) ||
          '';
        if (meta.login_title) {
          document.title = String(meta.login_title);
        } else if (isClientSimpleUi) {
          document.title = 'Log in';
        } else if (displayName) {
          document.title = `${displayName} · Login`;
        }
        if (!isClientSimpleUi) {
          const grid = document.getElementById('loginGrid');
          const fac = document.getElementById('loginFactoryColumn');
          if (fac) fac.classList.add('hidden');
          if (grid) {
            grid.classList.remove('md:grid-cols-2');
            grid.classList.add('md:grid-cols-1');
          }
        }
      } else if (kind === 'change') {
        const displayName =
          (tenant && tenant.name && String(tenant.name).trim()) ||
          (hero.title && String(hero.title).trim()) ||
          (j.tenant_id && String(j.tenant_id)) ||
          '';
        if (meta.console_title) {
          document.title = String(meta.console_title);
        } else if (displayName) {
          document.title = `${displayName} · Change Console`;
        }
        lockChangeConsoleLocale();
      } else if (kind === 'guide' && meta.guide_title) {
        document.title = String(meta.guide_title);
      }

      const brand =
        (tenant && tenant.name && String(tenant.name).trim()) ||
        (hero.title && String(hero.title).trim()) ||
        (j.tenant_id ? String(j.tenant_id) : '');
      if (brand && (kind === 'login' || kind === 'change' || kind === 'guide')) {
        setIfPresent('cfTenantBrandText', brand.toUpperCase());
        showEl('cfTenantBrand');
      }

      if (kind === 'change') {
        if (meta.console_heading) {
          setIfPresent('cfConsoleHeadline', String(meta.console_heading));
        }
        if (meta.console_tagline != null && String(meta.console_tagline).trim() !== '') {
          setIfPresent('cfConsoleTagline', String(meta.console_tagline));
          showEl('cfConsoleTaglineWrap');
        }
      }

      const detail = { site, tenant_id: j.tenant_id, tenant };
      window.__cfTenantSiteDetail = detail;
      window.dispatchEvent(new CustomEvent('cf-tenant-site', { detail }));
    } catch (_) {
      /* non-tenant or offline */
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
