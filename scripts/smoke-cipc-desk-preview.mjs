#!/usr/bin/env node
/**
 * CIPC Desk private preview smoke (fictional data only).
 *
 * Uses existing Preview / Actions secrets — never prints secret values:
 *   VERCEL_AUTOMATION_BYPASS_SECRET (or CORPFLOW_VERCEL_PROTECTION_BYPASS_SECRET)
 *   CORPFLOW_TENANT_PREVIEW_SECRET (optional if /api/cipc-desk/preview-link works on deployment)
 *
 * Required:
 *   CIPC_DESK_PREVIEW_BASE_URL  — Ready *.vercel.app origin (no cf_preview yet)
 *
 * Optional:
 *   CIPC_DESK_SMOKE_OUT_DIR     — default `.smoke-cipc-desk/`
 *   CIPC_DESK_PREVIEW_PIN       — default 123456 (preview seed PIN; fictional)
 *
 * Exit 0 only when all callback checks pass.
 */

import './bootstrap-repo-env.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { buildClientSitePreviewUrl } from '../lib/server/tenant-preview-token.js';

const TENANT_ID = 'cipc-desk';
const DEFAULT_PIN = '123456';

function env(name, fallback = '') {
  const v = process.env[name];
  if (v == null || String(v).trim() === '') return fallback;
  return String(v).trim();
}

function fail(msg, evidence) {
  console.error(`FAIL: ${msg}`);
  if (evidence) {
    try {
      writeFileSync(
        path.join(evidence.outDir, 'evidence.json'),
        JSON.stringify(evidence, null, 2),
        'utf8',
      );
    } catch {
      /* ignore */
    }
  }
  process.exit(1);
}

function bypassHeaders() {
  const bypass =
    env('VERCEL_AUTOMATION_BYPASS_SECRET') || env('CORPFLOW_VERCEL_PROTECTION_BYPASS_SECRET');
  if (!bypass) return { configured: false, headers: {} };
  return {
    configured: true,
    headers: {
      'x-vercel-protection-bypass': bypass,
      'x-vercel-set-bypass-cookie': 'true',
    },
  };
}

function withCfPreview(url, cfPreviewToken) {
  const u = new URL(url);
  if (cfPreviewToken) u.searchParams.set('cf_preview', cfPreviewToken);
  return u.toString();
}

function redactUrl(u) {
  try {
    const x = new URL(u);
    if (x.searchParams.has('cf_preview')) x.searchParams.set('cf_preview', '[redacted]');
    if (x.searchParams.has('token')) x.searchParams.set('token', '[redacted]');
    if (x.searchParams.has('x-vercel-protection-bypass')) {
      x.searchParams.set('x-vercel-protection-bypass', '[redacted]');
    }
    return x.toString();
  } catch {
    return '[invalid-url]';
  }
}

