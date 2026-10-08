import { createHash } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import {
  normalizeSbmStatement,
  toErpnextBankTransactionPreview,
  validateSbmStatement,
} from '../erpnext/sbm-statement-ingestion.js';

const execFileAsync = promisify(execFile);
export const SBM_GMAIL_QUERY =
  'from:SBM.EStatement@sbmgroup.mu subject:"Account e-statement" has:attachment';
const PDF_HEADER = Buffer.from('%PDF-');

function base64UrlToBuffer(value) {
  return Buffer.from(String(value).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function isPdfFilename(filename) {
  return /\.pdf$/i.test(String(filename || ''));
}

export function isPdfAttachment({ filename, mimeType, bytes }) {
  return (
    (isPdfFilename(filename) || mimeType === 'application/pdf' ||
      (mimeType === 'application/octet-stream' && isPdfFilename(filename))) &&
    Buffer.isBuffer(bytes) &&
    bytes.subarray(0, PDF_HEADER.length).equals(PDF_HEADER)
  );
}

function walkParts(part, result = []) {
  if (!part) return result;
  if (part.filename) result.push(part);
  for (const child of part.parts || []) walkParts(child, result);
  return result;
}

function gmailError(response) {
  return new Error(`GMAIL_HTTP_${response.status}`);
}

export class GmailStatementClient {
  constructor({ accessToken, fetchImpl = globalThis.fetch, userId = 'me' } = {}) {
    if (!accessToken) throw new Error('GMAIL_ACCESS_TOKEN_REQUIRED');
    if (typeof fetchImpl !== 'function') throw new Error('GMAIL_FETCH_UNAVAILABLE');
    this.accessToken = accessToken;
    this.fetchImpl = fetchImpl;
    this.userId = userId;
  }

  async request(endpoint, params = {}) {
    const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/${this.userId}/${endpoint}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await this.fetchImpl(url, {
      headers: { authorization: `Bearer ${this.accessToken}` },
    });
    if (!response.ok) throw gmailError(response);
    return response.json();
  }

  async listMessages({ lookbackDays = 31, now = new Date() } = {}) {
    if (!Number.isInteger(lookbackDays) || lookbackDays < 1 || lookbackDays > 366) {
      throw new Error('LOOKBACK_DAYS_OUT_OF_RANGE');
    }
    const after = new Date(now.getTime() - lookbackDays * 86400000);
    const query = `${SBM_GMAIL_QUERY} after:${Math.floor(after.getTime() / 1000)}`;
    return this.request('messages', { q: query, maxResults: '100' }).then((body) => body.messages || []);
  }

  async getMessage(messageId) {
    return this.request(`messages/${encodeURIComponent(messageId)}`, { format: 'full' });
  }

  async getAttachment(messageId, attachmentId) {
    const body = await this.request(
      `messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`
    );
    return base64UrlToBuffer(body.data || '');
  }

  async listStatementAttachments({ lookbackDays = 31, now = new Date() } = {}) {
    const messages = await this.listMessages({ lookbackDays, now });
    const attachments = [];
    for (const message of messages) {
      const full = await this.getMessage(message.id);
      for (const part of walkParts(full.payload)) {
        const bytes = part.body?.attachmentId
          ? await this.getAttachment(message.id, part.body.attachmentId)
          : base64UrlToBuffer(part.body?.data || '');
        if (!isPdfAttachment({ filename: part.filename, mimeType: part.mimeType, bytes })) continue;
        attachments.push({
          messageId: message.id,
          receivedAt: full.internalDate ? new Date(Number(full.internalDate)) : undefined,
          filename: path.basename(part.filename),
          mimeType: part.mimeType,
          bytes,
        });
      }
    }
    return attachments;
  }
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function statementPeriodFromFilename(filename) {
  const match = String(filename).match(/(?:^|[_-])(\d{6})(?:[_-]|\.|$)/);
  if (!match) return { period: null, confidence: 'unknown', reason: 'STATEMENT_PERIOD_NOT_FOUND' };
  const yy = Number(match[1].slice(0, 2));
  const month = Number(match[1].slice(2, 4));
  const day = Number(match[1].slice(4, 6));
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { period: null, confidence: 'unknown', reason: 'STATEMENT_FILENAME_DATE_INVALID' };
  }
  return { period: `${2000 + yy}-${String(month).padStart(2, '0')}`, confidence: 'filename', source: match[1] };
}

export function resolveStatementPeriod({ statementPeriod, filename, receivedAt } = {}) {
  if (/^\d{4}-\d{2}$/.test(String(statementPeriod || ''))) {
    return { period: statementPeriod, confidence: 'pdf' };
  }
  const fromFilename = statementPeriodFromFilename(filename);
  if (fromFilename.period) return fromFilename;
  if (receivedAt instanceof Date && !Number.isNaN(receivedAt.valueOf())) {
    return {
      period: `${receivedAt.getUTCFullYear()}-${String(receivedAt.getUTCMonth() + 1).padStart(2, '0')}`,
      confidence: 'email_date',
      reason: 'REVIEW_REQUIRED',
    };
  }
  return { period: null, confidence: 'unknown', reason: 'REVIEW_REQUIRED' };
}

function monthFolder(period) {
  const [year, month] = period.split('-');
  const names = [
    '01_January', '02_February', '03_March', '04_April', '05_May', '06_June',
    '07_July', '08_August', '09_September', '10_October', '11_November', '12_December',
  ];
  return path.join(year, names[Number(month) - 1], '01_Bank_Statements');
}

async function fileExists(filename) {
  try {
    await stat(filename);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function retainOriginal({ financeRoot, period, filename, bytes }) {
  const digest = sha256(bytes);
  const directory = path.join(financeRoot, monthFolder(period), 'Original');
  await mkdir(directory, { recursive: true });
  const base = path.basename(filename);
  const candidate = path.join(directory, base);
  if (await fileExists(candidate)) {
    const existing = await readFile(candidate);
    if (sha256(existing) === digest) return { status: 'DUPLICATE', path: candidate, sha256: digest };
  }
  const extension = path.extname(base) || '.pdf';
  const stem = path.basename(base, extension);
  const unique = path.join(directory, `${stem}-${digest.slice(0, 12)}${extension}`);
  if (await fileExists(unique)) return { status: 'DUPLICATE', path: unique, sha256: digest };
  await writeFile(unique, bytes, { flag: 'wx' });
  return { status: 'STORED', path: unique, sha256: digest };
}

function qpdfError(error) {
  if (error?.code === 'ENOENT') return new Error('QPDF_UNAVAILABLE');
  return error;
}

export function createRealQpdfRunner({ executable = 'qpdf' } = {}) {
  return {
    async showEncryption(input) {
      try {
        return (await execFileAsync(executable, ['--show-encryption', input], { maxBuffer: 1024 * 1024 })).stdout;
      } catch (error) {
        throw qpdfError(error);
      }
    },
    async decrypt(input, output, password) {
      return new Promise((resolve, reject) => {
        const child = spawn(executable, ['--password-file=-', '--decrypt', input, output], {
          stdio: ['pipe', 'ignore', 'pipe'],
        });
        let stderr = '';
        child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
        child.on('error', (error) => reject(qpdfError(error)));
        child.on('close', (code) => {
          if (code === 0) return resolve();
          const error = new Error('PASSWORD_REJECTED');
          error.qpdfStatus = code;
          error.qpdfStderr = stderr.replace(/\S+/g, '[REDACTED]');
          reject(error);
        });
        child.stdin.end(password);
      });
    },
    async check(input) {
      try {
        await execFileAsync(executable, ['--check', input], { maxBuffer: 1024 * 1024 });
      } catch (error) {
        throw qpdfError(error);
      }
    },
  };
}

export async function createUnlockedDerivative({
  originalPath,
  processedDirectory,
  outputName,
  password,
  qpdf = createRealQpdfRunner(),
}) {
  if (!password) throw new Error('SBM_STATEMENT_PASSWORD_REQUIRED');
  await mkdir(processedDirectory, { recursive: true });
  const outputPath = path.join(processedDirectory, outputName);
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  await rm(temporaryPath, { force: true });
  try {
    const encryption = await qpdf.showEncryption(originalPath);
    const encrypted = /R\s*=\s*\d+|user password|owner password/i.test(encryption);
    if (!encrypted) {
      await qpdf.check(originalPath);
      return { status: 'UNENCRYPTED', path: originalPath };
    }
    await qpdf.decrypt(originalPath, temporaryPath, password);
    await qpdf.check(temporaryPath);
    await rename(temporaryPath, outputPath);
    return { status: 'DECRYPTED', path: outputPath };
  } catch (error) {
    await rm(temporaryPath, { force: true });
    if (error.message === 'PASSWORD_REJECTED') throw error;
    throw new Error(error.message === 'QPDF_UNAVAILABLE' ? 'QPDF_UNAVAILABLE' : 'DECRYPTION_FAILED');
  }
}

export function handoffToSbmPreview(payload) {
  const statement = normalizeSbmStatement(payload);
  const validation = validateSbmStatement(statement);
  if (!validation.ok) return { status: 'VALIDATION_FAILED', validation, preview: null };
  return {
    status: 'READY_FOR_IMPORT_PREVIEW',
    validation,
    preview: toErpnextBankTransactionPreview(statement),
  };
}

export async function processStatementAttachment({
  financeRoot,
  attachment,
  password,
  statementPeriod,
  payload,
  qpdf,
}) {
  if (!isPdfAttachment(attachment)) return { status: 'REJECTED_NON_PDF' };
  const routing = resolveStatementPeriod({
    statementPeriod,
    filename: attachment.filename,
    receivedAt: attachment.receivedAt,
  });
  if (!routing.period || routing.confidence === 'email_date') {
    return { status: 'REVIEW_REQUIRED', reason: routing.reason, routing };
  }
  const original = await retainOriginal({ financeRoot, period: routing.period, ...attachment });
  if (original.status === 'DUPLICATE') return { status: 'DUPLICATE', original, routing };
  const processedDirectory = path.join(financeRoot, monthFolder(routing.period), 'Processed');
  const derivative = await createUnlockedDerivative({
    originalPath: original.path,
    processedDirectory,
    outputName: `${routing.period}-${sha256(attachment.bytes).slice(0, 16)}.pdf`,
    password,
    qpdf,
  });
  const handoff = payload ? handoffToSbmPreview(payload) : {
    status: 'STAGED_REQUIRES_CONVERSION',
    reason: 'PDF_TO_1378_PAYLOAD_REQUIRED',
  };
  return { status: handoff.status === 'VALIDATION_FAILED' ? handoff.status : 'PROCESSED', original, derivative, routing, handoff };
}
