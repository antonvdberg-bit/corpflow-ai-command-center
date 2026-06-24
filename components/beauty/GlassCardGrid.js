import React from 'react';

/**
 * Responsive grid of glass panels. Collapses to a single column on phones
 * via auto-fit + minmax, satisfying the mobile-first requirement without a
 * media-query stylesheet.
 *
 * @param {{
 *   minColWidth?: number,
 *   gap?: number,
 *   style?: React.CSSProperties,
 *   children?: React.ReactNode,
 * }} props
 */
export default function GlassCardGrid({ minColWidth = 260, gap = 18, style, children }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minColWidth}px, 1fr))`,
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
