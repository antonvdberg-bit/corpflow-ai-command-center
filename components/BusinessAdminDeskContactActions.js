import React, { useState } from 'react';

import { CF, cfBtnPrimary, cfBtnSecondary } from './public/corpflow-public-styles.js';

const CONTACT_EMAIL = 'swart829@gmail.com';

function buildMailto(subject, body) {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function BusinessAdminDeskContactActions({
  label = "Tell us what's going on",
  subject = 'Business Admin Desk enquiry',
  body = `Hi Business Admin Desk,

I need help with a company-administration matter.

What has happened / what I need help with:

Company name:

You can reply to me on this email.`,
  compact = false,
  secondary,
}) {
  const [copied, setCopied] = useState(false);
  const href = buildMailto(subject, body);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <a
          href={href}
          style={compact ? { ...cfBtnPrimary, fontSize: 13, minHeight: 40, padding: '10px 16px' } : cfBtnPrimary}
        >
          {label}
        </a>
        {secondary || null}
      </div>
      <p style={{ margin: '9px 0 0', color: CF.textMuted, fontSize: 12.5, lineHeight: 1.5 }}>
        Opens an email with a short starter message. Prefer webmail?{' '}
        <button
          type="button"
          onClick={copyEmail}
          style={{
            appearance: 'none',
            border: 0,
            padding: 0,
            background: 'transparent',
            color: CF.link,
            font: 'inherit',
            fontWeight: 700,
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          {copied ? 'Email address copied' : 'Copy our email address'}
        </button>
        .
      </p>
    </div>
  );
}

export { CONTACT_EMAIL, buildMailto };
