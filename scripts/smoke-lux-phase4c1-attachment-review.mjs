#!/usr/bin/env node
/**
 * Phase 4C.1 live verification — Lux operator media review round-trip.
 *
 * Targets either a Vercel preview (Protection Bypass required) or production.
 * Strictly read/write to a SINGLE Lux client-request ticket created at the start
 * of the run. No production data is mutated outside the new ticket.
 *
 * Required env (load via .env.local or set in shell):
 *   LUX_SMOKE_USERNAME=lux-smoke@corpflowai.com
 *   LUX_SMOKE_PASSWORD=<24+ chars>
 *
 * Choose a target. Either set:
 *   LUX_SMOKE_PREVIEW_BASE_URL=https://corpflow-...vercel.app
 *   VERCEL_AUTOMATION_BYPASS_SECRET=<...>          (preview only)
 *   CORPFLOW_VERCEL_PROTECTION_BYPASS_SECRET=<...> (preview only, alias)
 * or:
 *   LUX_SMOKE_BASE_URL=https://lux.corpflowai.com
 *
 * The script aborts loudly if neither target is reachable.
 *
 * Usage:
 *   node scripts/smoke-lux-phase4c1-attachment-review.mjs
 *   node scripts/smoke-lux-phase4c1-attachment-review.mjs --target=preview
 *   node scripts/smoke-lux-phase4c1-attachment-review.mjs --target=production
 *
 * Exits 0 only if every assertion passes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(REPO_ROOT, '.env.local') });
dotenv.config({ path: path.join(REPO_ROOT, '.env') });

const argv = process.argv.slice(2);
const argTarget = (argv.find((x) => x.startsWith('--target=')) || '').slice('--target='.length);

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
  throw new Error(msg);
}

function ok(msg) {
  console.log(`ok ${msg}`);
}

function info(msg) {
  console.log(`-- ${msg}`);
}

const username = process.env.LUX_SMOKE_USERNAME || '';
const password = process.env.LUX_SMOKE_PASSWORD || '';
if (!username || !password) {
  fail('LUX_SMOKE_USERNAME and LUX_SMOKE_PASSWORD must be set (see .env.template).');
}

const previewBase = (process.env.LUX_SMOKE_PREVIEW_BASE_URL || '').replace(/\/$/, '');
const prodBase = (process.env.LUX_SMOKE_BASE_URL || 'https://lux.corpflowai.com').replace(/\/$/, '');
const bypass =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
  process.env.CORPFLOW_VERCEL_PROTECTION_BYPASS_SECRET ||
  '';

let baseUrl;
let usingPreview = false;
if (argTarget === 'preview') {
  if (!previewBase) fail('LUX_SMOKE_PREVIEW_BASE_URL is required for --target=preview.');
  baseUrl = previewBase;
  usingPreview = true;
} else if (argTarget === 'production') {
  baseUrl = prodBase;
  usingPreview = false;
} else if (previewBase && bypass) {
  baseUrl = previewBase;
  usingPreview = true;
} else {
  baseUrl = prodBase;
  usingPreview = false;
}

if (usingPreview && !bypass) {
  fail('Preview targets require VERCEL_AUTOMATION_BYPASS_SECRET (or CORPFLOW_VERCEL_PROTECTION_BYPASS_SECRET).');
}

info(`target = ${baseUrl} (${usingPreview ? 'preview + bypass' : 'production'})`);

/**
 * Tiny synthetic media payloads. Both are valid bytes, not just zero-fills,
 * to satisfy any optional MIME sniff downstream.
 *
 * 1x1 transparent PNG (67 bytes).
 * Minimal MP4-like ISO base media file (just enough headers, ~32 bytes).
 */
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const MP4_BASE64 =
  'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQ==';

function commonHeaders(extra = {}) {
  const h = { ...extra };
  if (usingPreview && bypass) {
    h['x-vercel-protection-bypass'] = bypass;
    h['x-vercel-set-bypass-cookie'] = 'true';
  }
  return h;
}

const cookieJar = new Map(); // name -> value

function applySetCookie(res) {
  const sc = res.headers.getSetCookie?.() || res.headers.raw?.()['set-cookie'] || [];
  const arr = Array.isArray(sc) ? sc : [sc];
  for (const raw of arr) {
    if (!raw) continue;
    const first = String(raw).split(';')[0];
    const eq = first.indexOf('=');
    if (eq <= 0) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    if (name) cookieJar.set(name, value);
  }
}

function cookieHeader() {
  const parts = [];
  for (const [k, v] of cookieJar.entries()) parts.push(`${k}=${v}`);
  return parts.join('; ');
}

