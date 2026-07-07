/**
 * Print a one-screen Cursor Control Tower status summary for ChatGPT/n8n.
 *
 * Usage:
 *   node scripts/cursor-ops-status-summary.mjs
 *   node scripts/cursor-ops-status-summary.mjs --file cursor-ops-status.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  applyStaleRuleToStatus,
  CURSOR_OPS_STATUS_FILENAME,
  formatCursorOpsStatusLogBlock,
} from '../lib/server/cursor-ops-status.js';

/**
 * @param {string} filePath
 */
function readStatusFile(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return applyStaleRuleToStatus(raw);
}

function runCli() {
  const fileIdx = process.argv.indexOf('--file');
  const filePath = path.resolve(
    fileIdx >= 0 && process.argv[fileIdx + 1]
      ? String(process.argv[fileIdx + 1]).trim()
      : CURSOR_OPS_STATUS_FILENAME,
  );

  if (!fs.existsSync(filePath)) {
    console.error(`Status file not found: ${filePath}`);
    process.exit(2);
  }

  const status = readStatusFile(filePath);
  console.log(formatCursorOpsStatusLogBlock(status));
  console.log('');
  console.log(JSON.stringify(status, null, 2));
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  runCli();
}
