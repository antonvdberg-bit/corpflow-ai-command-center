import React from 'react';
import Head from 'next/head';

import BusinessAdminDeskBrand, { BUSINESS_ADMIN_DESK_MARK_PATH } from './BusinessAdminDeskBrand.js';
import BusinessAdminDeskLegalFooter from './BusinessAdminDeskLegalFooter.js';
import {
  BAD_PENDING_APPROVAL_HEADING,
  BAD_PENDING_APPROVAL_INTRO,
  BAD_PENDING_DECISIONS,
  BAD_POLICY_REVISION_LABEL,
} from '../lib/public/business-admin-desk-policies.js';
import { BUSINESS_ADMIN_DESK_PUBLIC_ORIGIN } from '../lib/public/business-admin-desk-packages.js';

const pageStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #07111f, #102a3b)',
  color: '#eef6ff',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
};

const prose = {
  color: '#d5e4f2',
  lineHeight: 1.7,
  fontSize: 16,
  margin: '0 0 14px',
};

const linkStyle = { color: '#7dd3fc' };

const POLICY_LINKS = [
  ['Pricing', '/pricing'],
  ['Terms', '/terms'],
  ['Privacy', '/privacy'],
  ['Refund policy', '/refund-policy'],
  ['Contact', 'mailto:info@businessadmindesk.co.za'],
];

/**
 * @param {{
 *   title: string,
 *   description: string,
 *   path: '/terms' | '/privacy' | '/refund-policy' | '/delivery-policy' | '/payment-security',
 *   review?: boolean,
 *   sections: ReadonlyArray<{ id: string, heading: string, paragraphs: readonly string[] }>,
 * }} props
 */
export default function BusinessAdminDeskPolicyPage({ title, description, path, review = false, sections }) {
  const canonical = `${BUSINESS_ADMIN_DESK_PUBLIC_ORIGIN}${path}`;
  return (
    <div style={pageStyle}>
      <Head>
        <title>{`${title} · Business Admin Desk`}</title>
        <meta name="description" content={description} />
        <meta name="robots" content={review ? 'noindex,nofollow' : 'index,follow'} />
        {review ? null : <link rel="canonical" href={canonical} />}
        <link rel="icon" href={BUSINESS_ADMIN_DESK_MARK_PATH} type="image/svg+xml" />
      </Head>
      <main style={{ maxWidth: 840, margin: '0 auto', padding: '32px 20px 64px' }}>
        <BusinessAdminDeskBrand subtitle="Operated by CorpFlowAI Ltd" />
        {review ? (
          <p style={{ color: '#fbbf24', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Internal review · not the public canonical page
          </p>
        ) : null}
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 44px)', lineHeight: 1.1, margin: '18px 0 8px' }}>{title}</h1>
        <p style={{ ...prose, color: '#9fb2c8', fontSize: 14 }}>{BAD_POLICY_REVISION_LABEL}</p>
        <nav aria-label="Business Admin Desk policies" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '8px 0 24px' }}>
          {POLICY_LINKS.map(([label, href]) => (
            <a key={label} href={href} style={linkStyle}>
              {label}
            </a>
          ))}
        </nav>
        {sections.map((section) => (
          <section key={section.id} style={{ marginTop: 28 }} aria-labelledby={`bad-policy-${section.id}`}>
            <h2 id={`bad-policy-${section.id}`} style={{ fontSize: 22, margin: '0 0 10px' }}>
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} style={prose}>
                {paragraph}
              </p>
            ))}
          </section>
        ))}
        <section
          aria-labelledby="bad-policy-pending"
          style={{
            marginTop: 32,
            padding: 20,
            border: '1px solid rgba(251,191,36,0.55)',
            borderRadius: 16,
            background: 'rgba(251,191,36,0.08)',
          }}
        >
          <h2 id="bad-policy-pending" style={{ margin: '0 0 10px', color: '#fde68a' }}>
            {BAD_PENDING_APPROVAL_HEADING}
          </h2>
          <p style={prose}>{BAD_PENDING_APPROVAL_INTRO}</p>
          <ul style={{ ...prose, paddingLeft: 20 }}>
            {BAD_PENDING_DECISIONS.map((item) => (
              <li key={item} style={{ marginBottom: 8 }}>
                {item}
              </li>
            ))}
          </ul>
        </section>
        <BusinessAdminDeskLegalFooter />
      </main>
    </div>
  );
}
