import fs from 'fs';
import path from 'path';
import process from 'process';
import { chromium } from 'playwright';

function str(v) {
  return v != null ? String(v).trim() : '';
}

function nowIso() {
  return new Date().toISOString();
}

function readJson(p) {
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

function joinUrl(base, p) {
  const u = new URL(base);
  const pathPart = String(p || '').startsWith('/') ? String(p) : `/${String(p || '')}`;
  u.pathname = pathPart;
  // preserve existing query on base
  return u.toString();
}

function classifyGated({ httpStatus, htmlText }) {
  const t = (htmlText || '').toLowerCase();
  if (httpStatus === 401 || httpStatus === 403) return true;
  if (t.includes('deployment protection') || (t.includes('password') && t.includes('vercel'))) return true;
  if (t.includes('log in') && t.includes('password')) return true;
  return false;
}

function detectPlatformError({ httpStatus, htmlText }) {
  const t = (htmlText || '').toLowerCase();
  if (httpStatus >= 500) return { ok: false, reason: `http_${httpStatus}` };
  if (t.includes('this page could not be found') || t.includes('statuscode\":404') || t.includes('404')) {
    return { ok: false, reason: 'http_404_or_next_404' };
  }
  if (t.includes('application error') || t.includes('internal server error')) {
    return { ok: false, reason: 'platform_error' };
  }
  return { ok: true };
}

/**
 * Visual check result codes (v1).
 * Keep stable; do not invent new codes without need.
 */
const CODES = {
  PASSED: 'VISUAL_CHECK_PASSED',
  FAILED: 'VISUAL_CHECK_FAILED',
  LIMITED: 'VISUAL_CHECK_LIMITED',
  GATED: 'VISUAL_CHECK_GATED',
  SELECTOR_MISSING: 'VISUAL_CHECK_SELECTOR_MISSING',
};

const ACCESS_MODES_V15 = new Set(['public', 'tokenized_url', 'cookie', 'manual_only']);

function parseJsonEnv(name) {
  const raw = str(process.env[name] || '');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function pickTenantCookies(tenantId) {
  const byTenant = parseJsonEnv('PREVIEW_VERIFY_COOKIES_BY_TENANT_JSON');
  if (byTenant && typeof byTenant === 'object' && byTenant !== null) {
    const v = byTenant[tenantId] ?? byTenant[String(tenantId || '')] ?? byTenant['root'] ?? null;
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.trim()) {
      try {
        const arr = JSON.parse(v);
        if (Array.isArray(arr)) return arr;
      } catch {
        /* ignore */
      }
    }
  }
  const single = parseJsonEnv('PREVIEW_VERIFY_COOKIE_JSON');
  if (Array.isArray(single)) return single;
  return null;
}

async function main() {
  const previewUrl = str(process.env.PREVIEW_URL);
  const tenantId = str(process.env.TENANT_ID || 'root');
  const ticketId = str(process.env.TICKET_ID || '');
  const configPath = str(
    process.env.PREVIEW_VERIFY_CONFIG || path.join(process.cwd(), 'config', 'preview-verify.v1.json'),
  );
  const outDir = str(process.env.OUTPUT_DIR || path.join(process.cwd(), 'artifacts', 'preview-verify'));
  const runUrl = str(process.env.GITHUB_RUN_URL || '');

  if (!previewUrl) {
    console.error('Missing PREVIEW_URL');
    process.exit(2);
  }

  const cfg = readJson(configPath);
  const tenantCfg = (cfg.tenants && cfg.tenants[tenantId]) || null;
  const defaults = cfg.defaults || {};
  const routes =
    (tenantCfg && Array.isArray(tenantCfg.routes) ? tenantCfg.routes : null) || defaults.routes || [];
  const timeoutMs = Number(tenantCfg?.timeout_ms ?? defaults.timeout_ms ?? 25000);

  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  /** @type {any[]} */
  const routeResults = [];
  let finalCode = CODES.PASSED;
  let finalReason = null;
  let verificationLevel = 'full';
  let accessModeEffective = 'public';
  /** @type {string[]} */
  const selectorsChecked = [];

  try {
    for (const r of routes) {
      const p = str(r?.path || '/');
      const amRaw = str(r?.access_mode || defaults?.access_mode || 'public').toLowerCase();
      const accessMode = ACCESS_MODES_V15.has(amRaw) ? amRaw : 'public';
      accessModeEffective = accessMode;

      const requiredSelectors = Array.isArray(r?.required_selectors)
        ? r.required_selectors.map(str).filter(Boolean)
        : [];
      const forbiddenText = Array.isArray(r?.forbidden_text) ? r.forbidden_text.map(str).filter(Boolean) : [];

      const url = joinUrl(previewUrl, p);
      const startedAt = Date.now();
      let httpStatus = null;
      let htmlText = '';
      let missingSelectors = [];
      let pageError = null;

      try {
        if (accessMode === 'manual_only') {
          finalCode = CODES.LIMITED;
          verificationLevel = 'limited';
          finalReason = 'manual_only_required';
          routeResults.push({
            path: p,
            url,
            http_status: null,
            elapsed_ms: 0,
            missing_selectors: [],
            error: null,
            access_mode: accessMode,
            selectors_checked: [],
          });
          break;
        }

        if (accessMode === 'cookie') {
          const cookies = pickTenantCookies(tenantId);
          if (!cookies) {
            finalCode = CODES.LIMITED;
            verificationLevel = 'limited';
            finalReason = 'cookie_required_but_missing_secret';
            break;
          }
          // Best-effort: Playwright expects cookie objects with at least name/value/domain or url.
          await context.addCookies(cookies).catch(() => {});
        }

        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
        httpStatus = resp ? resp.status() : null;

        // Allow late JS hydration / route render.
        await page.waitForLoadState('networkidle', { timeout: Math.min(timeoutMs, 15000) }).catch(() => {});

        htmlText = await page.content().catch(() => '');

        if (classifyGated({ httpStatus, htmlText })) {
          finalCode = CODES.GATED;
          verificationLevel = 'limited';
          finalReason = 'gated_or_protected';
        } else {
          const plat = detectPlatformError({ httpStatus: httpStatus ?? 0, htmlText });
          if (!plat.ok) {
            finalCode = CODES.FAILED;
            finalReason = plat.reason;
          }
        }

        if (finalCode === CODES.PASSED) {
          for (const sel of requiredSelectors) {
            selectorsChecked.push(sel);
            const found = await page.locator(sel).first().count().catch(() => 0);
            if (!found) missingSelectors.push(sel);
          }
          if (missingSelectors.length) {
            finalCode = CODES.SELECTOR_MISSING;
            verificationLevel = 'limited';
            finalReason = 'required_selector_missing';
          }
        }

        if (finalCode === CODES.PASSED && forbiddenText.length) {
          const bodyText = await page.innerText('body').catch(() => '');
          for (const f of forbiddenText) {
            if (!f) continue;
            if (bodyText.includes(f) || htmlText.includes(f)) {
              finalCode = CODES.FAILED;
              finalReason = 'forbidden_text_present';
              break;
            }
          }
        }
      } catch (e) {
        pageError = e instanceof Error ? e.message : String(e);
        finalCode = finalCode === CODES.PASSED ? CODES.LIMITED : finalCode;
        verificationLevel = 'limited';
        finalReason = finalReason || 'navigation_or_runtime_error';
      }

      const elapsedMs = Date.now() - startedAt;
      routeResults.push({
        path: p,
        url,
        http_status: httpStatus,
        elapsed_ms: elapsedMs,
        missing_selectors: missingSelectors,
        error: pageError,
        access_mode: accessMode,
        selectors_checked: requiredSelectors,
      });

      // Stop early on hard failure/gated/selector missing.
      if (finalCode !== CODES.PASSED) break;
    }

    const screenshotPath = path.join(outDir, `preview_${tenantId || 'root'}_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

    const result = {
      ok: true,
      code: finalCode,
      checked_at: nowIso(),
      tenant_id: tenantId || null,
      ticket_id: ticketId || null,
      preview_url: previewUrl,
      run_url: runUrl || null,
      access_mode: accessModeEffective,
      verification_level: verificationLevel,
      selectors_checked: selectorsChecked,
      missing_selectors:
        routeResults && routeResults.length
          ? Array.from(new Set(routeResults.flatMap((x) => (Array.isArray(x?.missing_selectors) ? x.missing_selectors : []))))
          : [],
      failure_reason: finalReason,
      artifact: { name: 'preview-screenshot', path: screenshotPath },
      details: {
        reason: finalReason,
        routes: routeResults,
        screenshot_path: screenshotPath,
      },
    };

    process.stdout.write(JSON.stringify(result));
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  const out = {
    ok: false,
    code: 'VISUAL_CHECK_FAILED',
    checked_at: nowIso(),
    access_mode: 'public',
    verification_level: 'limited',
    selectors_checked: [],
    missing_selectors: [],
    failure_reason: 'runner_crash',
    artifact: null,
    run_url: str(process.env.GITHUB_RUN_URL || '') || null,
    preview_url: str(process.env.PREVIEW_URL || '') || null,
    details: { error: msg },
  };
  process.stdout.write(JSON.stringify(out));
  process.exit(1);
});

