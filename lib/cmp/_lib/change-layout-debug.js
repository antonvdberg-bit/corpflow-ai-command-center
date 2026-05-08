/**
 * Gated diagnostics for `/change` horizontal overflow (`?layoutDebug=1`).
 * Does not run unless explicitly enabled via query string (see pages/change.js).
 */

/** Visible in `?debug=1` banner — bump when shipping layout fixes for deployment verification. */
export const CHANGE_LAYOUT_MARK_VERSION = 'pr153';

/** Bump when changing overflow scan / overlay behaviour (`?layoutDebug=1`). */
export const CHANGE_LAYOUT_INSTRUMENTATION_ID = 'root-maxwidth-100pct';

/** Expected git tip after PR153 overflow-hardening merge (update when tagging releases). */
export const CHANGE_LAYOUT_EXPECTED_COMMIT_PREFIX = 'f51c7579';

const OVERFLOW_EPS = 5;

/**
 * @param {Element} el
 * @param {Element | null} root
 * @returns {string}
 */
export function buildElementPath(el, root) {
  const parts = [];
  /** @type {Element | null} */
  let n = el;
  while (n && n !== root && n.nodeType === 1) {
    let seg = n.tagName.toLowerCase();
    const id = n.id && String(n.id).trim();
    if (id) {
      const esc = typeof globalThis.CSS !== 'undefined' && typeof globalThis.CSS.escape === 'function' ? globalThis.CSS.escape(id) : id;
      seg += `#${esc}`;
    } else if (n.parentElement) {
      const tag = n.tagName;
      const siblings = [...n.parentElement.children].filter((c) => c.tagName === tag);
      const idx = siblings.indexOf(n) + 1;
      seg += `:nth-of-type(${idx})`;
    }
    parts.unshift(seg);
    n = n.parentElement;
  }
  return parts.length ? parts.join(' > ') : '(root)';
}

/**
 * @param {HTMLElement} root
 * @param {Window} win
 * @returns {{
 *   innerWidth: number,
 *   docScrollWidth: number,
 *   docClientWidth: number,
 *   items: Array<{
 *     path: string,
 *     tag: string,
 *     className: string,
 *     styleHint: string,
 *     clientWidth: number,
 *     scrollWidth: number,
 *     rectWidth: number,
 *     rectRight: number,
 *     widerThanViewport: boolean,
 *     internalOverflow: boolean,
 *     textSample: string,
 *     element: HTMLElement,
 *   }>
 * }}
 */
export function scanHorizontalOverflow(root, win) {
  const innerWidth = win.innerWidth || 0;
  const doc = win.document.documentElement;
  const docScrollWidth = doc.scrollWidth;
  const docClientWidth = doc.clientWidth;

  /** @type {Array<{ element: HTMLElement, widerThanViewport: boolean, internalOverflow: boolean }>} */
  const items = [];

  if (!root) {
    return { innerWidth, docScrollWidth, docClientWidth, items: [] };
  }

  /** @type {NodeListOf<Element>} */
  const all = root.querySelectorAll('*');
  for (const node of all) {
    const el = /** @type {HTMLElement} */ (node);
    if (!(el instanceof HTMLElement)) continue;
    if (el.getAttribute('data-layout-debug-overlay') === '1') continue;
    if (el.closest('[data-layout-debug-overlay="1"]')) continue;

    let computed;
    try {
      computed = win.getComputedStyle(el);
    } catch {
      continue;
    }
    if (computed.display === 'none' || computed.visibility === 'hidden') continue;

    const cw = el.clientWidth;
    const sw = el.scrollWidth;
    const rect = el.getBoundingClientRect();
    const internalOverflow = sw > cw + OVERFLOW_EPS;
    const widerThanViewport = rect.width > innerWidth + 1 || rect.right > innerWidth + 1;

    if (!internalOverflow && !widerThanViewport) continue;

    const textSample = (el.innerText || el.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);

    const styleHint = [
      computed.display !== 'block' ? `display:${computed.display}` : '',
      computed.width !== 'auto' ? `width:${computed.width}` : '',
      computed.minWidth && computed.minWidth !== '0px' ? `min-width:${computed.minWidth}` : '',
      computed.maxWidth && computed.maxWidth !== 'none' ? `max-width:${computed.maxWidth}` : '',
      computed.overflowX !== 'visible' ? `overflow-x:${computed.overflowX}` : '',
    ]
      .filter(Boolean)
      .join('; ')
      .slice(0, 200);

    items.push({
      path: buildElementPath(el, root),
      tag: el.tagName.toLowerCase(),
      className: typeof el.className === 'string' ? String(el.className).slice(0, 160) : '',
      styleHint,
      clientWidth: cw,
      scrollWidth: sw,
      rectWidth: rect.width,
      rectRight: rect.right,
      widerThanViewport,
      internalOverflow,
      textSample,
      element: el,
    });
  }

  items.sort((a, b) => Math.max(b.scrollWidth - b.clientWidth, 0) - Math.max(a.scrollWidth - a.clientWidth, 0));

  return { innerWidth, docScrollWidth, docClientWidth, items };
}
