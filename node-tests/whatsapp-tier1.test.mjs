/**
 * #1214 WhatsApp Tier 1 — reusable manual contact (no API / send runtime).
 * Reuses scope/evidence from closed PR #1138 / #1137 on current main.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { cafeInternationalWhatsAppHref } from '../lib/website-rescue/cafe-international-preview.js';
import { CUSTOMER_SERVICE_PHONE } from '../lib/public/merchant-identity.js';
import {
  buildWhatsAppMeHref,
  encodeWhatsAppPrefill,
  normalizeWhatsAppDigits,
  normalizeWhatsAppMeUrl,
  validateWhatsAppBusinessPhone,
} from '../lib/whatsapp/href.js';
import { encodeQrMatrix, encodeQrSvg, QR_USES_EXTERNAL_SERVICE } from '../lib/whatsapp/qr-svg.js';
import {
  resolveWhatsAppTier1Contact,
  WHATSAPP_TIER1_CATALOG_PATH,
  WHATSAPP_TIER1_RUNTIME,
  whatsappTier1HasSendRuntime,
} from '../lib/whatsapp/tier1.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

function loadCatalog() {
  return JSON.parse(read(WHATSAPP_TIER1_CATALOG_PATH));
}

function enabledCatalog(mutator) {
  const catalog = loadCatalog();
  if (typeof mutator === 'function') mutator(catalog);
  return catalog;
}

describe('#1214 WhatsApp Tier 1 URL normalization', () => {
  it('strips formatting and extracts digits from wa.me / tel / whatsapp URLs', () => {
    assert.equal(normalizeWhatsAppDigits('+230 5765 8735'), '23057658735');
    assert.equal(normalizeWhatsAppDigits('tel:+230-5765-8735'), '23057658735');
    assert.equal(normalizeWhatsAppDigits('https://wa.me/23057658735'), '23057658735');
    assert.equal(normalizeWhatsAppDigits('https://wa.me/23057658735?text=Hello'), '23057658735');
    assert.equal(
      normalizeWhatsAppDigits('https://web.whatsapp.com/send?phone=23057658735&text=Hi'),
      '23057658735',
    );
    assert.equal(normalizeWhatsAppDigits('whatsapp://send?phone=+23057658735'), '23057658735');
  });

  it('builds canonical https://wa.me hrefs and preserves Café International URLs', () => {
    const cafePrefill = 'Hello Café International — I would like to order takeaway.';
    const expected = `https://wa.me/23057658735?text=${encodeURIComponent(cafePrefill)}`;
    assert.equal(buildWhatsAppMeHref('+230 5765 8735', cafePrefill), expected);
    assert.equal(cafeInternationalWhatsAppHref('+230 5765 8735'), expected);
    assert.equal(cafeInternationalWhatsAppHref('+230 5765 8735', cafePrefill), expected);
    assert.equal(
      normalizeWhatsAppMeUrl('https://wa.me/23057658735?text=Hello%20there'),
      'https://wa.me/23057658735?text=Hello%20there',
    );
    assert.equal(normalizeWhatsAppMeUrl('+230 5901 4284'), 'https://wa.me/23059014284');
    assert.equal(buildWhatsAppMeHref('+230 5901 4284', '   '), 'https://wa.me/23059014284');
  });
});

describe('#1214 WhatsApp Tier 1 prefilled-message encoding', () => {
  it('percent-encodes spaces, punctuation, and unicode without injecting extra query params', () => {
    const encoded = encodeWhatsAppPrefill('Hello — I would like to get in touch? offer=x&y=1');
    assert.equal(
      encoded,
      encodeURIComponent('Hello — I would like to get in touch? offer=x&y=1'),
    );
    assert.match(encoded, /%20/);
    assert.doesNotMatch(encoded, /&/);
    const href = buildWhatsAppMeHref('23059014284', 'Hello — I would like to get in touch? offer=x&y=1');
    const url = new URL(href);
    assert.equal(url.origin + url.pathname, 'https://wa.me/23059014284');
    assert.equal(url.searchParams.get('text'), 'Hello — I would like to get in touch? offer=x&y=1');
    assert.equal(encodeWhatsAppPrefill('   '), '');
  });
});

describe('#1214 WhatsApp Tier 1 phone-number validation', () => {
  it('accepts public business E.164 numbers already in the repo', () => {
    assert.deepEqual(validateWhatsAppBusinessPhone('+230 5765 8735'), {
      ok: true,
      digits: '23057658735',
      e164: '+23057658735',
    });
    assert.equal(validateWhatsAppBusinessPhone('+230 5901 4284').ok, true);
  });

  it('rejects missing, local-only, too short/long, and letter values', () => {
    assert.equal(validateWhatsAppBusinessPhone('').reason, 'missing_phone');
    assert.equal(validateWhatsAppBusinessPhone('057658735').reason, 'missing_country_code');
    assert.equal(validateWhatsAppBusinessPhone('23057').reason, 'too_short');
    assert.equal(validateWhatsAppBusinessPhone('23057658735123456').reason, 'too_long');
    assert.equal(validateWhatsAppBusinessPhone('call-jan-now').reason, 'letters_not_allowed');
  });
});

describe('#1214 WhatsApp Tier 1 tenant-safe configuration', () => {
  it('loads a non-secret catalog with send runtime hard-off and tenants disabled', () => {
    const catalog = loadCatalog();
    assert.equal(catalog.$publication_state, 'internal_capability_only_not_attached');
    assert.equal(catalog.defaults.enabled, false);
    assert.equal(catalog.tenants.corpflowai.enabled, false);
    assert.equal(catalog.tenants['cafe-international'].enabled, false);
    assert.equal(catalog.tenants['living-word'], undefined);
    assert.equal(catalog.tenants['living-word-mauritius'], undefined);
    assert.equal(whatsappTier1HasSendRuntime(catalog), false);
    assert.deepEqual(catalog.runtime, {
      api: false,
      webhook: false,
      automation: false,
      send: false,
      meta_cloud_api: false,
    });
    assert.deepEqual(WHATSAPP_TIER1_RUNTIME.send, false);
    assert.equal(catalog.tenants.corpflowai.business_phone, CUSTOMER_SERVICE_PHONE);
    assert.equal(catalog.tenants['cafe-international'].business_phone, '+230 5765 8735');
    assert.equal(catalog.$issue, '#1214');
  });

  it('fail-closes until enabled, and isolates product tenant ids', () => {
    const catalog = loadCatalog();
    const disabled = resolveWhatsAppTier1Contact({ tenantId: 'cafe-international', catalog });
    assert.equal(disabled.ok, false);
    assert.equal(disabled.reason, 'not_enabled');
    assert.equal(disabled.href, undefined);

    const mismatch = resolveWhatsAppTier1Contact({
      tenantId: 'corpflowai',
      productId: 'website-rescue',
      catalog: enabledCatalog((c) => {
        c.tenants.corpflowai.enabled = true;
        c.products['website-rescue'].enabled = true;
      }),
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.reason, 'tenant_product_mismatch');

    const unknown = resolveWhatsAppTier1Contact({ tenantId: 'living-word-mauritius', catalog });
    assert.equal(unknown.reason, 'unknown_tenant');

    const enabled = resolveWhatsAppTier1Contact({
      tenantId: 'cafe-international',
      catalog: enabledCatalog((c) => {
        c.tenants['cafe-international'].enabled = true;
      }),
    });
    assert.equal(enabled.ok, true);
    assert.equal(enabled.tenant_id, 'cafe-international');
    assert.equal(enabled.href, cafeInternationalWhatsAppHref('+230 5765 8735'));
    assert.equal(enabled.runtime.send, false);
    assert.match(enabled.qr_svg, /<svg /);
  });

  it('does not let a product overlay enable WhatsApp while the tenant stays disabled', () => {
    const bypass = resolveWhatsAppTier1Contact({
      tenantId: 'cafe-international',
      productId: 'website-rescue',
      catalog: enabledCatalog((c) => {
        c.products['website-rescue'].enabled = true;
      }),
    });
    assert.equal(bypass.ok, false);
    assert.equal(bypass.reason, 'not_enabled');
    assert.equal(bypass.href, undefined);

    const productOff = resolveWhatsAppTier1Contact({
      tenantId: 'cafe-international',
      productId: 'website-rescue',
      catalog: enabledCatalog((c) => {
        c.tenants['cafe-international'].enabled = true;
      }),
    });
    assert.equal(productOff.ok, false);
    assert.equal(productOff.reason, 'not_enabled');

    const bothOn = resolveWhatsAppTier1Contact({
      tenantId: 'cafe-international',
      productId: 'website-rescue',
      catalog: enabledCatalog((c) => {
        c.tenants['cafe-international'].enabled = true;
        c.products['website-rescue'].enabled = true;
      }),
    });
    assert.equal(bothOn.ok, true);
    assert.equal(bothOn.product_id, 'website-rescue');
    assert.equal(bothOn.cta_label, 'Order takeaway on WhatsApp');
  });

  it('does not add WhatsApp env vars or import the component on public pages', () => {
    const envTemplate = read('.env.template');
    assert.match(envTemplate, /EXEC_WHATSAPP_NUMBER=/);
    assert.match(envTemplate, /ADMIN_WHATSAPP_NUMBER=/);
    assert.match(envTemplate, /WHATSAPP_FROM=/);
    assert.equal((envTemplate.match(/^WHATSAPP_/gm) || []).length, 1);
    const publicPages = [
      'pages/contact.js',
      'pages/index.js',
      'pages/lead-rescue.js',
      'pages/website-rescue.js',
      'pages/demo/cafe-international/takeaway.js',
      'pages/demo/cafe-international/contact.js',
      'pages/demo/cafe-international/menu.js',
      'pages/living-word/demo.js',
    ];
    for (const rel of publicPages) {
      if (!existsSync(path.join(ROOT, rel))) continue;
      const src = read(rel);
      assert.equal(src.includes('WhatsAppTier1Contact'), false, rel);
      assert.equal(src.includes('whatsapp-tier1.v1.json'), false, rel);
    }
  });
});

describe('#1214 WhatsApp Tier 1 accessibility and fallback', () => {
  it('exposes accessible labels, desktop/mobile hints, privacy copy, and tel fallback when enabled', () => {
    const contact = resolveWhatsAppTier1Contact({
      tenantId: 'corpflowai',
      catalog: enabledCatalog((c) => {
        c.tenants.corpflowai.enabled = true;
      }),
    });
    assert.equal(contact.ok, true);
    assert.equal(contact.cta_aria_label, 'Message CorpFlowAI on WhatsApp');
    assert.match(contact.href, /^https:\/\/wa\.me\/23059014284\?text=/);
    assert.equal(contact.tel_href, 'tel:+23059014284');
    assert.equal(contact.qr_alt, 'QR code to message CorpFlowAI on WhatsApp');
    assert.match(contact.privacy_notice, /does not send, store, or automate WhatsApp messages/);
    assert.match(contact.consent_label, /manual WhatsApp conversation/);
    assert.match(contact.desktop_hint, /WhatsApp Web|desktop app/i);
    assert.match(contact.mobile_hint, /WhatsApp app/);
    assert.match(contact.fallback_copy, /optional/i);
    assert.doesNotMatch(contact.cta_label, /Choose payment path/i);

    const component = read('components/whatsapp/WhatsAppTier1Contact.js');
    assert.match(component, /data-whatsapp-tier1="contact"/);
    assert.match(component, /data-whatsapp-tier1="unavailable"/);
    assert.match(component, /role="status"/);
    assert.match(component, /rel="noopener noreferrer"/);
    assert.match(component, /aria-label=\{model\.cta_aria_label/);
    assert.match(component, /alt=\{model\.qr_alt/);
    assert.match(component, /href=\{model\.tel_href\}/);
    assert.match(component, /data-whatsapp-tier1-desktop-hint/);
    assert.match(component, /data-whatsapp-tier1-mobile-hint/);
    assert.match(component, /@media \(hover: none\) and \(pointer: coarse\)/);
    assert.match(component, /No WhatsApp\?/);
    assert.doesNotMatch(component, /Choose payment path/i);
    assert.doesNotMatch(component, /process\.env/);
  });

  it('keeps the unavailable path free of wa.me links', () => {
    const contact = resolveWhatsAppTier1Contact({
      tenantId: 'corpflowai',
      catalog: loadCatalog(),
    });
    assert.equal(contact.ok, false);
    assert.equal(contact.reason, 'not_enabled');
    assert.equal(contact.href, undefined);
    assert.match(contact.unavailable_copy, /not enabled for this tenant yet/);
    const component = read('components/whatsapp/WhatsAppTier1Contact.js');
    assert.match(component, /if \(!model\.ok\)/);
    assert.match(component, /data-whatsapp-tier1="unavailable"/);
  });
});

describe('#1214 WhatsApp Tier 1 local QR encoder', () => {
  it('encodes a wa.me URL as SVG without a hosted QR service', () => {
    assert.equal(QR_USES_EXTERNAL_SERVICE, false);
    const href = buildWhatsAppMeHref('+230 5765 8735', 'Hello');
    const svg = encodeQrSvg(href, { label: 'QR code to message Café International on WhatsApp' });
    assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    assert.match(svg, /aria-label="QR code to message Café International on WhatsApp"/);
    assert.doesNotMatch(svg, /qrserver|google\.com\/chart|api\.qr/i);
    const matrix = encodeQrMatrix('HELLO');
    assert.ok(matrix);
    assert.equal(matrix.modules[0].slice(0, 7).join(''), '1111111');
    assert.equal(matrix.modules[1].slice(0, 7).join(''), '1000001');
    assert.equal(matrix.modules[2].slice(0, 7).join(''), '1011101');
    assert.equal(encodeQrSvg(''), '');
  });
});
