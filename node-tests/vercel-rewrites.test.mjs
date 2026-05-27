import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve repo root from this file's location (node-tests/ → repo root).
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

// Allowlist of intentional dynamic destinations.
//
// Each entry MUST document the operational reason and the runtime artifact the
// destination ultimately resolves to. Add to this allowlist ONLY when adding a
// new dynamic API surface — never to silence a broken rewrite.
const DYNAMIC_DESTINATIONS = [
  {
    destinationPath: '/api/factory_router',
    reason: 'unified API gateway — every /api/* path is dispatched via __path query',
    requires: ['api/factory_router.js'],
  },
];

function readVercelJson() {
  const raw = readFileSync(join(REPO_ROOT, 'vercel.json'), 'utf-8');
  return JSON.parse(raw);
}

function isExistingFile(absPath) {
  try {
    return statSync(absPath).isFile();
  } catch {
    return false;
  }
}

function stripQuery(destination) {
  const i = destination.indexOf('?');
  return i === -1 ? destination : destination.slice(0, i);
}

function fileUnderPublic(urlPath) {
  if (!urlPath.startsWith('/')) return null;
  const candidate = join(REPO_ROOT, 'public', urlPath.slice(1));
  return isExistingFile(candidate) ? candidate : null;
}

function pageRouteFor(urlPath) {
  if (!urlPath.startsWith('/')) return null;
  const stripped = urlPath.replace(/\/+$/, '');
  const segs = stripped === '' ? 'index' : stripped.slice(1);
  for (const ext of ['.js', '.ts', '.tsx', '.jsx']) {
    const direct = join(REPO_ROOT, 'pages', `${segs}${ext}`);
    const idx = join(REPO_ROOT, 'pages', segs, `index${ext}`);
    if (isExistingFile(direct)) return direct;
    if (isExistingFile(idx)) return idx;
  }
  return null;
}

function apiRouteFor(urlPath) {
  if (!urlPath.startsWith('/api/')) return null;
  const rest = urlPath.slice('/api/'.length);
  for (const ext of ['.js', '.ts', '.mjs', '.cjs']) {
    const a = join(REPO_ROOT, 'api', `${rest}${ext}`);
    const b = join(REPO_ROOT, 'pages', 'api', `${rest}${ext}`);
    if (isExistingFile(a)) return a;
    if (isExistingFile(b)) return b;
  }
  return null;
}

function resolveDestination(destinationRaw) {
  const dest = stripQuery(destinationRaw);

  const allowed = DYNAMIC_DESTINATIONS.find(d => d.destinationPath === dest);
  if (allowed) {
    const missing = allowed.requires.filter(r => !isExistingFile(join(REPO_ROOT, r)));
    if (missing.length) {
      return {
        kind: 'MISSING',
        detail: `allowlist entry requires ${missing.join(', ')} which is absent`,
      };
    }
    return { kind: 'ALLOWLIST', reason: allowed.reason };
  }

  const fp = fileUnderPublic(dest);
  if (fp) return { kind: 'FILE', resolved: fp };

  const pp = pageRouteFor(dest);
  if (pp) return { kind: 'PAGE', resolved: pp };

  const ap = apiRouteFor(dest);
  if (ap) return { kind: 'API', resolved: ap };

  return {
    kind: 'MISSING',
    detail: 'no file in public/, no page in pages/, no API handler in api/ or pages/api/, not on allowlist',
  };
}

test('vercel.json: every rewrite destination resolves to a real route or allowlist entry', () => {
  const cfg = readVercelJson();
  const rewrites = cfg.rewrites ?? [];
  assert.ok(rewrites.length > 0, 'expected at least one rewrite in vercel.json');
  const failures = [];
  for (const r of rewrites) {
    const res = resolveDestination(r.destination);
    if (res.kind === 'MISSING') {
      failures.push(`  source=${r.source} destination=${r.destination} — ${res.detail}`);
    }
  }
  assert.equal(
    failures.length,
    0,
    `${failures.length} rewrite(s) have unresolvable destinations:\n${failures.join('\n')}`,
  );
});

test('vercel.json: no rewrite destination uses the wrong /public/<file> form', () => {
  // Files in public/ are served at site root in Next.js. A destination prefixed
  // with /public/ only resolves via a nested public/public/<file>, which is
  // almost never intended and historically caused dead 404s on /legal, /medical,
  // /master, and /core-lux-migration-repair.
  const cfg = readVercelJson();
  const rewrites = cfg.rewrites ?? [];
  const offenders = rewrites
    .filter(r => stripQuery(r.destination).startsWith('/public/'))
    .map(r => `  source=${r.source} destination=${r.destination}`);
  assert.equal(
    offenders.length,
    0,
    `${offenders.length} rewrite(s) use the disallowed /public/ destination prefix:\n${offenders.join('\n')}`,
  );
});

test('vercel.json: every dynamic-destination allowlist entry resolves to a real runtime file', () => {
  for (const a of DYNAMIC_DESTINATIONS) {
    for (const req of a.requires) {
      assert.ok(
        isExistingFile(join(REPO_ROOT, req)),
        `allowlist destination ${a.destinationPath} requires ${req} which is absent`,
      );
    }
  }
});
