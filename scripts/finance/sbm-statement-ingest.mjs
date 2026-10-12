import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  SBM_GMAIL_QUERY,
  createGmailClient,
  downloadAttachment,
  ingestSbmAttachment,
  listPdfAttachments,
} from '../../lib/finance/sbm-email-statement-ingestion.js';

function arg(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

const financeRoot = process.env.FINANCE_ROOT;
const lookbackDays = Number(arg('--lookback-days', '45'));
const listOnly = process.argv.includes('--list-only') || process.argv.includes('--dry-run');

if (!financeRoot) {
  console.error('FINANCE_ROOT is required');
  process.exitCode = 2;
} else if (!process.env.SBM_GMAIL_ACCESS_TOKEN) {
  console.error('SBM_GMAIL_ACCESS_TOKEN is required');
  process.exitCode = 2;
} else {
  const gmail = createGmailClient({ accessToken: process.env.SBM_GMAIL_ACCESS_TOKEN });
  const attachments = await listPdfAttachments({ gmail, lookbackDays });
  if (listOnly) {
    console.log(JSON.stringify({ query: SBM_GMAIL_QUERY, lookbackDays, attachments }, null, 2));
    process.exit(0);
  }

  const payloadPath = arg('--payload');
  let payload;
  if (payloadPath) payload = JSON.parse(await fs.readFile(path.resolve(payloadPath), 'utf8'));
  const results = [];
  for (const attachment of attachments) {
    const downloaded = await downloadAttachment({ gmail, attachment });
    results.push(await ingestSbmAttachment({
      attachment: downloaded,
      financeRoot,
      password: process.env.SBM_STATEMENT_PASSWORD,
      extractStatement: payload ? async () => payload : undefined,
    }));
  }
  console.log(JSON.stringify({ query: SBM_GMAIL_QUERY, results }, null, 2));
}
