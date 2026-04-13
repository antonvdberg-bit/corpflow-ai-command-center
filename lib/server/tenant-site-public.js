/**
 * Tenant public site API: read website draft for the current host/tenant.
 *
 * Route: GET /api/tenant/site
 *
 * Returns a tenant-scoped JSON draft (no cross-tenant access).
 */

import { PrismaClient } from '@prisma/client';

import { cfg } from './runtime-config.js';
import { isTenantPreviewSecretConfigured, verifyTenantPreviewTokenDetailed } from './tenant-preview-token.js';

function str(v) {
  return v != null ? String(v).trim() : '';
}

function resolveTenantIdFromReq(req) {
  try {
    const ctx = req?.corpflowContext;
    if (!ctx || ctx.surface !== 'tenant') return null;
    const tid = str(ctx.tenant_id);
    return tid || null;
  } catch {
    return null;
  }
}

/**
 * Signed `cf_preview` from query (Vercel rewrites merge original query with `__path`).
 *
 * @param {import('http').IncomingMessage & { query?: Record<string, unknown> }} req
 * @returns {string}
 */
export function parseCfPreviewFromReq(req) {
  try {
    const q = req?.query;
    if (q && typeof q === 'object') {
      const v = q.cf_preview;
      const raw = Array.isArray(v) ? v[0] : v;
      if (raw != null && str(raw) !== '') return str(raw);
    }
    const urlRaw = req?.url || '';
    const u = urlRaw.startsWith('http') ? new URL(urlRaw) : new URL(urlRaw, 'http://localhost');
    return str(u.searchParams.get('cf_preview'));
  } catch {
    return '';
  }
}

/**
 * Gated debug for `/api/tenant/site` (add `cf_debug=1` when `CORPFLOW_TENANT_SITE_DEBUG=true`).
 *
 * @param {import('http').IncomingMessage & { query?: Record<string, unknown> }} req
 * @returns {boolean}
 */
export function parseCfDebugTenantSiteFromReq(req) {
  try {
    const q = req?.query;
    if (q && typeof q === 'object') {
      const v = q.cf_debug;
      const raw = Array.isArray(v) ? v[0] : v;
      if (String(raw || '').trim() === '1') return true;
    }
    const urlRaw = req?.url || '';
    const u = urlRaw.startsWith('http') ? new URL(urlRaw) : new URL(urlRaw, 'http://localhost');
    return u.searchParams.get('cf_debug') === '1';
  } catch {
    return false;
  }
}

function tenantSiteResolutionDebugEnabled(req) {
  return String(cfg('CORPFLOW_TENANT_SITE_DEBUG', '')).toLowerCase() === 'true' && parseCfDebugTenantSiteFromReq(req);
}

/**
 * Default FR/RU (and EN guide) copy for Lux-style tenant sites. Editors can patch via `website_draft.i18n`.
 *
 * @returns {Record<string, Record<string, unknown>>}
 */
