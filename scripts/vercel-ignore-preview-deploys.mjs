#!/usr/bin/env node

const ref = process.env.VERCEL_GIT_COMMIT_REF || '';
const target = process.env.VERCEL_ENV || '';

if (target === 'production' || ref === 'main') {
  console.log('Vercel deploy allowed for production/main.');
  process.exit(1);
}

console.log(`Vercel deploy skipped for non-production ref: ${ref || 'unknown'}`);
process.exit(0);
