#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RETIRED_PRODUCT = String.fromCharCode(115, 108, 97, 99, 107);
const SKIP_DIRS = new Set([
  '.git',
  '.next',
  '.vercel',
  'node_modules',
  'coverage',
  'dist',
  'build',
]);
const MAX_BYTES = 2_000_000;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function looksBinary(buf) {
  const sample = buf.subarray(0, Math.min(buf.length, 8192));
  return sample.includes(0);
}

const findings = [];

for (const full of walk(ROOT)) {
  const rel = path.relative(ROOT, full).split(path.sep).join('/');
  if (rel.toLowerCase().includes(RETIRED_PRODUCT)) {
    findings.push({ path: rel, where: 'path' });
    continue;
  }

  let stat;
  try {
    stat = fs.statSync(full);
  } catch {
    continue;
  }
  if (stat.size > MAX_BYTES) continue;

  let buf;
  try {
    buf = fs.readFileSync(full);
  } catch {
    continue;
  }
  if (looksBinary(buf)) continue;

  const text = buf.toString('utf8');
  if (text.toLowerCase().includes(RETIRED_PRODUCT)) {
    findings.push({ path: rel, where: 'content' });
  }
}

if (findings.length) {
  console.error('Retired product cleanliness check FAIL');
  for (const finding of findings) {
    console.error(`- ${finding.path} (${finding.where})`);
  }
  process.exit(1);
}

console.log('Retired product cleanliness check PASS');
