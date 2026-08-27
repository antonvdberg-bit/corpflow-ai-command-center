/**
 * Local Operating Workspace proof proxy (#1176).
 * Serves /api/app/* through the existing handlers and forwards pages to Next.
 *
 * Usage:
 *   NEXT_ORIGIN=http://127.0.0.1:3000 node scripts/issue-1176-local-proof-proxy.mjs
 */
import http from 'node:http';
import { URL } from 'node:url';

import { tryHandleAppApi } from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';
import { resetRequestStore } from '../lib/app/request-store.js';

const PORT = Number(process.env.JOURNEY_PROXY_PORT || 3011);
const NEXT_ORIGIN = String(process.env.NEXT_ORIGIN || 'http://127.0.0.1:3000').replace(/\/$/, '');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
delete process.env.VERCEL_ENV;
resetProspectFixtureStore();
resetRequestStore();

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
    setHeader(name, value) {
      if (!nodeRes.headersSent) nodeRes.setHeader(name, value);
      return this;
    },
    end(buf) {
      if (!nodeRes.headersSent) {
        nodeRes.writeHead(this.statusCode || 200);
      }
      nodeRes.end(buf);
      return this;
    },
  };
}

async function proxyToNext(req, nodeRes) {
  const target = `${NEXT_ORIGIN}${req.url || '/'}`;
  const incoming = await fetch(target, {
    method: req.method || 'GET',
    headers: {
      accept: req.headers.accept || '*/*',
      'user-agent': req.headers['user-agent'] || 'corpflow-journey-proxy',
      cookie: req.headers.cookie || '',
    },
    redirect: 'manual',
  });
  const headers = {};
  incoming.headers.forEach((value, key) => {
    if (key === 'transfer-encoding' || key === 'content-encoding') return;
    headers[key] = value;
  });
  const buf = Buffer.from(await incoming.arrayBuffer());
  nodeRes.writeHead(incoming.status, headers);
  nodeRes.end(buf);
}

const server = http.createServer(async (req, nodeRes) => {
  const u = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const pathName = u.pathname.replace(/\/$/, '') || '/';
  if (pathName.startsWith('/api/app/') || pathName === '/api/app') {
    const pathSeg = pathName.replace(/^\/api\//, '');
    const fakeReq = {
      method: req.method || 'GET',
      url: req.url,
      headers: req.headers,
      query: Object.fromEntries(u.searchParams.entries()),
    };
    const res = makeRes(nodeRes);
    const handled = await tryHandleAppApi(fakeReq, res, pathSeg);
    if (handled) return;
    nodeRes.writeHead(404, { 'Content-Type': 'application/json' });
    nodeRes.end(JSON.stringify({ ok: false, error: 'not_found', path: pathSeg }));
    return;
  }
  try {
    await proxyToNext(req, nodeRes);
  } catch (err) {
    nodeRes.writeHead(502, { 'Content-Type': 'text/plain' });
    nodeRes.end(err instanceof Error ? err.message : 'proxy_failed');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Journey proof proxy http://127.0.0.1:${PORT}/app/core?proof=1`);
  console.log(`  pages via ${NEXT_ORIGIN}`);
});
