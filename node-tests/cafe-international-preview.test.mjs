import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  assertCafeInternationalJourneyRules,
  buildCafeInternationalRestaurantJsonLd,
  buildCafeInternationalTakeawayActions,
  CAFE_INTERNATIONAL_PREVIEW_BASE,
} from '../lib/website-rescue/cafe-international-preview.js';
import {
  getCafeInternationalPreviewProps,
  loadCafeInternationalClientTruth,
} from '../lib/website-rescue/cafe-international-preview-server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return readFileSync(path.join(ROOT, rel), 'utf8');
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

  it('JSON-LD uses Trou aux Biches facts only', () => {
    const truth = loadCafeInternationalClientTruth();
    const ld = buildCafeInternationalRestaurantJsonLd(
      truth,
      'https://corpflowai.com/demo/cafe-international',
    );
    assert.equal(ld['@type'], 'Restaurant');
    assert.equal(ld.address.addressLocality, 'Trou aux Biches');
    assert.doesNotMatch(JSON.stringify(ld), /Grand Baie/i);
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
});