function defaultLuxI18n() {
  return {
    en: {
      nav: { home: 'Home', changes: 'Request changes', guide: 'Guide' },
      lang: { fr: 'French', ru: 'Russian' },
      form: {
        protocol: 'Inquiry protocol',
        name_ph: 'IDENTIFIER (NAME)',
        email_ph: 'SECURE EMAIL',
        region: 'Region focus (optional)',
        region_fr: 'France / French-speaking Europe',
        region_za: 'South Africa',
        region_ee: 'Eastern Europe',
        region_ru: 'Russia',
        budget: 'Budget (USD, optional)',
        message_ph: 'CORE INTENT / REQUIREMENTS',
        submit: 'Initiate handoff',
        msg_ok: 'High-net-worth enquiries only. We respond within 1 business day.',
        msg_submit: 'Submitting…',
        msg_thanks: 'Thank you. We will contact you shortly.',
        msg_fail: 'Could not submit. Please try again.',
      },
      cards: {
        ph_title: 'Upcoming properties',
        ph_body:
          'We will populate this with developments, units, and availability as soon as visuals (renders, floorplans, videos) are received.',
      },
      footer: { powered: 'Powered by CorpFlow · Draft preview for rapid iteration in the Change Console' },
      guide: {
        kicker: 'CLIENT GUIDE',
        title: 'Lux Mauritius — request changes',
        lead:
          'Welcome. This is a preview website. You can ask for edits (text, colors, photos, layout, languages, lead forms) and we’ll update it quickly.',
        step1_h: 'Step 1 — Open your preview website',
        step1_p: 'Open the preview in your browser:',
        step1_btn: 'Open preview website',
        step1_tip: 'Tip: you can share this link with your team.',
        step2_h: 'Examples — what you can ask for',
        step2_p: 'After you open the change area, you can describe updates in your own words. For example:',
        step2_btn: 'Open Change Console',
        ex1:
          '“Change the homepage headline to: Discover exclusive luxury properties in Mauritius.”',
        ex2:
          '“Add a lead form with fields: name, email, phone, country, budget range, preferred language, message.”',
        ex3: '“Add French and Russian versions. Keep English as default.”',
        assets_h: 'What we need from you (to sell properties)',
        assets_p:
          'To build a high-quality marketing platform for luxury property, we need strong visual materials:',
        assets_li1: 'Photos (highest resolution available)',
        assets_li2: 'Architectural renders / CAD exports',
        assets_li3: 'Short videos (walkthroughs, drone, progress updates)',
        assets_li4: 'Floorplans and unit availability (max 10 units per development)',
        assets_li5: 'Key value points per development (why buy, timeline, milestones)',
        assets_note:
          'If needed, we can enhance image/video quality (cropping, color correction, compression) to improve conversions.',
        footer: 'Powered by CorpFlow · Draft preview for rapid iteration',
      },
    },
    fr: {
      nav: { home: 'Accueil', changes: 'Demander des modifications', guide: 'Guide' },
      lang: { fr: 'Français', ru: 'Russe' },
      hero: {
        headline: 'Île Maurice somptueuse',
        tagline: 'Découvrez des propriétés de luxe exclusives à Maurice',
        cta_label: 'Prochains biens',
      },
      form: {
        protocol: 'Protocole de demande',
        name_ph: 'IDENTIFIANT (NOM)',
        email_ph: 'E-MAIL SÉCURISÉ',
        region: 'Région d’intérêt (facultatif)',
        region_fr: 'France / Europe francophone',
        region_za: 'Afrique du Sud',
        region_ee: 'Europe de l’Est',
        region_ru: 'Russie',
        budget: 'Budget (USD, facultatif)',
        message_ph: 'INTENTION / EXIGENCES',
        submit: 'Lancer la prise de contact',
        msg_ok: 'Demandes grandes fortunes uniquement. Réponse sous 1 jour ouvré.',
        msg_submit: 'Envoi en cours…',
        msg_thanks: 'Merci. Nous vous contacterons rapidement.',
        msg_fail: 'Envoi impossible. Réessayez.',
      },
      cards: {
        ph_title: 'Prochains biens',
        ph_body:
          'Nous afficherons programmes, lots et disponibilité dès réception des visuels (rendus, plans, vidéos).',
      },
      footer: {
        powered:
          'Propulsé par CorpFlow · Aperçu brouillon pour itérer rapidement dans la Change Console',
      },
      sections: {
        band_title: 'Acheter directement au promoteur',
        about: {
          title: 'Pourquoi Maurice ?',
          body:
            'Les acheteurs choisissent de plus en plus Maurice pour sa beauté naturelle, son climat et son cadre de vie, ainsi que pour un cadre d’investissement attractif.',
        },
      },
      guide: {
        kicker: 'GUIDE CLIENT',
        title: 'Lux Maurice — demander des modifications',
        lead:
          'Bienvenue. Ceci est un site d’aperçu. Vous pouvez demander des changements (textes, couleurs, photos, mise en page, langues, formulaires) et nous les ferons rapidement.',
        step1_h: 'Étape 1 — Ouvrir le site d’aperçu',
        step1_p: 'Ouvrez l’aperçu dans votre navigateur :',
        step1_btn: 'Ouvrir le site d’aperçu',
        step1_tip: 'Vous pouvez partager ce lien avec votre équipe.',
        step2_h: 'Exemples — ce que vous pouvez demander',
        step2_p: 'Une fois l’espace de demandes ouvert, décrivez vos changements avec vos mots. Par exemple :',
        step2_btn: 'Ouvrir la Change Console',
        ex1:
          '« Modifier le titre d’accueil : Découvrez des propriétés de luxe exclusives à Maurice. »',
        ex2:
          '« Ajouter un formulaire : nom, e-mail, téléphone, pays, budget, langue préférée, message. »',
        ex3: '« Ajouter le français et le russe. Garder l’anglais par défaut. »',
        assets_h: 'Ce dont nous avons besoin (vente immobilière)',
        assets_p:
          'Pour une plateforme marketing haut de gamme, nous avons besoin de visuels solides :',
        assets_li1: 'Photos (haute résolution)',
        assets_li2: 'Rendus architecturaux / exports CAO',
        assets_li3: 'Vidéos courtes (visites, drone, chantier)',
        assets_li4: 'Plans et disponibilité des lots (max. 10 lots par programme)',
        assets_li5: 'Arguments clés par programme (pourquoi acheter, calendrier, jalons)',
        assets_note:
          'Si besoin, nous pouvons optimiser images/vidéos (recadrage, couleur, compression) pour la conversion.',
        footer: 'Propulsé par CorpFlow · Aperçu brouillon pour itération rapide',
      },
    },
    ru: {
      nav: { home: 'Главная', changes: 'Запросить изменения', guide: 'Гид' },
      lang: { fr: 'Французский', ru: 'Русский' },
      hero: {
        headline: 'Роскошный Маврикий',
        tagline: 'Эксклюзивная недвижимость премиум-класса на Маврикии',
        cta_label: 'Скоро в продаже',
      },
      form: {
        protocol: 'Форма запроса',
        name_ph: 'ИДЕНТИФИКАТОР (ИМЯ)',
        email_ph: 'E-MAIL',
        region: 'Регион (необязательно)',
        region_fr: 'Франция / франкоязычная Европа',
        region_za: 'ЮАР',
        region_ee: 'Восточная Европа',
        region_ru: 'Россия',
        budget: 'Бюджет (USD, необязательно)',
        message_ph: 'ЦЕЛЬ / ТРЕБОВАНИЯ',
        submit: 'Отправить запрос',
        msg_ok: 'Только запросы HNW. Ответ в течение одного рабочего дня.',
        msg_submit: 'Отправка…',
        msg_thanks: 'Спасибо. Мы свяжемся с вами.',
        msg_fail: 'Не удалось отправить. Повторите попытку.',
      },
      cards: {
        ph_title: 'Будущие объекты',
        ph_body:
          'Мы заполним блок после получения визуалов (рендеры, планы, видео), юнитов и наличия.',
      },
      footer: {
        powered:
          'На базе CorpFlow · Черновой предпросмотр для быстрых итераций в Change Console',
      },
      sections: {
        band_title: 'Покупка напрямую у застройщика',
        about: {
          title: 'Почему Маврикий?',
          body:
            'Премиальная недвижимость на Маврикии привлекает из-за природы, климата, качества жизни и выгодных условий для инвестиций.',
        },
      },
      guide: {
        kicker: 'ГИД ДЛЯ КЛИЕНТА',
        title: 'Lux Mauritius — как запросить изменения',
        lead:
          'Добро пожаловать. Это предпросмотр сайта. Вы можете запросить правки (тексты, цвета, фото, вёрстку, языки, формы) — мы обновим быстро.',
        step1_h: 'Шаг 1 — Откройте предпросмотр',
        step1_p: 'Откройте сайт в браузере:',
        step1_btn: 'Открыть предпросмотр',
        step1_tip: 'Ссылкой можно поделиться с командой.',
        step2_h: 'Примеры — что можно запросить',
        step2_p: 'После открытия раздела изменений опишите задачу своими словами. Например:',
        step2_btn: 'Открыть Change Console',
        ex1:
          '« Изменить заголовок главной: Откройте для себя эксклюзивную недвижимость на Маврикии. »',
        ex2:
          '« Добавить форму: имя, email, телефон, страна, бюджет, язык, сообщение. »',
        ex3: '« Добавить французский и русский. Английский по умолчанию. »',
        assets_h: 'Что нужно от вас (продажа недвижимости)',
        assets_p: 'Для сильного маркетинга премиум-класса нужны качественные материалы:',
        assets_li1: 'Фото (максимальное разрешение)',
        assets_li2: 'Архитектурные рендеры / CAD',
        assets_li3: 'Короткие видео (прогулки, дрон, ход строительства)',
        assets_li4: 'Планировки и доступность лотов (до 10 лотов на объект)',
        assets_li5: 'Ключевые аргументы по каждому объекту (зачем покупать, сроки, этапы)',
        assets_note:
          'При необходимости улучшим фото/видео (кадрирование, цвет, сжатие) для конверсии.',
        footer: 'На базе CorpFlow · Черновой предпросмотр для быстрых итераций',
      },
    },
  };
}

