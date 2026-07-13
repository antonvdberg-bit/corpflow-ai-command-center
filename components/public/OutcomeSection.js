import React from 'react';
import { cfBody, cfH2, cfKicker, cfSection } from './corpflow-public-styles.js';

/**
 * @param {{ label?: string, title: string, children: React.ReactNode, id?: string }} props
 */
export default function OutcomeSection({ label, title, children, id }) {
  return (
    <section id={id} style={cfSection}>
      {label ? <p style={cfKicker}>{label}</p> : null}
      <h2 style={cfH2}>{title}</h2>
      <div style={cfBody}>{children}</div>
    </section>
  );
}