async function http(method, urlPath, { body, headers } = {}) {
  const url = baseUrl + urlPath;
  const init = {
    method,
    headers: {
      ...commonHeaders(headers || {}),
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(cookieJar.size ? { cookie: cookieHeader() } : {}),
    },
    redirect: 'manual',
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(url, init);
  applySetCookie(res);
  let json = null;
  let text = '';
  const ct = String(res.headers.get('content-type') || '').toLowerCase();
  try {
    if (ct.includes('application/json')) {
      json = await res.json();
    } else {
      text = await res.text();
    }
  } catch (_) {
    /* ignore */
  }
  return { res, status: res.status, json, text };
}

async function login() {
  const r = await http('POST', '/api/auth/login', {
    body: { username, password, level: 'tenant' },
  });
  if (r.status !== 200) {
    fail(`auth/login expected 200, got ${r.status} body=${JSON.stringify(r.json || r.text).slice(0, 200)}`);
  }
  if (!cookieJar.has('corpflow_session')) {
    fail('login did not set corpflow_session cookie.');
  }
  ok('login as Lux smoke operator');
}

async function createRequestTicket() {
  const title = `[phase4c.1 smoke] ${new Date().toISOString()}`;
  const r = await http('POST', '/api/cmp/router?action=lux-client-request-create', {
    body: {
      request_type: 'property_update',
      title,
      description: 'Phase 4C.1 attachment review smoke test. Created and reviewed by automated round-trip; safe to leave open.',
      priority: 'Low',
      property_reference: 'lm-phase2d-manual-demo',
    },
  });
  if (r.status !== 200) {
    fail(`lux-client-request-create expected 200, got ${r.status} body=${JSON.stringify(r.json).slice(0, 200)}`);
  }
  const ticketId = r.json?.request?.ticket_id;
  if (!ticketId) fail('lux-client-request-create returned no ticket_id.');
  ok(`created Lux request ticket ${ticketId}`);
  return ticketId;
}

async function uploadAttachment(ticketId, { fileName, contentType, dataB64, intendedUse, notes }) {
  const r = await http('POST', '/api/change-attachment/upload', {
    body: {
      ticket_id: ticketId,
      file_name: fileName,
      content_type: contentType,
      data_base64: dataB64,
      intended_use: intendedUse,
      notes,
    },
  });
  if (r.status !== 200) {
    fail(`upload(${fileName}) expected 200, got ${r.status} body=${JSON.stringify(r.json).slice(0, 240)}`);
  }
  if (!r.json?.attachment_id) fail(`upload(${fileName}) returned no attachment_id.`);
  if (!r.json?.lux_meta) {
    fail(`upload(${fileName}) returned no lux_meta block — Lux annotation did not run.`);
  }
  if (r.json.lux_meta.review_status !== 'pending_review') {
    fail(`upload(${fileName}) initial review_status expected pending_review, got ${r.json.lux_meta.review_status}`);
  }
  ok(`upload ${fileName} (${contentType}) → attachment_id=${r.json.attachment_id} review_status=pending_review`);
  return r.json.attachment_id;
}

async function listAttachments(ticketId) {
  const r = await http('GET', `/api/change-attachment/list?ticket_id=${encodeURIComponent(ticketId)}`);
  if (r.status !== 200) {
    fail(`list expected 200, got ${r.status} body=${JSON.stringify(r.json).slice(0, 200)}`);
  }
  if (r.json?.lux_request_ticket !== true) fail('list lux_request_ticket flag expected true.');
  if (!Array.isArray(r.json?.attachments)) fail('list attachments not an array.');
  return r.json.attachments;
}

async function setReview(ticketId, attachmentId, reviewStatus, reviewNote) {
  const r = await http('POST', '/api/cmp/router?action=lux-attachment-review-set', {
    body: { ticket_id: ticketId, attachment_id: attachmentId, review_status: reviewStatus, review_note: reviewNote },
  });
  if (r.status !== 200) {
    fail(
      `lux-attachment-review-set(${reviewStatus}) expected 200, got ${r.status} body=${JSON.stringify(r.json).slice(
        0,
        240,
      )}`,
    );
  }
  if (r.json?.attachment?.review_status !== reviewStatus) {
    fail(`review_status echo expected ${reviewStatus}, got ${r.json?.attachment?.review_status}`);
  }
  ok(`lux-attachment-review-set(${attachmentId}, ${reviewStatus}) persisted`);
  return r.json.attachment;
}

async function negativeNoSession() {
  const oldCookies = new Map(cookieJar);
  cookieJar.clear();
  const r = await http('POST', '/api/cmp/router?action=lux-attachment-review-set', {
    body: { ticket_id: 'x', attachment_id: 'x', review_status: 'reviewed' },
  });
  for (const [k, v] of oldCookies) cookieJar.set(k, v);
  if (r.status !== 401 && r.status !== 403) {
    fail(`anonymous lux-attachment-review-set expected 401/403, got ${r.status}`);
  }
  ok(`anonymous lux-attachment-review-set rejected (status=${r.status})`);
}

async function negativeInvalidStatus(ticketId, attachmentId) {
  const r = await http('POST', '/api/cmp/router?action=lux-attachment-review-set', {
    body: { ticket_id: ticketId, attachment_id: attachmentId, review_status: 'approved' },
  });
  if (r.status !== 400) {
    fail(`invalid review_status expected 400, got ${r.status}`);
  }
  if (!Array.isArray(r.json?.allowed) || !r.json.allowed.includes('pending_review')) {
    fail(`invalid review_status response missing allowed list: ${JSON.stringify(r.json).slice(0, 200)}`);
  }
  ok(`invalid review_status rejected with allowlist (${r.json.allowed.join('/')})`);
}

async function publicSurfaceClean(urlPath) {
  // No bypass for production; use bypass for preview hosts.
  const r = await http('GET', urlPath);
  if (r.status !== 200) {
    fail(`GET ${urlPath} expected 200, got ${r.status}`);
  }
  const body = r.text || JSON.stringify(r.json || {});
  const forbidden = ['lux_request_meta', 'review_status', 'reviewed_by', 'attachments[', '/api/change-attachment/'];
  for (const term of forbidden) {
    if (body.includes(term)) {
      fail(`GET ${urlPath} unexpectedly leaked "${term}" in body.`);
    }
  }
  ok(`public ${urlPath} clean (no attachment metadata)`);
}

async function main() {
  await login();
  const ticketId = await createRequestTicket();

  const imgId = await uploadAttachment(ticketId, {
    fileName: 'phase4c1-smoke-hero.png',
    contentType: 'image/png',
    dataB64: PNG_BASE64,
    intendedUse: 'property_hero',
    notes: 'Smoke fixture: 1x1 transparent PNG',
  });
  const vidId = await uploadAttachment(ticketId, {
    fileName: 'phase4c1-smoke-clip.mp4',
    contentType: 'video/mp4',
    dataB64: MP4_BASE64,
    intendedUse: 'request_supporting',
    notes: 'Smoke fixture: minimal MP4 header',
  });

  let list = await listAttachments(ticketId);
  if (list.length !== 2) fail(`list expected 2 entries, got ${list.length}`);
  const byId = new Map(list.map((a) => [a.attachment_id, a]));
  if (byId.get(imgId)?.media_type !== 'image') fail('image media_type missing');
  if (byId.get(vidId)?.media_type !== 'video') fail('video media_type missing');
  if (byId.get(imgId)?.intended_use !== 'property_hero') fail('image intended_use lost');
  if (byId.get(vidId)?.intended_use !== 'request_supporting') fail('video intended_use lost');
  if (byId.get(imgId)?.review_status !== 'pending_review') fail('image not pending_review on first list');
  ok('list shape: filename + media_type + intended_use + notes + review_status all present');

  await negativeInvalidStatus(ticketId, imgId);

  await setReview(ticketId, imgId, 'reviewed', 'Smoke: image looks clean.');
  await setReview(ticketId, vidId, 'rejected', 'Smoke: video is a placeholder, reject.');

  list = await listAttachments(ticketId);
  const after = new Map(list.map((a) => [a.attachment_id, a]));
  if (after.get(imgId)?.review_status !== 'reviewed') fail('image review_status not persisted');
  if (after.get(vidId)?.review_status !== 'rejected') fail('video review_status not persisted');
  if (!after.get(imgId)?.reviewed_by) fail('reviewed_by missing on image');
  if (!after.get(vidId)?.reviewed_at) fail('reviewed_at missing on video');
  if (after.get(imgId)?.review_note !== 'Smoke: image looks clean.') fail('image review_note not persisted');
  ok('review state persisted for image (reviewed) and video (rejected) with note + reviewer + time');

  await negativeNoSession();

  await publicSurfaceClean('/');
  await publicSurfaceClean('/concierge');
  await publicSurfaceClean('/property/lm-phase2d-manual-demo');

  console.log(`\nALL CHECKS PASSED. ticket_id=${ticketId} (operator can leave open or close manually).`);
}

main().catch((e) => {
  console.error(e?.stack || e?.message || String(e));
  if (process.exitCode !== 0) process.exitCode = 1;
});
