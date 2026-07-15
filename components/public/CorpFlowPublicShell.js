import React from 'react';
import Head from 'next/head';
import CorpFlowPublicHeader from './CorpFlowPublicHeader.js';
import CorpFlowPublicFooter from './CorpFlowPublicFooter.js';
import CorpFlowBrandMetadata from './CorpFlowBrandMetadata.js';
import { cfPage, cfShell } from './corpflow-public-styles.js';

/**
 * Editorial gradient shell for CorpFlowAI public pages (homepage, contact, policies).
 * @param {{
 *   meta: { title: string, description: string, canonical?: string, ogTitle?: string, ogDescription?: string, ogUrl?: string, ogImage?: string, twitterCard?: string },
 *   children: React.ReactNode,
 *   maxWidth?: number,
 *   headerCta?: { label: string, href: string } | null,
 *   footerExtra?: string,
 *   brandHost?: string | null,
 *   brandSearch?: string | null,
 * }} props
 */
export default function CorpFlowPublicShell({
  meta,
  children,
  maxWidth,
  headerCta,
  footerExtra,
  brandHost = null,
  brandSearch = null,
}) {
  return (
    <div style={cfPage}>
      <CorpFlowBrandMetadata host={brandHost} search={brandSearch} />
      <Head>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        {meta.canonical ? <link rel="canonical" href={meta.canonical} /> : null}
        <meta property="og:title" content={meta.ogTitle || meta.title} />
        <meta property="og:description" content={meta.ogDescription || meta.description} />
        {meta.ogUrl ? <meta property="og:url" content={meta.ogUrl} /> : null}
        {meta.ogImage ? <meta property="og:image" content={meta.ogImage} /> : null}
        <meta name="twitter:card" content={meta.twitterCard || 'summary_large_image'} />
        <meta name="twitter:title" content={meta.ogTitle || meta.title} />
        <meta name="twitter:description" content={meta.ogDescription || meta.description} />
        {meta.ogImage ? <meta name="twitter:image" content={meta.ogImage} /> : null}
      </Head>
      <main style={cfShell(maxWidth)}>
        <CorpFlowPublicHeader cta={headerCta} />
        {children}
        <CorpFlowPublicFooter extra={footerExtra} />
      </main>
    </div>
  );
}
