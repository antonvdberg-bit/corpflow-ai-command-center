import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { normalizeInvoiceCsvFiles } from '../../lib/orixhealth/invoice-csv-adapter.js';

function valuesFor(name) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name) values.push(process.argv[index + 1]);
  }
  return values.filter(Boolean);
}

function required(name) {
  const value = valuesFor(name)[0];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

try {
  const inputPaths = valuesFor('--input');
  if (!inputPaths.length) throw new Error('--input is required at least once');
  const outputPath = required('--output');
  const mappingPath = valuesFor('--mapping')[0];
  const config = mappingPath
    ? JSON.parse(await readFile(path.resolve(mappingPath), 'utf8'))
    : {};
  const files = await Promise.all(inputPaths.map(async (inputPath) => ({
    name: inputPath,
    text: await readFile(path.resolve(inputPath), 'utf8'),
  })));
  const normalized = normalizeInvoiceCsvFiles(files, config);
  await writeFile(path.resolve(outputPath), `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  process.stdout.write(`Wrote ${normalized.invoices.length} normalized invoice lines to ${outputPath}\n`);
} catch (error) {
  console.error(`Invoice CSV adapter failed: ${error.message}`);
  process.exitCode = 2;
}
