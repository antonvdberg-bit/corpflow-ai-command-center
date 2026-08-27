/**
 * #1177 in-process + live corpflow_test + hosted ERPNext GET probe.
 * Writes artifacts/commercial-quotation-evidence-1177/probe.json
 *
 * GET/read-only. Never prints ERPNEXT_BASE_URL, keys, or Authorization.
 * Never creates/updates/submits ERPNext or Postgres rows.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

import {
  actorFromSessionPayload,
  buildProofTenantActor,
  isProofModeAllowed,
} from '../lib/app/access.js';
import {
  handleAppCommercial,
  handleAppCommercialQuotation,
  handleAppCommercialQuotationPdf,
} from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import { quotationNameFromCommercialRow } from '../lib/app/commercial-quotation-evidence.js';
import { projectCommercialRowsFromLeads } from '../lib/app/commercial-summary.js';
import { isStableQuotationName, readQuotationEvidence, readQuotationPdf } from '../lib/erpnext/quotation-evidence.js';
import { tryFrappeClientFromEnv, redactText } from '../lib/erpnext/frappe-rest-client.js';

const OUT_DIR = path.resolve('artifacts/commercial-quotation-evidence-1177');
fs.mkdirSync(OUT_DIR, { recursive: true });

const LIVE = process.env.LIVE_BASE_URL || 'https://core.corpflowai.com';
const KNOWN_QUOTATIONS = Object.freeze([
  'SAL-QTN-2026-00001',
  'SAL-QTN-2026-00003',
  'SAL-QTN-2026-00004',
  'SAL-QTN-2026-00005',
]);

function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function mockRes() {
  /** @type {{ statusCode: number, body: any, headers: Record<string, string> }} */
  const state = { statusCode: 0, body: null, headers: {} };
  return {
    state,
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(payload) {
      state.body = payload;
      return this;
    },
    setHeader(name, value) {
      state.headers[String(name).toLowerCase()] = String(value);
      return this;
    },
    end(buf) {
      state.body = buf;
      return this;
    },
  };
}

async function hit(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CorpFlowAI-1177-acceptance/1.0' },
    redirect: 'manual',
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const text = buf.toString('utf8');
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return {
    status: res.status,
    content_type: res.headers.get('content-type'),
    bytes: buf.length,
    is_pdf: buf.subarray(0, 5).toString('utf8') === '%PDF-',
    has_sign_in: /Sign in/i.test(text),
    has_operating_workspace: /Operating Workspace/i.test(text),
    page: (text.match(/"page":"([^"]+)"/) || [])[1] || null,
    json_error: json && json.error ? json.error : null,
    json_ok: json && json.ok === true,
  };
}

function sha16(buf) {
  return createHash('sha256').update(buf).digest('hex').slice(0, 16);
}

const prevNode = process.env.NODE_ENV;
const prevVercel = process.env.VERCEL_ENV;
process.env.NODE_ENV = 'development';
delete process.env.VERCEL_ENV;
resetProspectFixtureStore();

const ada = mockRes();
await handleAppCommercialQuotation(
  {
    method: 'GET',
    url: '/api/app/commercial-quotation?proof=1&env=core&id=syn-772-lr-ada',
    headers: {},
  },
  ada,
);

const bea = mockRes();
await handleAppCommercialQuotation(
  {
    method: 'GET',
    url: '/api/app/commercial-quotation?proof=1&env=core&id=syn-772-rd-bea',
    headers: {},
  },
  bea,
);

const invented = mockRes();
await handleAppCommercialQuotation(
  {
    method: 'GET',
    url: '/api/app/commercial-quotation?proof=1&env=core&id=invented-commercial-row',
    headers: {},
  },
  invented,
);

const invalidName = isStableQuotationName('../Quotation');
const pdf = mockRes();
await handleAppCommercialQuotationPdf(
  {
    method: 'GET',
    url: '/api/app/commercial-quotation-pdf?proof=1&env=core&id=syn-772-lr-ada',
    headers: {},
  },
  pdf,
);

