#!/usr/bin/env node
/**
 * Fail if vercel.json crons violate Vercel Hobby "at most once per day" rules.
 * Run in CI and locally before deploy: npm run verify:vercel-hobby-crons
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateVercelJsonCronsForHobby } from './lib/vercel-cron-hobby.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const vercelPath = path.join(root, 'vercel.json');

if (!existsSync(vercelPath)) {
  console.error('vercel.json not found at', vercelPath);
  process.exit(1);
}

let json;
try {
  json = JSON.parse(readFileSync(vercelPath, 'utf8'));
} catch (e) {
  console.error('Invalid vercel.json:', e.message);
  process.exit(1);
}

const result = validateVercelJsonCronsForHobby(json);
if (!result.ok) {
  console.error('Vercel Hobby-incompatible cron schedule(s) — production deploy will fail:\n');
  for (const line of result.errors) console.error('  •', line);
  console.error('\nFix: use one fixed minute + one fixed hour per job (e.g. "0 4 * * *").');
  console.error('See docs/VERCEL_DEPLOYMENT.md\n');
  process.exit(1);
}

console.log('vercel.json crons: OK for Vercel Hobby (≤ once/day per job).');
