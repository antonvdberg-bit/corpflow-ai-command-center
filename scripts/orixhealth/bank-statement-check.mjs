#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { checkBankStatementFile, zohoCsvFromReport } from '../../lib/orixhealth/bank-statement-check.js';

function option(name) {
  const position = process.argv.indexOf(name);
  return position === -1 ? undefined : process.argv[position + 1];
}

function usage() {
  return [
    'Usage: node scripts/orixhealth/bank-statement-check.mjs',
    '  --csv <local-path> --mapping <json> --date-format <format>',
    '  --decimal-separator <. or ,> [--two-digit-year-century <year>]',
    '  [--output <local-path>] [--zoho-csv-output <local-path>]',
  ].join('\n');
}

const csvPath = option('--csv');
const mappingText = option('--mapping');
const dateFormat = option('--date-format');
const decimalSeparator = option('--decimal-separator');
const twoDigitYearCentury = option('--two-digit-year-century');
const outputPath = option('--output');
const zohoCsvOutputPath = option('--zoho-csv-output');
const createdOutputs = [];

try {
  if (!csvPath || !mappingText || !dateFormat || !decimalSeparator) throw new Error(usage());
  const outputPaths = [outputPath, zohoCsvOutputPath].filter(Boolean);
  const resolvedInput = path.resolve(csvPath);
  const resolvedOutputs = outputPaths.map((output) => path.resolve(output));
  if (new Set(resolvedOutputs).size !== resolvedOutputs.length) {
    throw new Error('Output paths must be distinct');
  }
  if (resolvedOutputs.includes(resolvedInput)) {
    throw new Error('Input and output paths must be distinct');
  }
  for (const output of resolvedOutputs) {
    if (fs.existsSync(output)) throw new Error(`Output file already exists: ${output}`);
    const parent = path.dirname(output);
    const parentStat = fs.statSync(parent);
    if (!parentStat.isDirectory()) throw new Error(`Output parent is not a directory: ${parent}`);
  }
  const report = checkBankStatementFile({
    csvPath,
    mapping: JSON.parse(mappingText),
    dateFormat,
    decimalSeparator,
    ...(twoDigitYearCentury === undefined ? {} : { twoDigitYearCentury: Number(twoDigitYearCentury) }),
  });
  const output = `${JSON.stringify(report, null, 2)}\n`;
  const zohoOutput = zohoCsvOutputPath ? zohoCsvFromReport(report) : undefined;
  if (outputPath) {
    fs.writeFileSync(outputPath, output, { encoding: 'utf8', flag: 'wx' });
    createdOutputs.push(path.resolve(outputPath));
  }
  if (zohoCsvOutputPath) {
    fs.writeFileSync(zohoCsvOutputPath, zohoOutput, { encoding: 'utf8', flag: 'wx' });
    createdOutputs.push(path.resolve(zohoCsvOutputPath));
  }
  if (!outputPath) process.stdout.write(output);
} catch (error) {
  for (const createdOutput of createdOutputs) {
    try {
      fs.unlinkSync(createdOutput);
    } catch {
      // Preserve the original failure if cleanup is no longer possible.
    }
  }
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 2;
}
