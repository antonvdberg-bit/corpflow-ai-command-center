import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  assertCafeInternationalJourneyRules,
  buildCafeInternationalMenuJsonLd,
  buildCafeInternationalRestaurantJsonLd,
  buildCafeInternationalTakeawayActions,
  CAFE_INTERNATIONAL_MENU_INTRO,
  CAFE_INTERNATIONAL_PREVIEW_BASE,
  CAFE_INTERNATIONAL_PREVIEW_NAV,
  selectCafeInternationalHomeMenuPreview,
  selectCafeInternationalTakeawayFeatured,
} from '../lib/website-rescue/cafe-international-preview.js';
import {
  CAFE_INTERNATIONAL_FOOD_MOTION_PROVENANCE,
  CAFE_INTERNATIONAL_VISUALS,
} from '../lib/website-rescue/cafe-international-assets.js';
import {
  getCafeInternationalPreviewProps,
  loadCafeInternationalClientTruth,
  loadCafeInternationalMenuPreview,
} from '../lib/website-rescue/cafe-international-preview-server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

/**
 * Detect MP4 handler types without ffprobe (CI runners may not ship ffmpeg).
 * ISO-BMFF `hdlr` layout after the type marker: version/flags (4) +
 * pre_defined (4) + handler_type (4) → handler_type starts 12 bytes after `hdlr`.
 */
function mp4HandlerTypes(absPath) {
  const buf = readFileSync(absPath);
  const types = new Set();
  const needle = Buffer.from('hdlr');
  let from = 0;
  while (from < buf.length) {
    const idx = buf.indexOf(needle, from);
    if (idx === -1) break;
    const typeOffset = idx + 12;
    if (typeOffset + 4 <= buf.length) {
      const handler = buf.toString('ascii', typeOffset, typeOffset + 4);
      if (handler === 'vide' || handler === 'soun') types.add(handler);
    }
    from = idx + 4;
  }
  return types;
}