function mergeI18nBlocks(baseI18n, draftI18n) {
  if (!draftI18n || typeof draftI18n !== 'object') return baseI18n || {};
  const b = baseI18n && typeof baseI18n === 'object' ? baseI18n : {};
  const out = { ...b };
  for (const lang of Object.keys(draftI18n)) {
    const patch = draftI18n[lang];
    const prev = b[lang] && typeof b[lang] === 'object' ? b[lang] : {};
    if (!patch || typeof patch !== 'object') continue;
    const merged = { ...prev, ...patch };
    const nested = ['nav', 'hero', 'form', 'guide', 'footer', 'cards', 'sections'];
    for (const k of nested) {
      if (patch[k] && typeof patch[k] === 'object') {
        merged[k] = { ...(prev[k] && typeof prev[k] === 'object' ? prev[k] : {}), ...patch[k] };
      }
    }
    if (merged.sections && patch.sections && patch.sections.about && typeof patch.sections.about === 'object') {
      const psa = prev.sections && typeof prev.sections === 'object' && prev.sections.about ? prev.sections.about : {};
      merged.sections.about = { ...psa, ...patch.sections.about };
    }
    out[lang] = merged;
  }
  return out;
}

/**
 * Default marketing draft when persona has no / partial `website_draft`.
 * `dbName` comes from Postgres `tenants.name` so we do not hardcode per-client labels here.
 *
 * @param {string | null} tenantId
 * @param {string} host
 * @param {{ dbName?: string | null }} [opts]
 */
