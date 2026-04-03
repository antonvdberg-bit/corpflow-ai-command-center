/**
 * Lux client guide: applies tenant theme copy from /api/tenant/site + ?lang= (en|fr|ru).
 * Requires tenant-chrome.js (sets cf-tenant-skin). Runs on cf-tenant-site event or after short delay.
 */
(function () {
  function langFromQuery(site) {
    try {
      const q = new URLSearchParams(window.location.search).get('lang');
      const raw = (q || '').trim().toLowerCase();
      const allowed = Array.isArray(site.languages) ? site.languages.map(String) : ['en', 'fr', 'ru'];
      if (allowed.includes(raw)) return raw;
      const d = site.lang_default ? String(site.lang_default).toLowerCase() : 'en';
      return allowed.includes(d) ? d : 'en';
    } catch {
      return 'en';
    }
  }

  function pickGuide(site, lang) {
    const enG =
      site.i18n && site.i18n.en && site.i18n.en.guide && typeof site.i18n.en.guide === 'object'
        ? site.i18n.en.guide
        : {};
    if (lang === 'en') return enG;
    const loc =
      site.i18n && site.i18n[lang] && site.i18n[lang].guide && typeof site.i18n[lang].guide === 'object'
        ? site.i18n[lang].guide
        : {};
    return { ...enG, ...loc };
  }

  function set(id, text) {
    const el = document.getElementById(id);
    if (!el || text == null) return;
    el.textContent = String(text);
  }

  function apply(site) {
    const lang = langFromQuery(site);
    document.documentElement.lang = lang;
    const G = pickGuide(site, lang);
    const meta = site.meta && typeof site.meta === 'object' ? site.meta : {};

    if (meta.guide_title) document.title = String(meta.guide_title);
    set('gKicker', G.kicker);
    set('gTitle', G.title);
    set('gLead', G.lead);
    set('gStep1h', G.step1_h);
    set('gStep1p', G.step1_p);
    set('gStep1btn', G.step1_btn);
    set('gStep1tip', G.step1_tip);
    set('gStep2h', G.step2_h);
    set('gStep2p', G.step2_p);
    set('gStep2btn', G.step2_btn);
    set('gEx1', G.ex1);
    set('gEx2', G.ex2);
    set('gEx3', G.ex3);
    set('gLoginh', G.login_h);
    set('gLoginp', G.login_p);
    set('gLoginbtn', G.login_btn);
    set('gLogintip', G.login_tip);
    set('gAssetsh', G.assets_h);
    set('gAssetsp', G.assets_p);
    set('gAli1', G.assets_li1);
    set('gAli2', G.assets_li2);
    set('gAli3', G.assets_li3);
    set('gAli4', G.assets_li4);
    set('gAli5', G.assets_li5);
    set('gAssetsnote', G.assets_note);
    set('gFooter', G.footer);

    const fr = document.getElementById('gLangFr');
    const ru = document.getElementById('gLangRu');
    const en = document.getElementById('gLangEn');
    if (fr) fr.href = '/lux-guide?lang=fr';
    if (ru) ru.href = '/lux-guide?lang=ru';
    if (en) en.href = '/lux-guide?lang=en';
    if (fr) fr.setAttribute('aria-current', lang === 'fr' ? 'true' : 'false');
    if (ru) ru.setAttribute('aria-current', lang === 'ru' ? 'true' : 'false');
    if (en) en.setAttribute('aria-current', lang === 'en' ? 'true' : 'false');
  }

  function run(detail) {
    if (!detail || !detail.site) return;
    apply(detail.site);
  }

  window.addEventListener('cf-tenant-site', (e) => run(e.detail));

  window.addEventListener('DOMContentLoaded', () => {
    const start = Date.now();
    const iv = setInterval(() => {
      if (window.__cfTenantSiteDetail) {
        clearInterval(iv);
        run(window.__cfTenantSiteDetail);
      } else if (Date.now() - start > 6000) {
        clearInterval(iv);
      }
    }, 40);
  });
})();