describe('Café International preview — fixture truth (#797)', () => {
  it('loads canonical client facts without inventing Grand Baie address', () => {
    const truth = loadCafeInternationalClientTruth();
    assert.equal(truth.tenant_id, 'cafe-international');
    assert.match(String(truth.public_name), /Café International/);
    assert.match(String(truth.address), /Royal Road/);
    assert.match(String(truth.address), /Trou aux Biches/);
    assert.doesNotMatch(String(truth.address), /Grand Baie/i);
    assert.equal(truth.public_phone, '+230 5765 8735');
    assert.equal(truth.since_year, 2009);
    assert.equal(truth.takeaway_chat_allowed, false);
    assert.equal(truth.takeaway_delivery, false);
    assert.deepEqual(truth.booking_channels, ['phone', 'website_chat']);
    assert.deepEqual(truth.takeaway_channels, ['whatsapp', 'phone']);
  });

  it('enforces booking vs takeaway separation', () => {
    const truth = loadCafeInternationalClientTruth();
    const { booking, takeaway } = assertCafeInternationalJourneyRules(truth);
    assert.ok(booking.some((a) => a.kind === 'phone'));
    assert.ok(booking.some((a) => a.kind === 'chat_bridge'));
    assert.ok(takeaway.some((a) => a.kind === 'whatsapp'));
    assert.ok(takeaway.every((a) => a.kind !== 'chat_bridge' && a.kind !== 'chat'));
    const wa = takeaway.find((a) => a.kind === 'whatsapp');
    assert.match(wa.href, /^https:\/\/wa\.me\/23057658735/);
  });

  it('menu preview loads live Menu-page sheet prices (not Drive CSV, not invented)', () => {
    const props = getCafeInternationalPreviewProps();
    assert.equal(props.menu.invented_item_prices, false);
    assert.equal(props.menu.source, 'live_menu_page_google_sheet_csv');
    assert.match(String(props.menu.source_page || ''), /menu-page/);
    assert.ok(props.menu.categories.some((c) => c.name === 'Drinks'));
    assert.ok(props.menu.categories.some((c) => c.name === 'From our Grill'));
    const starters = props.menu.categories.find((c) => c.name === 'Starters');
    assert.ok(starters && starters.items.length > 0);
    const greekSmall = starters.items.find(
      (i) => i.name === 'Greek Salad' && i.description === 'Small',
    );
    assert.equal(greekSmall.price_mur, 260);
    // Drive snapshot had 220 — prove we are on the live sheet
    assert.notEqual(greekSmall.price_mur, 220);
  });

  it('JSON-LD uses Trou aux Biches facts only and points at crawlable menu', () => {
    const truth = loadCafeInternationalClientTruth();
    const ld = buildCafeInternationalRestaurantJsonLd(
      truth,
      'https://corpflowai.com/demo/cafe-international',
    );
    assert.equal(ld['@type'], 'Restaurant');
    assert.equal(ld.address.addressLocality, 'Trou aux Biches');
    assert.doesNotMatch(JSON.stringify(ld), /Grand Baie/i);
    assert.match(String(ld.hasMenu), /\/demo\/cafe-international\/menu$/);
    assert.equal(ld.menu, ld.hasMenu);
  });

  it('Menu JSON-LD exposes crawlable sections and MUR offers', () => {
    const truth = loadCafeInternationalClientTruth();
    const menu = loadCafeInternationalMenuPreview();
    const ld = buildCafeInternationalMenuJsonLd(
      truth,
      menu,
      'https://corpflowai.com/demo/cafe-international/menu',
    );
    assert.equal(ld['@type'], 'Menu');
    assert.ok(Array.isArray(ld.hasMenuSection));
    assert.ok(ld.hasMenuSection.some((s) => s.name === 'From our Grill'));
    const starters = ld.hasMenuSection.find((s) => s.name === 'Starters');
    assert.ok(starters);
    const greek = starters.hasMenuItem.find(
      (i) => i.name === 'Greek Salad' && i.description === 'Small',
    );
    assert.equal(greek.offers.price, 260);
    assert.equal(greek.offers.priceCurrency, 'MUR');
  });

  it('homepage favourites are category-led with Sheet starting prices', () => {
    const menu = loadCafeInternationalMenuPreview();
    const rows = selectCafeInternationalHomeMenuPreview(menu, 6);
    assert.equal(rows.length, 6);
    assert.deepEqual(
      rows.map((r) => [r.id, r.name, r.price_mur, r.price_display]),
      [
        ['beef-steaks', 'Beef Steaks', 1050, 'from Rs 1,050'],
        ['steak-and-ribs', 'Steak & Ribs', 1450, 'from Rs 1,450'],
        ['pork-ribs', 'Pork Ribs', 1150, 'from Rs 1,150'],
        ['burgers', 'Burgers', 180, 'from Rs 180'],
        ['wings-and-rings', 'Buffalo Wings & Onion Rings', 200, 'from Rs 200'],
        ['chicken-fillet', 'Chicken Fillet', 650, 'from Rs 650'],
      ],
    );
    assert.ok(rows.every((r) => r.merchandising === 'category'));
    assert.ok(rows.every((r) => String(r.price_display).startsWith('from Rs')));
    assert.doesNotMatch(rows.map((r) => r.name).join(' '), /\b\d{2,4}g\b/);
  });
});