/**
 * Tenants listed in CORPFLOW_ORG_TENANT_IDS get neutral CorpFlow styling instead of the Lux demo palette.
 *
 * @param {string | null} tenantId
 * @returns {boolean}
 */
function useNeutralOrgSiteDefaults(tenantId) {
  const raw = cfg('CORPFLOW_ORG_TENANT_IDS', 'corpflowai,root');
  const set = new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
  return set.has(String(tenantId || '').trim());
}

export function defaultPublicSite(tenantId, host, opts) {
  const slugBrand = tenantId ? str(tenantId).replace(/[-_]+/g, ' ') : 'CorpFlow';
  const orgLabel = (opts && opts.dbName && str(opts.dbName)) || slugBrand;
  /** @type {Record<string, unknown>} */
  const out = {
    tenant_id: tenantId || null,
    host: host || null,
    meta: {
      page_title: `${orgLabel} · Preview`,
      /** Browser tab for /change when set; otherwise derived from hero.title in client. */
      console_title: null,
      /** Optional override for main H1 on Change Console (default: "Change Console"). */
      console_heading: null,
      /** Optional second line under the hero description on /change. */
      console_tagline: null,
      guide_title: `${orgLabel} · How to request changes`,
      /** `/login` tab title when on tenant host */
      login_title: null,
    },
    languages: ['en', 'fr', 'ru'],
    lang_default: 'en',
    i18n: defaultLuxI18n(),
    theme: {
      primary: '#d4af37', // gold
      accent: '#ffffff',
      background: '#0a0a0a',
      surface: '#0f0f10',
      text: '#f5f5f5',
      muted: '#bdbdbd',
    },
    hero: {
      /** Nav / logo wordmark (uppercased in UI); overridden by `website_draft.hero`. */
      title: orgLabel,
      headline: 'Welcome',
      tagline: host ? `Preview experience — ${host}` : 'Marketing preview',
      cta_label: 'Upcoming Properties',
      cta_href: '#enquire',
    },
    sections: {
      band_title: 'Buy direct from the developer',
      about: {
        title: 'Why work with us',
        body:
          'This is a starter draft. Replace copy in the site editor or request changes in the Change Console.',
      },
      services: { title: 'Upcoming properties', items: [] },
      contact: { title: 'Contact', email: null, phone: null, website: host ? `https://${host}` : null },
    },
    media: { hero_image_url: null, gallery: [], logo_url: null },
  };

  if (useNeutralOrgSiteDefaults(tenantId)) {
    out.languages = ['en'];
    out.lang_default = 'en';
    out.theme = {
      primary: '#38bdf8',
      accent: '#e2e8f0',
      background: '#020617',
      surface: '#0f172a',
      text: '#f1f5f9',
      muted: '#94a3b8',
    };
    out.i18n = mergeI18nBlocks(defaultLuxI18n(), {
      en: {
        guide: {
          title: `${orgLabel} — how to request changes`,
          lead:
            'Use the Change Console to describe updates to your preview site. Your operator or automation applies approved changes.',
        },
        nav: { home: 'Home', changes: 'Request changes', guide: 'Guide' },
        footer: { powered: 'Powered by CorpFlow' },
      },
    });
    const hero = /** @type {Record<string, unknown>} */ (out.hero);
    hero.cta_label = 'Get started';
    const sections = /** @type {Record<string, unknown>} */ (out.sections);
    sections.band_title = 'Built with CorpFlow';
    const about = /** @type {Record<string, unknown>} */ (sections.about);
    about.title = 'About this preview';
    about.body =
      'This is a neutral starter draft for your organization tenant. Customize content in the site editor or open a change request.';
    const services = /** @type {Record<string, unknown>} */ (sections.services);
    services.title = 'Highlights';
  }

  return out;
}

