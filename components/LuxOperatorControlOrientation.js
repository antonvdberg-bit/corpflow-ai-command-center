/**
 * Lux-only operator orientation banner for `/change` (issue #704).
 * Render only when `luxe-maurice` operator context is active.
 * Does not alter public Rare & Exclusive client surfaces.
 */

import {
  LUX_OPERATOR_CONTROL_NOT_PUBLIC_NOTICE,
  LUX_OPERATOR_CONTROL_PURPOSE,
  LUX_OPERATOR_CONTROL_SPACE_TITLE,
  LUX_OPERATOR_CRM_WORKSPACE_HASH,
  LUX_OPERATOR_JAN_TEST_CHECKLIST,
  buildLuxOperatorOrientationTokens,
} from '../lib/client/lux-operator-control-orientation.js';

/**
 * @param {{ compact?: boolean }} [props]
 */
export default function LuxOperatorControlOrientation({ compact = false }) {
  const t = buildLuxOperatorOrientationTokens();

  return (
    <section
      data-testid="lux-operator-control-orientation"
      aria-label={LUX_OPERATOR_CONTROL_SPACE_TITLE}
      style={{
        marginBottom: 16,
        padding: compact ? '14px 16px' : '16px 18px',
        borderRadius: 12,
        border: `1px solid ${t.panelBorder}`,
        background: t.panelBg,
        boxShadow: `inset 4px 0 0 ${t.accentBar}`,
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: t.eyebrow,
        }}
      >
        Operator control space
      </div>
      <h2
        data-testid="lux-operator-control-title"
        style={{
          margin: '8px 0 0',
          fontSize: compact ? 18 : 20,
          fontWeight: 800,
          color: t.title,
          lineHeight: 1.25,
          fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif',
        }}
      >
        {LUX_OPERATOR_CONTROL_SPACE_TITLE}
      </h2>
      <p
        data-testid="lux-operator-control-not-public"
        style={{
          margin: '8px 0 0',
          fontSize: 14,
          fontWeight: 800,
          color: t.notice,
          lineHeight: 1.4,
        }}
      >
        {LUX_OPERATOR_CONTROL_NOT_PUBLIC_NOTICE}
      </p>
      <p
        data-testid="lux-operator-control-purpose"
        style={{
          margin: '6px 0 0',
          fontSize: 13,
          color: t.body,
          lineHeight: 1.5,
          maxWidth: 720,
        }}
      >
        {LUX_OPERATOR_CONTROL_PURPOSE}
      </p>

      <div
        data-testid="lux-operator-jan-test-checklist"
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid rgba(148,163,184,0.25)',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: t.eyebrow,
            marginBottom: 8,
          }}
        >
          Jan functional test sequence
        </div>
        <ol
          style={{
            margin: 0,
            padding: '0 0 0 22px',
            color: t.body,
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          {LUX_OPERATOR_JAN_TEST_CHECKLIST.map((step, idx) => (
            <li
              key={step.id}
              data-testid={`lux-operator-jan-test-step-${step.id}`}
              style={{ marginBottom: 6 }}
            >
              <span style={{ color: t.stepNum, fontWeight: 800, marginRight: 6 }}>
                {idx + 1}.
              </span>
              {step.href ? (
                <a
                  href={step.href}
                  style={{ color: t.link, fontWeight: 600, textDecoration: 'underline' }}
                >
                  {step.label}
                </a>
              ) : (
                <span>{step.label}</span>
              )}
            </li>
          ))}
        </ol>
        <p
          style={{
            margin: '10px 0 0',
            fontSize: 12,
            color: t.muted,
            lineHeight: 1.45,
          }}
        >
          Existing enquiry workflow (#673 / #675): open{' '}
          <a
            href={LUX_OPERATOR_CRM_WORKSPACE_HASH}
            style={{ color: t.link, fontWeight: 700 }}
          >
            Leads · LuxeMaurice CRM
          </a>{' '}
          below — do not rebuild status elsewhere. Focus on workflow, not visual polish.
        </p>
      </div>
    </section>
  );
}
