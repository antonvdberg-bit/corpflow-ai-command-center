import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'scripts',
  'ensure-vercel-next-output-stubs.mjs',
);

test('ensure-vercel-next-output-stubs writes output/static/404.html when missing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-vercel-stubs-'));
  const nextDir = path.join(tmp, '.next');
  fs.mkdirSync(path.join(nextDir, 'server', 'pages'), { recursive: true });
  fs.writeFileSync(path.join(nextDir, 'routes-manifest.json'), '{"version":3}\n', 'utf8');
  fs.writeFileSync(
    path.join(nextDir, 'server', 'pages', '404.html'),
    '<html><body>branded-404</body></html>\n',
    'utf8',
  );

  const r = spawnSync(process.execPath, [script], {
    cwd: tmp,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const dest = path.join(nextDir, 'output', 'static', '404.html');
  assert.ok(fs.existsSync(dest), 'missing output/static/404.html');
  assert.match(fs.readFileSync(dest, 'utf8'), /branded-404/);
  assert.ok(fs.existsSync(path.join(nextDir, 'routes-manifest-deterministic.json')));
});
