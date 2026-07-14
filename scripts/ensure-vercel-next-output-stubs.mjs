/**
 * Vercel Git Integration finalization (`onBuildComplete`) sometimes expects
 * Build Output API paths under `.next/output/…` even when `next build --webpack`
 * (Pages Router) writes classic `.next/server/pages/…` artifacts.
 *
 * Observed 2026-07-14 on this repo:
 *   Failed to run onBuildComplete from Vercel
 *   ENOENT chmod '/vercel/path0/.next/output/static/404.html'
 *
 * Next itself had already finished compiling and generating static pages.
 * Mirror the existing `routes-manifest-deterministic.json` unblocker: if the
 * platform-expected file is missing, copy the generated Pages 404 (or write a
 * minimal fallback) so finalization can chmod/read it.
 *
 * Also keep the deterministic routes-manifest copy (same historical unblocker).
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const nextDir = path.join(root, '.next');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function log(msg) {
  console.log(`ensure-vercel-next-output-stubs: ${msg}`);
}

function ensureRoutesManifestDeterministic() {
  const src = path.join(nextDir, 'routes-manifest.json');
  const dest = path.join(nextDir, 'routes-manifest-deterministic.json');
  try {
    if (fs.existsSync(dest)) {
      log('routes-manifest-deterministic.json exists');
      return;
    }
    if (!fs.existsSync(src)) {
      console.warn('ensure-vercel-next-output-stubs: missing routes-manifest.json');
      return;
    }
    fs.copyFileSync(src, dest);
    log(`wrote ${path.relative(root, dest)}`);
  } catch (e) {
    console.warn('ensure-vercel-next-output-stubs: routes-manifest copy failed', String(e?.message || e));
  }
}

function ensureOutputStatic404() {
  const destDir = path.join(nextDir, 'output', 'static');
  const dest = path.join(destDir, '404.html');
  const candidates = [
    path.join(nextDir, 'server', 'pages', '404.html'),
    path.join(nextDir, 'server', 'app', '_not-found.html'),
    path.join(nextDir, 'server', 'app', '_not-found', 'index.html'),
  ];

  try {
    if (fs.existsSync(dest)) {
      log('output/static/404.html exists');
      return;
    }
    ensureDir(destDir);
    const src = candidates.find((p) => fs.existsSync(p));
    if (src) {
      fs.copyFileSync(src, dest);
      log(`copied ${path.relative(root, src)} -> ${path.relative(root, dest)}`);
      return;
    }
    // Last resort stub — enough for Vercel finalization chmod; runtime still uses pages/404.
    const stub = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Not found</title></head><body><p>Not found</p></body></html>\n`;
    fs.writeFileSync(dest, stub, 'utf8');
    log(`wrote stub ${path.relative(root, dest)}`);
  } catch (e) {
    console.warn('ensure-vercel-next-output-stubs: 404 stub failed', String(e?.message || e));
  }
}

ensureRoutesManifestDeterministic();
ensureOutputStatic404();
