import React from 'react';
import { GLASS_TOKENS } from '../../lib/ui/glass.js';

/**
 * Atmospheric overlay between the photo and the content. Its only job is
 * readability — strengthen the scrim before touching panel opacity when a
 * contrast check fails over a bright region of the photo.
 *
 * @param {{ tone?: 'dark'|'light', fixed?: boolean, zIndex?: number, style?: React.CSSProperties, publicScrimHook?: boolean }} props
 */
export default function Scrim({ tone = 'dark', fixed = false, zIndex = 1, style, publicScrimHook = false }) {
  const background = tone === 'light' ? GLASS_TOKENS.scrimLight : GLASS_TOKENS.scrimDark;
  return (
    <div
      aria-hidden="true"
      {...(publicScrimHook ? { 'data-cf-public-scrim': '' } : {})}
      style={{
        position: fixed ? 'fixed' : 'absolute',
        inset: 0,
        zIndex,
        background,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}