/**
 * Deep-merge draft into defaults so partial saves never wipe nested hero/sections.
 *
 * @param {Record<string, unknown>} base
 * @param {Record<string, unknown>} draft
 * @returns {Record<string, unknown>}
 */
export function mergeSiteDraft(base, draft) {
  if (!draft || typeof draft !== 'object') return base;
  const out = { ...base, ...draft };
  if (draft.meta && typeof draft.meta === 'object') {
    out.meta = { ...(base.meta && typeof base.meta === 'object' ? base.meta : {}), ...draft.meta };
  }
  if (draft.theme && typeof draft.theme === 'object') {
    out.theme = { ...(base.theme && typeof base.theme === 'object' ? base.theme : {}), ...draft.theme };
  }
  if (draft.hero && typeof draft.hero === 'object') {
    out.hero = { ...(base.hero && typeof base.hero === 'object' ? base.hero : {}), ...draft.hero };
  }
  if (draft.media && typeof draft.media === 'object') {
    out.media = { ...(base.media && typeof base.media === 'object' ? base.media : {}), ...draft.media };
  }
  if (draft.sections && typeof draft.sections === 'object') {
    const bSec = base.sections && typeof base.sections === 'object' ? base.sections : {};
    const dSec = draft.sections;
    out.sections = { ...bSec, ...dSec };
    if (dSec.about && typeof dSec.about === 'object') {
      out.sections.about = {
        ...(bSec.about && typeof bSec.about === 'object' ? bSec.about : {}),
        ...dSec.about,
      };
    }
    if (dSec.services && typeof dSec.services === 'object') {
      out.sections.services = {
        ...(bSec.services && typeof bSec.services === 'object' ? bSec.services : {}),
        ...dSec.services,
      };
    }
    if (dSec.contact && typeof dSec.contact === 'object') {
      out.sections.contact = {
        ...(bSec.contact && typeof bSec.contact === 'object' ? bSec.contact : {}),
        ...dSec.contact,
      };
    }
  }
  if (draft.i18n && typeof draft.i18n === 'object') {
    out.i18n = mergeI18nBlocks(base.i18n, draft.i18n);
  }
  return out;
}

