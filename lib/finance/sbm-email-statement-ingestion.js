import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  normalizeSbmStatement,
  toErpnextBankTransactionPreview,
  validateSbmStatement,
} from '../erpnext/sbm-statement-ingestion.js';

export const SBM_GMAIL_QUERY =
  'from:SBM.EStatement@sbmgroup.mu subject:"Account e-statement" has:attachment';

const PDF_MAGIC = Buffer.from('%PDF-');
const SAFE_FILENAME = /[^a-zA-Z0-9._-]+/g;

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function safeFilename(name) {
  const value = path.basename(String(name || 'statement.pdf')).replace(SAFE_FILENAME, '_');
  return value.toLowerCase().endsWith('.pdf') ? value : `${value}.pdf`;
}

function pdfBytes(bytes) {
  return Buffer.isBuffer(bytes) && bytes.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC);
}

function errorCode(error) {
  return error?.code || 'UNKNOWN';
}

function periodFromPayload(payload) {
  const periods = [...new Set(
    (Array.isArray(payload?.accounts) ? payload.accounts : [])
      .map((account) => String(account?.statement_period || '').trim())
      .filter(Boolean),
  )];
  return periods.length === 1 && /^\d{4}-\d{2}$/.test(periods[0]) ? periods[0] : null;
}

function periodFromFilename(filename) {
  const value = String(filename || '');
  const match = value.match(/(20\d{2})[-_]?([01]\d)(?:[-_]?[0-3]\d)?/);
  return match ? `${match[1]}-${match[2]}` : null;
}

