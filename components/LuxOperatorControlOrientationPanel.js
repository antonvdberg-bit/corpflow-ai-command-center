import React, { useCallback, useState } from 'react';
import {
  LUX_OPERATOR_CONTROL_NOT_PUBLIC,
  LUX_OPERATOR_CONTROL_PURPOSE,
  LUX_OPERATOR_CONTROL_TITLE,
  LUX_OPERATOR_FUNCTIONAL_TEST_CHECKLIST,
} from '../lib/client/lux-operator-control-orientation.js';

/**
 * Lux-only operator orientation banner for `/change` (issue #704).
 *
 * Visually distinct from the public Rare & Exclusive ivory/sand site:
 * cool steel control strip on charcoal — not marketing chrome.
 * Surfaces the existing #673/#675 CRM workflow via checklist links.
 *
 * @param {{
 *   chrome?: {
 *     text?: string,
 *     textMuted?: string,
 *     textLabel?: string,
 *     gold?: string,
 *     border?: string,
 *     charcoalSoft?: string,
 *     fontBody?: string,
 *   } | null,
 *   style?: React.CSSProperties,
 * }} props
 */
export default function LuxOperatorControlOrientationPanel({ chrome = null, style }) {
  const [checked, setChecked] = useState(() => /** @type {Record<string, boolean>} */ ({}));

  const toggle = useCallback((id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const palette = {
    bg: chrome?.charcoalSoft || '#1A1817',
    border: 'rgba(94, 234, 212, 0.45)',
    accent: '#5eead4',
    accentSoft: 'rgba(94, 234, 212, 0.12)',
    title: chrome?.text || '#F4EFE8',
    body: chrome?.textMuted || 'rgba(244, 239, 232, 0.72)',
    label: chrome?.textLabel || '#A8842C',
    link: chrome?.gold || '#A8842C',
    warnBg: 'rgba(251, 191, 36, 0.12)',
    warnBorder: 'rgba(251, 191, 36, 0.55)',
    warnText: '#fde68a',
    font: chrome?.fontBody || 'ui-sans-serif, system-ui, sans-serif',
  };

  return (
    <aside
      data-testid="lux-operator-control-orientation"
      data-lux-operator-control-space="true"
      aria-label={LUX_OPERATOR_CONTROL_TITLE}
      style={{
        border: `1px solid ${palette.border}`,
        borderLeft: `4px solid ${palette.accent}`,
        background: `linear-gradient(135deg, ${palette.accentSoft} 0%, ${palette.bg} 42%)`,
        borderRadius: 6,
        padding: '16px 18px',
        marginBottom: 16,
        minWidth: 0,
        fontFamily: palette.font,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.25)',
        ...style,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: palette.accent,
        }}
      >
        Operator control space · Lux only
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 18,
          fontWeight: 800,
          color: palette.title,
          lineHeight: 1.3,
        }}
      >
        {LUX_OPERATOR_CONTROL_TITLE}
      </div>

      <div
        data-testid="lux-operator-control-not-public"
        style={{
          marginTop: 10,
          display: 'inline-block',
          padding: '6px 10px',
          borderRadius: 4,
          border: `1px solid ${palette.warnBorder}`,
          background: palette.warnBg,
          color: palette.warnText,
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: '0.01em',
        }}
      >
        {LUX_OPERATOR_CONTROL_NOT_PUBLIC}
      </div>

      <p
        style={{
          marginTop: 10,
          marginBottom: 0,
          fontSize: 13,
          lineHeight: 1.55,
          color: palette.body,
          maxWidth: 720,
        }}
      >
        {LUX_OPERATOR_CONTROL_PURPOSE} Public buyers use the ivory/sand site (
        <a href="/" style={{ color: palette.link, fontWeight: 700 }}>
          /
        </a>
        ,{' '}
        <a href="/concierge" style={{ color: palette.link, fontWeight: 700 }}>
          /concierge
        </a>
        ). You are on the private desk that reviews those enquiries.
      </p>

      <div
        style={{
          marginTop: 14,
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: palette.label,
        }}
      >
        Jan functional test sequence
      </div>
      <p
        style={{
          marginTop: 4,
          marginBottom: 8,
          fontSize: 12,
          color: palette.body,
          lineHeight: 1.45,
        }}
      >
        Test workflow capability (submit → find → contact fields → status moves). Do not treat this
        as a visual polish pass.
      </p>

      <ol
        data-testid="lux-operator-functional-test-checklist"
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'grid',
          gap: 8,
        }}
      >
        {LUX_OPERATOR_FUNCTIONAL_TEST_CHECKLIST.map((step, index) => {
          const isOn = !!checked[step.id];
          return (
            <li key={step.id} style={{ minWidth: 0 }}>
              <label
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  padding: '8px 10px',
                  borderRadius: 4,
                  border: `1px solid ${isOn ? palette.border : 'rgba(148,163,184,0.22)'}`,
                  background: isOn ? palette.accentSoft : 'rgba(0,0,0,0.18)',
                  color: palette.title,
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(step.id)}
                  data-testid={`lux-operator-test-step-${step.id}`}
                  style={{ marginTop: 3, flexShrink: 0 }}
                />
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 800, color: palette.accent, marginRight: 6 }}>
                    {index + 1}.
                  </span>
                  {step.href ? (
                    <a
                      href={step.href}
                      style={{ color: palette.link, fontWeight: 650, textDecoration: 'underline' }}
                    >
                      {step.label}
                    </a>
                  ) : (
                    <span style={{ fontWeight: 650 }}>{step.label}</span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ol>

      <p
        data-testid="lux-operator-workflow-surface-note"
        style={{
          marginTop: 12,
          marginBottom: 0,
          fontSize: 12,
          color: palette.body,
          lineHeight: 1.5,
        }}
      >
        Enquiry status workflow (new → contacted → qualified → invited → closed) lives in{' '}
        <a href="#lux-crm-leads-workspace" style={{ color: palette.link, fontWeight: 700 }}>
          Leads · LuxeMaurice CRM
        </a>{' '}
        below — same path as #673/#675. This panel only orients; it does not replace that desk.
      </p>
    </aside>
  );
}
