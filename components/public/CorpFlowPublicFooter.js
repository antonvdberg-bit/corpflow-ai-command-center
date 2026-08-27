import React from 'react';
import Link from 'next/link';
import PublicSiteFooter from '../PublicSiteFooter.js';
import { CORPflow_PUBLIC_LAUNCH_PRODUCTS } from '../../lib/public/corpflow-public-market.js';
import { CF, cfLink } from './corpflow-public-styles.js';

/**
 * Trust footer for CorpFlowAI public pages — company descriptor, offers, policies.
 * Wraps PublicSiteFooter for merchant identity and compliance copy.
 */
export default function CorpFlowPublicFooter({ extra }) {
  const year = new Date().getFullYear();
  const products = CORPflow_PUBLIC_LAUNCH_PRODUCTS;

  return (
    <footer style={{ marginTop: 48 }}>
      <div
        style={{
          padding: '24px 0',
          borderTop: `1px solid ${CF.panelBorder}`,
          borderBottom: `1px solid ${CF.panelBorder}`,
          marginBottom: 20,
        }}
      >
        <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: CF.text }}>CorpFlowAI</p>
        <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.65, color: CF.textMuted, maxWidth: 640 }}>
          CorpFlowAI designs and operates practical AI-assisted workflow systems with managed delivery — lead
          response, website operating upgrades, and administration improvement. ERPNext holds commercial records;
          CorpFlowAI is the public selling and delivery wrapper.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13 }}>
          {products.map((product) => (
            <Link key={product.href} href={product.href} style={cfLink}>
              {product.label}
            </Link>
          ))}
        </div>
        <p style={{ margin: '16px 0 0', fontSize: 12, color: CF.textFaint }}>
          © {year} CorpFlowAI Ltd · Mauritius ·{' '}
          <Link href="/contact" style={cfLink}>
            Contact
          </Link>
          {' · '}
          <Link href="/insights" style={cfLink}>
            Insights
          </Link>
          {' · '}
          <Link href="/videos" style={cfLink}>
            Videos
          </Link>
          {' · '}
          <Link href="/privacy" style={cfLink}>
            Privacy
          </Link>
          {' · '}
          <Link href="/terms" style={cfLink}>
            Terms
          </Link>
        </p>
      </div>
      <PublicSiteFooter extra={extra} />
    </footer>
  );
}