describe('Café International preview — routes and hygiene', () => {
  it('preview pages exist under /demo/cafe-international', () => {
    const pages = [
      'pages/demo/cafe-international/index.js',
      'pages/demo/cafe-international/menu.js',
      'pages/demo/cafe-international/takeaway.js',
      'pages/demo/cafe-international/about.js',
      'pages/demo/cafe-international/visit.js',
      'pages/demo/cafe-international/contact.js',
      'pages/demo/cafe-international/steaks-and-grill.js',
    ];
    for (const rel of pages) {
      assert.equal(existsSync(path.join(ROOT, rel)), true, rel);
    }
    assert.equal(CAFE_INTERNATIONAL_PREVIEW_BASE, '/demo/cafe-international');
  });

  it('takeaway page source never offers chat as takeaway channel', () => {
    const src = read('pages/demo/cafe-international/takeaway.js');
    assert.match(src, /WhatsApp or phone/i);
    assert.match(src, /not through website chat/i);
    const actions = buildCafeInternationalTakeawayActions(loadCafeInternationalClientTruth());
    assert.ok(!actions.some((a) => String(a.label).toLowerCase().includes('chat')));
  });

  it('menu page uses one WhatsApp CTA per category, not per item', () => {
    const src = read('pages/demo/cafe-international/menu.js');
    assert.match(src, /data-cafe-category-whatsapp/);
    assert.match(src, /CATEGORY_WHATSAPP_CTA_LABEL\s*=\s*'Order on WhatsApp'/);
    assert.match(src, /\{CATEGORY_WHATSAPP_CTA_LABEL\}/);
    assert.doesNotMatch(src, /Order Starters on WhatsApp|Order Grill Specials on WhatsApp|Order Burgers on WhatsApp|Ask about toppings on WhatsApp/);
    // Per-item WhatsApp buttons must not be generated inside the items map
    assert.doesNotMatch(
      src,
      /cat\.items[\s\S]{0,800}ActionButton[\s\S]{0,120}WhatsApp/,
    );
    assert.match(src, /data-cafe-menu-item/);
    assert.match(src, /data-cafe-menu-price/);
    assert.match(src, /categoryWhatsAppPrefill/);
  });

  it('preview is noindex and does not activate chatbot components', () => {
    const shell = read('components/cafe-international/CafeInternationalPreviewShell.js');
    assert.match(shell, /noindex,nofollow/);
    assert.match(shell, /No chatbot/);
    assert.match(shell, /no WhatsApp automation/);
    assert.doesNotMatch(shell, /ElevenLabs|Chatwoot/);
    assert.doesNotMatch(shell, /from ['"].*chat-widget|ElevenLabsWebsiteVoiceChat/);
    const home = read('pages/demo/cafe-international/index.js');
    assert.doesNotMatch(home, /ElevenLabsWebsiteVoiceChat/);
  });

  it('brand authenticity: owners, logo, and Best Steaks 2025 badge', () => {
    const home = read('pages/demo/cafe-international/index.js');
    const shell = read('components/cafe-international/CafeInternationalPreviewShell.js');
    const assets = read('lib/website-rescue/cafe-international-assets.js');
    assert.match(assets, /CAFE_INTERNATIONAL_OWNERS\s*=\s*'Deon and Annemarie'/);
    assert.match(home, /CAFE_INTERNATIONAL_OWNERS/);
    assert.match(home, /Deon and Annemarie|CAFE_INTERNATIONAL_OWNERS/);
    assert.doesNotMatch(home, /Dion|Anna-Marie|Anne Marie/);
    assert.match(shell, /brandLogoMark|brand-logo-mark/);
    assert.match(home, /brandLogoWide|brand-logo-wide/);
    assert.match(home, /bestSteaks2025Badge|best-steaks-2025-badge/);
    assert.match(home, /data-cafe-rg-badge/);
    assert.match(home, /CAFE_INTERNATIONAL_RESTAURANT_GURU_URL/);
    assert.match(
      assets,
      /restaurantguru\.com\/Cafe-International-The-Flame-Grill-Cafe-Trou-aux-Biches/,
    );
    assert.match(home, /target="_blank"/);
    assert.match(home, /rel="noopener noreferrer"/);
    assert.equal(
      existsSync(path.join(ROOT, 'public/assets/cafe-international/client/brand-logo-mark.png')),
      true,
    );
    assert.equal(
      existsSync(path.join(ROOT, 'public/assets/cafe-international/client/brand-logo-wide.png')),
      true,
    );
    assert.equal(
      existsSync(
        path.join(ROOT, 'public/assets/cafe-international/client/best-steaks-2025-badge.png'),
      ),
      true,
    );
  });

  it('homepage includes owner story + menu preview; menu page emits Menu JSON-LD', () => {
    const home = read('pages/demo/cafe-international/index.js');
    const menuPage = read('pages/demo/cafe-international/menu.js');
    assert.match(home, /data-cafe-owner-story/);
    assert.match(home, /data-cafe-home-menu-preview/);
    assert.match(home, /selectCafeInternationalHomeMenuPreview/);
    assert.match(home, /View full menu/);
    assert.match(menuPage, /buildCafeInternationalMenuJsonLd/);
    assert.match(menuPage, /jsonLd=\{menuJsonLd\}/);
  });
});

describe('Café International corrective pass (#855 / #860)', () => {
  it('primary nav is exactly Home | Menu | Visit | Takeaway | About', () => {
    const labels = CAFE_INTERNATIONAL_PREVIEW_NAV.map((item) => item.label);
    assert.deepEqual(labels, ['Home', 'Menu', 'Visit', 'Takeaway', 'About']);
    assert.equal(labels.includes('Steaks & grill'), false);
    assert.equal(labels.includes('Contact'), false);
    const shell = read('components/cafe-international/CafeInternationalPreviewShell.js');
    assert.match(shell, /visit#book/);
    assert.doesNotMatch(shell, /contact#book/);
  });

  it('menu intro uses the exact approved wording', () => {
    assert.equal(
      CAFE_INTERNATIONAL_MENU_INTRO,
      'Browse the menu by section. For takeaway, order the items you want on WhatsApp or by phone — website chat is for table bookings.',
    );
    const menuPage = read('pages/demo/cafe-international/menu.js');
    assert.match(menuPage, /CAFE_INTERNATIONAL_MENU_INTRO/);
    assert.match(menuPage, /data-cafe-menu-intro/);
    assert.doesNotMatch(menuPage, /order the whole category on WhatsApp/);
  });

  it('Best Steaks badge is inside the hero brand-card structure', () => {
    const home = read('pages/demo/cafe-international/index.js');
    const glassOpen = home.indexOf('data-cafe-hero-glass');
    const glassClose = home.indexOf('</CafeGlassPanel>', glassOpen);
    const badge = home.indexOf('data-cafe-rg-badge');
    assert.ok(glassOpen > -1, 'hero glass present');
    assert.ok(badge > glassOpen && badge < glassClose, 'badge nested inside hero glass');
    assert.match(home, /target="_blank"/);
    assert.match(home, /rel="noopener noreferrer"/);
    assert.match(home, /not Café-owned IP|not Cafe-owned IP|external recognition/i);
  });

  it('homepage food-motion uses muted autoplay, poster, and reduced-motion treatment', () => {
    const home = read('pages/demo/cafe-international/index.js');
    const shell = read('components/cafe-international/CafeInternationalPreviewShell.js');
    assert.match(home, /CafeFoodMotion/);
    assert.match(home, /foodMotion|food-motion\.mp4/);
    assert.match(shell, /data-cafe-food-motion-video/);
    assert.match(shell, /\bmuted\b/);
    assert.match(shell, /playsInline/);
    assert.match(shell, /\bautoPlay\b/);
    assert.match(shell, /\bloop\b/);
    assert.match(shell, /poster=\{poster\}/);
    assert.match(shell, /prefers-reduced-motion/);
    assert.match(shell, /data-cafe-food-motion-fallback/);
    // Regression: webpack fails on duplicate named exports of CafeFoodMotion.
    assert.match(shell, /export\s+function\s+CafeFoodMotion\b/);
    assert.equal(
      (shell.match(/\bexport\s+function\s+CafeFoodMotion\b/g) || []).length,
      1,
      'CafeFoodMotion must be declared as a named export exactly once',
    );
    assert.doesNotMatch(
      shell,
      /export\s*\{[^}]*\bCafeFoodMotion\b[^}]*\}/,
      'CafeFoodMotion must not also appear in a barrel re-export (duplicate export)',
    );
    assert.equal(
      existsSync(path.join(ROOT, 'public/assets/cafe-international/client/food-motion.mp4')),
      true,
    );
    assert.equal(
      existsSync(
        path.join(ROOT, 'public/assets/cafe-international/client/food-motion-poster.jpg'),
      ),
      true,
    );
    assert.match(CAFE_INTERNATIONAL_VISUALS.foodMotion, /food-motion\.mp4$/);
    assert.match(
      CAFE_INTERNATIONAL_FOOD_MOTION_PROVENANCE.source_filename,
      /Real food\.mp4/,
    );
  });

  it('sr-only helper text is visually hidden (not visible blue tile copy)', () => {
    const shell = read('components/cafe-international/CafeInternationalPreviewShell.js');
    const home = read('pages/demo/cafe-international/index.js');
    assert.match(home, /className="sr-only"/);
    assert.match(shell, /\.sr-only/);
    assert.match(shell, /clip:\s*rect\(0,\s*0,\s*0,\s*0\)/);
    assert.match(shell, /position:\s*absolute/);
  });

  it('homepage uses one Visit/Book + Takeaway journey section (no duplicate Visit band)', () => {
    const home = read('pages/demo/cafe-international/index.js');
    assert.match(home, /data-cafe-journey/);
    assert.match(home, /Visit \/ Book a Table/);
    assert.match(home, /Takeaway \/ Order/);
    assert.match(home, /data-cafe-journey-visit-facts/);
    assert.doesNotMatch(home, /Book or takeaway/);
    // Large standalone "Visit us" band removed from homepage
    assert.doesNotMatch(home, />\s*Visit us\s*</);
  });

  it('booking stays phone/chat; takeaway stays WhatsApp/phone', () => {
    const truth = loadCafeInternationalClientTruth();
    const { booking, takeaway } = assertCafeInternationalJourneyRules(truth);
    assert.ok(booking.some((a) => a.kind === 'phone'));
    assert.ok(booking.some((a) => a.kind === 'chat_bridge'));
    assert.ok(takeaway.every((a) => a.kind === 'whatsapp' || a.kind === 'phone'));
    const visit = read('pages/demo/cafe-international/visit.js');
    assert.match(visit, /bookingActions/);
    assert.match(visit, /id="book"/);
    const takeawayPage = read('pages/demo/cafe-international/takeaway.js');
    assert.match(takeawayPage, /WhatsApp or phone/i);
    assert.match(takeawayPage, /not takeaway|for table bookings/i);
  });

  it('drinks fixture matches refreshed live Sheet prices', () => {
    const menu = loadCafeInternationalMenuPreview();
    assert.equal(menu.captured_at, '2026-08-10');
    const drinks = menu.categories.find((c) => c.name === 'Drinks');
    assert.ok(drinks);
    assert.equal(drinks.items.length, 87);
    const houseRed = drinks.items.find(
      (i) => i.name === 'Wine - House Red' && i.description === 'Glass 200 ml',
    );
    assert.equal(houseRed.price_mur, 280);
    const blueSmall = drinks.items.find((i) => i.name === 'Beer - Blue Marlin Small');
    assert.equal(blueSmall.price_mur, 150);
    assert.ok(drinks.items.some((i) => i.name === 'Beer - Monaco Small'));
    assert.ok(drinks.items.some((i) => i.name === 'Coffee - Ice Coffee'));
    const spritzer = drinks.items.find((i) => i.name === 'Wine - Spritzer');
    assert.equal(spritzer.price_mur, 320);
    assert.match(String(spritzer.description || ''), /soda/i);
    assert.doesNotMatch(String(spritzer.description || ''), /Sodan/);
  });
});

describe('Café International corrective pass (#871 / #872)', () => {
  it('hero brand card uses full container width with badge on the far right', () => {
    const home = read('pages/demo/cafe-international/index.js');
    assert.match(home, /data-cafe-hero-brand-row/);
    assert.match(home, /data-cafe-hero-brand-copy/);
    assert.match(home, /data-cafe-hero-brand-trust/);
    assert.match(home, /maxWidth:\s*['"]100%['"]|maxWidth:\s*'100%'/);
    assert.doesNotMatch(home, /maxWidth:\s*640/);
    const glassOpen = home.indexOf('<CafeGlassPanel');
    const glassClose = home.indexOf('</CafeGlassPanel>', glassOpen);
    const badge = home.indexOf('data-cafe-rg-badge', glassOpen);
    const trust = home.indexOf('data-cafe-hero-brand-trust', glassOpen);
    assert.ok(glassOpen > -1 && glassClose > glassOpen, 'hero glass panel present');
    assert.ok(home.includes('data-cafe-hero-glass'), 'hero glass marker present');
    assert.ok(badge > glassOpen && badge < glassClose, 'badge stays inside hero glass');
    assert.ok(trust > glassOpen && trust < glassClose, 'trust column inside hero glass');
    assert.ok(trust < badge, 'trust column wraps the badge on the right');
    assert.match(home, /CAFE_INTERNATIONAL_RESTAURANT_GURU_URL/);
    assert.match(home, /not Café-owned IP|not Cafe-owned IP|external recognition/i);
  });

  it('homepage featured favourites avoid unsupported best-seller claims', () => {
    const home = read('pages/demo/cafe-international/index.js');
    assert.match(home, /Featured favourites/);
    assert.match(home, /Owner favourites guests order most/);
    assert.doesNotMatch(home, />\s*Menu preview\s*</);
    const headingIdx = home.indexOf('>\n            Featured favourites\n');
    assert.ok(headingIdx > -1, 'visible Featured favourites heading present');
    const sectionSrc = home.slice(headingIdx, headingIdx + 500);
    assert.doesNotMatch(
      sectionSrc,
      /best[- ]seller|most[- ]requested|most[- ]ordered|top[- ]seller/i,
    );
    assert.match(home, /data-cafe-home-menu-preview/);
    assert.match(home, /View full menu/);
    assert.match(home, /Sizes and options vary/);
    const rows = selectCafeInternationalHomeMenuPreview(loadCafeInternationalMenuPreview(), 6);
    assert.equal(rows.length, 6);
    assert.ok(rows.every((r) => r.price_mur != null));
    assert.ok(rows.every((r) => String(r.price_display).startsWith('from Rs')));
  });

  it('homepage Restaurant Guru social proof uses official award ribbon + listing facts', () => {
    const home = read('pages/demo/cafe-international/index.js');
    const assets = read('lib/website-rescue/cafe-international-assets.js');
    assert.match(home, /data-cafe-rg-social-proof/);
    assert.match(home, /data-cafe-rg-official-embed/);
    assert.match(home, /data-cafe-rg-listing-link/);
    assert.match(home, /CAFE_INTERNATIONAL_RESTAURANT_GURU_PROOF/);
    assert.match(home, /officialAwardCssHref/);
    assert.match(home, /officialAwardWidgetHtml/);
    assert.match(assets, /officialAwardCssHref/);
    assert.match(assets, /awards\.infcdn\.net\/2024\/circle_v2\.css/);
    assert.match(assets, /circle-r-ribbon/);
    assert.match(assets, /Best steaks/);
    assert.match(assets, /aggregateSources/);
    assert.match(assets, /Google/);
    assert.match(assets, /Trip/);
    assert.match(assets, /Facebook/);
    assert.match(assets, /Foursquare/);
    // Official ribbon is static CSS/SVG HTML — no blocking script loader.
    assert.doesNotMatch(assets, /widgets\.leadconnectorhq|document\.write/);
    assert.match(home, /guest votes/);
    assert.match(home, /See reviews on Restaurant Guru/);
    // Hero Best Steaks badge preserved.
    assert.match(home, /data-cafe-rg-badge/);
    assert.match(home, /bestSteaks2025Badge|best-steaks-2025-badge/);
  });

  it('source foodMotion and venueBuzzMotion files contain no audio track', () => {
    const files = [
      'public/assets/cafe-international/client/food-motion.mp4',
      'public/assets/cafe-international/client/venue-buzz-motion.mp4',
    ];
    for (const rel of files) {
      const abs = path.join(ROOT, rel);
      assert.equal(existsSync(abs), true, rel);
      const handlers = mp4HandlerTypes(abs);
      assert.ok(handlers.has('vide'), `${rel} must include a video handler`);
      assert.equal(
        handlers.has('soun'),
        false,
        `${rel} must not include an audio handler (unmute control not warranted)`,
      );
    }
    // Regression: detector must still report soun when audio is present (known A/V asset).
    const withAudio = mp4HandlerTypes(
      path.join(ROOT, 'public/media/corpflowai/ai-lead-rescue-sprint-intro-1080p.mp4'),
    );
    assert.ok(withAudio.has('vide'));
    assert.ok(
      withAudio.has('soun'),
      'control fixture must expose an audio handler so the no-audio check cannot silently no-op',
    );

    const shell = read('components/cafe-international/CafeInternationalPreviewShell.js');
    assert.match(shell, /\bmuted\b/);
    assert.doesNotMatch(shell, /unmute|Sound on|Enable sound/i);
  });

  it('takeaway is one browse → WhatsApp/phone → collect journey with owner favourites', () => {
    const src = read('pages/demo/cafe-international/takeaway.js');
    assert.match(src, /data-cafe-takeaway-journey/);
    assert.match(src, /data-cafe-takeaway-steps/);
    assert.match(src, /data-cafe-takeaway-featured/);
    assert.match(src, /data-cafe-takeaway-tile=\{tile\.id\}/);
    assert.match(src, /\[['"]platters['"],\s*['"]steaks['"],\s*['"]burgers['"]\]/);
    assert.match(src, /Great for takeaway/i);
    assert.match(src, /Owner favourites for collection/);
    assert.match(src, /WhatsApp or phone/i);
    assert.match(src, /not a takeaway channel|for table bookings/i);
    assert.doesNotMatch(src, /best[- ]seller|most[- ]ordered|most[- ]requested/i);
    assert.doesNotMatch(src, /CafeActionPanel/);
    const actions = buildCafeInternationalTakeawayActions(loadCafeInternationalClientTruth());
    assert.ok(actions.every((a) => a.kind === 'whatsapp' || a.kind === 'phone'));
    assert.ok(!actions.some((a) => String(a.label).toLowerCase().includes('chat')));
    const featured = selectCafeInternationalTakeawayFeatured(
      loadCafeInternationalMenuPreview(),
      6,
    );
    assert.equal(featured.length, 6);
    assert.deepEqual(
      featured.map((r) => [r.id, r.name, r.price_mur, r.price_display]),
      [
        ['burgers', 'Burgers', 180, 'from Rs 180'],
        ['steaks', 'Steaks', 1050, 'from Rs 1,050'],
        ['buffalo-wings', 'Buffalo Wings', 250, 'from Rs 250'],
        ['onion-rings', 'Onion Rings', 200, 'from Rs 200'],
        ['greek-salads', 'Greek Salads', 260, 'from Rs 260'],
        ['pork-ribs', 'Pork Ribs', 1150, 'from Rs 1,150'],
      ],
    );
    assert.ok(featured.every((r) => String(r.price_display).startsWith('from Rs')));
  });

  it('about page includes genuine restaurant-front exterior imagery', () => {
    const about = read('pages/demo/cafe-international/about.js');
    assert.match(about, /data-cafe-about-exterior/);
    assert.match(about, /venuePatio|venue-patio/);
    assert.match(about, /CAFE_INTERNATIONAL_OWNERS/);
    assert.match(about, /Since \{truth\.since_year\}|Since \$\{truth\.since_year\}/);
    assert.match(about, /Halal and certification wording/);
    assert.equal(
      existsSync(path.join(ROOT, 'public/assets/cafe-international/client/venue-patio.jpg')),
      true,
    );
  });

  it('menu and visit remain regression-safe after corrective pass', () => {
    const menuPage = read('pages/demo/cafe-international/menu.js');
    const visit = read('pages/demo/cafe-international/visit.js');
    assert.match(menuPage, /CAFE_INTERNATIONAL_MENU_INTRO/);
    assert.match(menuPage, /data-cafe-menu-intro/);
    assert.match(menuPage, /data-cafe-category-whatsapp/);
    assert.match(visit, /bookingActions/);
    assert.match(visit, /id="book"/);
    assert.match(visit, /CafeFoodMotion/);
    assert.match(visit, /venueBuzzMotion/);
    assert.deepEqual(
      CAFE_INTERNATIONAL_PREVIEW_NAV.map((item) => item.label),
      ['Home', 'Menu', 'Visit', 'Takeaway', 'About'],
    );
  });
});
