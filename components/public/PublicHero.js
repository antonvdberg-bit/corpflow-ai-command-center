import React from 'react';
import Link from 'next/link';
import { cfBtnPrimary, cfBtnSecondary, cfH1, cfKicker, cfLead } from './corpflow-public-styles.js';

/**
 * @param {{ eyebrow?: string, headline: string, subhead: string, primaryCta: { label: string, href: string }, secondaryCta?: { label: string, href: string } }} props
 */
export default function PublicHero({ eyebrow, headline, subhead, primaryCta, secondaryCta }) {
  return (
    <header style={{ marginTop: 28 }}>
      {eyebrow ? <p style={cfKicker}>{eyebrow}</p> : null}
      <h1 style={cfH1}>{headline}</h1>
      <p style={cfLead}>{subhead}</p>
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
    </header>
  );
}
