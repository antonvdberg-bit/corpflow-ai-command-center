import React from 'react';
import Head from 'next/head';

import PhotoBackground from './PhotoBackground.js';
import Scrim from './Scrim.js';
import GlassPanel from './GlassPanel.js';
import { GLASS_GLOBAL_CSS, GLASS_TOKENS } from '../../lib/ui/glass.js';

/**
 * Shared CorpFlowAI "photo + glass" page shell for public marketing surfaces
 * (docs/marketing/CORPFLOW_VISUAL_STANDARD_HUMAN_FIRST_BEAUTY_LAYER.md,
 * docs/marketing/CORPFLOW_BEAUTY_LAYER_ROLLOUT_PLAN_V1.md §4).
 *
 * It centralises the single most error-prone part of the beauty layer — the
 * stacking-context recipe that took two PRs to get right in Product A:
 *   - the `.page` wrapper forms its own stacking context via
 *     `position:relative; isolation:isolate;` and carries NO opaque background,
 *     so the fixed photographic layer paints through (see PR #450 regression);
 *   - photo (zIndex 0) -> scrim (zIndex 1) -> content (zIndex 2).
 *
 * It also injects the global glass CSS (reduced-transparency / reduced-motion
 * fallbacks), the focus-ring style, and the nav text-shadow once, and wraps an
 * optional footer in a recessed glass panel so it reads on a legible surface.
 *
 * Page-specific <Head> content (title, description, canonical, robots, OG) stays
 * in the page; Next.js merges multiple <Head> usages.
 *
 * @param {{
 *   hero: {
 *     base?: string,            // e.g. '/assets/visuals/foo-v1' (derivatives: .avif/.webp/.jpg + -<mobile> variants)
 *     sources?: Array<{ type?: string, media?: string, srcSet: string }>,
 *     fallbackSrc?: string,     // defaults to `${base}.jpg`
 *     alt?: string,             // '' => decorative (meaning carried by copy)
 *     objectPosition?: string,
 *     preloadSrcSet?: string,   // defaults to `${base}-1280.avif 1280w, ${base}.avif 2400w`
 *     preload?: boolean,        // emit the AVIF responsive preload (default true when base set)
 *   },
 *   scrimTone?: 'dark'|'light',
 *   pageClassName?: string,
 *   maxWidth?: number,
 *   contentStyle?: React.CSSProperties,
 *   footer?: React.ReactNode,
 *   children?: React.ReactNode,
 * }} props
 */
export default function PublicMarketingPhotoGlassShell({
  hero = {},
  scrimTone = 'dark',
  pageClassName = 'cf-glass-page',
  maxWidth = 1120,
  contentStyle,
  footer,
  children,
}) {
  const base = hero.base;
  const sources = hero.sources || [];
  const fallbackSrc = hero.fallbackSrc || (base ? `${base}.jpg` : undefined);
  const preload = hero.preload !== false && Boolean(base);
  const preloadSrcSet =
    hero.preloadSrcSet || (base ? `${base}-1280.avif 1280w, ${base}.avif 2400w` : undefined);

  const css =
    GLASS_GLOBAL_CSS +
    `.${pageClassName} a:focus-visible,.${pageClassName} button:focus-visible,.${pageClassName} input:focus-visible,.${pageClassName} textarea:focus-visible{outline:2px solid ${GLASS_TOKENS.accent};outline-offset:2px;border-radius:8px;}` +
    // The nav is the only copy that may sit directly on the photograph; a soft
    // shadow keeps it AA-legible without darkening the photo with a heavier scrim.
    `.${pageClassName} nav{text-shadow:0 1px 3px rgba(3,8,15,0.55);}`;

  return (
    <div
      className={pageClassName}
      style={{
        position: 'relative',
        isolation: 'isolate',
        minHeight: '100vh',
        overflowX: 'hidden',
        color: GLASS_TOKENS.text,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <Head>
        {preload ? (
          <link
            rel="preload"
            as="image"
            type="image/avif"
            href={`${base}.avif`}
            imageSrcSet={preloadSrcSet}
            imageSizes="100vw"
          />
        ) : null}
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </Head>

      {fallbackSrc ? (
        <PhotoBackground
          fixed
          priority
          zIndex={0}
          fallbackSrc={fallbackSrc}
          sources={sources}
          alt={hero.alt || ''}
          objectPosition={hero.objectPosition || 'center'}
        />
      ) : null}
      <Scrim fixed tone={scrimTone} zIndex={1} />

      <main style={{ position: 'relative', zIndex: 2, maxWidth, margin: '0 auto', padding: '42px 20px 56px', ...contentStyle }}>
        {children}
        {footer ? (
          <GlassPanel
            variant={{ fill: GLASS_TOKENS.glassFillSoft, padding: 22, elevation: 1 }}
            style={{ marginTop: 40 }}
          >
            {footer}
          </GlassPanel>
        ) : null}
      </main>
    </div>
  );
}
