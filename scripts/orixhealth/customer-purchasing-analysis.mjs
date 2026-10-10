import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
  analyzeCustomerPurchasing,
  reportToCsv,
} from '../../lib/orixhealth/customer-purchasing-analysis.js';

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function requiredArgument(name) {
  const value = argument(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const inputPath = requiredArgument('--input');
const asOfDate = requiredArgument('--as-of');
const format = argument('--format') ?? 'json';
const statuses = (argument('--include-statuses') ?? 'paid,sent')
  .split(',')
  .map((status) => status.trim())
  .filter(Boolean);
const dormancyDays = Number(argument('--dormancy-days') ?? 90);

if (!['json', 'csv'].includes(format)) throw new Error('--format must be json or csv');
if (!Number.isInteger(dormancyDays) || dormancyDays < 0) throw new Error('--dormancy-days must be a non-negative integer');

try {
  const input = JSON.parse(await readFile(path.resolve(inputPath), 'utf8'));
  const report = analyzeCustomerPurchasing(input, {
    asOfDate,
    includedStatuses: statuses,
    dormancyDays,
  });
  process.stdout.write(format === 'csv' ? reportToCsv(report) : `${JSON.stringify(report, null, 2)}\n`);
} catch (error) {
  console.error(`Analysis failed: ${error.message}`);
  process.exitCode = 2;
}
