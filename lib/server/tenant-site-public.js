/**
 * Tenant public site API: read website draft for the current host/tenant.
 *
 * Route: GET /api/tenant/site
 *
 * Returns a tenant-scoped JSON draft (no cross-tenant access).
 */

import { PrismaClient } from '@prisma/client';

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
export function defaultPublicSite(tenantId, host, opts) {
  const slugBrand = tenantId ? str(tenantId).replace(/[-_]+/g, ' ') : 'CorpFlow';
  const orgLabel = (opts && opts.dbName && str(opts.dbName)) || slugBrand;
  return {
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

  const tenantId = resolveTenantIdFromReq(req);
  if (!tenantId) {
    return res.status(200).json({ ok: true, tenant_id: null, tenant: null, site: null });
  }

  const host = str(req?.corpflowContext?.host);
  const prisma = new PrismaClient();
  try {
    const [persona, tenantRow] = await Promise.all([
      prisma.tenantPersona.findUnique({
        where: { tenantId },
        select: { personaJson: true },
      }),
      prisma.tenant.findUnique({
        where: { tenantId },
        select: { tenantId: true, name: true, slug: true, fqdn: true },
      }),
    ]);

    const tenantPayload = {
      tenant_id: tenantId,
      name: tenantRow?.name != null ? str(tenantRow.name) : null,
      slug: tenantRow?.slug != null ? str(tenantRow.slug) : null,
      fqdn: tenantRow?.fqdn != null ? str(tenantRow.fqdn) : null,
    };

    const pj = persona?.personaJson && typeof persona.personaJson === 'object' ? persona.personaJson : {};
    const draft =
      pj && typeof pj === 'object' && pj.website_draft && typeof pj.website_draft === 'object'
        ? pj.website_draft
        : null;

    const base = defaultPublicSite(tenantId, host, { dbName: tenantPayload.name });
    const site = mergeSiteDraft(base, draft || {});
    return res.status(200).json({ ok: true, tenant_id: tenantId, tenant: tenantPayload, site });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: 'TENANT_SITE_READ_FAILED', detail: msg });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

