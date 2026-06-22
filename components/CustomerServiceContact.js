import React from 'react';
import {
  CUSTOMER_SERVICE_EMAIL,
  CUSTOMER_SERVICE_PHONE,
  formatSupportSlaText,
  hasCustomerServicePhone,
} from '../lib/public/merchant-identity.js';

const linkStyle = { color: '#7dd3fc', textDecoration: 'none' };

/**
 * Shared customer-service contact block for policy and compliance pages.
 */
export default function CustomerServiceContact({ style }) {
  const pStyle = style || { color: '#aebfd1', lineHeight: 1.75, margin: '0 0 14px', fontSize: 15.5 };

  return (
    <>
      <p style={pStyle}>
        Email:{' '}
        <a href={`mailto:${CUSTOMER_SERVICE_EMAIL}`} style={linkStyle}>
          {CUSTOMER_SERVICE_EMAIL}
        </a>
      </p>
      {hasCustomerServicePhone() ? (
        <p style={pStyle}>
          Telephone:{' '}
          <a href={`tel:${CUSTOMER_SERVICE_PHONE.replace(/\s/g, '')}`} style={linkStyle}>
            {CUSTOMER_SERVICE_PHONE}
          </a>
        </p>
      ) : (
        <p style={pStyle}>
          Telephone: a published merchant support line will appear here when SBM e-Commerce onboarding is
          complete. Until then, email {CUSTOMER_SERVICE_EMAIL} and we will arrange a callback during
          Mauritius business hours (Monday–Friday).
        </p>
      )}
      <p style={pStyle}>Response expectation: {formatSupportSlaText()}</p>
    </>
  );
}
