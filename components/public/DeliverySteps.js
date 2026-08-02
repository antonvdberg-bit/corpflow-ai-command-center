import React from 'react';
import { cfBody, cfCard, cfGrid, cfH2, cfKicker, cfSection, CF } from './corpflow-public-styles.js';

/**
 * @param {{
 *   steps: { step: string, title: string, body: string }[],
 *   label?: string,
 *   title?: string,
 * }} props
 */
export default function DeliverySteps({
  steps,
  label = 'How delivery works',
  title = 'From discovery to visible output',
}) {
  return (
    <section style={cfSection}>
      <p style={cfKicker}>{label}</p>
      <h2 style={cfH2}>{title}</h2>
      <div style={cfGrid}>
        {steps.map((s) => (
          <div key={s.step} style={cfCard}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                background: 'rgba(125,211,252,0.18)',
                color: CF.link,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 13,
                marginBottom: 10,
              }}
            >
              {s.step}
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, color: CF.text }}>{s.title}</h3>
            <p style={{ ...cfBody, margin: 0, fontSize: 14 }}>{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
