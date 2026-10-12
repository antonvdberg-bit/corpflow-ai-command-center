#!/usr/bin/env node
import fs from 'node:fs';
import process from 'node:process';
import { checkBankStatementFile } from '../../lib/orixhealth/bank-statement-check.js';

function option(name) {
  const position = process.argv.indexOf(name);
  return position === -1 ? undefined : process.argv[position + 1];
}

function usage() {
  return [
    'Usage: node scripts/orixhealth/bank-statement-check.mjs',
    '  --csv <local-path> --mapping <json> --date-format <format>',
    '  --decimal-separator <. or ,> [--output <local-path>]',
  ].join('\n');
}

const csvPath = option('--csv');
const mappingText = option('--mapping');
const dateFormat = option('--date-format');
const decimalSeparator = option('--decimal-separator');
const outputPath = option('--output');

try {
  if (!csvPath || !mappingText || !dateFormat || !decimalSeparator) throw new Error(usage());
  const report = checkBankStatementFile({
    csvPath,
    mapping: JSON.parse(mappingText),
    dateFormat,
    decimalSeparator,
  });
  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (outputPath) fs.writeFileSync(outputPath, output, { encoding: 'utf8', flag: 'wx' });
  else process.stdout.write(output);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 2;
}