process.env.NODE_ENV = 'test';
const tenantJson = mockRes();
await handleAppCommercialQuotation(
  {
    method: 'GET',
    url: '/api/app/commercial-quotation?env=core&id=syn-772-lr-ada',
    headers: {},
    __testAppActor: buildProofTenantActor(),
  },
  tenantJson,
);
const tenantPdf = mockRes();
await handleAppCommercialQuotationPdf(
  {
    method: 'GET',
    url: '/api/app/commercial-quotation-pdf?env=core&id=syn-772-lr-ada',
    headers: {},
    __testAppActor: actorFromSessionPayload({
      typ: 'tenant',
      tenant_id: REFERENCE_TENANT_ID,
      username: 'tenant-user',
    }),
  },
  tenantPdf,
);
const tenantList = mockRes();
await handleAppCommercial(
  {
    method: 'GET',
    url: '/api/app/commercial?env=core&filter=all',
    headers: {},
    __testAppActor: buildProofTenantActor(),
  },
  tenantList,
);

const client = tryFrappeClientFromEnv(process.env);
/** @type {Record<string, unknown>} */
const hosted = {
  credentials_present: Boolean(client),
  identity: null,
  quotations: [],
  pdfs: [],
  mutated: false,
};
if (client) {
  if (typeof client.getLoggedUser === 'function') {
    try {
      const logged = await client.getLoggedUser();
      hosted.identity = logged?.user || null;
      hosted.identity_http = logged?.http || null;
    } catch (err) {
      hosted.identity_error = redactText(err instanceof Error ? err.name : 'Error');
    }
  }
  for (const name of [...KNOWN_QUOTATIONS, 'SAL-QTN-DOES-NOT-EXIST']) {
    const read = await readQuotationEvidence({ client, name });
    hosted.quotations.push({
      name,
      ok: read.ok === true,
      http: read.http || 0,
      error: read.error || null,
      docstatus: read.evidence?.docstatus ?? null,
      status: read.evidence?.status || null,
      currency: read.evidence?.currency || null,
      grand_total: read.evidence?.grand_total ?? null,
      customer: read.evidence?.customer || null,
      mutated: read.evidence?.mutated === true,
      copied_to_postgres: read.evidence?.copied_to_postgres === true,
    });
  }
  for (const name of ['SAL-QTN-2026-00001', 'SAL-QTN-2026-00005']) {
    const printed = await readQuotationPdf({ client, name, printFormat: 'Quotation Standard' });
    hosted.pdfs.push({
      name,
      ok: printed.ok === true,
      http: printed.http || 0,
      is_pdf: printed.isPdf === true,
      bytes: printed.bytes?.length || 0,
      sha256_16: printed.isPdf ? sha16(printed.bytes) : null,
      error: printed.error || null,
    });
  }
}

/** @type {Record<string, unknown>} */
let liveLeads = { ok: false, scanned: 0, rows_with_quotation: 0, mutated: false };
try {
  const prisma = new PrismaClient();
  const leads = await prisma.lead.findMany({ take: 400 });
  const projected = projectCommercialRowsFromLeads(leads);
  const withQuote = projected.filter((row) => quotationNameFromCommercialRow(row));
  liveLeads = {
    ok: true,
    scanned: leads.length,
    commercial_rows: projected.length,
    rows_with_quotation: withQuote.length,
    quotation_names: [
      ...new Set(withQuote.map((row) => quotationNameFromCommercialRow(row)).filter(Boolean)),
    ].filter((name) => KNOWN_QUOTATIONS.includes(name) || String(name).startsWith('SAL-QTN-2026-')),
    mutated: false,
  };
  await prisma.$disconnect();
} catch (err) {
  liveLeads = {
    ok: false,
    error: redactText(err instanceof Error ? err.name : 'Error'),
    mutated: false,
  };
}

