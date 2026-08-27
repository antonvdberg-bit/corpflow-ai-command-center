/**
 * Pure Café International preview helpers (no Node fs — safe for shared imports).
 */

import { buildWhatsAppMeHref } from '../whatsapp/href.js';

export const CAFE_INTERNATIONAL_PREVIEW_BASE = '/demo/cafe-international';

/** Live Menu-page published Sheet — same CSV the GoHighLevel /menu-page loads. */
export const CAFE_INTERNATIONAL_LIVE_MENU_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTB9dndns4LTTfWMfKJfIMebDrwq02J15PLNbQ4JDVysSuiQcXQjl43QDb2GpHPZ9jMsF_thjrSOyZi/pub?output=csv';

export const CAFE_INTERNATIONAL_LIVE_MENU_PAGE_URL =
  'https://cafeinternational.net/menu-page';

/** Approved primary navigation (#855 / #860). Steaks & Grill + Contact stay as routes, not primary nav. */
export const CAFE_INTERNATIONAL_PREVIEW_NAV = Object.freeze([
  { href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}`, label: 'Home' },
  { href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu`, label: 'Menu' },
  { href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/visit`, label: 'Visit' },
  { href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/takeaway`, label: 'Takeaway' },
  { href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/about`, label: 'About' },
]);

/** Exact menu-page intro wording (#855). */
export const CAFE_INTERNATIONAL_MENU_INTRO =
  'Browse the menu by section. For takeaway, order the items you want on WhatsApp or by phone — website chat is for table bookings.';

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
  return buildWhatsAppMeHref(
    phone,
    prefill || 'Hello Café International — I would like to order takeaway.',
  );
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
 * Format a Sheet-grounded starting price for category merchandising.
 * Always uses "from" so multi-size items are not implied as a fixed SKU.
 */
export function formatCafeInternationalFromPrice(priceMur) {
  const n = Number(priceMur);
  if (!Number.isFinite(n)) return '';
  return `from Rs ${n.toLocaleString('en-US')}`;
}

function listCafeInternationalPricedItems(menu) {
  const categories = Array.isArray(menu?.categories) ? menu.categories : [];
  const rows = [];
  for (const cat of categories) {
    for (const item of cat.items || []) {
      if (item.price_mur == null || !Number.isFinite(Number(item.price_mur))) continue;
      rows.push({
        category: cat.name,
        categoryId: cat.id,
        name: String(item.name || ''),
        description: String(item.description || ''),
        price_mur: Number(item.price_mur),
      });
    }
  }
  return rows;
}

function minCafeInternationalPrice(items, predicate) {
  let min = null;
  for (const item of items) {
    if (!predicate(item)) continue;
    if (min == null || item.price_mur < min) min = item.price_mur;
  }
  return min;
}

function buildCafeInternationalCategoryFavourite(def, items) {
  const price_mur = minCafeInternationalPrice(items, def.match);
  if (price_mur == null) {
    throw new Error(`Café favourite "${def.id}" has no Sheet-grounded price`);
  }
  if (def.expected_from_mur != null && price_mur !== def.expected_from_mur) {
    throw new Error(
      `Café favourite "${def.id}" expected from Rs ${def.expected_from_mur} but Sheet min is ${price_mur}`,
    );
  }
  return {
    id: def.id,
    categoryId: def.categoryId,
    category: def.categoryLabel,
    name: def.label,
    description: def.description,
    price_mur,
    price_display: formatCafeInternationalFromPrice(price_mur),
    href: def.href,
    merchandising: 'category',
  };
}

/** Homepage / sit-down owner favourites — category-led, Sheet-grounded (#885). */
export const CAFE_INTERNATIONAL_HOME_FAVOURITE_DEFS = Object.freeze([
  {
    id: 'beef-steaks',
    label: 'Beef Steaks',
    description: 'Fillet, Ribeye & Sirloin',
    categoryLabel: 'From our Grill',
    categoryId: 'from-our-grill',
    href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu#from-our-grill`,
    expected_from_mur: 1050,
    match: (item) =>
      item.categoryId === 'from-our-grill' &&
      /^Beef Steak (Fillet|Ribeye|Sirloin)\b/i.test(item.name),
  },
  {
    id: 'steak-and-ribs',
    label: 'Steak & Ribs',
    description: 'Pork ribs paired with beef steak',
    categoryLabel: 'Platters',
    categoryId: 'platters',
    href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu#platters`,
    expected_from_mur: 1450,
    match: (item) =>
      item.categoryId === 'platters' && /^Pork Ribs and Beef\b/i.test(item.name),
  },
  {
    id: 'pork-ribs',
    label: 'Pork Ribs',
    description: 'Flame-grilled pork ribs — sizes vary',
    categoryLabel: 'From our Grill',
    categoryId: 'from-our-grill',
    href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu#from-our-grill`,
    expected_from_mur: 1150,
    match: (item) =>
      item.categoryId === 'from-our-grill' && /^Pork Ribs\b/i.test(item.name),
  },
  {
    id: 'burgers',
    label: 'Burgers',
    description: 'Beef, lamb, chicken, steak, fish & vegetarian options',
    categoryLabel: 'Build a Burger',
    categoryId: 'build-a-burger',
    href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu#build-a-burger`,
    expected_from_mur: 180,
    match: (item) => item.categoryId === 'build-a-burger',
  },
  {
    id: 'wings-and-rings',
    label: 'Buffalo Wings & Onion Rings',
    description: 'Shareable starters — portions vary',
    categoryLabel: 'Starters',
    categoryId: 'starters',
    href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu#starters`,
    expected_from_mur: 200,
    match: (item) =>
      item.categoryId === 'starters' &&
      (/^Buffalo Wings$/i.test(item.name) || /^Onion Rings$/i.test(item.name)),
  },
  {
    id: 'chicken-fillet',
    label: 'Chicken Fillet',
    description: 'Flame-grilled chicken fillet plate',
    categoryLabel: 'From our Grill',
    categoryId: 'from-our-grill',
    href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu#from-our-grill`,
    expected_from_mur: 650,
    match: (item) =>
      item.categoryId === 'from-our-grill' && /^Chicken Fillet$/i.test(item.name),
  },
]);

