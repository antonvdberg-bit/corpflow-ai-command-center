import React from 'react';
import { GLASS_TOKENS } from '../../lib/ui/glass.js';

/**
 * Atmospheric overlay between the photo and the content. Its only job is
 * readability — strengthen the scrim before touching panel opacity when a
 * contrast check fails over a bright region of the photo.
 *
 * @param {{ tone?: 'dark'|'light', fixed?: boolean, style?: React.CSSProperties }} props
 */
export default function Scrim({ tone = 'dark', fixed = false, style }) {
  const background = tone === 'light' ? GLASS_TOKENS.scrimLight : GLASS_TOKENS.scrimDark;
  return (
    <div
      aria-hidden="true"
      style={{
        position: fixed ? 'fixed' : 'absolute',
        inset: 0,
        zIndex: -1,
        background,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}
