/**
 * Ghost / execution-only hosts: serve /log-stream.html instead of marketing or tenant home.
 * Uses CORPFLOW_GHOST_HOSTS (comma list) and CORPFLOW_GHOST_HOST_MAP (JSON: host -> true).
 * Logic matches the former root proxy.ts so behavior stays consistent on Vercel.
 */

/**
 * @param {string} host
 * @returns {boolean}
 */
export function isGhostHost(host) {
  const h = (host || '').trim().toLowerCase();
  if (!h) return false;

  const ghostList = (process.env.CORPFLOW_GHOST_HOSTS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (ghostList.includes(h)) return true;

  try {
    const raw = process.env.CORPFLOW_GHOST_HOST_MAP || '{}';
    const m = JSON.parse(raw);
    if (m && typeof m === 'object' && m[h] === true) return true;
  } catch {
    /* fail closed: not ghost */
  }
  return false;
}
