#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  GmailStatementClient,
  processStatementAttachment,
} from '../../lib/finance/sbm-email-statement-ingestion.js';

function usage() {
  console.log('Usage: node scripts/finance/sbm-statement-ingest.mjs --dry-run [--lookback-days N]');
  console.log('       node scripts/finance/sbm-statement-ingest.mjs --process-local FILE [--payload FILE]');
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] || null;
}

const financeRoot = process.env.SBM_FINANCE_ROOT || path.resolve('finance');
const lookbackDays = Number(option('--lookback-days') || 31);
const localFile = option('--process-local');
const payloadFile = option('--payload');
const dryRun = process.argv.includes('--dry-run');

if (!dryRun && !localFile && !process.argv.includes('--download')) {
  usage();
  process.exitCode = 2;
} else if (localFile) {
  const bytes = await readFile(localFile);
  const payload = payloadFile ? JSON.parse(await readFile(payloadFile, 'utf8')) : undefined;
  const result = await processStatementAttachment({
    financeRoot,
    attachment: { filename: path.basename(localFile), mimeType: 'application/pdf', bytes },
    password: process.env.SBM_STATEMENT_PASSWORD,
    payload,
  });
  console.log(JSON.stringify({
    status: result.status,
    reason: result.reason,
    statement_period: result.routing?.period,
    handoff: result.handoff?.status,
    preview_row_count: result.handoff?.preview?.length,
  }));
} else {
  const client = new GmailStatementClient({
    accessToken: process.env.GMAIL_ACCESS_TOKEN,
  });
  const attachments = await client.listStatementAttachments({ lookbackDays });
  console.log(JSON.stringify({
    query: 'SBM sender + Account e-statement + attachment',
    messages_or_attachments_found: attachments.length,
    mode: dryRun ? 'dry-run' : 'download',
    download_enabled: !dryRun,
  }));
  if (!dryRun) {
    for (const attachment of attachments) {
      const result = await processStatementAttachment({
        financeRoot,
        attachment,
        password: process.env.SBM_STATEMENT_PASSWORD,
      });
      console.log(JSON.stringify({
        status: result.status,
        reason: result.reason,
        statement_period: result.routing?.period,
      }));
    }
  }
}
