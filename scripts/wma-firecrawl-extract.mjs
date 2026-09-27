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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function apiFetch(url, options = {}, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    const text = await response.text();
    let body;
    try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }

    if (response.ok) return body;

    if (response.status === 429 && attempt < maxAttempts) {
      const retryAfter = Number.parseInt(response.headers.get('retry-after') || '', 10);
      const waitMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : Math.min(15000, 1500 * (2 ** (attempt - 1)));
      console.warn(`Firecrawl rate limit reached; retrying in ${waitMs}ms (attempt ${attempt}/${maxAttempts})`);
      await sleep(waitMs);
      continue;
    }

    throw new Error(`Firecrawl HTTP ${response.status}: ${JSON.stringify(body).slice(0, 500)}`);
  }

  throw new Error('Firecrawl request exhausted retries');
}

const mapPayload = await apiFetch('https://api.firecrawl.dev/v2/map', {
  method: 'POST',
  body: JSON.stringify({
    url: target.toString(),
    limit,
    sitemap: 'include',
    ignoreQueryParameters: true,
  }),
});

const discovered = [];
for (const item of mapPayload.links || mapPayload.data?.links || []) {
  const rawUrl = typeof item === 'string' ? item : item?.url;
  if (!rawUrl) continue;

  let candidate;
  try { candidate = new URL(rawUrl, target); } catch { continue; }
  if (!['http:', 'https:'].includes(candidate.protocol)) continue;
  if (candidate.origin !== target.origin) continue;
  candidate.hash = '';
  discovered.push(candidate.toString());
}

if (!discovered.some((url) => new URL(url).pathname === target.pathname)) {
  discovered.unshift(target.toString());
}

const urls = [...new Set(discovered)].slice(0, limit);
if (urls.length === 0) {
  throw new Error('Firecrawl map returned no same-origin URLs');
}

const pages = [];
const failures = [];
let creditsUsed = Number(mapPayload.creditsUsed || mapPayload.data?.creditsUsed || 0) || 0;

for (let index = 0; index < urls.length; index += 1) {
  const url = urls[index];
  console.log(`WMA Firecrawl scrape ${index + 1}/${urls.length}: ${url}`);

  try {
    const scrapePayload = await apiFetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      body: JSON.stringify({
        url,
        formats: ['markdown', 'links'],
        onlyMainContent: true,
      }),
    });

    const item = scrapePayload.data || scrapePayload;
    const metadata = item?.metadata || {};
    creditsUsed += Number(scrapePayload.creditsUsed || item?.creditsUsed || 0) || 0;

    pages.push({
      url: metadata.sourceURL || metadata.url || url,
      status_code: metadata.statusCode ?? null,
      title: metadata.title ?? null,
      meta_description: metadata.description ?? null,
      links: Array.isArray(item?.links) ? item.links : [],
      markdown: typeof item?.markdown === 'string' ? item.markdown : '',
      source_evidence: [metadata.sourceURL || metadata.url || url].filter(Boolean),
      verification_state: 'verified',
    });
  } catch (error) {
    failures.push({ url, error: String(error?.message || error) });
    console.warn(`WMA Firecrawl partial failure for ${url}: ${error?.message || error}`);
  }

  if (index < urls.length - 1) await sleep(1200);
}

if (pages.length === 0) {
  throw new Error(`Firecrawl returned no usable pages; failures=${failures.length}`);
}

const summary = {
  target: target.toString(),
  mode: 'map_then_serial_scrape',
  page_limit: limit,
  discovered_urls: urls.length,
  pages_returned: pages.length,
  failed_pages: failures.length,
  credits_used: creditsUsed || null,
  status: failures.length === 0 ? 'completed' : 'partial',
  extracted_at: new Date().toISOString(),
};

fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'pages.json'), `${JSON.stringify(pages, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'failures.json'), `${JSON.stringify(failures, null, 2)}\n`);
console.log(JSON.stringify(summary));
