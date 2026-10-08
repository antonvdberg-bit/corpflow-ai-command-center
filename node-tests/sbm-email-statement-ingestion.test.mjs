import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  GmailStatementClient,
  SBM_GMAIL_QUERY,
  createUnlockedDerivative,
  createRealQpdfRunner,
  handoffToSbmPreview,
  isPdfAttachment,
  processStatementAttachment,
  resolveStatementPeriod,
  statementPeriodFromFilename,
} from '../lib/finance/sbm-email-statement-ingestion.js';

const PDF = Buffer.from('%PDF-1.7 synthetic redacted fixture');
const PASSWORD = 'synthetic-only-password';
const TOKEN = 'synthetic-only-token';

function qpdfFake({ encrypted = true, failDecrypt = false } = {}) {
  return {
    calls: [],
    async showEncryption(file) {
      this.calls.push(['showEncryption', file]);
      return encrypted ? 'R = 6\\nuser password = not empty' : 'File is not encrypted';
    },
    async decrypt(input, output, password) {
      this.calls.push(['decrypt', input, output, password]);
      if (failDecrypt) throw new Error('PASSWORD_REJECTED');
      await writeFile(output, Buffer.from('%PDF-1.7 unlocked synthetic fixture'));
    },
    async check(file) {
      this.calls.push(['check', file]);
    },
  };
}

function validPayload() {
  return {
    statement_id: 'SYNTHETIC-SBM-2026-07',
    accounts: [{
      currency: 'MUR',
      statement_period: '2026-07',
      opening_balance: 100,
      total_credits: 50,
      total_debits: 20,
      closing_balance: 130,
      transactions: [{
        transaction_date: '2026-07-02',
        value_date: '2026-07-02',
        description: 'Synthetic receipt',
        debit: 0,
        credit: 50,
      }, {
        transaction_date: '2026-07-03',
        value_date: '2026-07-03',
        description: 'Synthetic fee',
        debit: 20,
        credit: 0,
      }],
    }],
  };
}

test('Gmail query is exact and octet-stream PDF bytes are accepted', async () => {
  const urls = [];
  const client = new GmailStatementClient({
    accessToken: TOKEN,
    fetchImpl: async (url) => {
      urls.push(String(url));
      if (url.pathname.endsWith('/messages')) {
        return { ok: true, json: async () => ({ messages: [{ id: 'm1' }] }) };
      }
      if (url.pathname.endsWith('/messages/m1')) {
        return {
          ok: true,
          json: async () => ({
            internalDate: '1780000000000',
            payload: { parts: [{ filename: '260702_REDACTED.PDF', mimeType: 'application/octet-stream', body: { attachmentId: 'a1' } }] },
          }),
        };
      }
      return { ok: true, json: async () => ({ data: PDF.toString('base64url') }) };
    },
  });
  const attachments = await client.listStatementAttachments({ lookbackDays: 10, now: new Date('2026-07-10T00:00:00Z') });
  assert.equal(attachments.length, 1);
  assert.equal(attachments[0].filename, '260702_REDACTED.PDF');
  assert.equal(new URL(urls[0]).searchParams.get('q').startsWith(SBM_GMAIL_QUERY), true);
  assert.match(new URL(urls[0]).searchParams.get('q'), /after:/);
  assert.equal(isPdfAttachment({ filename: 'x.pdf', mimeType: 'application/octet-stream', bytes: PDF }), true);
  assert.equal(isPdfAttachment({ filename: 'x.txt', mimeType: 'application/octet-stream', bytes: PDF }), false);
  assert.equal(isPdfAttachment({ filename: 'x.pdf', mimeType: 'application/octet-stream', bytes: Buffer.from('not pdf') }), false);
});

test('filename routing is deterministic and email-date fallback requires review', () => {
  assert.deepEqual(statementPeriodFromFilename('260702_REDACTED.PDF'), {
    period: '2026-07', confidence: 'filename', source: '260702',
  });
  assert.deepEqual(resolveStatementPeriod({ filename: 'unknown.pdf' }), {
    period: null, confidence: 'unknown', reason: 'REVIEW_REQUIRED',
  });
  const fallback = resolveStatementPeriod({ filename: 'unknown.pdf', receivedAt: new Date('2026-08-04T00:00:00Z') });
  assert.equal(fallback.period, '2026-08');
  assert.equal(fallback.reason, 'REVIEW_REQUIRED');
});

