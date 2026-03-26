/**
 * Centralized runtime config helper.
 *
 * Supports a single JSON env var `CORPFLOW_RUNTIME_CONFIG_JSON` to reduce
 * operational overhead in Vercel (one variable instead of many).
 */

let cachedBlob = null;

function parseBlob() {
  if (cachedBlob !== null) return cachedBlob;
  const raw = (process.env.CORPFLOW_RUNTIME_CONFIG_JSON || '').toString().trim();
  if (!raw) {
    cachedBlob = {};
    return cachedBlob;
  }
  try {
    const parsed = JSON.parse(raw);
    cachedBlob = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    cachedBlob = {};
  }
  return cachedBlob;
}

/**
 * Returns runtime config value from:
 * 1) direct env var
 * 2) CORPFLOW_RUNTIME_CONFIG_JSON key
 * 3) optional aliases
 *
 * @param {string} key
 * @param {string} [fallback]
 * @returns {string}
 */
export function cfg(key, fallback = '') {
  const direct = process.env[key];
  if (direct != null && String(direct).trim() !== '') return String(direct);

  // Compatibility alias for existing Vercel projects.
  if (key === 'POSTGRES_URL') {
    const alt = process.env.POSTGRES_PRISMA_URL || process.env.PRISMA_DATABASE_URL;
    if (alt != null && String(alt).trim() !== '') return String(alt);
  }

  const blob = parseBlob();
  const v = blob?.[key];
  if (v != null && String(v).trim() !== '') return String(v);

  return fallback;
}

