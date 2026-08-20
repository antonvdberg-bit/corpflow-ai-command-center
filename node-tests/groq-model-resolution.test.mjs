/**
 * #1013 Groq model resolution — empty env must not fall back to retired Llama 3.3 70B.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  GROQ_DEFAULT_MODEL,
  RETIRED_GROQ_MODEL_IDS,
  isRetiredGroqModel,
  resolveGroqModel,
} from '../lib/server/groq-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const RETIRED_LLAMA = 'llama-3.3-70b-versatile';
const SUPPORTED_DEFAULT = 'openai/gpt-oss-120b';

const EXECUTABLE_ROOTS = ['api', 'lib', 'evals', 'scripts'];
const EXECUTABLE_EXT = new Set(['.js', '.mjs', '.cjs', '.py']);
const SKIP_DIR_NAMES = new Set(['node_modules', '.git', '.artifacts', 'dist', 'coverage']);

/** Hardcoded retired-model *defaults* (env fallback / assignment). The retired-id list itself is allowed. */
const FORBIDDEN_DEFAULT_PATTERNS = [
  /DEFAULT_MODEL\s*=\s*['"]llama-3\.3-70b-versatile['"]/,
  /\|\|\s*['"]llama-3\.3-70b-versatile['"]/,
  /model\s*[:=]\s*['"]llama-3\.3-70b-versatile['"]/,
];

function walkFiles(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (SKIP_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!EXECUTABLE_EXT.has(path.extname(entry.name))) continue;
    acc.push(full);
  }
  return acc;
}

function withModelEnv(overrides, fn) {
  const keys = ['GROQ_MODEL_NAME', 'CORPFLOW_TECHNICAL_LEAD_LLM_MODEL'];
  const previous = {};
  for (const key of keys) {
    previous[key] = Object.prototype.hasOwnProperty.call(process.env, key) ? process.env[key] : undefined;
    if (overrides[key] === undefined) delete process.env[key];
    else process.env[key] = overrides[key];
  }
  try {
    return fn();
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test('#1013 built-in Groq default is the supported replacement, not retired Llama', () => {
  assert.equal(GROQ_DEFAULT_MODEL, SUPPORTED_DEFAULT);
  assert.equal(isRetiredGroqModel(GROQ_DEFAULT_MODEL), false);
  assert.equal(RETIRED_GROQ_MODEL_IDS.includes(RETIRED_LLAMA), true);
  assert.equal(isRetiredGroqModel(RETIRED_LLAMA), true);
  assert.equal(isRetiredGroqModel(''), false);
});

test('#1013 empty GROQ_MODEL_NAME resolves primary to openai/gpt-oss-120b', () => {
  withModelEnv({}, () => {
    assert.equal(resolveGroqModel('primary'), SUPPORTED_DEFAULT);
    assert.notEqual(resolveGroqModel('primary'), RETIRED_LLAMA);
  });
});

test('#1013 empty CORPFLOW_TECHNICAL_LEAD_LLM_MODEL resolves TL rephrase to openai/gpt-oss-120b', () => {
  withModelEnv({ GROQ_MODEL_NAME: 'some-other-groq-model' }, () => {
    assert.equal(resolveGroqModel('technical_lead_rephrase'), SUPPORTED_DEFAULT);
    assert.notEqual(resolveGroqModel('technical_lead_rephrase'), RETIRED_LLAMA);
    assert.equal(resolveGroqModel('primary'), 'some-other-groq-model');
  });
});

test('#1013 explicit env override is honoured and not silently remapped', () => {
  withModelEnv(
    {
      GROQ_MODEL_NAME: 'qwen/qwen3.6-27b',
      CORPFLOW_TECHNICAL_LEAD_LLM_MODEL: 'qwen/qwen3.6-27b',
    },
    () => {
      assert.equal(resolveGroqModel('primary'), 'qwen/qwen3.6-27b');
      assert.equal(resolveGroqModel('technical_lead_rephrase'), 'qwen/qwen3.6-27b');
    },
  );
});

test('#1013 /api/health uses resolveGroqModel and does not hardcode the retired Llama id', () => {
  const src = readFileSync(path.join(REPO_ROOT, 'api/factory_router.js'), 'utf8');
  assert.match(src, /async function handleHealth\(/);
  assert.match(src, /model:\s*resolveGroqModel\('primary'\)/);
  assert.equal(src.includes(`model: '${RETIRED_LLAMA}'`), false);
  assert.equal(src.includes(`model: "${RETIRED_LLAMA}"`), false);
});

test('#1013 no executable Groq default still points at llama-3.3-70b-versatile', () => {
  const offenders = [];
  for (const root of EXECUTABLE_ROOTS) {
    const absRoot = path.join(REPO_ROOT, root);
    try {
      statSync(absRoot);
    } catch {
      continue;
    }
    for (const file of walkFiles(absRoot)) {
      const rel = path.relative(REPO_ROOT, file).replaceAll('\\', '/');
      if (rel === 'node-tests/groq-model-resolution.test.mjs') continue;
      const text = readFileSync(file, 'utf8');
      for (const pattern of FORBIDDEN_DEFAULT_PATTERNS) {
        if (pattern.test(text)) {
          offenders.push(`${rel} matches ${pattern}`);
        }
      }
    }
  }
  assert.deepEqual(offenders, []);
});
