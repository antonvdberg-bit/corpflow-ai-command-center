/**
 * After `next build`, copy the prerendered Change Console v2 shell into `public/`
 * so Vercel static + rewrite routing can serve `/change-v2` (same pattern as `/change` → `change.html`).
 *
 * IMPORTANT: When the hosting layer serves only `public/` (static output),
 * we must also publish the matching Next static assets under `public/_next/static`,
 * otherwise the HTML shell will reference `/_next/static/...` URLs that 404 in production.
 */
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, '.next', 'server', 'pages', 'change-v2.html');
const destDir = path.join(root, 'public');
const dest = path.join(destDir, 'change-v2.html');
const nextStaticSrc = path.join(root, '.next', 'static');
const nextStaticDest = path.join(destDir, '_next', 'static');

if (!existsSync(src)) {
  console.error('sync-change-v2-html: missing', src, '(run next build first)');
  process.exit(1);
}
if (!existsSync(nextStaticSrc)) {
  console.error('sync-change-v2-html: missing', nextStaticSrc, '(run next build first)');
  process.exit(1);
}
mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
mkdirSync(path.dirname(nextStaticDest), { recursive: true });
cpSync(nextStaticSrc, nextStaticDest, { recursive: true, force: true });
console.log('sync-change-v2-html: copied to public/change-v2.html and public/_next/static');
