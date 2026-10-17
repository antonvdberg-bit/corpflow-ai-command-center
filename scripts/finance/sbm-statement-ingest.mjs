import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  SBM_GMAIL_QUERY,
  createGmailClient,
  createRefreshingGmailClient,
  downloadAttachment,
  ingestSbmAttachment,
  ingestSbmLocalPdf,
  listPdfAttachments,
} from '../../lib/finance/sbm-email-statement-ingestion.js';

function arg(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name}_MUST_BE_A_POSITIVE_INTEGER`);
  return parsed;
}

function redactedResult(result) {
  const accounts = Array.isArray(result.validation?.accounts) ? result.validation.accounts : [];
  return {
    status: result.status,
    period: result.route?.period || null,
    currencies: [...new Set(accounts.map((account) => account.currency).filter(Boolean))],
    extracted_transaction_count: accounts.reduce((count, account) => count + (account.transaction_count || 0), 0),
    validated_transaction_count: result.validation?.ok
      ? accounts.reduce((count, account) => count + (account.transaction_count || 0), 0)
      : 0,
    preview_count: result.preview?.length || 0,
    duplicate: result.status === 'DUPLICATE_SKIPPED',
  };
}

const financeRoot = process.env.FINANCE_ROOT;
const lookbackDays = Number(arg('--lookback-days', '45'));
const listOnly = process.argv.includes('--list-only') || process.argv.includes('--dry-run');
const maxStatementsArg = arg('--max-statements');
const inputPath = arg('--input');

if (!financeRoot) {
  console.error('FINANCE_ROOT is required');
  process.exitCode = 2;
} else if (inputPath) {
  const payloadPath = arg('--payload');
  const payload = payloadPath ? JSON.parse(await fs.readFile(path.resolve(payloadPath), 'utf8')) : undefined;
  const result = await ingestSbmLocalPdf({
    inputPath: path.resolve(inputPath),
    financeRoot,
    password: process.env.SBM_STATEMENT_PASSWORD,
    extractStatement: payload ? async () => payload : undefined,
    dryRun: listOnly,
  });
  console.log(JSON.stringify({ result: redactedResult(result) }, null, 2));
} else if (!process.env.SBM_GMAIL_ACCESS_TOKEN && !process.env.SBM_GMAIL_REFRESH_TOKEN) {
  console.error('SBM_GMAIL_ACCESS_TOKEN or SBM_GMAIL_REFRESH_TOKEN is required');
  process.exitCode = 2;
} else {
  const gmail = process.env.SBM_GMAIL_REFRESH_TOKEN
    ? createRefreshingGmailClient({
      accessToken: process.env.SBM_GMAIL_ACCESS_TOKEN,
      refreshToken: process.env.SBM_GMAIL_REFRESH_TOKEN,
      clientId: process.env.SBM_GMAIL_CLIENT_ID,
      clientSecret: process.env.SBM_GMAIL_CLIENT_SECRET,
    })
    : createGmailClient({ accessToken: process.env.SBM_GMAIL_ACCESS_TOKEN });
  const attachments = await listPdfAttachments({ gmail, lookbackDays });
  const selectedAttachments = maxStatementsArg
    ? attachments.slice(0, positiveInteger(maxStatementsArg, 'MAX_STATEMENTS'))
    : attachments;
  if (listOnly) {
    console.log(JSON.stringify({
      query_configured: SBM_GMAIL_QUERY === 'from:SBM.EStatement@sbmgroup.mu subject:"Account e-statement" has:attachment',
      lookbackDays,
      attachment_count: attachments.length,
      selected_attachment_count: selectedAttachments.length,
    }, null, 2));
    process.exit(0);
  }

  const payloadPath = arg('--payload');
  let payload;
  if (payloadPath) payload = JSON.parse(await fs.readFile(path.resolve(payloadPath), 'utf8'));
  const results = [];
  for (const attachment of selectedAttachments) {
    const downloaded = await downloadAttachment({ gmail, attachment });
    try {
      results.push(redactedResult(await ingestSbmAttachment({
        attachment: downloaded,
        financeRoot,
        password: process.env.SBM_STATEMENT_PASSWORD,
        extractStatement: payload ? async () => payload : undefined,
      })));
    } catch (error) {
      results.push({ status: error?.code || 'PROCESSING_FAILED', preview_count: 0 });
    }
  }
  console.log(JSON.stringify({ result_count: results.length, results }, null, 2));
}
