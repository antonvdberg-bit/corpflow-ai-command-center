#!/usr/bin/env node
/**
 * Local static server for the browser-voice demo (localhost only).
 *
 *   node prototypes/ai-receptionist-browser-voice/cli/serve-demo.mjs
 *
 * Opens nothing automatically. Visit http://127.0.0.1:8765/demo/
 * No production binding. No auth. Synthetic demo only.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const host = '127.0.0.1';
const port = Number(process.env.AI_RECEPTIONIST_DEMO_PORT || 8765);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${host}:${port}`);
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/demo/index.html';
  if (rel.endsWith('/')) rel = `${rel}index.html`;

  const filePath = path.normalize(path.join(root, rel));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`AI receptionist browser demo (local only): http://${host}:${port}/demo/`);
  console.log('Synthetic data only. No telephony. No production deployment.');
  console.log('Ctrl+C to stop.');
});
