/**
 * Local #1194 proof server — Next pages + proof-mode /api/app handlers.
 * Proof fixtures only. No live enquiry, send, or production write.
 *
 *   node scripts/issue-1194-local-proof-server.mjs
 *   http://127.0.0.1:4794/app/queue?proof=1
 */
import http from 'node:http';
import next from 'next';

import { tryHandleAppApi } from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';

const PORT = Number(process.env.ISSUE_1194_PROOF_PORT || 4794);
const HOST = '127.0.0.1';

if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';
delete process.env.VERCEL_ENV;

resetProspectFixtureStore();

const app = next({
  dev: process.env.NODE_ENV !== 'production',
  hostname: HOST,
  port: PORT,
  dir: process.cwd(),
});
const handle = app.getRequestHandler();

function makeRes(nodeRes) {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      const body = JSON.stringify(payload);
      if (!nodeRes.headersSent) {
        nodeRes.writeHead(this.statusCode || 200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        });
      }
      nodeRes.end(body);
      return this;
    },
  };
}

await app.prepare();

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url || '/', `http://${HOST}:${PORT}`);
    if (u.pathname.startsWith('/api/app')) {
      const pathSeg = u.pathname.replace(/^\/api\//, '').replace(/\/+$/, '');
      const fakeReq = {
        method: req.method,
        url: req.url,
        headers: req.headers,
      };
      const handled = await tryHandleAppApi(fakeReq, makeRes(res), pathSeg);
      if (handled) return;
    }
    await handle(req, res);
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end(err instanceof Error ? err.stack || err.message : String(err));
  }
});

await new Promise((resolve, reject) => {
  server.listen(PORT, HOST, (err) => (err ? reject(err) : resolve()));
});

console.log(`#1194 proof server http://${HOST}:${PORT}/app/queue?proof=1`);
console.log(`                     http://${HOST}:${PORT}/app/prospects/syn-1171-lr-enquiry?proof=1`);
console.log(`                     http://${HOST}:${PORT}/app/prospects/syn-1171-wr-enquiry?proof=1`);
