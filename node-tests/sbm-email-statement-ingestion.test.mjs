import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import fixture from '../fixtures/erpnext-bank-reconciliation-readiness/sbm-combined-statement-redacted.v1.json' with { type: 'json' };
import {
  SBM_GMAIL_QUERY,
  downloadAttachment,
  ingestSbmAttachment,
  listPdfAttachments,
  routeStatement,
} from '../lib/finance/sbm-email-statement-ingestion.js';

const PDF = Buffer.from('%PDF-1.7 synthetic redacted PDF\n');

async function qpdfStub(directory) {
  const file = path.join(directory, 'qpdf-stub.sh');
  await writeFile(file, '#!/bin/sh\nread password\nif [ "$password" = "bad-password" ]; then exit 1; fi\ncp "$3" "$4"\n');
  await chmod(file, 0o755);
  return file;
}

async function brokenQpdfStub(directory) {
  const file = path.join(directory, 'qpdf-broken-stub.sh');
  await writeFile(file, '#!/bin/sh\nread password\nexit 0\n');
  await chmod(file, 0o755);
  return file;
}

function gmailFixture() {
  const calls = [];
  return {
    calls,
    async listMessages(options) {
      calls.push(['list', options]);
      return { messages: [{ id: 'message-1' }] };
    },
    async getMessage() {
      return {
        id: 'message-1',
        internalDate: String(Date.now()),
        payload: {
          headers: [{ name: 'Date', value: 'Thu, 1 Oct 2026 10:00:00 +0000' }],
          parts: [
            { filename: 'statement-2026-09.pdf', mimeType: 'application/octet-stream', body: { attachmentId: 'pdf-1' } },
            { filename: 'not-a-pdf.txt', mimeType: 'text/plain', body: { attachmentId: 'txt-1' } },
          ],
        },
      };
    },
    async getAttachment(_messageId, attachmentId) {
      return { data: Buffer.from(attachmentId === 'pdf-1' ? PDF : 'not PDF').toString('base64url') };
    },
  };
}

test('uses the exact Gmail filter and accepts octet-stream PDF bytes', async () => {
  const gmail = gmailFixture();
  const listed = await listPdfAttachments({ gmail });
  assert.equal(gmail.calls[0][1].query, SBM_GMAIL_QUERY);
  assert.equal(listed.length, 2);
  const pdf = await downloadAttachment({ gmail, attachment: listed[0] });
  const rejected = await downloadAttachment({ gmail, attachment: listed[1] });
  assert.equal(pdf.status, 'ACCEPTED');
  assert.equal(rejected.status, 'REJECTED_NOT_PDF');
});

test('routes parser period first, filename second, email date with review, and unknown without filing', () => {
  assert.deepEqual(routeStatement({ payload: { accounts: [{ statement_period: '2026-08' }] }, filename: '2026-09.pdf' }).source, 'statement_parser');
  assert.deepEqual(routeStatement({ filename: 'statement_2026-09.pdf' }).period, '2026-09');
  assert.equal(routeStatement({ filename: 'statement.pdf', emailDate: '2026-09-03T00:00:00Z' }).reviewRequired, true);
  assert.equal(routeStatement({ filename: 'statement.pdf' }).period, null);
});

test('decrypts safely, reuses #1378 validation/preview, and skips duplicate hashes', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sbm-ingestion-'));
  const qpdf = await qpdfStub(root);
  const attachment = {
    status: 'ACCEPTED',
    filename: 'statement-2026-09.pdf',
    emailDate: '2026-10-01T00:00:00Z',
    bytes: PDF,
  };
  const first = await ingestSbmAttachment({
    attachment,
    financeRoot: root,
    password: 'fixture-password',
    qpdfBin: qpdf,
    extractStatement: async () => fixture,
  });
  const second = await ingestSbmAttachment({
    attachment,
    financeRoot: root,
    password: 'fixture-password',
    qpdfBin: qpdf,
    extractStatement: async () => fixture,
  });
  assert.equal(first.status, 'PREVIEW_READY');
  assert.equal(first.preview.length, 8);
  assert.equal(second.status, 'DUPLICATE_SKIPPED');
  assert.deepEqual(await readFile(first.routedPath), PDF);
  assert.equal((await readdir(path.join(root, 'Incoming', 'SBM', 'Original', 'Unrouted'))).length, 1);
});

test('wrong password fails closed without leaking the password and leaves no derivative', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sbm-ingestion-'));
  const qpdf = await qpdfStub(root);
  const result = await ingestSbmAttachment({
    attachment: { status: 'ACCEPTED', filename: 'statement-2026-09.pdf', bytes: PDF },
    financeRoot: root,
    password: 'bad-password',
    qpdfBin: qpdf,
  });
  assert.equal(result.status, 'PASSWORD_REJECTED');
  assert.doesNotMatch(JSON.stringify(result), /bad-password|fixture-password/);
  assert.equal((await readdir(path.join(root, 'Processed', 'SBM', 'Unrouted'))).length, 0);
});

test('derivative failure is atomic and leaves no temporary output', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sbm-ingestion-'));
  const result = await ingestSbmAttachment({
    attachment: { status: 'ACCEPTED', filename: 'statement-2026-09.pdf', bytes: PDF },
    financeRoot: root,
    qpdfBin: await brokenQpdfStub(root),
  });
  assert.equal(result.status, 'DERIVATIVE_FAILED');
  assert.equal((await readdir(path.join(root, 'Processed', 'SBM', 'Unrouted'))).length, 0);
});

test('unencrypted input is handled by qpdf and validation failure is not preview-ready', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sbm-ingestion-'));
  const qpdf = await qpdfStub(root);
  const result = await ingestSbmAttachment({
    attachment: { status: 'ACCEPTED', filename: 'statement-2026-09.pdf', bytes: PDF },
    financeRoot: root,
    password: undefined,
    qpdfBin: qpdf,
    extractStatement: async () => ({
      accounts: [{
        statement_period: '2026-09',
        opening_balance: 1,
        closing_balance: 2,
        total_credits: 0,
        total_debits: 0,
        transactions: [],
      }],
    }),
  });
  assert.equal(result.status, 'VALIDATION_FAILED');
  assert.equal(result.preview, undefined);
});

test('unknown period stops before month filing and dry-run does not stage bytes', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sbm-ingestion-'));
  const dryRun = await ingestSbmAttachment({
    attachment: { status: 'ACCEPTED', filename: 'statement.pdf', bytes: PDF },
    financeRoot: root,
    dryRun: true,
  });
  assert.equal(dryRun.status, 'ACCEPTED_DRY_RUN');
  const unknown = await ingestSbmAttachment({
    attachment: { status: 'ACCEPTED', filename: 'statement.pdf', bytes: PDF },
    financeRoot: root,
    qpdfBin: await qpdfStub(root),
    extractStatement: async () => ({ accounts: [] }),
  });
  assert.equal(unknown.status, 'REVIEW_REQUIRED');
  assert.match(unknown.reason, /UNKNOWN_PERIOD/);
  assert.equal((await readdir(path.join(root, 'Processed', 'SBM', 'Unrouted'))).length, 1);
});
