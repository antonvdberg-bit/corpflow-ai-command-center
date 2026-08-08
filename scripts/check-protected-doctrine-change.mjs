import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const manifestPath = 'config/protected-operating-doctrine.v1.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const baseSha = process.env.BASE_SHA;
if (!baseSha) {
  console.error('Protected doctrine guard: BASE_SHA is required.');
  process.exit(2);
}

const changed = execFileSync('git', ['diff', '--name-only', `${baseSha}...HEAD`], {
  encoding: 'utf8',
})
  .split(/\r?\n/)
  .map((value) => value.trim())
  .filter(Boolean);

const protectedSet = new Set(manifest.protected_paths);
const touched = changed.filter((path) => protectedSet.has(path));

if (touched.length === 0) {
  console.log('Protected doctrine guard: PASS — no protected operating-doctrine paths changed.');
  process.exit(0);
}

console.log('Protected doctrine paths changed:');
for (const path of touched) console.log(`- ${path}`);

const labels = JSON.parse(process.env.PR_LABELS_JSON || '[]');
const labelNames = labels.map((label) => (typeof label === 'string' ? label : label?.name)).filter(Boolean);
const body = process.env.PR_BODY || '';

const missing = [];
if (!labelNames.includes(manifest.required_label)) {
  missing.push(`label: ${manifest.required_label}`);
}

for (const marker of manifest.required_pr_body_markers) {
  if (!body.includes(marker)) missing.push(`PR body marker: ${marker}`);
}

if (missing.length > 0) {
  console.error('\nProtected doctrine guard: BLOCKED.');
  console.error('A lower-level workstream may propose a doctrine change, but it may not silently apply one.');
  console.error('Missing governance classification/packet requirements:');
  for (const item of missing) console.error(`- ${item}`);
  console.error('\nThe governance-change label and packet are classification only. They do NOT constitute Anton approval.');
  process.exit(1);
}

console.log('\nProtected doctrine guard: PASS — explicitly classified governance proposal with required impact packet.');
console.log('Anton approval remains mandatory before merge.');
