import React from 'react';
import Head from 'next/head';
import PublicMarketingPhotoGlassShell from '../beauty/PublicMarketingPhotoGlassShell.js';
import CorpFlowPublicHeader from './CorpFlowPublicHeader.js';
import CorpFlowPublicFooter from './CorpFlowPublicFooter.js';
import CorpFlowBrandMetadata from './CorpFlowBrandMetadata.js';
import {
  buildPublicVisualHero,
  CORPFLOW_PUBLIC_HERO_SCRIM_DESKTOP,
} from '../../lib/public/corpflow-public-visuals.js';

/**
 * Photo + glass public shell for CorpFlowAI market pages.
 * Backgrounds from CORPFLOW_PUBLIC_VISUALS; all copy/CTAs stay live HTML.
 *
 * @param {{
 *   meta: { title: string, description: string, canonical?: string, ogTitle?: string, ogDescription?: string, ogUrl?: string, ogImage?: string, twitterCard?: string },
 *   visualKey: 'home'|'contact'|'about'|'process'|'services'|'standards'|'onboarding',
 *   children: React.ReactNode,
 *   maxWidth?: number,
 *   headerCta?: { label: string, href: string } | null,
 *   footerExtra?: string,
 *   pageClassName?: string,
 * }} props
 */
export default function CorpFlowPublicPhotoShell({
  meta,
  visualKey,
  children,
  maxWidth = 1120,
  headerCta,
  footerExtra,
  pageClassName,
}) {
  const hero = buildPublicVisualHero(visualKey);
  const className = pageClassName || `cf-public-photo-${visualKey}`;

  return (
    <>
      <CorpFlowBrandMetadata />
      <Head>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        {meta.canonical ? <link rel="canonical" href={meta.canonical} /> : null}
        <meta property="og:title" content={meta.ogTitle || meta.title} />
        <meta property="og:description" content={meta.ogDescription || meta.description} />
        {meta.ogUrl ? <meta property="og:url" content={meta.ogUrl} /> : null}
        <meta property="og:image" content={meta.ogImage || `${hero.base}.jpg`} />
        <meta name="twitter:card" content={meta.twitterCard || 'summary_large_image'} />
        <meta name="twitter:title" content={meta.ogTitle || meta.title} />
        <meta name="twitter:description" content={meta.ogDescription || meta.description} />
        <meta name="twitter:image" content={meta.ogImage || `${hero.base}.jpg`} />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media (max-width: 768px) {
                .${className} [data-cf-public-scrim] {
                  background: linear-gradient(180deg, rgba(3,15,34,0.9) 0%, rgba(3,15,34,0.82) 62%, rgba(3,15,34,0.72) 100%) !important;
                }
              }
            `,
          }}
        />
      </Head>
      <PublicMarketingPhotoGlassShell
        pageClassName={className}
        maxWidth={maxWidth}
        hero={hero}
        scrimTone="dark"
        scrimStyle={{ background: CORPFLOW_PUBLIC_HERO_SCRIM_DESKTOP }}
        publicScrimHook
        footer={<CorpFlowPublicFooter extra={footerExtra} />}
      >
        <CorpFlowPublicHeader cta={headerCta} />
        {children}
      </PublicMarketingPhotoGlassShell>
    </>
  );
}
