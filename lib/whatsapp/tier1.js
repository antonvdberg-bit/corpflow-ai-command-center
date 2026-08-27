/**
 * WhatsApp Tier 1 — manual contact helpers (#1214 / parent #702; supersedes #1137).
 *
 * Deep links only (`https://wa.me/…`). No Cloud API, webhook, token, env var,
 * schema, automation, or send runtime. Tenant catalog lives in
 * `config/whatsapp-tier1.v1.json` (non-secret, enabled=false by default).
 *
 * Café International already built `wa.me` links in
 * `lib/website-rescue/cafe-international-preview.js`; that helper now reuses
 * `buildWhatsAppMeHref` from `lib/whatsapp/href.js` so there is one URL primitive.
 */

import {
  buildWhatsAppMeHref,
  encodeWhatsAppPrefill,
  normalizeWhatsAppDigits,
  normalizeWhatsAppMeUrl,
  validateWhatsAppBusinessPhone,
  WHATSAPP_ME_ORIGIN,
} from './href.js';
import { encodeQrSvg } from './qr-svg.js';

export {
  buildWhatsAppMeHref,
  encodeWhatsAppPrefill,
  normalizeWhatsAppDigits,
  normalizeWhatsAppMeUrl,
  validateWhatsAppBusinessPhone,
  WHATSAPP_ME_ORIGIN,
};

export const WHATSAPP_TIER1_CATALOG_PATH = 'config/whatsapp-tier1.v1.json';
export const WHATSAPP_TIER1_RUNTIME = Object.freeze({
  api: false,
  webhook: false,
  automation: false,
  send: false,
  meta_cloud_api: false,
});

function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

function mergeLayer(...layers) {
  const out = {};
  for (const layer of layers) {
    const src = asObj(layer);
    for (const [k, val] of Object.entries(src)) {
      if (val === undefined) continue;
      out[k] = val;
    }
  }
  return out;
}

/**
 * Resolve tenant/product WhatsApp Tier 1 config without env vars or schema.
 * Fail-closed when disabled, missing, or tenant/product ids disagree.
 *
 * @param {{ tenantId?: string, productId?: string, catalog?: object, includeQr?: boolean }} opts
 * @returns {object}
 */
export function resolveWhatsAppTier1Contact(opts = {}) {
  const catalog = asObj(opts.catalog);
  const tenantId = String(opts.tenantId || '').trim();
  const productId = String(opts.productId || '').trim();
  const defaults = asObj(catalog.defaults);
  const tenants = asObj(catalog.tenants);
  const products = asObj(catalog.products);
  const runtime = mergeLayer(WHATSAPP_TIER1_RUNTIME, catalog.runtime);

  if (runtime.api || runtime.webhook || runtime.automation || runtime.send || runtime.meta_cloud_api) {
    return {
      ok: false,
      reason: 'runtime_not_tier1',
      tenant_id: tenantId || null,
      product_id: productId || null,
    };
  }

  if (!tenantId && !productId) {
    return { ok: false, reason: 'missing_tenant_or_product', tenant_id: null, product_id: null };
  }

  const product = productId ? asObj(products[productId]) : {};
  if (productId && !products[productId]) {
    return { ok: false, reason: 'unknown_product', tenant_id: tenantId || null, product_id: productId };
  }

  const productTenant = String(product.tenant_id || '').trim();
  const resolvedTenantId = tenantId || productTenant;
  if (tenantId && productTenant && tenantId !== productTenant) {
    return {
      ok: false,
      reason: 'tenant_product_mismatch',
      tenant_id: tenantId,
      product_id: productId,
    };
  }

  const tenant = resolvedTenantId ? asObj(tenants[resolvedTenantId]) : {};
  if (resolvedTenantId && !tenants[resolvedTenantId]) {
    return {
      ok: false,
      reason: 'unknown_tenant',
      tenant_id: resolvedTenantId,
      product_id: productId || null,
    };
  }

  const merged = mergeLayer(defaults, tenant, product);
  // Fail-closed: a product overlay cannot enable WhatsApp while the tenant
  // row stays disabled, and a tenant cannot inherit enablement from defaults.
  const tenantEnabled = !resolvedTenantId || tenant.enabled === true;
  const productEnabled = !productId || product.enabled === true;
  const enabled = tenantEnabled && productEnabled;
  if (!enabled) {
    return {
      ok: false,
      reason: 'not_enabled',
      tenant_id: resolvedTenantId || null,
      product_id: productId || null,
      display_name: String(merged.display_name || resolvedTenantId || 'this business'),
      unavailable_copy: String(merged.unavailable_copy || defaults.unavailable_copy || ''),
      fallback_copy: String(merged.fallback_copy || ''),
      publication_state: String(catalog.$publication_state || catalog.publication_state || ''),
    };
  }

  const phone = validateWhatsAppBusinessPhone(merged.business_phone);
  if (!phone.ok) {
    return {
      ok: false,
      reason: phone.reason,
      tenant_id: resolvedTenantId || null,
      product_id: productId || null,
      display_name: String(merged.display_name || resolvedTenantId || 'this business'),
      unavailable_copy: String(merged.unavailable_copy || ''),
      fallback_copy: String(merged.fallback_copy || ''),
    };
  }

  const prefill = String(merged.prefill_message || '').trim();
  const href = buildWhatsAppMeHref(phone.digits, prefill);
  const displayName = String(merged.display_name || resolvedTenantId || 'this business');
  const ctaLabel = String(merged.cta_label || 'Message us on WhatsApp');
  const qrLabel = `QR code to message ${displayName} on WhatsApp`;
  const includeQr = opts.includeQr !== false;
  const qrSvg = includeQr ? encodeQrSvg(href, { label: qrLabel }) : '';

  return {
    ok: true,
    reason: null,
    tenant_id: resolvedTenantId || null,
    product_id: productId || null,
    display_name: displayName,
    business_phone: phone.e164,
    business_phone_digits: phone.digits,
    prefill_message: prefill,
    href,
    tel_href: `tel:+${phone.digits}`,
    cta_label: ctaLabel,
    cta_aria_label: `Message ${displayName} on WhatsApp`,
    qr_alt: qrLabel,
    qr_caption: String(merged.qr_caption || ''),
    qr_svg: qrSvg,
    privacy_notice: String(merged.privacy_notice || ''),
    consent_label: String(merged.consent_label || ''),
    fallback_copy: String(merged.fallback_copy || ''),
    desktop_hint: String(merged.desktop_hint || ''),
    mobile_hint: String(merged.mobile_hint || ''),
    later_surfaces: Array.isArray(merged.later_surfaces) ? merged.later_surfaces.slice() : [],
    runtime: { ...WHATSAPP_TIER1_RUNTIME },
    publication_state: String(catalog.$publication_state || catalog.publication_state || ''),
  };
}

export function whatsappTier1HasSendRuntime(catalog) {
  const runtime = asObj(asObj(catalog).runtime);
  return Boolean(runtime.api || runtime.webhook || runtime.automation || runtime.send || runtime.meta_cloud_api);
}