export default async function tenantSitePublicHandler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tenantId = resolveTenantIdFromReq(req);
  const host = str(req?.corpflowContext?.host);
  const ctx = req?.corpflowContext;
  /** @type {{ cf_preview_param_present: boolean, preview_verify_reason: string | null, tenant_missing_after_ok_token: boolean }} */
  const previewTrace = {
    cf_preview_param_present: false,
    preview_verify_reason: null,
    tenant_missing_after_ok_token: false,
  };
  const prisma = new PrismaClient();
  try {
    if (!tenantId) {
      const cfPreview = parseCfPreviewFromReq(req);
      previewTrace.cf_preview_param_present = Boolean(cfPreview);
      if (cfPreview) {
        const detailed = verifyTenantPreviewTokenDetailed(cfPreview);
        if (detailed.ok) {
          const tExists = await prisma.tenant.findUnique({
            where: { tenantId: detailed.tenantId },
            select: { tenantId: true },
          });
          if (tExists?.tenantId) tenantId = str(tExists.tenantId);
          else previewTrace.tenant_missing_after_ok_token = true;
        } else {
          previewTrace.preview_verify_reason = detailed.reason;
        }
      }
    }

    if (!tenantId) {
      /** @type {Record<string, unknown>} */
      const empty = { ok: true, tenant_id: null, tenant: null, site: null };
      if (tenantSiteResolutionDebugEnabled(req)) {
        const reason = previewTrace.tenant_missing_after_ok_token
          ? 'TOKEN_OK_BUT_TENANT_ROW_MISSING'
          : previewTrace.preview_verify_reason
            ? `PREVIEW_TOKEN_${previewTrace.preview_verify_reason}`
            : 'NO_HOST_MAPPING_AND_NO_VALID_PREVIEW_TOKEN';
        empty.tenant_resolution = {
          host: host || null,
          surface: ctx?.surface ?? null,
          context_tenant_id: str(ctx?.tenant_id) || null,
          corpflow_tenant_id_source: req.corpflowTenantIdSource != null ? String(req.corpflowTenantIdSource) : null,
          cf_preview_param_present: previewTrace.cf_preview_param_present,
          preview_secret_configured_on_this_deployment: isTenantPreviewSecretConfigured(),
          fallback_reason: reason,
        };
      }
      return res.status(200).json(empty);
    }

    const tenantRow = await prisma.tenant.findUnique({
      where: { tenantId },
      select: { tenantId: true, name: true, slug: true, fqdn: true },
    });
    if (!tenantRow) {
      return res.status(200).json({
        ok: true,
        tenant_id: null,
        tenant: null,
        site: null,
        reason: 'TENANT_NOT_REGISTERED',
        hint: 'Host resolved to a tenant id with no row in tenants — complete onboarding before public branding.',
      });
    }

    const persona = await prisma.tenantPersona.findUnique({
      where: { tenantId },
      select: { personaJson: true },
    });

    const tenantPayload = {
      tenant_id: tenantId,
      name: tenantRow.name != null ? str(tenantRow.name) : null,
      slug: tenantRow.slug != null ? str(tenantRow.slug) : null,
      fqdn: tenantRow.fqdn != null ? str(tenantRow.fqdn) : null,
    };

    const pj = persona?.personaJson && typeof persona.personaJson === 'object' ? persona.personaJson : {};
    const draft =
      pj && typeof pj === 'object' && pj.website_draft && typeof pj.website_draft === 'object'
        ? pj.website_draft
        : null;

    const base = defaultPublicSite(tenantId, host, { dbName: tenantPayload.name });
    const site = mergeSiteDraft(base, draft || {});

    if (tenantId === 'luxe-maurice') {
      site.meta = site.meta && typeof site.meta === 'object' ? site.meta : {};
      site.meta.page_title = 'Lux Mauritius · Private previews';
      site.hero = site.hero && typeof site.hero === 'object' ? site.hero : {};
      site.hero.headline = 'Exclusive Mauritius residences — curated for you.';
      site.hero.tagline = 'Private previews and priority access for qualified buyers.';
      site.hero.cta_label = 'Request a private preview';
    }

    return res.status(200).json({ ok: true, tenant_id: tenantId, tenant: tenantPayload, site });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: 'TENANT_SITE_READ_FAILED', detail: msg });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

