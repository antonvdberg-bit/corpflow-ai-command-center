/**

 * LuxeMaurice-only Change Console chrome (pages/change.js).

 * Editorial concierge look: charcoal shell, ivory typography, gold hairlines.

 * Does not apply to Core or other tenants.

 */



import { LUXE_MAURICE_BRAND_TOKENS as T } from './luxe-maurice-brand-theme.js';

import { changePanelStyle, changePageShellStyle } from '../cmp/_lib/change-console-layout.js';



/**

 * @returns {import('../cmp/_lib/change-console-layout.js').ChangePanelStyleInput & Record<string, unknown>}

 */

export function buildLuxChangeConsoleChrome() {

  const shellBg = T.charcoal;

  const pageInner = {

    fontFamily: T.fontBody,

    padding: '28px clamp(20px, 4vw, 56px)',

    maxWidth: 1240,

    margin: '0 auto',

    width: '100%',

    minWidth: 0,

    boxSizing: 'border-box',

    color: T.ivory,

  };

  const card = changePanelStyle({

    border: `1px solid ${T.hairline}`,

    borderRadius: T.radiusLg,

    background: T.charcoalSoft,

    padding: 18,

    boxShadow: '0 18px 48px rgba(0,0,0,0.28)',

  });

  const subtleCard = changePanelStyle({

    border: `1px solid ${T.hairlineStone}`,

    borderRadius: T.radiusLg,

    background: T.charcoal,

    padding: 16,

  });

  return {

    shellBg,

    pageInner,

    card,

    subtleCard,

    text: T.ivory,

    textMuted: T.ivoryMuted,

    textLabel: T.gold,

    mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',

    border: T.hairline,

    borderStone: T.hairlineStone,

    link: T.gold,

    gold: T.gold,

    goldDeep: T.goldDeep,

    sand: T.ivorySoft,

    white: T.charcoalSoft,

    heroDeep: T.ivory,

    fontDisplay: T.fontDisplay,

    fontBody: T.fontBody,

    charcoal: T.charcoal,

    charcoalSoft: T.charcoalSoft,

    /** Stage / filter pills on the Lux desk. */

    pill(active) {

      return {

        padding: '8px 12px',

        borderRadius: 999,

        border: `1px solid ${active ? T.gold : T.hairlineStone}`,

        background: active ? T.goldSoft : 'transparent',

        color: active ? T.ivory : T.ivoryMuted,

        fontSize: 12,

        fontWeight: 700,

        cursor: 'pointer',

        letterSpacing: active ? '0.06em' : 'normal',

      };

    },

    /** Top nav links — concierge pill geometry. */

    navPill(variant) {

      if (variant === 'highlight') {

        return {

          padding: '8px 14px',

          borderRadius: 999,

          border: `1px solid ${T.hairlineStone}`,

          color: T.ivory,

          fontWeight: 750,

          fontSize: 12,

          textDecoration: 'none',

          background: T.ivorySoft,

          opacity: 0.92,

        };

      }

      if (variant === 'gold') {

        return {

          padding: '8px 14px',

          borderRadius: 999,

          border: `1px solid ${T.gold}`,

          color: T.gold,

          fontWeight: 800,

          fontSize: 12,

          textDecoration: 'none',

          background: 'transparent',

        };

      }

      return {

        padding: '8px 14px',

        borderRadius: 999,

        border: `1px solid ${T.hairlineStone}`,

        color: T.ivoryMuted,

        fontWeight: 750,

        fontSize: 12,

        textDecoration: 'none',

        background: 'transparent',

      };

    },

    notifyBar() {

      return {

        display: 'flex',

        flexWrap: 'wrap',

        gap: 10,

        alignItems: 'center',

        padding: '10px 14px',

        borderRadius: T.radiusLg,

        border: `1px solid ${T.hairlineStone}`,

        background: 'rgba(17,17,17,0.55)',

        minWidth: 0,

        flex: '1 1 300px',

      };

    },

    notifyCheckboxLabel() {

      return {

        display: 'inline-flex',

        alignItems: 'center',

        gap: 8,

        fontSize: 12,

        fontWeight: 700,

        color: T.ivory,

        cursor: 'pointer',

        whiteSpace: 'nowrap',

      };

    },

    queueBtn(active) {

      return {

        textAlign: 'left',

        padding: 12,

        borderRadius: T.radiusMd,

        border: `1px solid ${active ? T.gold : T.hairlineStone}`,

        background: active ? 'rgba(168, 132, 44, 0.14)' : T.charcoal,

        color: active ? T.ivory : T.ivoryMuted,

        cursor: 'pointer',

        minWidth: 0,

        maxWidth: '100%',

        width: '100%',

        boxSizing: 'border-box',

        opacity: 1,

      };

    },

    queueBtnSmoke(active) {

      const base = this.queueBtn(active);

      return {

        ...base,

        opacity: active ? 0.88 : 0.55,

      };

    },

    queueBtnInternal(active) {

      const base = this.queueBtn(active);

      return {

        ...base,

        opacity: active ? 0.92 : 0.5,

      };

    },

    refreshBtn(busy) {

      return {

        padding: '6px 12px',

        borderRadius: T.radiusMd,

        border: `1px solid ${T.hairline}`,

        background: 'transparent',

        color: T.gold,

        fontWeight: 800,

        fontSize: 12,

        cursor: busy ? 'not-allowed' : 'pointer',

      };

    },

    badge(kind) {

      const map = {

        programme: { bg: T.goldSoft, border: T.gold, color: T.gold },

        active_client: { bg: 'rgba(59,130,246,0.12)', border: '#3b82f6', color: '#93c5fd' },

        client_request: { bg: 'rgba(59,130,246,0.12)', border: '#3b82f6', color: '#93c5fd' },

        crm_leads: { bg: 'rgba(14,165,233,0.12)', border: '#0ea5e9', color: '#7dd3fc' },

        property_media: { bg: 'rgba(34,197,94,0.12)', border: '#22c55e', color: '#86efac' },

        media: { bg: 'rgba(168,85,247,0.12)', border: '#a855f7', color: '#d8b4fe' },

        property: { bg: 'rgba(34,197,94,0.12)', border: '#22c55e', color: '#86efac' },

        internal: { bg: 'rgba(148,163,184,0.12)', border: '#94a3b8', color: '#cbd5e1' },

        archived_smoke: { bg: 'rgba(148,163,184,0.12)', border: '#94a3b8', color: '#cbd5e1' },

        smoke_test: { bg: 'rgba(148,163,184,0.12)', border: '#94a3b8', color: '#cbd5e1' },

        other: { bg: 'rgba(244,239,232,0.06)', border: T.hairlineStone, color: T.ivoryMuted },

      };

      const b = map[kind] || map.other;

      return {

        display: 'inline-block',

        fontSize: 10,

        fontWeight: 800,

        letterSpacing: '0.04em',

        textTransform: 'uppercase',

        padding: '3px 8px',

        borderRadius: 999,

        border: `1px solid ${b.border}`,

        background: b.bg,

        color: b.color,

      };

    },

    pre() {

      return {

        padding: 12,

        borderRadius: T.radiusMd,

        border: `1px solid ${T.hairlineStone}`,

        background: T.charcoal,

        fontSize: 12,

        color: T.ivory,

      };

    },

    input() {

      return {

        padding: '8px 10px',

        borderRadius: T.radiusMd,

        border: `1px solid ${T.hairlineStone}`,

        background: T.charcoal,

        color: T.ivory,

        fontSize: 12,

      };

    },

    /** Readable action + estimate tokens on editorial charcoal cards. */

    deskInk: {

      sectionLabel: T.gold,

      body: T.ivory,

      muted: T.ivoryMuted,

      success: '#86efac',

      successSoft: '#bbf7d0',

      warn: '#fcd34d',

      info: '#93c5fd',

      infoSoft: '#bfdbfe',

      danger: '#fda4af',

      dangerBg: 'rgba(190,18,60,0.18)',

      dangerBorder: 'rgba(253,164,175,0.45)',

      footnoteBg: 'rgba(244,239,232,0.06)',

      footnoteBorder: T.hairlineStone,

      /** @param {boolean} busy */

      withdrawBtn(busy) {

        return {

          padding: '8px 12px',

          borderRadius: T.radiusMd,

          border: `1px solid ${busy ? T.hairlineStone : 'rgba(253,164,175,0.45)'}`,

          background: busy ? 'transparent' : 'rgba(190,18,60,0.18)',

          color: busy ? T.ivoryMuted : '#fda4af',

          fontWeight: 800,

          fontSize: 12,

          cursor: busy ? 'not-allowed' : 'pointer',

        };

      },

      /** @param {boolean} disabled */

      proceedBtn(disabled) {

        return {

          padding: '12px 14px',

          borderRadius: T.radiusLg,

          border: `1px solid ${disabled ? T.hairlineStone : 'rgba(134,239,172,0.45)'}`,

          background: disabled ? 'transparent' : 'rgba(22,163,74,0.16)',

          color: disabled ? T.ivoryMuted : '#bbf7d0',

          textAlign: 'left',

          cursor: disabled ? 'not-allowed' : 'pointer',

        };

      },

      /** @param {boolean} busy */

      changeRequestBtn(busy) {

        return {

          padding: '12px 14px',

          borderRadius: T.radiusLg,

          border: `1px solid ${T.gold}`,

          background: busy ? 'transparent' : T.goldSoft,

          color: T.ivory,

          textAlign: 'left',

          cursor: busy ? 'not-allowed' : 'pointer',

        };

      },

      /** @param {boolean} disabled */

      estimateCtaBtn(disabled) {

        return {

          padding: '10px 14px',

          borderRadius: T.radiusLg,

          border: `1px solid ${disabled ? T.hairlineStone : T.gold}`,

          background: disabled ? 'transparent' : T.goldSoft,

          color: disabled ? T.ivoryMuted : T.gold,

          fontWeight: 900,

          fontSize: 12,

          cursor: disabled ? 'not-allowed' : 'pointer',

        };

      },

      marketBox: {

        borderRadius: T.radiusLg,

        border: '1px solid rgba(147,197,253,0.35)',

        background: 'rgba(59,130,246,0.12)',

        padding: 14,

        label: '#93c5fd',

        value: '#bfdbfe',

        caption: T.ivoryMuted,

      },

      ourBox: {

        borderRadius: T.radiusLg,

        border: '1px solid rgba(134,239,172,0.35)',

        background: 'rgba(22,163,74,0.14)',

        padding: 14,

        label: '#86efac',

        value: '#bbf7d0',

        caption: T.ivoryMuted,

      },

      budgetPill: {

        display: 'inline-block',

        marginLeft: 6,

        padding: '3px 10px',

        borderRadius: 999,

        border: `1px solid ${T.hairline}`,

        background: 'transparent',

        color: T.gold,

        fontWeight: 800,

      },

    },

    /** Concierge-aligned tokens for `#lux-media-workspace`. */
    mediaWorkspace: {
      body: T.ivoryMuted,
      error: '#fda4af',
      fieldLabel: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: T.gold,
        display: 'grid',
        gap: 6,
      },
      fieldInput: {
        padding: '8px 0',
        border: 'none',
        borderBottom: `1px solid ${T.hairlineStone}`,
        borderRadius: 0,
        background: 'transparent',
        color: T.ivory,
        fontSize: 13,
        fontFamily: T.fontBody,
        outline: 'none',
      },
      fieldSelect: {
        padding: '8px 10px',
        borderRadius: T.radiusMd,
        border: `1px solid ${T.hairlineStone}`,
        background: T.charcoal,
        color: T.ivory,
        fontSize: 12,
      },
      /** @param {'primary' | 'secondary'} kind */
      actionBtn(kind) {
        if (kind === 'primary') {
          return {
            padding: '8px 14px',
            borderRadius: T.radiusMd,
            border: `1px solid ${T.gold}`,
            background: T.goldSoft,
            color: T.ivory,
            fontWeight: 800,
            fontSize: 12,
            cursor: 'pointer',
          };
        }
        return {
          padding: '8px 14px',
          borderRadius: T.radiusMd,
          border: `1px solid ${T.hairlineStone}`,
          background: 'transparent',
          color: T.ivoryMuted,
          fontWeight: 750,
          fontSize: 12,
          cursor: 'pointer',
        };
      },
      tableShell: {
        maxHeight: 280,
        overflow: 'auto',
        border: `1px solid ${T.hairlineStone}`,
        borderRadius: T.radiusLg,
        fontSize: 11,
        color: T.ivory,
      },
      tableHeaderCell: {
        padding: 8,
        textAlign: 'left',
        color: T.gold,
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        fontWeight: 700,
      },
      tableCell: { padding: 8, wordBreak: 'break-all' },
      tableRowBorder: `1px solid ${T.hairlineStone}`,
      tableEmpty: T.ivoryMuted,
    },

    shellStyle() {

      return changePageShellStyle({ background: shellBg, minHeight: '100vh' });

    },

  };

}


