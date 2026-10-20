import { readFile } from 'node:fs/promises';

import { PDFParse } from 'pdf-parse';

const DATE = '(\\d{2}[/-]\\d{2}[/-]\\d{4})';
const AMOUNT = '((?:\\(?-?[A-Z]{0,3}\\s*[\\d,]+\\.\\d{2}\\)?))';
const MAX_PDF_BYTES = 20 * 1024 * 1024;

function amount(value) {
  const normalized = String(value || '')
    .replace(/[A-Z]/gi, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .replace(/^\((.+)\)$/, '-$1');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw new Error('SBM_PDF_INVALID_AMOUNT');
  return parsed;
}

function isoDate(value) {
  const [day, month, year] = String(value).split(/[/-]/);
  if (!day || !month || !year) throw new Error('SBM_PDF_INVALID_DATE');
  return `${year}-${month}-${day}`;
}

function firstMatch(text, patterns, code) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return amount(match[1]);
  }
  const error = new Error(code);
  error.code = code;
  throw error;
}

function periodFromText(text) {
  const match = text.match(new RegExp(
    `(?:statement\\s+period|period(?:\\s+from)?)[^\\n\\d]*${DATE}\\s*(?:to|-|–)\\s*${DATE}`,
    'i',
  ));
  if (!match) {
    const error = new Error('SBM_PDF_PERIOD_NOT_FOUND');
    error.code = 'SBM_PDF_PERIOD_NOT_FOUND';
    throw error;
  }
  return `${isoDate(match[1])}/${isoDate(match[2])}`;
}

function currencyFromText(text) {
  const match = text.match(/\b(?:currency|account\s+currency)\s*[:=-]?\s*(MUR|USD)\b/i)
    || text.match(/\b(MUR|USD)\s+(?:current|savings|call deposit|account)\b/i);
  if (!match) {
    const error = new Error('SBM_PDF_CURRENCY_NOT_FOUND');
    error.code = 'SBM_PDF_CURRENCY_NOT_FOUND';
    throw error;
  }
  return match[1].toUpperCase();
}

function balanceRows(text) {
  const row = new RegExp(
    `^\\s*${DATE}\\s+${DATE}\\s+(.+?)\\s+${AMOUNT}\\s+${AMOUNT}\\s+${AMOUNT}\\s*$`,
    'gm',
  );
  return [...text.matchAll(row)].map((match) => ({
    transaction_date: isoDate(match[1]),
    value_date: isoDate(match[2]),
    branch: 'SBM',
    description: match[3].replace(/\s+/g, ' ').trim(),
    debit: amount(match[4]),
    credit: amount(match[5]),
    statement_running_balance: amount(match[6]),
  }));
}

function parseAccount(text) {
  const openingBalance = firstMatch(text, [
    new RegExp(`opening\\s+balance[^\\n]*?${AMOUNT}`, 'i'),
  ], 'SBM_PDF_OPENING_BALANCE_NOT_FOUND');
  const totalCredits = firstMatch(text, [
    new RegExp(`total\\s+(?:credits|deposits)[^\\n]*?${AMOUNT}`, 'i'),
  ], 'SBM_PDF_TOTAL_CREDITS_NOT_FOUND');
  const totalDebits = firstMatch(text, [
    new RegExp(`total\\s+(?:debits|withdrawals)[^\\n]*?${AMOUNT}`, 'i'),
  ], 'SBM_PDF_TOTAL_DEBITS_NOT_FOUND');
  const closingBalance = firstMatch(text, [
    new RegExp(`closing\\s+balance[^\\n]*?${AMOUNT}`, 'i'),
  ], 'SBM_PDF_CLOSING_BALANCE_NOT_FOUND');

  const transactions = balanceRows(text);
  const expectedClosing = Math.round((openingBalance + totalCredits - totalDebits) * 100) / 100;
  if (expectedClosing !== closingBalance) {
    const error = new Error('SBM_PDF_ACCOUNT_ARITHMETIC_FAILED');
    error.code = 'SBM_PDF_ACCOUNT_ARITHMETIC_FAILED';
    throw error;
  }
  if (transactions.length && transactions.at(-1).statement_running_balance !== closingBalance) {
    const error = new Error('SBM_PDF_RUNNING_BALANCE_FAILED');
    error.code = 'SBM_PDF_RUNNING_BALANCE_FAILED';
    throw error;
  }
  return {
    currency: currencyFromText(text),
    statement_period: periodFromText(text),
    opening_balance: openingBalance,
    total_credits: totalCredits,
    total_debits: totalDebits,
    closing_balance: closingBalance,
    lien: 0,
    transactions: transactions.map(({ statement_running_balance, ...transaction }) => transaction),
  };
}

/**
 * Convert native SBM PDF text into the existing #1378 normalization payload.
 *
 * The adapter deliberately accepts only the documented tabular layout. It
 * fails closed when totals, period, currency, or the running balance cannot be
 * established; it never guesses transactions from prose or OCR.
 */
export function parseSbmStatementText(text) {
  const pages = String(text || '').replace(/\r/g, '').split('\f').filter((page) => page.trim());
  if (!pages.length) {
    const error = new Error('SBM_PDF_EMPTY_TEXT');
    error.code = 'SBM_PDF_EMPTY_TEXT';
    throw error;
  }
  const accounts = pages.map(parseAccount);
  return {
    statement_id: 'SBM-PDF-EXTRACTED',
    accounts,
  };
}

/**
 * Extract text locally from a password-free working PDF. The encrypted
 * original is never passed to the parser or copied outside FINANCE_ROOT.
 */
export async function extractSbmStatementFromPdf(pdfPath, { PDFParseClass = PDFParse } = {}) {
  const data = await readFile(pdfPath);
  if (data.length > MAX_PDF_BYTES) {
    const error = new Error('SBM_PDF_TOO_LARGE');
    error.code = 'SBM_PDF_TOO_LARGE';
    throw error;
  }
  const parser = new PDFParseClass({ data });
  try {
    const result = await parser.getText();
    return parseSbmStatementText(result.text);
  } catch (error) {
    if (error?.code?.startsWith('SBM_PDF_')) throw error;
    const extractionError = new Error('SBM_PDF_TEXT_EXTRACTION_FAILED');
    extractionError.code = 'SBM_PDF_TEXT_EXTRACTION_FAILED';
    throw extractionError;
  } finally {
    await parser.destroy?.();
  }
}
