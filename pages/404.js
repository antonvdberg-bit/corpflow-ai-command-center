import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { needsWorkspaceEscape } from '../lib/app/consolidated-release-qualification.js';

/**
 * Branded 404 page (Packet 4.1 / Lux SEO fix).
 *
 * Replaces the generic Next.js `_error` HTML for any host. Trust + governance
 * §2.5 row 4 in `docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md`
 * requires a branded fallback (no raw Vercel / Next chrome).
 *
 * Constraints from Next.js: this page is statically generated and cannot use
 * `getInitialProps` or `getServerSideProps`. So we render a host-neutral
 * design that is acceptable for both apex (CorpFlowAI) and tenant marketing
 * surfaces (Luxurious Mauritius). The CTA always points to the host's own
 * homepage via a relative `/` link, so the user lands back on whichever site
 * they came from. Unknown `/app`, `/admin`, and `/change` URLs also offer
 * Open workspace (`/app`) so operators are not stranded on a marketing 404.
 *
 * Read-only — no data fetched, no tenant lookups, no analytics events.
 */
export default function NotFoundPage() {
  const router = useRouter();
  const requestedPath = String(router.asPath || '').split('?')[0];
  const showWorkspaceEscape = needsWorkspaceEscape(requestedPath);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#f5f5f5',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <Head>
        <title>Page not found</title>
        <meta name="robots" content="noindex" />
        <meta
          name="description"
          content="The page you requested could not be found. Return to the homepage to continue."
        />
      </Head>
      <main
        style={{
          maxWidth: 560,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#d4af37',
            marginBottom: 16,
          }}
        >
          404
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 16px' }}>Page not found</h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: '#bdbdbd', margin: '0 0 28px' }}>
          The page you requested could not be found on this site. Head back to the homepage and pick up from there.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '12px 22px',
              background: '#d4af37',
              color: '#0a0a0a',
              borderRadius: 8,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Back to homepage
          </Link>
          {showWorkspaceEscape ? (
            <Link
              href="/app"
              data-testid="workspace-escape"
              style={{
                display: 'inline-block',
                padding: '12px 22px',
                background: 'transparent',
                color: '#f5f5f5',
                borderRadius: 8,
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid rgba(245,245,245,0.35)',
              }}
            >
              Open workspace
            </Link>
          ) : null}
        </div>
      </main>
    </div>
  );
}
