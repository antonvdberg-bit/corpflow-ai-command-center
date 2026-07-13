import React from 'react';
import { CORPFLOW_PUBLIC_VISUALS, CORPFLOW_PUBLIC_TRUST_SCRIM } from '../../lib/public/corpflow-public-visuals.js';

/**
 * Quiet trust/proof band using corpflow-trust-band (not a full-page hero).
 * Lazy-loads the decorative background; meaning stays in HTML children.
 */
export default function PublicTrustBand({ children }) {
  const slot = CORPFLOW_PUBLIC_VISUALS.trust;
  const base = slot.base;

  return (
    <section
      aria-label="Operating posture"
      style={{
        position: 'relative',
        marginTop: 40,
        borderRadius: 20,
        overflow: 'hidden',
        minHeight: 160,
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      <picture>
        <source type="image/avif" srcSet={`${base}-768.avif`} media="(max-width: 768px)" />
        <source type="image/webp" srcSet={`${base}-768.webp`} media="(max-width: 768px)" />
        <source type="image/avif" srcSet={`${base}.avif`} />
        <source type="image/webp" srcSet={`${base}.webp`} />
        <img
          src={`${base}.jpg`}
          alt=""
          width={1024}
          height={438}
          loading="lazy"
          decoding="async"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: slot.objectPositionDesktop,
          }}
        />
      </picture>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: CORPFLOW_PUBLIC_TRUST_SCRIM,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, padding: '28px 26px' }}>{children}</div>
    </section>
  );
}
