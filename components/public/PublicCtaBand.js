import React from 'react';
import Link from 'next/link';
import { cfBtnPrimary, cfBtnSecondary, cfH2, cfKicker, cfSection, cfBody } from './corpflow-public-styles.js';

/**
 * @param {{ title: string, body: string, primaryCta: { label: string, href: string }, secondaryCta?: { label: string, href: string } }} props
 */
export default function PublicCtaBand({ title, body, primaryCta, secondaryCta }) {
  return (
    <section style={{ ...cfSection, marginTop: 48 }}>
      <div
        style={{
          background: 'rgba(45,212,191,0.08)',
          border: '1px solid rgba(45,212,191,0.28)',
          borderRadius: 20,
          padding: '28px 26px',
        }}
      >
        <p style={cfKicker}>Next step</p>
        <h2 style={cfH2}>{title}</h2>
        <p style={cfBody}>{body}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          <Link href={primaryCta.href} style={cfBtnPrimary}>
            {primaryCta.label}
          </Link>
          {secondaryCta ? (
            <Link href={secondaryCta.href} style={cfBtnSecondary}>
              {secondaryCta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
