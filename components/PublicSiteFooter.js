import React from 'react';
import Link from 'next/link';
import {
  CUSTOMER_SERVICE_EMAIL,
  CUSTOMER_SERVICE_PHONE,
  formatCurrencyDisclosure,
  formatMerchantIdentityLine,
  formatSupportSlaText,
  hasCustomerServicePhone,
} from '../lib/public/merchant-identity.js';

const linkStyle = { color: '#7dd3fc', textDecoration: 'none' };

export default function PublicSiteFooter({ extra, flush = false }) {
  const phoneSegment = hasCustomerServicePhone() ? (
    <>
      {' · '}
      <a href={`tel:${CUSTOMER_SERVICE_PHONE.replace(/\s/g, '')}`} style={linkStyle}>
        {CUSTOMER_SERVICE_PHONE}
      </a>
    </>
  ) : null;

  // `flush` drops the top margin/padding/divider so the footer can sit inside a
  // surrounding surface (e.g. a glass panel) that already provides separation.
  // Default (false) preserves the standalone footer used across other pages.
  const footerStyle = flush
    ? { fontSize: 12, color: '#9fb2c8', lineHeight: 1.65 }
    : { marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.12)', fontSize: 12, color: '#9fb2c8', lineHeight: 1.65 };

  return (
    <footer style={footerStyle}>
      {extra ? <div style={{ marginBottom: 12 }}>{extra}</div> : null}
      <div>
        <Link href="/lead-rescue" style={linkStyle}>
          AI Lead Rescue
        </Link>
        {' · '}
        <Link href="/services" style={linkStyle}>
          Services
        </Link>
        {' · '}
        <Link href="/about" style={linkStyle}>
          About
        </Link>
        {' · '}
        <Link href="/process" style={linkStyle}>
          Process
        </Link>
        {' · '}
        <Link href="/standards" style={linkStyle}>
          Standards
        </Link>
        {' · '}
        <Link href="/onboarding" style={linkStyle}>
          Onboarding
        </Link>
        {' · '}
        <Link href="/contact" style={linkStyle}>
          Contact
        </Link>
        {' · '}
        <Link href="/privacy" style={linkStyle}>
          Privacy
        </Link>
        {' · '}
        <Link href="/terms" style={linkStyle}>
          Terms
        </Link>
        {' · '}
        <Link href="/refund-policy" style={linkStyle}>
          Refund policy
        </Link>
        {' · '}
        <Link href="/delivery-policy" style={linkStyle}>
          Delivery
        </Link>
        {' · '}
        <Link href="/payment-security" style={linkStyle}>
          Payment security
        </Link>
        {' · '}
        <Link href="/login" style={linkStyle}>
          Client login
        </Link>
      </div>
      <div style={{ marginTop: 12 }}>{formatMerchantIdentityLine()}</div>
      <div style={{ marginTop: 12 }}>
        Service questions:{' '}
        <a href={`mailto:${CUSTOMER_SERVICE_EMAIL}`} style={linkStyle}>
          {CUSTOMER_SERVICE_EMAIL}
        </a>
        {phoneSegment}
        {' '}
        ({formatSupportSlaText().charAt(0).toLowerCase() + formatSupportSlaText().slice(1)}).
      </div>
      <div style={{ marginTop: 12 }}>{formatCurrencyDisclosure()}</div>
      <div style={{ marginTop: 12 }}>
        This website provides general service information. Final terms may be confirmed in the applicable invoice or
        service agreement. We do not guarantee new revenue. Results vary by business and lead volume. This is not legal,
        tax, or accounting advice.
      </div>
    </footer>
  );
}