/** Takeaway owner favourites — plural/category-led, Sheet-grounded (#885). */
export const CAFE_INTERNATIONAL_TAKEAWAY_FAVOURITE_DEFS = Object.freeze([
  {
    id: 'burgers',
    label: 'Burgers',
    description: 'Build-your-own options for collection',
    categoryLabel: 'Build a Burger',
    categoryId: 'build-a-burger',
    href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu#build-a-burger`,
    expected_from_mur: 180,
    match: (item) => item.categoryId === 'build-a-burger',
  },
  {
    id: 'steaks',
    label: 'Steaks',
    description: 'Fillet, Ribeye & Sirloin — sizes vary',
    categoryLabel: 'From our Grill',
    categoryId: 'from-our-grill',
    href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu#from-our-grill`,
    expected_from_mur: 1050,
    match: (item) =>
      item.categoryId === 'from-our-grill' &&
      /^Beef Steak (Fillet|Ribeye|Sirloin)\b/i.test(item.name),
  },
  {
    id: 'buffalo-wings',
    label: 'Buffalo Wings',
    description: 'Starter portion for takeaway',
    categoryLabel: 'Starters',
    categoryId: 'starters',
    href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu#starters`,
    expected_from_mur: 250,
    match: (item) =>
      item.categoryId === 'starters' && /^Buffalo Wings$/i.test(item.name),
  },
  {
    id: 'onion-rings',
    label: 'Onion Rings',
    description: 'Crispy starter for collection',
    categoryLabel: 'Starters',
    categoryId: 'starters',
    href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu#starters`,
    expected_from_mur: 200,
    match: (item) =>
      item.categoryId === 'starters' && /^Onion Rings$/i.test(item.name),
  },
  {
    id: 'greek-salads',
    label: 'Greek Salads',
    description: 'Small & large — starting at Small',
    categoryLabel: 'Starters',
    categoryId: 'starters',
    href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu#starters`,
    expected_from_mur: 260,
    match: (item) =>
      item.categoryId === 'starters' && /^Greek Salad$/i.test(item.name),
  },
  {
    id: 'pork-ribs',
    label: 'Pork Ribs',
    description: 'Flame-grilled pork ribs — sizes vary',
    categoryLabel: 'From our Grill',
    categoryId: 'from-our-grill',
    href: `${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu#from-our-grill`,
    expected_from_mur: 1150,
    match: (item) =>
      item.categoryId === 'from-our-grill' && /^Pork Ribs\b/i.test(item.name),
  },
]);

/**
 * Homepage featured favourites — owner category merchandising (#885).
 * Starting prices are the minimum matching Sheet row; never a fixed SKU size.
 */
export function selectCafeInternationalHomeMenuPreview(menu, limit = 6) {
  const items = listCafeInternationalPricedItems(menu);
  return CAFE_INTERNATIONAL_HOME_FAVOURITE_DEFS.slice(0, limit).map((def) =>
    buildCafeInternationalCategoryFavourite(def, items),
  );
}

/**
 * Takeaway featured picks — owner category merchandising for collection (#885).
 * WhatsApp/phone + collection only; presentation order is owner-facing, not a
 * sales ranking claim.
 */
export function selectCafeInternationalTakeawayFeatured(menu, limit = 6) {
  const items = listCafeInternationalPricedItems(menu);
  return CAFE_INTERNATIONAL_TAKEAWAY_FAVOURITE_DEFS.slice(0, limit).map((def) =>
    buildCafeInternationalCategoryFavourite(def, items),
  );
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
