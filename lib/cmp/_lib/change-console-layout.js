/**
 * Layout containment helpers for `pages/change.js` only.
 * Keeps long unbroken URLs/paths/markdown/JSON from forcing horizontal page overflow.
 *
 * Why PR #152 was insufficient: wrapping `textarea` / snapshot `pre` alone does not stop flex/grid
 * tracks from sizing to `min-content` (e.g. `1fr` columns without `minmax(0,1fr)`, flex rows without
 * `minWidth:0` on shrinking children, monospace ticket IDs). This module centralises the full pattern.
 *
 * Manual verification (1280px width, incognito):
 * - Select ticket cmo8mjijk0000jl04l1jz0v6d — no grey strip / horizontal spill.
 * - Select ticket cmov9fs050000kz04070wi23k — layout unchanged vs baseline.
 * Dev-only: append `?changeLayoutFixture=1` on /change in development to render a stress panel.
 */

/** @param {Record<string, unknown>} [extra] */
export function changePageShellStyle(extra) {
  return {
    width: '100%',
    // Use 100% of the containing block, not 100vw: `100vw` includes the vertical scrollbar width on
    // classic layouts, so `max-width:100vw` can force document scrollWidth > innerWidth (~8–17px) even
    // when no child content overflows (instrumentation then flags the root shell).
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    overflowX: 'hidden',
    ...extra,
  };
}

/** Card / subtle panel: constrain to parent grid/flex track. */
/** @param {Record<string, unknown>} [extra] */
export function changePanelStyle(extra) {
  return {
    minWidth: 0,
    maxWidth: '100%',
    boxSizing: 'border-box',
    overflowX: 'hidden',
    ...extra,
  };
}

/** Long prose, monospace IDs, snapshot JSON — wrap inside panel. */
/** @param {Record<string, unknown>} [extra] */
export function changeTextContainStyle(extra) {
  return {
    minWidth: 0,
    maxWidth: '100%',
    boxSizing: 'border-box',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    ...extra,
  };
}

/** Native `<select>` can size to the longest `<option>` label and blow grid tracks — constrain to parent. */
/** @param {Record<string, unknown>} [extra] */
export function changeSelectContainStyle(extra) {
  return {
    maxWidth: '100%',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    ...extra,
  };
}

/** `pre` / code-like blocks: wrap first; keep local horizontal scroll as fallback. */
/** @param {Record<string, unknown>} [extra] */
export function changePreBlockStyle(extra) {
  return {
    margin: 0,
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    ...extra,
  };
}

/** Flex row where the first child is text-heavy (must shrink). */
export function changeFlexMainChildStyle() {
  return { minWidth: 0, flex: '1 1 0%', maxWidth: '100%' };
}

export const CHANGE_LAYOUT_FIXTURE_LONG_LINE = [
  '### Stress line (fixture)',
  '`'.repeat(3) + 'x'.repeat(400) + '`'.repeat(3),
  '/very/long/unix/style/path/'.repeat(40) + 'file-name-without-spaces.ext',
  'https://example.com/' + 'segment/'.repeat(60) + 'end',
  '{"a":'.repeat(20) + '"z":1' + '}'.repeat(20),
].join('\n');
