import React, { useState, useMemo, useCallback } from 'react';

import {
  LUX_CONTENT_SPRINT_GENERIC_GUIDANCE,
  getLuxContentSprintGuidance,
  normalizeLuxContentSprintCode,
} from '../lib/client/lux-content-sprint-guidance.js';

/**
 * Operator-desk Add content panel + content checklist for LuxeMaurice Content
 * Population Sprint child tickets (C1–C4). Rendered above the generic workflow
 * controls in `pages/change.js`.
 *
 * The checklist is operator guidance only (component-local state) — see
 * `lib/client/lux-content-sprint-guidance.js` and
 * `docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md` § 8b for the persistence follow-up.
 *
 * @param {{
 *   sprintCode: string | null,
 *   chrome?: { textLabel?: string, text?: string, textMuted?: string, borderHairline?: string, accent?: string, cta?: string } | null,
 *   onUploadClick?: () => void,
 *   style?: React.CSSProperties,
 * }} props
 */
export default function LuxContentSprintPanel({ sprintCode, chrome, onUploadClick, style }) {
  const normalizedCode = normalizeLuxContentSprintCode(sprintCode);
  const guidance = useMemo(
    () => (normalizedCode ? getLuxContentSprintGuidance(normalizedCode) : null),
    [normalizedCode],
  );
  const generic = LUX_CONTENT_SPRINT_GENERIC_GUIDANCE;

  const [checked, setChecked] = useState(() => /** @type {Record<string, boolean>} */ ({}));

  const toggle = useCallback(
    (id) => {
      setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
    },
    [],
  );

  const palette = chromeOrFallback(chrome);
  const panelTitle = guidance ? guidance.panelTitle : generic.panelTitle;
  const shortLine = guidance ? guidance.shortLine : generic.shortLine;
  const uploadSteps = guidance ? guidance.uploadSteps : [...generic.uploadSteps];
  const taskGuidance = guidance ? guidance.taskGuidance : [];
  const checklist = guidance ? guidance.checklist : [];
  const primaryCtaLabel = guidance ? guidance.primaryCtaLabel : generic.primaryCtaLabel;
  const secondaryGuidance = guidance ? guidance.secondaryGuidance : generic.secondaryGuidance;

  return (
    <div
      data-testid="lux-content-sprint-panel"
      data-sprint-code={normalizedCode || 'generic'}
      style={{
        border: `1px solid ${palette.borderAccent}`,
        background: palette.bgAccent,
        borderRadius: 14,
        padding: 16,
        marginBottom: 14,
        minWidth: 0,
        ...style,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: '0.08em',
          color: palette.label,
          textTransform: 'uppercase',
        }}
      >
        {normalizedCode ? `Content sprint ${normalizedCode}` : 'Content sprint'}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 16,
          fontWeight: 800,
          color: palette.text,
          lineHeight: 1.3,
        }}
      >
        {panelTitle}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 13,
          color: palette.body,
          lineHeight: 1.5,
        }}
      >
        {shortLine}
      </div>

      <div
        style={{
          marginTop: 14,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
        }}
      >
        {typeof onUploadClick === 'function' ? (
          <button
            type="button"
            data-testid="lux-content-sprint-upload-cta"
            onClick={onUploadClick}
            style={{
              fontSize: 13,
              fontWeight: 800,
              padding: '10px 16px',
              borderRadius: 12,
              border: `1px solid ${palette.ctaBorder}`,
              background: palette.ctaBg,
              color: palette.ctaText,
              cursor: 'pointer',
            }}
          >
            {primaryCtaLabel}
          </button>
        ) : (
          <div
            data-testid="lux-content-sprint-upload-cta-static"
            style={{
              fontSize: 13,
              fontWeight: 800,
              padding: '10px 16px',
              borderRadius: 12,
              border: `1px solid ${palette.ctaBorder}`,
              background: palette.ctaBg,
              color: palette.ctaText,
            }}
          >
            {primaryCtaLabel}
          </div>
        )}
        <div style={{ fontSize: 12, color: palette.muted, maxWidth: 380, lineHeight: 1.4 }}>
          {secondaryGuidance}
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.06em',
          color: palette.label,
          textTransform: 'uppercase',
        }}
      >
        Upload &amp; review steps
      </div>
      <ol
        style={{
          marginTop: 6,
          marginBottom: 0,
          paddingLeft: 22,
          fontSize: 13,
          color: palette.body,
          lineHeight: 1.55,
        }}
      >
        {uploadSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      {taskGuidance.length ? (
        <>
          <div
            style={{
              marginTop: 16,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: palette.label,
              textTransform: 'uppercase',
            }}
          >
            What this sprint task needs
          </div>
          <ul
            style={{
              marginTop: 6,
              marginBottom: 0,
              paddingLeft: 22,
              fontSize: 13,
              color: palette.body,
              lineHeight: 1.55,
            }}
          >
            {taskGuidance.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </>
      ) : null}

      {checklist.length ? (
        <div
          data-testid="lux-content-sprint-checklist"
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: `1px solid ${palette.divider}`,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: palette.label,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Content checklist
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {checklist.map((item) => {
              const isOn = !!checked[item.id];
              return (
                <label
                  key={item.id}
                  data-testid={`lux-content-sprint-checklist-item-${item.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 13,
                    color: isOn ? palette.muted : palette.body,
                    textDecoration: isOn ? 'line-through' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => toggle(item.id)}
                    style={{ width: 16, height: 16 }}
                  />
                  <span>{item.label}</span>
                </label>
              );
            })}
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              color: palette.muted,
              fontStyle: 'italic',
              lineHeight: 1.4,
            }}
          >
            Checklist state is session-only for now. Sprint progress is recorded in
            the master sprint doc and console ticket history; per-item persistence
            ships as a follow-up.
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * @param {object | null | undefined} chrome
 */
function chromeOrFallback(chrome) {
  const c = chrome && typeof chrome === 'object' ? chrome : {};
  return {
    label: c.textLabel || '#cbd5e1',
    text: c.text || '#f4efe8',
    body: c.text || '#e2e8f0',
    muted: c.textMuted || '#94a3b8',
    borderAccent: 'rgba(168,132,44,0.55)',
    bgAccent: 'rgba(168,132,44,0.06)',
    divider: c.borderHairline || 'rgba(148,163,184,0.22)',
    ctaBorder: 'rgba(168,132,44,0.75)',
    ctaBg: 'rgba(168,132,44,0.18)',
    ctaText: '#f4efe8',
  };
}
