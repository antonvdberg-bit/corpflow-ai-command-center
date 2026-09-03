import React, { useState } from 'react';
import Link from 'next/link';
import { CORPflow_PUBLIC_NAV } from '../../lib/public/corpflow-public-market.js';
import { cfBtnPrimary, cfLink, CF } from './corpflow-public-styles.js';

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  brand: { fontWeight: 900, fontSize: 20, color: CF.text, textDecoration: 'none', letterSpacing: '-0.02em' },
  brandSub: { color: CF.textFaint, fontSize: 12, marginTop: 2 },
  links: { display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' },
  link: { ...cfLink, fontSize: 13.5, fontWeight: 500 },
  menuBtn: {
    display: 'none',
    background: 'rgba(255,255,255,0.08)',
    border: `1px solid ${CF.panelBorder}`,
    color: CF.text,
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  mobilePanel: {
    display: 'none',
    flexDirection: 'column',
    gap: 10,
    padding: '14px 0 4px',
    borderTop: `1px solid ${CF.panelBorder}`,
    marginTop: 12,
  },
  mobileOpen: { display: 'flex' },
};

/**
 * Shared CorpFlowAI public header with desktop links and mobile menu toggle.
 * @param {{ cta?: { label: string, href: string } | null }} props
 */
export default function CorpFlowPublicHeader({ cta = { label: 'Book discovery', href: '/contact' } }) {
  const [open, setOpen] = useState(false);

  return (
    <header>
      <nav style={styles.nav} aria-label="Primary">
        <div>
          <Link href="/" style={styles.brand}>
            CorpFlowAI
          </Link>
          <div style={styles.brandSub}>Mauritius-based · selected clients</div>
        </div>
        <button
          type="button"
          className="cf-nav-menu-btn"
          style={styles.menuBtn}
          aria-expanded={open}
          aria-controls="cf-public-nav-panel"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Close menu' : 'Menu'}
        </button>
        <div className="cf-nav-desktop" style={styles.links}>
          {CORPflow_PUBLIC_NAV.map((item) => (
            <Link key={item.href} href={item.href} style={styles.link}>
              {item.label}
            </Link>
          ))}
          {cta ? (
            <Link href={cta.href} style={{ ...cfBtnPrimary, fontSize: 13, minHeight: 40, padding: '10px 16px' }}>
              {cta.label}
            </Link>
          ) : null}
        </div>
      </nav>
      <div
        id="cf-public-nav-panel"
        className={`cf-nav-mobile${open ? ' cf-nav-mobile-open' : ''}`}
        style={{ ...styles.mobilePanel, ...(open ? styles.mobileOpen : {}) }}
      >
        {CORPflow_PUBLIC_NAV.map((item) => (
          <Link key={item.href} href={item.href} style={styles.link} onClick={() => setOpen(false)}>
            {item.label}
          </Link>
        ))}
        {cta ? (
          <Link href={cta.href} style={cfBtnPrimary} onClick={() => setOpen(false)}>
            {cta.label}
          </Link>
        ) : null}
      </div>
      <style jsx global>{`
        @media (max-width: 720px) {
          .cf-nav-menu-btn {
            display: inline-flex !important;
          }
          .cf-nav-desktop {
            display: none !important;
          }
          .cf-nav-mobile.cf-nav-mobile-open {
            display: flex !important;
          }
        }
        @media (min-width: 721px) {
          .cf-nav-mobile {
            display: none !important;
          }
        }
        .cf-nav-menu-btn:focus-visible,
        .cf-nav-desktop a:focus-visible,
        .cf-nav-mobile a:focus-visible {
          outline: 2px solid #7dd3fc;
          outline-offset: 2px;
        }
      `}</style>
    </header>
  );
}
