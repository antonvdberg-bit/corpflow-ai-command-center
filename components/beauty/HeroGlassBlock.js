import React from 'react';
import GlassPanel from './GlassPanel.js';

/**
 * Hero composition on glass: eyebrow + headline + lead + CTA actions. Keeps
 * the primary CTA above the glass layer and the most prominent element
 * (the actions node owns CTA styling — the primary CTA stays a solid fill,
 * never translucent).
 *
 * @param {{
 *   eyebrow?: React.ReactNode,
 *   title?: React.ReactNode,
 *   lead?: React.ReactNode,
 *   actions?: React.ReactNode,
 *   style?: React.CSSProperties,
 *   children?: React.ReactNode,
 * }} props
 */
export default function HeroGlassBlock({ eyebrow, title, lead, actions, style, children }) {
  return (
    <GlassPanel variant={{ padding: 28 }} style={{ maxWidth: 760, ...style }}>
      {eyebrow}
      {title}
      {lead}
      {actions}
      {children}
    </GlassPanel>
  );
}
