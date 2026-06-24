import React from 'react';
import { glassPanelStyle } from '../../lib/ui/glass.js';

/**
 * Frosted "3D glass" content panel. The `cf-glass` class lets the global
 * CSS (GLASS_GLOBAL_CSS) apply the reduced-transparency / reduced-motion
 * fallbacks. `variant` overrides opacity, tint, blur, radius, padding, etc.
 *
 * @param {{
 *   variant?: object,
 *   as?: keyof JSX.IntrinsicElements,
 *   className?: string,
 *   style?: React.CSSProperties,
 *   children?: React.ReactNode,
 * }} props
 */
export default function GlassPanel({ variant, as: Tag = 'div', className, style, children, ...rest }) {
  const cls = className ? `cf-glass ${className}` : 'cf-glass';
  return (
    <Tag className={cls} style={{ ...glassPanelStyle(variant), ...style }} {...rest}>
      {children}
    </Tag>
  );
}
