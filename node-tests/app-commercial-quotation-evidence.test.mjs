/**
 * #1160 Commercial Workspace → ERPNext quotation evidence continuity.
 * Deterministic. No live ERPNext write. Never prints secrets.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  actorFromSessionPayload,
  buildProofCoreActor,
  buildProofTenantActor,
} from '../lib/app/access.js';
import {
  buildCommercialQuotationEvidencePayload,
  loadCommercialQuotationEvidence,
  loadCommercialQuotationPdf,
  quotationNameFromCommercialRow,
} from '../lib/app/commercial-quotation-evidence.js';
import { fixtureCommercialRecords, projectCommercialRow } from '../lib/app/commercial-summary.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import {
  handleAppCommercialQuotation,
  handleAppCommercialQuotationPdf,
  tryHandleAppApi,
} from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';
import {
  classifyWorkspaceSurface,
  commercialQuotationPath,
  isCommercialQuotationPath,
  isCommercialSummaryPath,
} from '../lib/app/workspace-context.js';
import { isOperatingWorkspaceStaffPath } from '../lib/app/tenant-workspace.js';
import { isStaffOnlyTenantDeniedPath } from '../lib/app/tenant-journey.js';
import { createFrappeRestClient } from '../lib/erpnext/frappe-rest-client.js';
import {
  isStableQuotationName,
  projectBoundedQuotationEvidence,
  proofQuotationDocForName,
  readQuotationEvidence,
  syntheticProofPdfBytes,
} from '../lib/erpnext/quotation-evidence.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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

function memoryQuotationClient(seed, { failPdf = false } = {}) {
  const rows = new Map();
  const log = [];
  for (const row of seed) {
    rows.set(String(row.name), { ...row });
  }
  return {
    kind: 'memory',
    log,
    async get(doctype, name) {
      log.push({ op: 'get', doctype, name, method: 'GET' });
      const row = rows.get(String(name));
      if (!row) return { ok: false, http: 404, row: null, error: 'NOT_FOUND' };
      return { ok: true, http: 200, row: { ...row, doctype }, error: null };
    },
    async downloadPdf(doctype, name) {
      log.push({ op: 'downloadPdf', doctype, name, method: 'GET' });
      if (failPdf) return { ok: false, http: 500, bytes: Buffer.alloc(0), isPdf: false, error: 'PRINT_FAILED' };
      const bytes = syntheticProofPdfBytes(name);
      return { ok: true, http: 200, bytes, contentType: 'application/pdf', isPdf: true, error: null };
    },
    async create() {
      log.push({ op: 'create', method: 'POST' });
      throw new Error('create_forbidden');
    },
    async update() {
      log.push({ op: 'update', method: 'PUT' });
      throw new Error('update_forbidden');
    },
  };
}

describe('Commercial quotation evidence #1160', { concurrency: false }, () => {
  test('Ada commercial row already has a stable ERPNext Quotation id', () => {
    const now = new Date('2026-08-19T12:00:00.000Z');
    const ada = fixtureCommercialRecords(now).find((row) => row.id === 'syn-772-lr-ada');
    assert.equal(quotationNameFromCommercialRow(ada), 'SAL-QTN-2026-00001');
    assert.equal(isStableQuotationName(ada.erpnext.quotation), true);
    assert.equal(ada.quotation_evidence_path, '/app/commercial/syn-772-lr-ada');
    const proof = proofQuotationDocForName('SAL-QTN-2026-00001');
    assert.equal(proof.name, 'SAL-QTN-2026-00001');
    assert.equal(proof.docstatus, 0);
    assert.equal(proof.status, 'Draft');
    assert.equal(proof.currency, 'USD');
    assert.equal(proof.grand_total, 249);
  });

  test('rows without a quotation reference do not invent a drilldown', () => {
    const bea = projectCommercialRow({
      id: 'syn-772-rd-bea',
      prospect_id: 'syn-772-rd-bea',
      product: 'website-rescue',
      erpnext_quotation: null,
    });
    assert.equal(bea.erpnext.quotation, null);
    assert.equal(bea.quotation_evidence_path, null);
    assert.equal(isStableQuotationName('../Quotation'), false);
    assert.equal(isStableQuotationName('quotation/SAL-QTN-2026-00001'), false);
  });

  test('proof mode resolves Ada to bounded GET-shaped evidence without ERPNext write', async () => {
    resetProspectFixtureStore();
    const loaded = await loadCommercialQuotationEvidence({
      id: 'syn-772-lr-ada',
      proofMode: true,
    });
    assert.equal(loaded.ok, true);
    assert.equal(loaded.evidence.name, 'SAL-QTN-2026-00001');
    assert.equal(loaded.evidence.docstatus, 0);
    assert.equal(loaded.evidence.status, 'Draft');
    assert.equal(loaded.evidence.currency, 'USD');
    assert.equal(loaded.evidence.grand_total, 249);
    assert.equal(loaded.evidence.mutated, false);
    assert.equal(loaded.evidence.copied_to_postgres, false);
    const payload = buildCommercialQuotationEvidencePayload({
      row: loaded.row,
      evidence: loaded.evidence,
      data_source: loaded.data_source,
      proof_mode: true,
    });
    assert.equal(payload.path, '/app/commercial/syn-772-lr-ada');
    assert.equal(payload.erpnext_mutated, false);
    assert.equal(payload.copied_to_postgres, false);
    assert.equal(payload.back.commercial.includes('/app/commercial'), true);
    assert.equal(payload.back.prospect, '/app/prospects/syn-772-lr-ada?proof=1');
    assert.match(payload.print.href, /commercial-quotation-pdf/);
    resetProspectFixtureStore();
  });

  test('Bea stops at the exact missing quotation reference', async () => {
    resetProspectFixtureStore();
    const loaded = await loadCommercialQuotationEvidence({
      id: 'syn-772-rd-bea',
      proofMode: true,
    });
    assert.equal(loaded.ok, false);
    assert.equal(loaded.error, 'quotation_reference_missing');
    assert.match(loaded.blocker, /no stable ERPNext Quotation id/);
    resetProspectFixtureStore();
  });

  test('injected Frappe client is GET-only and never create/update', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    const client = memoryQuotationClient([
      {
        name: 'SAL-QTN-2026-00001',
        docstatus: 0,
        status: 'Draft',
        currency: 'USD',
        grand_total: 249,
        customer: 'CF880 Synthetic Lead Rescue Ltd',
      },
    ]);
    resetProspectFixtureStore();
    try {
      const loaded = await loadCommercialQuotationEvidence({
        id: 'syn-772-lr-ada',
        proofMode: false,
        client,
      });
      assert.equal(loaded.ok, true);
      assert.equal(loaded.evidence.name, 'SAL-QTN-2026-00001');
      assert.equal(loaded.evidence.source, 'erpnext_get');
      assert.deepEqual(
        client.log.map((row) => row.op),
        ['get'],
      );
      const pdf = await loadCommercialQuotationPdf({
        id: 'syn-772-lr-ada',
        proofMode: false,
        client,
      });
      assert.equal(pdf.ok, true);
      assert.equal(pdf.isPdf, true);
      assert.equal(pdf.bytes.subarray(0, 5).toString('utf8'), '%PDF-');
      assert.ok(client.log.every((row) => row.op !== 'create' && row.op !== 'update'));
    } finally {
      process.env.NODE_ENV = prevNode;
      resetProspectFixtureStore();
    }
  });

  test('live path without a client stops at the exact read blocker', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    resetProspectFixtureStore();
    try {
      const loaded = await loadCommercialQuotationEvidence({
        id: 'syn-772-lr-ada',
        proofMode: false,
        client: null,
        env: {},
      });
      assert.equal(loaded.ok, false);
      assert.equal(loaded.error, 'erpnext_read_unavailable');
      assert.match(loaded.blocker, /ERPNext GET\/read-only client is unavailable/);
    } finally {
      process.env.NODE_ENV = prevNode;
      resetProspectFixtureStore();
    }
  });

  test('handler: Core proof returns Ada quotation evidence', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    resetProspectFixtureStore();
    try {
      const res = mockRes();
      await handleAppCommercialQuotation(
        {
          method: 'GET',
          url: '/api/app/commercial-quotation?proof=1&env=core&id=syn-772-lr-ada',
          headers: {},
        },
        res,
      );
      assert.equal(res.state.statusCode, 200);
      assert.equal(res.state.body.ok, true);
      assert.equal(res.state.body.quotation.name, 'SAL-QTN-2026-00001');
      assert.equal(res.state.body.quotation.docstatus, 0);
      assert.equal(res.state.body.erpnext_mutated, false);
      assert.equal(res.state.body.copied_to_postgres, false);
      const blob = JSON.stringify(res.state.body);
      assert.equal(blob.includes('ERPNEXT_API_SECRET'), false);
      assert.equal(blob.includes('qualificationJson'), false);
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevVercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
      resetProspectFixtureStore();
    }
  });

  test('handler: proof PDF is a GET-only synthetic PDF', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    resetProspectFixtureStore();
    try {
      const res = mockRes();
      await handleAppCommercialQuotationPdf(
        {
          method: 'GET',
          url: '/api/app/commercial-quotation-pdf?proof=1&env=core&id=syn-772-lr-ada',
          headers: {},
        },
        res,
      );
      assert.equal(res.state.statusCode, 200);
      assert.equal(res.state.headers['content-type'], 'application/pdf');
      assert.equal(Buffer.isBuffer(res.state.body), true);
      assert.equal(res.state.body.subarray(0, 5).toString('utf8'), '%PDF-');
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevVercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
      resetProspectFixtureStore();
    }
  });

  test('handler: Tenant session is denied quotation evidence and PDF', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const jsonRes = mockRes();
      await handleAppCommercialQuotation(
        {
          method: 'GET',
          url: '/api/app/commercial-quotation?env=core&id=syn-772-lr-ada',
          headers: {},
          __testAppActor: buildProofTenantActor(),
        },
        jsonRes,
      );
      assert.equal(jsonRes.state.statusCode, 403);
      assert.equal(jsonRes.state.body.error, 'core_access_denied');

      const pdfRes = mockRes();
      await handleAppCommercialQuotationPdf(
        {
          method: 'GET',
          url: '/api/app/commercial-quotation-pdf?env=core&id=syn-772-lr-ada',
          headers: {},
          __testAppActor: buildProofTenantActor(),
        },
        pdfRes,
      );
      assert.equal(pdfRes.state.statusCode, 403);
      assert.equal(pdfRes.state.body.error, 'core_access_denied');
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });

  test('handler: tenant actor cannot use env=core to read another client quotation', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const tenantActor = actorFromSessionPayload({
        typ: 'tenant',
        tenant_id: REFERENCE_TENANT_ID,
        username: 'tenant-user',
      });
      const res = mockRes();
      await handleAppCommercialQuotation(
        {
          method: 'GET',
          url: '/api/app/commercial-quotation?env=core&id=syn-772-lr-ada',
          headers: {},
          __testAppActor: tenantActor,
        },
        res,
      );
      assert.equal(res.state.statusCode, 403);
      assert.equal(res.state.body.error, 'core_access_denied');
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });

  test('tryHandleAppApi routes quotation evidence APIs', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    resetProspectFixtureStore();
    try {
      const res = mockRes();
      const handled = await tryHandleAppApi(
        {
          method: 'GET',
          url: '/api/app/commercial-quotation?proof=1&env=core&id=syn-772-lr-ada',
          headers: {},
          __testAppActor: buildProofCoreActor(),
        },
        res,
        'app/commercial-quotation',
      );
      assert.equal(handled, true);
      assert.equal(res.state.statusCode, 200);
      assert.equal(res.state.body.quotation.name, 'SAL-QTN-2026-00001');
    } finally {
      process.env.NODE_ENV = prevNode;
      resetProspectFixtureStore();
    }
  });

  test('staff-only path helpers include the drilldown and APIs', () => {
    assert.equal(isCommercialQuotationPath('/app/commercial/syn-772-lr-ada'), true);
    assert.equal(isCommercialQuotationPath('/api/app/commercial-quotation'), true);
    assert.equal(isCommercialSummaryPath('/app/commercial/syn-772-lr-ada'), true);
    assert.equal(isOperatingWorkspaceStaffPath('/app/commercial/syn-772-lr-ada'), true);
    assert.equal(isOperatingWorkspaceStaffPath('/api/app/commercial-quotation'), true);
    assert.equal(isStaffOnlyTenantDeniedPath('/app/commercial/syn-772-lr-ada'), true);
    assert.equal(isStaffOnlyTenantDeniedPath('/api/app/commercial-quotation-pdf'), true);
    assert.equal(commercialQuotationPath('syn-772-lr-ada'), '/app/commercial/syn-772-lr-ada');
    assert.equal(classifyWorkspaceSurface('/app/commercial/syn-772-lr-ada')?.path, '/app/commercial/[id]');
  });

  test('Frappe downloadPdf is a GET to the standard print method', async () => {
    const calls = [];
    const pdfBytes = syntheticProofPdfBytes('SAL-QTN-2026-00001');
    const client = createFrappeRestClient({
      baseUrl: 'https://erpnext.example.invalid',
      apiKey: 'key',
      apiSecret: 'secret',
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), method: init.method, headers: init.headers });
        return {
          status: 200,
          headers: { get: () => 'application/pdf' },
          arrayBuffer: async () => pdfBytes,
        };
      },
    });
    const result = await client.downloadPdf('Quotation', 'SAL-QTN-2026-00001', 'Quotation Standard');
    assert.equal(result.ok, true);
    assert.equal(calls[0].method, 'GET');
    assert.match(calls[0].url, /frappe\.utils\.print_format\.download_pdf/);
    assert.match(String(calls[0].headers.Authorization), /^token /);
    const evidence = await readQuotationEvidence({
      client: memoryQuotationClient([
        { name: 'SAL-QTN-2026-00001', docstatus: 0, status: 'Draft', currency: 'USD', grand_total: 249 },
      ]),
      name: 'SAL-QTN-2026-00001',
    });
    const bounded = projectBoundedQuotationEvidence(evidence.evidence);
    assert.equal(bounded.base_grand_total, undefined);
    assert.equal(bounded.mutated, false);
  });

  test('UI remains read-only and returns to Commercial / Prospect', () => {
    const page = readFileSync(join(root, 'pages/app/commercial/[id].js'), 'utf8');
    const ui = readFileSync(join(root, 'components/app/CommercialQuotationEvidence.js'), 'utf8');
    const list = readFileSync(join(root, 'components/app/CommercialSummary.js'), 'utf8');
    const css = readFileSync(join(root, 'components/app/app-theme.js'), 'utf8');
    assert.ok(page.includes('/api/app/commercial-quotation'));
    assert.ok(!page.includes("method: 'PATCH'"));
    assert.ok(!page.includes("method: 'POST'"));
    assert.ok(ui.includes('commercial-quotation-back-commercial'));
    assert.ok(ui.includes('commercial-quotation-back-prospect'));
    assert.ok(ui.includes('Open printable PDF'));
    assert.ok(list.includes('commercial-quotation-'));
    assert.ok(list.includes('Open quotation evidence'));
    assert.match(css, /\.cf-app-actions\s*\{[^}]*flex-wrap:\s*wrap/s);
    assert.match(css, /\.cf-app-dl\s*\{[^}]*auto-fit/s);
    assert.match(css, /\.cf-app-table-wrap\s*\{[^}]*overflow-x:\s*auto/s);
  });
});
