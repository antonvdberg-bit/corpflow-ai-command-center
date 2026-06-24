import React from 'react';

/**
 * Full-bleed photographic background — the base layer of the Human-First
 * Beauty Layer (docs/marketing/CORPFLOW_VISUAL_STANDARD_HUMAN_FIRST_BEAUTY_LAYER.md).
 *
 * Renders an art-directed responsive <picture>. When `fixed` is set the
 * background covers the viewport and stays put as content scrolls (no CLS,
 * since it is taken out of flow at a known size). When the photo is purely
 * atmospheric, pass `alt=""` so assistive tech skips it; the manifest carries
 * the descriptive alt for governance.
 *
 * @param {{
 *   fallbackSrc: string,
 *   sources?: Array<{ type?: string, media?: string, srcSet: string }>,
 *   alt?: string,
 *   priority?: boolean,
 *   fixed?: boolean,
 *   objectPosition?: string,
 *   style?: React.CSSProperties,
 * }} props
 */
export default function PhotoBackground({
  fallbackSrc,
  sources = [],
  alt = '',
  priority = false,
  fixed = false,
  objectPosition = 'center',
  style,
}) {
  const decorative = alt === '';
  return (
    <div
      aria-hidden={decorative ? 'true' : undefined}
      style={{
        position: fixed ? 'fixed' : 'absolute',
        inset: 0,
        zIndex: -2,
        overflow: 'hidden',
        backgroundColor: '#06111f',
        ...style,
      }}
    >
      <picture>
        {sources.map((s) => (
          <source key={s.srcSet} type={s.type} media={s.media} srcSet={s.srcSet} />
        ))}
        <img
          src={fallbackSrc}
          alt={alt}
          decoding="async"
          loading={priority ? 'eager' : 'lazy'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition,
            display: 'block',
          }}
        />
      </picture>
    </div>
  );
}
