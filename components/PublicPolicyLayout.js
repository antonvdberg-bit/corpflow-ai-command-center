import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #06111f 0%, #0b1f33 45%, #101827 100%)',
    color: '#eef6ff',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  shell: { maxWidth: 800, margin: '0 auto', padding: '42px 20px 56px' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 32 },
  brand: { fontWeight: 900, fontSize: 20, color: '#eef6ff', textDecoration: 'none' },
  navLinks: { display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13 },
  link: { color: '#7dd3fc', textDecoration: 'none' },
  h1: { margin: '0 0 8px', fontSize: 32, letterSpacing: '-0.03em' },
  updated: { color: '#9fb2c8', fontSize: 13, marginBottom: 24 },
  footer: { marginTop: 40, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.12)', fontSize: 12, color: '#9fb2c8', lineHeight: 1.6 },
};

export const policyStyles = {
  section: { marginTop: 24 },
  h2: { fontSize: 20, margin: '0 0 10px', color: '#c9d8e8' },
  p: { color: '#aebfd1', lineHeight: 1.7, margin: '0 0 12px' },
  ul: { color: '#aebfd1', lineHeight: 1.75, paddingLeft: 20, margin: '0 0 12px' },
};

function PolicyFooter() {
  return (
    <footer style={styles.footer}>
      This website provides general service information. Final terms may be confirmed in the applicable invoice or
      service agreement. CorpFlowAI does not provide legal, tax, or accounting advice on these pages.
      <div style={{ marginTop: 12 }}>
        <Link href="/" style={styles.link}>
          Home
        </Link>
        {' · '}
        <Link href="/lead-rescue" style={styles.link}>
          AI Lead Rescue
        </Link>
        {' · '}
        <Link href="/privacy" style={styles.link}>
          Privacy
        </Link>
        {' · '}
        <Link href="/terms" style={styles.link}>
          Terms
        </Link>
        {' · '}
        <Link href="/refund-policy" style={styles.link}>
          Refund policy
        </Link>
      </div>
    </footer>
  );
}

export default function PublicPolicyLayout({ title, children }) {
  return (
    <div style={styles.page}>
      <Head>
        <title>{title} · CorpFlowAI</title>
      </Head>
      <main style={styles.shell}>
        <nav style={styles.nav}>
          <Link href="/" style={styles.brand}>
            CorpFlowAI
          </Link>
          <div style={styles.navLinks}>
            <Link href="/lead-rescue" style={styles.link}>
              AI Lead Rescue
            </Link>
            <Link href="/contact" style={styles.link}>
              Contact
            </Link>
            <Link href="/privacy" style={styles.link}>
              Privacy
            </Link>
            <Link href="/terms" style={styles.link}>
              Terms
            </Link>
            <Link href="/refund-policy" style={styles.link}>
              Refunds
            </Link>
          </div>
        </nav>
        <h1 style={styles.h1}>{title}</h1>
        <p style={styles.updated}>Last updated: May 2026. This page may be updated from time to time.</p>
        {children}
        <PolicyFooter />
      </main>
    </div>
  );
}