const live = {
  health: await hit(`${LIVE}/api/factory/health`),
  commercial_html: await hit(`${LIVE}/app/commercial`),
  quotation_html: await hit(`${LIVE}/app/commercial/syn-772-lr-ada`),
  commercial_api: await hit(`${LIVE}/api/app/commercial?env=core&filter=all`),
  quotation_api: await hit(`${LIVE}/api/app/commercial-quotation?env=core&id=syn-772-lr-ada`),
  quotation_pdf_api: await hit(`${LIVE}/api/app/commercial-quotation-pdf?env=core&id=syn-772-lr-ada`),
  proof_rejected: await hit(`${LIVE}/api/app/commercial-quotation?proof=1&env=core&id=syn-772-lr-ada`),
  tenant_env_unauth: await hit(`${LIVE}/api/app/commercial?env=tenant`),
};

const adaOk = ada.state.statusCode === 200 && ada.state.body?.quotation?.name === 'SAL-QTN-2026-00001';
const hostedAda = hosted.quotations.find((row) => row.name === 'SAL-QTN-2026-00001');
const hostedAdaPdf = hosted.pdfs.find((row) => row.name === 'SAL-QTN-2026-00001');
const livePointerGap = liveLeads.ok === true && liveLeads.rows_with_quotation === 0;
const blocker = livePointerGap
  ? 'NOT READY — corpflow_test Commercial leads have no recorded ERPNext Quotation id'
  : adaOk && hostedAda?.ok && hostedAdaPdf?.ok
    ? null
    : 'NOT READY — quotation evidence path failed proof or hosted GET';

const probe = {
  schema: 'corpflow.commercial_quotation_evidence_acceptance.v1',
  issue: 1177,
  git_sha: gitSha(),
  current_main_sha: 'b731411734edb01b7dbb8d7e20247c5a7805983a',
  production_github_deployment: 6122881088,
  route: '/app/commercial/syn-772-lr-ada',
  quotation: 'SAL-QTN-2026-00001',
  proof_mode_allowed_here: isProofModeAllowed(),
  in_process: {
    ada: {
      status: ada.state.statusCode,
      quotation: ada.state.body?.quotation?.name || null,
      docstatus: ada.state.body?.quotation?.docstatus ?? null,
      status_text: ada.state.body?.quotation?.status || null,
      currency: ada.state.body?.quotation?.currency || null,
      grand_total: ada.state.body?.quotation?.grand_total ?? null,
      erpnext_mutated: ada.state.body?.erpnext_mutated === true,
      copied_to_postgres: ada.state.body?.copied_to_postgres === true,
      print_href: ada.state.body?.print?.href || null,
    },
    bea: {
      status: bea.state.statusCode,
      error: bea.state.body?.error || null,
      blocker: bea.state.body?.blocker || null,
    },
    invented: {
      status: invented.state.statusCode,
      error: invented.state.body?.error || null,
    },
    invalid_path_name_stable: invalidName,
    proof_pdf: {
      status: pdf.state.statusCode,
      content_type: pdf.state.headers['content-type'] || null,
      is_pdf: Buffer.isBuffer(pdf.state.body) && pdf.state.body.subarray(0, 5).toString('utf8') === '%PDF-',
      bytes: Buffer.isBuffer(pdf.state.body) ? pdf.state.body.length : 0,
    },
    tenant_denied: {
      quotation: { status: tenantJson.state.statusCode, error: tenantJson.state.body?.error || null },
      pdf: { status: tenantPdf.state.statusCode, error: tenantPdf.state.body?.error || null },
      list: { status: tenantList.state.statusCode, error: tenantList.state.body?.error || null },
    },
  },
  hosted_erpnext: hosted,
  live_leads: liveLeads,
  live,
  erpnext_mutated: false,
  postgres_mutated: false,
  blocker,
  verdict: blocker || 'COMMERCIAL -> ERPNEXT QUOTATION EVIDENCE USABLE',
};

fs.writeFileSync(path.join(OUT_DIR, 'probe.json'), `${JSON.stringify(probe, null, 2)}\n`);
console.log(JSON.stringify({ ok: !blocker, verdict: probe.verdict, artifact: path.join(OUT_DIR, 'probe.json') }, null, 2));

if (prevNode == null) delete process.env.NODE_ENV;
else process.env.NODE_ENV = prevNode;
if (prevVercel == null) delete process.env.VERCEL_ENV;
else process.env.VERCEL_ENV = prevVercel;
resetProspectFixtureStore();
