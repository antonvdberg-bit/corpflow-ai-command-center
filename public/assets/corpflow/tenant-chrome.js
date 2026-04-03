/**
 * Host-scoped tenant chrome: reads GET /api/tenant/site and applies theme + optional titles.
 * Use on static pages (/change, /lux-guide) that should match the tenant marketing draft.
 *
 * Sets on document.documentElement: --cf-accent, --cf-accent-rgb, --cf-tenant-bg, --cf-tenant-text, --cf-tenant-muted
 * Adds body class: cf-tenant-skin
 * Dispatches: window dispatchEvent(new CustomEvent('cf-tenant-site', { detail: { site, tenant_id } }))
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

  async function init() {
    try {
      const r = await fetch('/api/tenant/site', { method: 'GET' });
      const j = await r.json().catch(() => ({}));
      if (!j.tenant_id || !j.site) return;

      const site = j.site;
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

      if (meta.console_title) {
        document.title = String(meta.console_title);
      } else if (hero.title) {
        document.title = `${String(hero.title)} · Change Console`;
      }

      const brand = hero.title ? String(hero.title) : '';
      if (brand) {
        setIfPresent('cfTenantBrandText', brand.toUpperCase());
        showEl('cfTenantBrand');
      }

      if (meta.console_heading) {
        setIfPresent('cfConsoleHeadline', String(meta.console_heading));
      }
      if (meta.console_tagline != null && String(meta.console_tagline).trim() !== '') {
        setIfPresent('cfConsoleTagline', String(meta.console_tagline));
        showEl('cfConsoleTaglineWrap');
      }

      const detail = { site, tenant_id: j.tenant_id };
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
