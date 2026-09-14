#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const apiKey = String(process.env.FIRECRAWL_API_KEY || '').trim();
const targetRaw = String(process.env.WMA_TARGET_URL || '').trim();
const outDir = String(process.env.WMA_FIRECRAWL_OUT_DIR || 'artifacts/wma-firecrawl').trim();
const limitRaw = Number.parseInt(String(process.env.WMA_CRAWL_LIMIT || '25'), 10);
const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 100)) : 25;

if (!apiKey) {
  console.error('WMA Firecrawl FAIL: FIRECRAWL_API_KEY secret is not available');
  process.exit(1);
}

let target;
try {
  target = new URL(targetRaw);
} catch {
  console.error('WMA Firecrawl FAIL: invalid target URL');
  process.exit(1);
}

if (!['http:', 'https:'].includes(target.protocol)) {
  console.error('WMA Firecrawl FAIL: target must use http/https');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const headers = {
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
};

async function apiFetch(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok) {
    throw new Error(`Firecrawl HTTP ${response.status}: ${JSON.stringify(body).slice(0, 500)}`);
  }
  return body;
}

const started = await apiFetch('https://api.firecrawl.dev/v2/crawl', {
  method: 'POST',
  body: JSON.stringify({
    url: target.toString(),
    limit,
    sitemap: 'include',
    ignoreQueryParameters: true,
    allowExternalLinks: false,
    allowSubdomains: false,
    scrapeOptions: {
      formats: ['markdown', 'links'],
      onlyMainContent: true,
    },
  }),
});

const jobId = started.id || started.data?.id;
if (!jobId) {
  throw new Error('Firecrawl did not return a crawl job id');
}

let statusPayload = null;
for (let attempt = 1; attempt <= 60; attempt += 1) {
  statusPayload = await apiFetch(`https://api.firecrawl.dev/v2/crawl/${encodeURIComponent(jobId)}`);
  const status = String(statusPayload.status || '').toLowerCase();
  if (status === 'completed') break;
  if (status === 'failed' || status === 'cancelled') {
    throw new Error(`Firecrawl crawl ended with status=${status}`);
  }
  if (attempt === 60) throw new Error('Firecrawl crawl timed out while polling');
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

const pages = [];
let pagePayload = statusPayload;
while (pagePayload) {
  for (const item of pagePayload.data || []) pages.push(item);
  const next = pagePayload.next;
  if (!next) break;
  const nextUrl = new URL(next, 'https://api.firecrawl.dev');
  if (nextUrl.origin !== 'https://api.firecrawl.dev') {
    throw new Error('Firecrawl returned an unexpected pagination origin');
  }
  pagePayload = await apiFetch(nextUrl.toString());
}

const mapped = pages.slice(0, limit).map((item) => ({
  url: item?.metadata?.sourceURL || item?.metadata?.url || null,
  status_code: item?.metadata?.statusCode ?? null,
  title: item?.metadata?.title ?? null,
  meta_description: item?.metadata?.description ?? null,
  links: Array.isArray(item?.links) ? item.links : [],
  markdown: typeof item?.markdown === 'string' ? item.markdown : '',
  source_evidence: [item?.metadata?.sourceURL || item?.metadata?.url].filter(Boolean),
  verification_state: 'verified',
}));

const summary = {
  target: target.toString(),
  job_id: jobId,
  page_limit: limit,
  status: statusPayload?.status || null,
  total: statusPayload?.total ?? null,
  completed: statusPayload?.completed ?? mapped.length,
  credits_used: statusPayload?.creditsUsed ?? null,
  pages_returned: mapped.length,
  extracted_at: new Date().toISOString(),
};

fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'pages.json'), `${JSON.stringify(mapped, null, 2)}\n`);
console.log(JSON.stringify(summary));