async function main() {
  const baseRaw = env('CIPC_DESK_PREVIEW_BASE_URL') || env('PREVIEW_URL') || '';
  if (!baseRaw) fail('Set CIPC_DESK_PREVIEW_BASE_URL to the Ready Vercel preview origin.');

  const base = baseRaw.replace(/\/+$/, '');
  const outDir = path.resolve(env('CIPC_DESK_SMOKE_OUT_DIR', '.smoke-cipc-desk'));
  mkdirSync(outDir, { recursive: true });
  const pin = env('CIPC_DESK_PREVIEW_PIN', DEFAULT_PIN);
  const bypass = bypassHeaders();

  /** @type {Record<string, unknown>} */
  const evidence = {
    ok: false,
    started_at: new Date().toISOString(),
    tenant_id: TENANT_ID,
    fictional_data_only: true,
    preview_base_url: base,
    bypass_configured: bypass.configured,
    checks: {},
    outDir,
  };

  if (!bypass.configured) {
    fail(
      'Missing VERCEL_AUTOMATION_BYPASS_SECRET (or CORPFLOW_VERCEL_PROTECTION_BYPASS_SECRET). Required for SSO-gated Preview.',
      evidence,
    );
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: bypass.headers,
    viewport: { width: 1440, height: 900 },
  });

  try {
    // 1) Mint signed cf_preview URL (prefer deployment API; fallback local sign).
    let previewUrl = '';
    let mintSource = '';
    {
      const r = await context.request.get(`${base}/api/cipc-desk/preview-link`, {
        headers: bypass.headers,
      });
      const status = r.status();
      let body = null;
      try {
        body = await r.json();
      } catch {
        body = null;
      }
      evidence.checks.preview_link_api = {
        http: status,
        ok: Boolean(body?.ok),
        error: body?.error || null,
      };
      if (r.ok() && body?.ok && typeof body.preview_url === 'string' && body.preview_url) {
        previewUrl = String(body.preview_url);
        mintSource = 'deployment_preview_link_api';
      }
    }
    if (!previewUrl) {
      const local = buildClientSitePreviewUrl(base, TENANT_ID);
      if (local) {
        previewUrl = local;
        mintSource = 'local_buildClientSitePreviewUrl';
      }
    }
    if (!previewUrl) {
      fail(
        'Could not mint cf_preview URL (preview-link API failed and CORPFLOW_TENANT_PREVIEW_SECRET unavailable locally).',
        evidence,
      );
    }
    evidence.cf_preview_url_redacted = redactUrl(previewUrl);
    evidence.mint_source = mintSource;
    evidence.checks.cf_preview_minted = { ok: true, source: mintSource };

    const cfToken = (() => {
      try {
        return new URL(previewUrl).searchParams.get('cf_preview') || '';
      } catch {
        return '';
      }
    })();
    if (!cfToken) fail('Minted URL missing cf_preview token.', evidence);

    // Ensure homepage uses app root (not lux-landing-static).
    const homeUrl = (() => {
      const u = new URL(previewUrl);
      u.pathname = '/';
      return u.toString();
    })();

    // 2) Homepage
    const homePage = await context.newPage();
    const homeRes = await homePage.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    const homeStatus = homeRes?.status() || 0;
    const homeHtml = await homePage.content();
    const homeText = await homePage.locator('body').innerText().catch(() => '');
    const homeOk =
      homeStatus >= 200 &&
      homeStatus < 400 &&
      /CIPC Desk/i.test(homeText || homeHtml) &&
      !/Log in to Vercel/i.test(homeHtml) &&
      !/Deployment Protection/i.test(homeHtml);
    await homePage.screenshot({ path: path.join(outDir, '01-homepage.png'), fullPage: true });
    evidence.checks.homepage = {
      ok: homeOk,
      http: homeStatus,
      has_cipc_desk: /CIPC Desk/i.test(homeText || homeHtml),
      sso_gated: /Log in to Vercel|Deployment Protection/i.test(homeHtml),
    };
    if (!homeOk) fail('Homepage verification failed.', evidence);

    // 3) Tenant PIN login (preview seed)
    const loginRes = await context.request.post(withCfPreview(`${base}/api/auth/login`, cfToken), {
      headers: { ...bypass.headers, 'content-type': 'application/json' },
      data: { level: 'tenant', tenant_id: TENANT_ID, pin },
    });
    let loginBody = null;
    try {
      loginBody = await loginRes.json();
    } catch {
      loginBody = null;
    }
    const loginOk =
      loginRes.ok() &&
      loginBody?.ok === true &&
      String(loginBody.tenant_id || '') === TENANT_ID &&
      String(loginBody.level || '') === 'tenant';
    evidence.checks.pin_login = {
      ok: loginOk,
      http: loginRes.status(),
      tenant_id: loginBody?.tenant_id || null,
      level: loginBody?.level || null,
      error: loginBody?.error || null,
    };
    if (!loginOk) fail('PIN login for cipc-desk failed.', evidence);

    // 4) /change operator panel
    const changePage = await context.newPage();
    const changeUrl = withCfPreview(`${base}/change`, cfToken);
    const changeRes = await changePage.goto(changeUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    const changeStatus = changeRes?.status() || 0;
    await changePage.waitForTimeout(1500);
    const changeText = await changePage.locator('body').innerText().catch(() => '');
    const changeHtml = await changePage.content();
    const panelVisible =
      /CIPC Desk/i.test(changeText || changeHtml) ||
      /email-first/i.test(changeText || changeHtml) ||
      /Create\/update ticket from email/i.test(changeText || changeHtml) ||
      /client reply draft/i.test(changeText || changeHtml);
    await changePage.screenshot({ path: path.join(outDir, '02-change-operator.png'), fullPage: true });
    evidence.checks.change_operator_panel = {
      ok: changeStatus >= 200 && changeStatus < 400 && panelVisible,
      http: changeStatus,
      panel_signals: panelVisible,
    };
    if (!evidence.checks.change_operator_panel.ok) {
      fail('/change operator panel verification failed.', evidence);
    }

    // 5) Fictional inbound-email intake
    const fictionalEmail = [
      'From: preview.client@example.test',
      'Subject: CIPC Desk · fictional private company registration enquiry',
      '',
      'Hello — this is fictional preview data only.',
      'Please register a private company (Pty Ltd) in South Africa.',
      'Company working name: Fictional Acme Desk (Pty) Ltd.',
      'No live email or WhatsApp should be sent.',
    ].join('\n');

    const intakeRes = await context.request.post(withCfPreview(`${base}/api/cipc-desk/email-intake`, cfToken), {
      headers: { ...bypass.headers, 'content-type': 'application/json' },
      data: { email_text: fictionalEmail },
    });
    let intakeBody = null;
    try {
      intakeBody = await intakeRes.json();
    } catch {
      intakeBody = null;
    }
    const ticketId = intakeBody?.ticket_id ? String(intakeBody.ticket_id) : '';
    const magicLink = intakeBody?.magic_link_url ? String(intakeBody.magic_link_url) : '';
    const intakeOk = intakeRes.ok() && intakeBody?.ok === true && ticketId.length >= 18 && Boolean(magicLink);
    evidence.checks.email_intake = {
      ok: intakeOk,
      http: intakeRes.status(),
      ticket_id: ticketId || null,
      magic_link_redacted: magicLink ? redactUrl(magicLink) : null,
      error: intakeBody?.error || null,
    };
    if (!intakeOk) fail('Fictional email-intake failed.', evidence);

    // 6) Checklist update + 7) client reply-draft persistence
    const replyDraft =
      'FICTIONAL PREVIEW REPLY DRAFT — thank you; Serah will validate exact CIPC scope before any live work. No production mail sent.';
    const updateRes = await context.request.post(
      withCfPreview(`${base}/api/cmp/router?action=cipc-desk-ticket-update`, cfToken),
      {
        headers: { ...bypass.headers, 'content-type': 'application/json' },
        data: {
          ticket_id: ticketId,
          client_reply_draft: replyDraft,
          checklist_items: [
            { key: 'scope_confirmed', status: 'reviewed' },
            { key: 'required_info_captured', status: 'reviewed' },
            { key: 'documents_and_turnaround', status: 'reviewed' },
            { key: 'client_reply_draft_ready', status: 'reviewed' },
          ],
        },
      },
    );
    let updateBody = null;
    try {
      updateBody = await updateRes.json();
    } catch {
      updateBody = null;
    }
    const updateOk = updateRes.ok() && updateBody?.ok === true;
    evidence.checks.checklist_and_reply_draft = {
      ok: updateOk,
      http: updateRes.status(),
      all_reviewed: updateBody?.all_reviewed === true,
      error: updateBody?.error || null,
    };
    if (!updateOk) fail('cipc-desk-ticket-update (checklist + reply draft) failed.', evidence);

    // Confirm draft via ticket-get
    const getRes = await context.request.get(
      withCfPreview(`${base}/api/cmp/router?action=ticket-get&id=${encodeURIComponent(ticketId)}`, cfToken),
      { headers: bypass.headers },
    );
    let getBody = null;
    try {
      getBody = await getRes.json();
    } catch {
      getBody = null;
    }
    const cipc =
      getBody?.ticket_progress?.client_view?.cipc_desk &&
      typeof getBody.ticket_progress.client_view.cipc_desk === 'object'
        ? getBody.ticket_progress.client_view.cipc_desk
        : null;
    const draftPersisted =
      typeof cipc?.client_reply_draft === 'string' && cipc.client_reply_draft.includes('FICTIONAL PREVIEW REPLY DRAFT');
    const checklistOk = Array.isArray(cipc?.checklist?.items)
      ? cipc.checklist.items.every((it) => String(it?.status || '').toLowerCase() === 'reviewed')
      : false;
    evidence.checks.reply_draft_persisted = {
      ok: getRes.ok() && draftPersisted,
      http: getRes.status(),
      draft_persisted: draftPersisted,
      checklist_all_reviewed: checklistOk,
    };
    if (!evidence.checks.reply_draft_persisted.ok) {
      fail('Client reply draft did not persist on ticket-get.', evidence);
    }

    // 8) Client decisions thank-you flow (magic link)
    const magicToken = (() => {
      try {
        return new URL(magicLink).searchParams.get('token') || '';
      } catch {
        return '';
      }
    })();
    if (!magicToken) fail('Magic link missing token.', evidence);

    const submitRes = await context.request.post(
      withCfPreview(`${base}/api/cmp/router?action=submit-client-decisions`, cfToken),
      {
        headers: {
          ...bypass.headers,
          'content-type': 'application/json',
        },
        data: {
          ticket_id: ticketId,
          token: magicToken,
          answers: {
            human_handoff_owner_and_hours: {
              answer: 'Serah Fourie (fictional preview) — weekdays 09:00–16:00 SAST',
            },
            first_slice_outcome: {
              answer: 'First slice outcome: private-company registration (provisional)',
            },
            first_market_or_country: { answer: 'South Africa (CIPC)' },
            listings_feed_or_idx_provider_status: { waive: true },
          },
        },
      },
    );
    let submitBody = null;
    try {
      submitBody = await submitRes.json();
    } catch {
      submitBody = null;
    }
    const thankYou =
      typeof submitBody?.thank_you_message === 'string' ? submitBody.thank_you_message.trim() : '';
    const thankYouOk =
      submitRes.ok() &&
      submitBody?.ok === true &&
      thankYou.length > 0 &&
      thankYou.includes('FICTIONAL PREVIEW REPLY DRAFT');
    evidence.checks.client_decisions_thank_you = {
      ok: thankYouOk,
      http: submitRes.status(),
      thank_you_uses_reply_draft: thankYou.includes('FICTIONAL PREVIEW REPLY DRAFT'),
      sufficient_to_proceed: submitBody?.client_decisions?.sufficient_to_proceed === true,
      error: submitBody?.error || null,
    };

    const thankPage = await context.newPage();
    const thankNav = magicLink.includes('?')
      ? `${magicLink}&cf_preview=${encodeURIComponent(cfToken)}`
      : withCfPreview(magicLink, cfToken);
    await thankPage.goto(thankNav, { waitUntil: 'domcontentloaded', timeout: 90_000 }).catch(() => null);
    await thankPage.waitForTimeout(1200);
    await thankPage.screenshot({ path: path.join(outDir, '03-client-decisions-thank-you.png'), fullPage: true });

    if (!thankYouOk) fail('Client decisions thank-you flow failed.', evidence);

    evidence.tenant_boundary = {
      ok: true,
      note: 'All CMP + intake calls used cf_preview tenant=cipc-desk; PIN login returned tenant_id=cipc-desk.',
    };
    evidence.fictional_data_only = true;
    evidence.ok = true;
    evidence.finished_at = new Date().toISOString();

    writeFileSync(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2), 'utf8');
    console.log(
      JSON.stringify(
        {
          ok: true,
          preview_base_url: base,
          cf_preview_url_redacted: evidence.cf_preview_url_redacted,
          ticket_id: ticketId,
          checks: Object.fromEntries(
            Object.entries(evidence.checks).map(([k, v]) => [k, Boolean(v && v.ok)]),
          ),
          out_dir: outDir,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error('FATAL:', err?.message || err);
  process.exit(1);
});
