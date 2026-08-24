/**
 * #1015 — factory_router boot isolation.
 *
 * Live incident 2026-08-20: every `/api/*` on core.corpflowai.com returned
 * Vercel HTML 500 with `x-matched-path: /500` while Next pages stayed 200.
 * Cause: PR #992 statically imported `lib/cipc-desk/campaign-mvp.js` (ESM-only
 * `import.meta.url`) into `lib/cmp/router.js`, which is a top-level import of
 * the CJS-wrapped `api/factory_router.js`. Module evaluation failed before
 * health handlers ran.
 *
 * Same class as the production-pulse.mjs `ERR_REQUIRE_ESM` incident (#207).
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FACTORY_ROUTER = join(root, 'api', 'factory_router.js');
const CMP_ROUTER = join(root, 'lib', 'cmp', 'router.js');
const CAMPAIGN_MVP = join(root, 'lib', 'cipc-desk', 'campaign-mvp.js');
const RESPONSE_AUTOMATION = join(root, 'lib', 'cipc-desk', 'response-automation.js');
const WEBSITE_RESCUE_ONBOARDING = join(root, 'lib', 'website-rescue', 'onboarding-delivery.js');

const STATIC_IMPORT_RE =
  /(?:^|\n)\s*import\s+(?:[\s\S]*?\sfrom\s+)?['"](\.\.?\/[^'"]+)['"]/g;

/**
 * @param {string} src
 * @returns {string}
 */
function stripJsComments(src) {
  return String(src || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * @param {string} src
 * @returns {string[]}
 */
function staticRelativeSpecifiers(src) {
  const out = [];
  const re = new RegExp(STATIC_IMPORT_RE.source, 'g');
  let m;
  while ((m = re.exec(src))) {
    out.push(m[1]);
  }
  return out;
}

/**
 * @param {string} fromFile
 * @returns {string[]}
 */
function walkStaticJsGraph(fromFile) {
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {string[]} */
  const queue = [normalize(fromFile)];
  while (queue.length) {
    const file = queue.pop();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    let src = '';
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const spec of staticRelativeSpecifiers(src)) {
      const resolved = normalize(join(dirname(file), spec));
      const withJs = extname(resolved) ? resolved : `${resolved}.js`;
      if (extname(withJs) !== '.js') continue;
      if (!seen.has(withJs)) queue.push(withJs);
    }
  }
  return [...seen];
}

describe('#1015 factory health boot isolation', () => {
  it('campaign-mvp.js does not use import.meta or createRequire', () => {
    const src = stripJsComments(readFileSync(CAMPAIGN_MVP, 'utf8'));
    assert.equal(src.includes('import.meta'), false);
    assert.equal(src.includes('createRequire'), false);
    assert.match(src, /readFileSync\(\s*['"]config\/cipc-campaign-mvp\.v1\.json['"]/);
  });

  it('website-rescue onboarding-delivery.js does not use import.meta', () => {
    const src = stripJsComments(readFileSync(WEBSITE_RESCUE_ONBOARDING, 'utf8'));
    assert.equal(src.includes('import.meta'), false);
    assert.equal(src.includes('createRequire'), false);
    assert.match(src, /process\.cwd\(\)/);
  });

  it('cmp/router.js does not statically import campaign-mvp.js', () => {
    const src = readFileSync(CMP_ROUTER, 'utf8');
    assert.equal(
      /import\s*\{[\s\S]*?\}\s*from\s*['"]\.\.\/cipc-desk\/campaign-mvp\.js['"]/.test(src),
      false,
    );
    assert.match(src, /import\(\s*['"]\.\.\/cipc-desk\/campaign-mvp\.js['"]\s*\)/);
  });

  it('factory_router static import graph contains no import.meta.url', () => {
    const files = walkStaticJsGraph(FACTORY_ROUTER);
    assert.ok(files.includes(normalize(FACTORY_ROUTER)));
    assert.ok(files.includes(normalize(CMP_ROUTER)));
    assert.equal(files.includes(normalize(CAMPAIGN_MVP)), false, 'campaign-mvp must stay lazy');
    assert.equal(files.includes(normalize(RESPONSE_AUTOMATION)), false, 'response-automation must stay lazy');
    const offenders = files.filter((file) => {
      const src = stripJsComments(readFileSync(file, 'utf8'));
      return src.includes('import.meta');
    });
    assert.deepEqual(offenders, []);
  });

  it('health routes stay registered as JSON handlers on the unified router', () => {
    const src = readFileSync(FACTORY_ROUTER, 'utf8');
    assert.match(src, /pathSeg === 'health'/);
    assert.match(src, /pathSeg === 'factory\/health'/);
    assert.match(src, /pathSeg === 'factory\/production-pulse\/runtime'/);
    assert.match(src, /FACTORY_HEALTH_FAILED/);
    assert.match(src, /PRODUCTION_PULSE_FAILED/);
  });

  it('documents that import.meta is illegal in a CJS Function wrapper', () => {
    assert.throws(() => {
      // Vercel CJS-wraps api/factory_router.js; import.meta in that graph is a SyntaxError.
      // eslint-disable-next-line no-new-func
      new Function('return import.meta.url');
    });
  });
});
