import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'vercel-env.mjs');

test('vercel-env allowlist merges template + manifest + policy', () => {
  const r = spawnSync(process.execPath, [SCRIPT, 'allowlist'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /^POSTGRES_URL$/m);
  assert.match(r.stdout, /^SOVEREIGN_SESSION_SECRET$/m);
  assert.match(r.stdout, /^CORPFLOW_RUNTIME_CONFIG_JSON$/m);
});
