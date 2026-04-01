/**
 * Secure 6-digit tenant PIN generation and scrypt storage (`tenants.sovereign_pin_hash` in Postgres).
 */

import crypto from 'crypto';

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/**
 * Cryptographically secure 6-digit PIN (leading zeros preserved).
 *
 * @returns {string}
 */
export function generateSecureTenantPin() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * Format: v1:<salt_hex>:<scrypt_derived_key_hex>
 *
 * @param {string} pin
 * @returns {string}
 */
export function hashPinForStorage(pin) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(pin), salt, 64, SCRYPT_PARAMS);
  return `v1:${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * Verify presented PIN against stored v1 hash or legacy plaintext (timing-safe for equal lengths).
 *
 * @param {string} pin
 * @param {unknown} storedRaw
 * @returns {boolean}
 */
export function verifyPinAgainstStored(pin, storedRaw) {
  if (storedRaw == null) return false;
  const stored = String(storedRaw);
  if (!stored) return false;

  if (stored.startsWith('v1:')) {
    const parts = stored.split(':');
    if (parts.length !== 3) return false;
    try {
      const salt = Buffer.from(parts[1], 'hex');
      const expected = Buffer.from(parts[2], 'hex');
      if (!salt.length || !expected.length) return false;
      const candidate = crypto.scryptSync(String(pin), salt, 64, SCRYPT_PARAMS);
      if (candidate.length !== expected.length) return false;
      return crypto.timingSafeEqual(candidate, expected);
    } catch {
      return false;
    }
  }

  try {
    const a = Buffer.from(String(pin), 'utf8');
    const b = Buffer.from(stored, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