function periodFromEmailDate(date) {
  const parsed = new Date(date || '');
  if (Number.isNaN(parsed.valueOf())) return null;
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function routeStatement({ payload, filename, emailDate }) {
  const parserPeriod = periodFromPayload(payload);
  if (parserPeriod) return { period: parserPeriod, source: 'statement_parser', reviewRequired: false };
  const filenamePeriod = periodFromFilename(filename);
  if (filenamePeriod) return { period: filenamePeriod, source: 'filename', reviewRequired: false };
  const emailPeriod = periodFromEmailDate(emailDate);
  if (emailPeriod) return { period: emailPeriod, source: 'email_date', reviewRequired: true };
  return { period: null, source: 'unknown', reviewRequired: true };
}

async function writeOriginal(originalPath, bytes) {
  try {
    await fs.writeFile(originalPath, bytes, { flag: 'wx', mode: 0o600 });
    return 'written';
  } catch (error) {
    if (errorCode(error) !== 'EEXIST') throw error;
    const existing = await fs.readFile(originalPath);
    if (sha256(existing) !== sha256(bytes)) {
      const collision = new Error('ORIGINAL_PATH_COLLISION');
      collision.code = 'ORIGINAL_PATH_COLLISION';
      throw collision;
    }
    return 'already_present';
  }
}

function runQpdf({ inputPath, outputPath, password, qpdfBin = 'qpdf' }) {
  return new Promise((resolve, reject) => {
    const child = spawn(qpdfBin, ['--password-file=-', '--decrypt', inputPath, outputPath], {
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => reject(Object.assign(new Error('QPDF_UNAVAILABLE'), { code: error.code })));
    child.on('close', (code) => {
      if (code === 0) return resolve();
      const error = new Error('PASSWORD_REJECTED');
      error.code = 'PASSWORD_REJECTED';
      error.detail = stderr.replace(/password|passphrase/gi, '[REDACTED]').slice(0, 240);
      reject(error);
    });
    child.stdin.end(password || '');
  });
}

async function atomicDecrypt({ inputPath, outputPath, password, qpdfBin }) {
  const temporaryPath = `${outputPath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await runQpdf({ inputPath, outputPath: temporaryPath, password, qpdfBin });
    const derivative = await fs.readFile(temporaryPath);
    if (!pdfBytes(derivative)) throw Object.assign(new Error('DERIVATIVE_NOT_PDF'), { code: 'DERIVATIVE_NOT_PDF' });
    await fs.chmod(temporaryPath, 0o600);
    await fs.rename(temporaryPath, outputPath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
}

export function createGmailClient({ accessToken, fetchImpl = globalThis.fetch, gmailBaseUrl = 'https://gmail.googleapis.com/gmail/v1/users/me' }) {
  if (!accessToken) throw new Error('SBM_GMAIL_ACCESS_TOKEN_REQUIRED');
  async function request(url) {
    const response = await fetchImpl(url, { headers: { authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`GMAIL_HTTP_${response.status}`);
    return response.json();
  }
  return {
    async listMessages({ query = SBM_GMAIL_QUERY, maxResults = 100 } = {}) {
      return request(`${gmailBaseUrl}/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`);
    },
    async getMessage(id) {
      return request(`${gmailBaseUrl}/messages/${encodeURIComponent(id)}?format=full`);
    },
    async getAttachment(messageId, attachmentId) {
      return request(`${gmailBaseUrl}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`);
    },
  };
}

function decodeBase64Url(value) {
  return Buffer.from(String(value || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function messageDate(message) {
  const header = message?.payload?.headers?.find((item) => item.name?.toLowerCase() === 'date');
  return header?.value || (message?.internalDate ? new Date(Number(message.internalDate)).toISOString() : '');
}

function collectParts(part, result = []) {
  if (part?.body?.attachmentId) result.push(part);
  for (const child of part?.parts || []) collectParts(child, result);
  return result;
}

export async function listPdfAttachments({ gmail, lookbackDays = 45, now = Date.now() }) {
  const listed = await gmail.listMessages({ query: SBM_GMAIL_QUERY });
  const cutoff = now - lookbackDays * 24 * 60 * 60 * 1000;
  const result = [];
  for (const item of listed.messages || []) {
    const message = await gmail.getMessage(item.id);
    if (Number(message.internalDate || 0) < cutoff) continue;
    for (const part of collectParts(message.payload)) {
      result.push({
        messageId: message.id,
        attachmentId: part.body.attachmentId,
        filename: part.filename || 'statement.pdf',
        mimeType: part.mimeType || '',
        emailDate: messageDate(message),
      });
    }
  }
  return result;
}

export async function downloadAttachment({ gmail, attachment }) {
  const response = await gmail.getAttachment(attachment.messageId, attachment.attachmentId);
  const bytes = decodeBase64Url(response.data);
  if (!pdfBytes(bytes)) {
    return { status: 'REJECTED_NOT_PDF', filename: attachment.filename, bytes: bytes.length };
  }
  return { status: 'ACCEPTED', ...attachment, bytes, sha256: sha256(bytes) };
}

export async function ingestSbmAttachment({
  attachment,
  financeRoot,
  password,
  qpdfBin = 'qpdf',
  extractStatement,
  dryRun = false,
}) {
  if (!financeRoot) throw new Error('FINANCE_ROOT_REQUIRED');
  const downloaded = attachment.bytes ? attachment : await downloadAttachment({ gmail: attachment.gmail, attachment });
  if (downloaded.status !== 'ACCEPTED') return downloaded;
  const digest = downloaded.sha256 || sha256(downloaded.bytes);
  const receiptPath = path.join(financeRoot, 'Receipts', `${digest}.json`);
  try {
    await fs.access(receiptPath);
    return { status: 'DUPLICATE_SKIPPED', sha256: digest };
  } catch (error) {
    if (errorCode(error) !== 'ENOENT') throw error;
  }
  if (dryRun) return { status: 'ACCEPTED_DRY_RUN', filename: downloaded.filename, sha256: digest };

  const originalPath = path.join(financeRoot, 'Incoming', 'SBM', 'Original', 'Unrouted', safeFilename(downloaded.filename));
  await fs.mkdir(path.dirname(originalPath), { recursive: true });
  await writeOriginal(originalPath, downloaded.bytes);
  const workingDir = path.join(financeRoot, 'Processed', 'SBM', 'Unrouted');
  await fs.mkdir(workingDir, { recursive: true });
  const workingPath = path.join(workingDir, safeFilename(downloaded.filename));
  try {
    await atomicDecrypt({ inputPath: originalPath, outputPath: workingPath, password, qpdfBin });
  } catch (error) {
    const status = error.code === 'PASSWORD_REJECTED'
      ? 'PASSWORD_REJECTED'
      : error.code === 'QPDF_UNAVAILABLE'
        ? 'QPDF_UNAVAILABLE'
        : 'DERIVATIVE_FAILED';
    return { status, sha256: digest };
  }

  const payload = extractStatement ? await extractStatement(workingPath) : null;
  const route = routeStatement({ payload, filename: downloaded.filename, emailDate: downloaded.emailDate });
  if (!route.period) return { status: 'REVIEW_REQUIRED', reason: 'UNKNOWN_PERIOD', sha256: digest, workingPath };
  const periodDir = path.join(financeRoot, 'Processed', 'SBM', route.period);
  await fs.mkdir(periodDir, { recursive: true });
  const routedPath = path.join(periodDir, safeFilename(downloaded.filename));
  await fs.rename(workingPath, routedPath);
  if (!payload) {
    return { status: 'EXTRACTION_REQUIRED', reason: 'NO_SAFE_PDF_TO_PAYLOAD_ADAPTER', route, sha256: digest, routedPath };
  }
  const normalized = normalizeSbmStatement(payload);
  const validation = validateSbmStatement(normalized);
  if (!validation.ok) return { status: 'VALIDATION_FAILED', route, validation, sha256: digest, routedPath };
  const preview = toErpnextBankTransactionPreview(normalized);
  const receipt = {
    sha256: digest,
    original_filename: downloaded.filename,
    original_path: originalPath,
    processed_path: routedPath,
    route,
    preview_count: preview.length,
    preview_ready: true,
  };
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  return { status: 'PREVIEW_READY', route, validation, preview, receiptPath, routedPath };
}
