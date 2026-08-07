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

  it('menu preview does not invent MUR prices', () => {
    const props = getCafeInternationalPreviewProps();
    assert.equal(props.menu.invented_item_prices, false);
    for (const cat of props.menu.categories) {
      assert.equal(Array.isArray(cat.items) && cat.items.length === 0, true);
    }
    const blob = JSON.stringify(props.menu);
    assert.doesNotMatch(blob, /"price"\s*:/);
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
});
