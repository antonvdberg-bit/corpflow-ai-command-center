/**
 * Pure Café International preview helpers (no Node fs — safe for shared imports).
 */

export const CAFE_INTERNATIONAL_PREVIEW_BASE = '/demo/cafe-international';

/** Live Menu-page published Sheet — same CSV the GoHighLevel /menu-page loads. */
export const CAFE_INTERNATIONAL_LIVE_MENU_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTB9dndns4LTTfWMfKJfIMebDrwq02J15PLNbQ4JDVysSuiQcXQjl43QDb2GpHPZ9jMsF_thjrSOyZi/pub?output=csv';

export const CAFE_INTERNATIONAL_LIVE_MENU_PAGE_URL =
  'https://cafeinternational.net/menu-page';

export const CAFE_INTERNATIONAL_PREVIEW_NAV = Object.freeze([
  { href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}`, label: 'Home' },
  { href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu`, label: 'Menu' },
  { href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/steaks-and-grill`, label: 'Steaks & grill' },
  { href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/takeaway`, label: 'Takeaway' },
  { href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/about`, label: 'About' },
  { href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/visit`, label: 'Visit' },
  { href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/contact`, label: 'Contact' },
]);

const DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DAY_LABEL = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export function cafeInternationalTelHref(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return `tel:${digits}`;
}

export function cafeInternationalWhatsAppHref(phone, prefill) {
  const digits = String(phone || '').replace(/\D/g, '');
  const text = encodeURIComponent(
    prefill || 'Hello Café International — I would like to order takeaway.',
  );
  return `https://wa.me/${digits}?text=${text}`;
}

export function cafeInternationalChatBridgeHref() {
  return 'https://cafeinternational.net/';
}

export function formatCafeInternationalHours(openingHours) {
  const src = openingHours && typeof openingHours === 'object' ? openingHours : {};
  return DAY_ORDER.map((day) => ({
    label: DAY_LABEL[day],
    hours: String(src[day] || '').trim() || '—',
  }));
}

export function buildCafeInternationalBookingActions(truth) {
  const phone = String(truth.public_phone || '');
  const channels = Array.isArray(truth.booking_channels) ? truth.booking_channels : [];
  const actions = [];
  if (channels.includes('phone')) {
    actions.push({
      id: 'booking-phone',
      label: 'Call to book',
      href: cafeInternationalTelHref(phone),
      kind: 'phone',
    });
  }
  if (channels.includes('website_chat')) {
    actions.push({
      id: 'booking-chat',
      label: 'Book via website chat',
      href: cafeInternationalChatBridgeHref(),
      kind: 'chat_bridge',
    });
  }
  return actions;
}

export function buildCafeInternationalTakeawayActions(truth) {
  const phone = String(truth.public_phone || '');
  const channels = Array.isArray(truth.takeaway_channels) ? truth.takeaway_channels : [];
  const actions = [];
  if (channels.includes('whatsapp')) {
    actions.push({
      id: 'takeaway-whatsapp',
      label: 'WhatsApp takeaway',
      href: cafeInternationalWhatsAppHref(phone),
      kind: 'whatsapp',
    });
  }
  if (channels.includes('phone')) {
    actions.push({
      id: 'takeaway-phone',
      label: 'Call for takeaway',
      href: cafeInternationalTelHref(phone),
      kind: 'phone',
    });
  }
  return actions;
}

export function assertCafeInternationalJourneyRules(truth) {
  const booking = buildCafeInternationalBookingActions(truth);
  const takeaway = buildCafeInternationalTakeawayActions(truth);
  const takeawayKinds = takeaway.map((a) => a.kind);
  if (truth.takeaway_chat_allowed === true) {
    throw new Error('takeaway_chat_allowed must be false for this packet');
  }
  if (takeawayKinds.includes('chat_bridge') || takeawayKinds.includes('chat')) {
    throw new Error('takeaway must not route through website chat');
  }
  if (!booking.some((a) => a.kind === 'phone')) {
    throw new Error('booking must include phone');
  }
  if (!booking.some((a) => a.kind === 'chat_bridge')) {
    throw new Error('booking must include website chat bridge');
  }
  if (!takeaway.some((a) => a.kind === 'whatsapp')) {
    throw new Error('takeaway must include WhatsApp');
  }
  return { booking, takeaway };
}

export function buildCafeInternationalRestaurantJsonLd(truth, pageUrl) {
  const hours = truth.opening_hours && typeof truth.opening_hours === 'object' ? truth.opening_hours : {};
  const specs = DAY_ORDER.map((day) => {
    const raw = String(hours[day] || '');
    const [opens, closes] = raw.split('-');
    if (!opens || !closes) return null;
    return {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAY_LABEL[day],
      opens: opens.trim(),
      closes: closes.trim(),
    };
  }).filter(Boolean);

  const menuUrl = `${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu`;
  const absoluteMenuUrl = String(pageUrl || '').includes('://')
    ? new URL(menuUrl, pageUrl).toString()
    : `https://corpflowai.com${menuUrl}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: String(truth.public_name || 'Café International'),
    url: pageUrl,
    telephone: String(truth.public_phone || ''),
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Royal Road',
      addressLocality: 'Trou aux Biches',
      addressCountry: 'MU',
    },
    openingHoursSpecification: specs,
    servesCuisine: ['Grill'],
    hasMenu: absoluteMenuUrl,
    menu: absoluteMenuUrl,
  };
}

/**
 * Crawlable Menu JSON-LD from the fixture categories (no invented prices).
 * @param {object} truth
 * @param {object} menu
 * @param {string} pageUrl
 */
export function buildCafeInternationalMenuJsonLd(truth, menu, pageUrl) {
  const categories = Array.isArray(menu?.categories) ? menu.categories : [];
  const sections = categories
    .filter((cat) => cat && cat.id !== 'extras')
    .map((cat) => ({
      '@type': 'MenuSection',
      name: String(cat.name || ''),
      hasMenuItem: (Array.isArray(cat.items) ? cat.items : []).slice(0, 40).map((item) => {
        const entry = {
          '@type': 'MenuItem',
          name: String(item.name || ''),
        };
        if (item.description) entry.description = String(item.description);
        if (item.price_mur != null && Number.isFinite(Number(item.price_mur))) {
          entry.offers = {
            '@type': 'Offer',
            price: Number(item.price_mur),
            priceCurrency: 'MUR',
          };
        }
        return entry;
      }),
    }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: `${String(truth.public_name || 'Café International')} menu`,
    url: pageUrl,
    hasMenuSection: sections,
  };
}

/**
 * Homepage sample rows — real fixture items, not invented.
 * Prefers grill / starters / burgers for appetite-led preview.
 */
export function selectCafeInternationalHomeMenuPreview(menu, limit = 6) {
  const preferredIds = ['from-our-grill', 'starters', 'build-a-burger', 'platters'];
  const categories = Array.isArray(menu?.categories) ? menu.categories : [];
  const byId = new Map(categories.map((c) => [c.id, c]));
  const rows = [];
  for (const id of preferredIds) {
    const cat = byId.get(id);
    if (!cat) continue;
    for (const item of cat.items || []) {
      if (item.price_mur == null) continue;
      rows.push({
        category: cat.name,
        categoryId: cat.id,
        name: item.name,
        description: item.description || '',
        price_mur: item.price_mur,
        price_display: item.price_display || `Rs ${item.price_mur}`,
      });
      if (rows.length >= limit) return rows;
    }
  }
  return rows;
}

export function buildCafeInternationalPreviewViewModel(truth, menu) {
  const { booking, takeaway } = assertCafeInternationalJourneyRules(truth);
  return {
    truth,
    menu,
    bookingActions: booking,
    takeawayActions: takeaway,
    hoursRows: formatCafeInternationalHours(
      /** @type {Record<string, string>} */ (truth.opening_hours || {}),
    ),
    nav: CAFE_INTERNATIONAL_PREVIEW_NAV,
    basePath: CAFE_INTERNATIONAL_PREVIEW_BASE,
  };
}