test('encrypted source is retained, decrypted atomically, and handed to #1378 preview', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sbm-intake-'));
  try {
    const qpdf = qpdfFake();
    const result = await processStatementAttachment({
      financeRoot: root,
      attachment: { filename: '260702_REDACTED.PDF', mimeType: 'application/octet-stream', bytes: PDF },
      password: PASSWORD,
      payload: validPayload(),
      qpdf,
    });
    assert.equal(result.status, 'PROCESSED');
    assert.equal(result.handoff.status, 'READY_FOR_IMPORT_PREVIEW');
    assert.equal(result.handoff.preview.length, 2);
    assert.equal((await readFile(result.original.path)).equals(PDF), true);
    assert.equal(result.derivative.status, 'DECRYPTED');
    assert.match(result.derivative.path, /Processed/);
    assert.ok(!qpdf.calls.some((call) => call[0] === 'decrypt' && call[3] !== PASSWORD));
    assert.equal((await readdir(path.dirname(result.derivative.path))).some((name) => name.endsWith('.tmp')), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('duplicates do not create another derivative and wrong password fails closed without secret leakage', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sbm-intake-'));
  try {
    const args = {
      financeRoot: root,
      attachment: { filename: '260702_REDACTED.PDF', mimeType: 'application/pdf', bytes: PDF },
      password: PASSWORD,
      qpdf: qpdfFake(),
    };
    const first = await processStatementAttachment(args);
    const duplicate = await processStatementAttachment(args);
    assert.equal(first.status, 'PROCESSED');
    assert.equal(duplicate.status, 'DUPLICATE');
    await assert.rejects(
      () => createUnlockedDerivative({
        originalPath: first.original.path,
        processedDirectory: path.dirname(first.derivative.path),
        outputName: 'wrong.pdf',
        password: PASSWORD,
        qpdf: qpdfFake({ failDecrypt: true }),
      }),
      (error) => error.message === 'PASSWORD_REJECTED' && !error.stack.includes(PASSWORD)
    );
    assert.equal(await readdir(path.dirname(first.derivative.path)).then((files) => files.includes('wrong.pdf')), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('unencrypted source is checked in place and original is never overwritten', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sbm-intake-'));
  try {
    const qpdf = qpdfFake({ encrypted: false });
    const result = await processStatementAttachment({
      financeRoot: root,
      attachment: { filename: '260702_REDACTED.PDF', mimeType: 'application/pdf', bytes: PDF },
      password: PASSWORD,
      qpdf,
    });
    assert.equal(result.derivative.status, 'UNENCRYPTED');
    assert.equal(result.derivative.path, result.original.path);
    assert.equal((await readFile(result.original.path)).equals(PDF), true);
    assert.equal(qpdf.calls.some((call) => call[0] === 'decrypt'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('unknown month does not mutate filing storage and #1378 validation failure blocks preview', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sbm-intake-'));
  try {
    const review = await processStatementAttachment({
      financeRoot: root,
      attachment: { filename: 'statement.pdf', mimeType: 'application/pdf', bytes: PDF, receivedAt: undefined },
      password: PASSWORD,
      qpdf: qpdfFake(),
    });
    assert.equal(review.status, 'REVIEW_REQUIRED');
    assert.deepEqual(await readdir(root), []);
    const bad = handoffToSbmPreview({ ...validPayload(), accounts: [{ ...validPayload().accounts[0], closing_balance: 999 }] });
    assert.equal(bad.status, 'VALIDATION_FAILED');
    assert.equal(bad.preview, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('real qpdf adapter fails closed when executable is unavailable', async () => {
  await assert.rejects(
    () => createRealQpdfRunner({ executable: 'qpdf-that-is-not-installed' }).showEncryption('/tmp/no.pdf'),
    (error) => error.message === 'QPDF_UNAVAILABLE'
  );
});

