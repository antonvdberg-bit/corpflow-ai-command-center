import React from 'react';
import GlassPanel from './GlassPanel.js';
import { GLASS_TOKENS } from '../../lib/ui/glass.js';

/**
 * High-contrast action surface. Uses the stronger (more opaque) glass fill
 * because it wraps text- and input-dense content (the intake form) that must
 * be the most readable surface on the page. The primary CTA *inside* this
 * block remains a solid teal fill — never given backdrop-filter — so it never
 * loses contrast against the photo.
 *
 * @param {{ style?: React.CSSProperties, children?: React.ReactNode }} props
 */
export default function CtaGlassBlock({ style, children }) {
  return (
    <GlassPanel variant={{ fill: GLASS_TOKENS.glassFillStrong, padding: 24, elevation: 3 }} style={style}>
      {children}
    </GlassPanel>
  );
}
