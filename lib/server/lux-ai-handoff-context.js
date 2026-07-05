/**
 * LuxeMaurice AI handoff corpus — optional Groq context for ticket-create refinement.
 *
 * Operator syncs the Google Drive handoff folder into:
 *   `artifacts/luxe-maurice-ai-handoff/`
 *
 * See `artifacts/luxe-maurice-ai-handoff/README.md`.
 */

import fs from 'node:fs';
import path from 'node:path';

const HANDOFF_ROOT = path.join(process.cwd(), 'artifacts', 'luxe-maurice-ai-handoff');
const MAX_TOTAL_CHARS = 96_000;
const MAX_FILE_CHARS = 24_000;
const TEXT_EXTENSIONS = new Set([
  '.md',
  '.txt',
  '.json',
  '.yml',
  '.yaml',
  '.mjs',
  '.js',
  '.ts',
  '.tsx',
  '.jsx',
  '.html',
  '.css',
  '.env.example',
]);

const SKIP_DIRS = new Set([
  '.git',
  '.github',
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  'tests',
  'test',
  '__tests__',
  'database',
]);

/**
 * @param {string} dir
 * @param {string[]} acc
 */
function collectHandoffFiles(dir, acc) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      collectHandoffFiles(full, acc);
      continue;
    }
    if (!ent.isFile()) continue;
    const ext = path.extname(ent.name).toLowerCase();
    const base = ent.name.toLowerCase();
    if (base === 'readme.md') continue;
    if (!TEXT_EXTENSIONS.has(ext) && base !== '.env.example' && base !== 'claude.md' && base !== 'project_rules.md') {
      continue;
    }
    acc.push(full);
  }
}

/**
 * @returns {{ loaded: boolean; file_count: number; char_count: number; block: string }}
 */
export function loadLuxAiHandoffContextForGroq() {
  const files = [];
  collectHandoffFiles(HANDOFF_ROOT, files);
  files.sort((a, b) => a.localeCompare(b));

  if (!files.length) {
    return { loaded: false, file_count: 0, char_count: 0, block: '' };
  }

  const parts = [];
  let total = 0;
  for (const filePath of files) {
    if (total >= MAX_TOTAL_CHARS) break;
    let text = '';
    try {
      text = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }
    const rel = path.relative(HANDOFF_ROOT, filePath).replace(/\\/g, '/');
    const slice = text.slice(0, MAX_FILE_CHARS);
    const chunk = `--- luxemaurice-ai-handoff/${rel} ---\n${slice}`;
    if (total + chunk.length > MAX_TOTAL_CHARS) {
      parts.push(chunk.slice(0, MAX_TOTAL_CHARS - total));
      total = MAX_TOTAL_CHARS;
      break;
    }
    parts.push(chunk);
    total += chunk.length;
  }

  if (!parts.length) {
    return { loaded: false, file_count: 0, char_count: 0, block: '' };
  }

  const block = [
    'Tenant programme context (LuxeMaurice AI handoff — reference only; do not invent facts beyond this corpus):',
    'Use this material to understand LuxeMaurice positioning, scope boundaries, and operator vocabulary when refining tickets.',
    'Do not quote file paths or internal repo structure in client_safe_response.',
    '',
    parts.join('\n\n'),
  ].join('\n');

  return {
    loaded: true,
    file_count: parts.length,
    char_count: block.length,
    block,
  };
}
