/**
 * Shared Living Word TEST DEMO form-chain page chrome (client-safe constants + styles).
 */

import { TestEnvironmentRibbon } from '../sandbox/test-environment-ribbon.js';

export const DEMO_LABEL = '[LIVING WORD — TEST DEMO]';
export const LOGO_PATH = '/assets/tenants/living-word-mauritius/living-word-church-logo.png';
export const API_STATUS = '/api/factory_router?__path=tenant/living-word/demo-form-chain/status';
export const API_FORM1 = '/api/factory_router?__path=tenant/living-word/demo-form-chain/form-1';
export const API_FORM2_SESSION =
  '/api/factory_router?__path=tenant/living-word/demo-form-chain/form-2-session';
export const API_FORM2 = '/api/factory_router?__path=tenant/living-word/demo-form-chain/form-2';

export const COLOURS = {
  navy: '#0E1F3A',
  gold: '#C9A961',
  cream: '#FAF7F2',
  text: '#1A1A1A',
  muted: '#555',
};

export const RIBBON_MESSAGE = `${DEMO_LABEL} — Not a public launch. Synthetic test data only.`;

export function DemoPageShell({ title, children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: COLOURS.cream,
        color: COLOURS.text,
        font: '16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        paddingTop: 88,
        paddingBottom: 48,
      }}
    >
      <TestEnvironmentRibbon message={RIBBON_MESSAGE} />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '0 20px' }}>
        <header style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src={LOGO_PATH}
            alt="Living Word Church Mauritius"
            width={120}
            height={120}
            style={{ display: 'block', margin: '0 auto 16px', objectFit: 'contain' }}
          />
          <p
            style={{
              margin: '0 0 8px',
              fontWeight: 700,
              color: COLOURS.navy,
              fontSize: 14,
              letterSpacing: 0.3,
            }}
          >
            {DEMO_LABEL}
          </p>
          <h1 style={{ margin: '0 0 8px', fontSize: 26, color: COLOURS.navy }}>{title}</h1>
        </header>
        {children}
      </main>
    </div>
  );
}

export function fieldStyle() {
  return {
    display: 'block',
    width: '100%',
    padding: '10px 12px',
    marginTop: 4,
    marginBottom: 16,
    border: '1px solid #ccc',
    borderRadius: 6,
    fontSize: 16,
    boxSizing: 'border-box',
  };
}

export function labelStyle() {
  return { display: 'block', fontWeight: 600, color: COLOURS.navy, fontSize: 14 };
}

export function buttonStyle(disabled = false) {
  return {
    display: 'inline-block',
    padding: '12px 24px',
    background: disabled ? '#999' : COLOURS.navy,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: '100%',
  };
}

export function cardStyle() {
  return {
    background: '#fff',
    border: `1px solid ${COLOURS.gold}`,
    borderRadius: 10,
    padding: 24,
    boxShadow: '0 2px 12px rgba(14,31,58,0.08)',
  };
}
