/**
 * Company Master fixture security checks — no secrets, binaries, or real restricted content.
 * @module company-master/lib/security
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { COMPANY_MASTER_ROOT } from './paths.js';

/** Credential-shaped values (not the English word "secret" in docs). */
const SECRET_VALUE_LIKE =
  /\b(sk_live|sk_test)_[A-Za-z0-9]+\b|BEGIN (RSA |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|\b(api[_-]?key|password|token)\s*[:=]\s*['\"]?[^'"\s]{8,}/i;

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.pdf',
  '.svg',
  '.docx',
  '.xlsx',
  '.zip',
  '.bin',
]);

/**
 * Recursively list files under company-master (skip node_modules if ever present).
 * @param {string} [root]
 * @returns {string[]}
 */
export function listCompanyMasterFiles(root = COMPANY_MASTER_ROOT) {
  /** @type {string[]} */
  const out = [];
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === '.git') continue;
      const abs = path.join(dir, name);
      const st = statSync(abs);
      if (st.isDirectory()) walk(abs);
      else out.push(abs);
    }
  }
  walk(root);
  return out;
}

/**
 * Fixture JSON under examples/ is scanned for credential-shaped values.
 * The whole tree is scanned for committed binaries and embedded PDF bodies.
 *
 * @param {string[]} [files]
 * @returns {{ ok: boolean, findings: Array<{ path: string, code: string, message: string }> }}
 */
export function auditCompanyMasterFixturesForSecretsAndBinaries(files) {
  const list = files || listCompanyMasterFiles();
  /** @type {Array<{ path: string, code: string, message: string }>} */
  const findings = [];

  for (const abs of list) {
    const rel = path.relative(COMPANY_MASTER_ROOT, abs);
    const ext = path.extname(abs).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) {
      findings.push({
        path: rel,
        code: 'BINARY_FILE',
        message: `binary extension ${ext} must not be committed under company-master/`,
      });
      continue;
    }

    let text;
    try {
      text = readFileSync(abs, 'utf8');
    } catch {
      findings.push({
        path: rel,
        code: 'UNREADABLE',
        message: 'file could not be read as UTF-8 text',
      });
      continue;
    }

    // Real restricted document contents must not appear — forbid large base64 blobs.
    if (/data:application\/pdf;base64,[A-Za-z0-9+/=]{200,}/.test(text)) {
      findings.push({
        path: rel,
        code: 'EMBEDDED_RESTRICTED_CONTENT',
        message: 'embedded PDF base64 content is forbidden in company-master fixtures',
      });
    }

    const isExampleFixture = rel.startsWith(`examples${path.sep}`) && ext === '.json';
    if (isExampleFixture && SECRET_VALUE_LIKE.test(text)) {
      findings.push({
        path: rel,
        code: 'SECRET_LIKE',
        message: 'possible secret/credential value detected in synthetic fixture',
      });
    }
  }

  return { ok: findings.length === 0, findings };
}
