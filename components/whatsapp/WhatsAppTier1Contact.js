import React from 'react';

/**
 * Reusable WhatsApp Tier 1 manual-contact block (#1137).
 *
 * Presentational only. Pass a model from `resolveWhatsAppTier1Contact`.
 * Do not import this into a public/client page in this packet — attachment
 * needs a later delivery approval on a named surface.
 *
 * No API, webhook, token, or send. The CTA is a `wa.me` deep link.
 *
 * @param {{ contact: object, showQr?: boolean }} props
 */
export default function WhatsAppTier1Contact({ contact, showQr = true }) {
  const model = contact && typeof contact === 'object' ? contact : {};
  const displayName = String(model.display_name || 'this business');

  if (!model.ok) {
    const unavailable =
      String(model.unavailable_copy || '').trim() ||
      'WhatsApp contact is not enabled for this tenant yet.';
    const fallback = String(model.fallback_copy || '').trim();
    return (
      <section
        data-whatsapp-tier1="unavailable"
        data-whatsapp-tier1-reason={String(model.reason || 'unavailable')}
        aria-label={`WhatsApp contact unavailable for ${displayName}`}
        style={sectionStyle}
      >
        <p role="status" style={bodyStyle}>
          {unavailable}
        </p>
        {fallback ? <p style={mutedStyle}>{fallback}</p> : null}
      </section>
    );
  }

  const qrDataUri = model.qr_svg
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(model.qr_svg)}`
    : '';
  const showQrBlock = showQr && Boolean(qrDataUri);

  return (
    <section data-whatsapp-tier1="contact" style={sectionStyle}>
      <style>{`
        [data-whatsapp-tier1="contact"] [data-whatsapp-tier1-desktop-hint] { display: block; }
        [data-whatsapp-tier1="contact"] [data-whatsapp-tier1-mobile-hint] { display: none; }
        @media (hover: none) and (pointer: coarse) {
          [data-whatsapp-tier1="contact"] [data-whatsapp-tier1-desktop-hint] { display: none !important; }
          [data-whatsapp-tier1="contact"] [data-whatsapp-tier1-mobile-hint] { display: block !important; }
        }
      `}</style>
      <a
        href={model.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={model.cta_aria_label || `Message ${displayName} on WhatsApp`}
        data-whatsapp-tier1-cta="1"
        style={ctaStyle}
      >
        {model.cta_label || 'Message us on WhatsApp'}
      </a>
      <p data-whatsapp-tier1-desktop-hint="1" style={hintDesktopStyle}>
        {model.desktop_hint}
      </p>
      <p data-whatsapp-tier1-mobile-hint="1" style={hintMobileStyle}>
        {model.mobile_hint}
      </p>
      {showQrBlock ? (
        <figure data-whatsapp-tier1-qr="1" style={qrFigureStyle}>
          <img src={qrDataUri} alt={model.qr_alt || `QR code to message ${displayName} on WhatsApp`} width={168} height={168} />
          {model.qr_caption ? <figcaption style={mutedStyle}>{model.qr_caption}</figcaption> : null}
        </figure>
      ) : null}
      <p style={bodyStyle}>
        No WhatsApp?{' '}
        <a href={model.tel_href} aria-label={`Call ${displayName} at ${model.business_phone}`}>
          Call {model.business_phone}
        </a>
        . {model.fallback_copy}
      </p>
      <p style={privacyStyle}>{model.privacy_notice}</p>
      <p style={consentStyle}>{model.consent_label}</p>
    </section>
  );
}

const sectionStyle = {
  display: 'grid',
  gap: 12,
  maxWidth: 420,
  minWidth: 0,
};

const ctaStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 44,
  padding: '12px 18px',
  borderRadius: 999,
  background: '#128C7E',
  color: '#ffffff',
  fontWeight: 700,
  textDecoration: 'none',
  width: 'fit-content',
};

const bodyStyle = {
  margin: 0,
  fontSize: 15,
  lineHeight: 1.55,
  color: '#1f2933',
};

const mutedStyle = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.5,
  color: '#4b5563',
};

const privacyStyle = {
  ...mutedStyle,
  fontSize: 13,
};

const consentStyle = {
  ...mutedStyle,
  fontSize: 13,
};

const qrFigureStyle = {
  margin: 0,
};

const hintDesktopStyle = {
  ...mutedStyle,
  display: 'block',
};

const hintMobileStyle = {
  ...mutedStyle,
  display: 'none',
};
