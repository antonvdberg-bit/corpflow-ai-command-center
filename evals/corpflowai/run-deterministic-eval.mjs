#!/usr/bin/env node
/**
 * Deterministic CorpFlowAI AI quality-gate runner (Promptfoo pilot).
 *
 * Default path for `npm run eval:ai` / `npm run eval:ai:ci`.
 * - No Promptfoo CLI required (works on Node 22.14 / CI Node 22)
 * - No network / model credentials
 * - Community-licence pilot compatible (local only)
 *
 * When Node satisfies Promptfoo engines (>=22.22.0 or ^20.20.0), operators may
 * also run: npx promptfoo@latest eval -c evals/corpflowai/promptfooconfig.yaml
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const DeterministicCorpflowProvider = require('./providers/deterministic-corpflow.cjs');
const {
  assertMandatorySafety,
  knownBadSamples,
  asText,
} = require('./assertions/safety.cjs');

const ROOT = __dirname;
const CASES_PATH = join(ROOT, 'cases', 'cases.json');
const PROMPT_PATH = join(ROOT, 'prompts', 'system_user.txt');
const ARTIFACTS_DIR = join(ROOT, '.artifacts');

function renderPrompt(template, vars) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v == null ? '' : String(v);
  });
}

function runContains(output, value, negate = false) {
  const text = asText(output);
  const hit = text.includes(value);
  if (negate) {
    return hit
      ? { pass: false, reason: `Output unexpectedly contains '${value}'.` }
      : { pass: true, reason: `Output correctly omits '${value}'.` };
  }
  return hit
    ? { pass: true, reason: `Output contains '${value}'.` }
    : { pass: false, reason: `Output missing required text '${value}'.` };
}

function runRegex(output, pattern) {
  const text = asText(output);
  const re = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
  return re.test(text)
    ? { pass: true, reason: `Regex matched: ${re}` }
    : { pass: false, reason: `Regex failed: ${re}` };
}

async function loadJsAssertion(valuePath) {
  const abs = valuePath.startsWith('file://')
    ? join(ROOT, valuePath.replace(/^file:\/\//, ''))
    : join(ROOT, valuePath);
  // Support both CJS export and default function.
  const mod = require(abs);
  if (typeof mod === 'function') return mod;
  if (mod && typeof mod.default === 'function') return mod.default;
  if (mod && typeof mod.promptfooMandatorySafety === 'function') {
    return mod.promptfooMandatorySafety;
  }
  throw new Error(`JavaScript assertion export not found at ${abs}`);
}

async function runAssertion(assertDef, output, context) {
  const type = String(assertDef.type || '').toLowerCase();
  if (type === 'contains') return runContains(output, assertDef.value, false);
  if (type === 'not-contains') return runContains(output, assertDef.value, true);
  if (type === 'regex' || type === 'icontains-regex') return runRegex(output, assertDef.value);
  if (type === 'javascript') {
    const fn = await loadJsAssertion(assertDef.value);
    const result = await fn(output, context);
    if (typeof result === 'boolean') {
      return {
        pass: result,
        reason: result ? 'JavaScript assertion passed.' : 'JavaScript assertion failed.',
      };
    }
    return {
      pass: Boolean(result?.pass),
      reason: result?.reason || (result?.pass ? 'pass' : 'fail'),
      score: result?.score,
    };
  }
  return { pass: false, reason: `Unsupported assertion type '${type}' in local runner.` };
}

async function main() {
  const started = new Date().toISOString();
  const promptTemplate = readFileSync(PROMPT_PATH, 'utf8');
  const cases = JSON.parse(readFileSync(CASES_PATH, 'utf8'));
  if (!Array.isArray(cases) || cases.length < 20) {
    console.error(`Expected at least 20 cases in ${CASES_PATH}; found ${cases?.length}`);
    process.exit(2);
  }

  const provider = new DeterministicCorpflowProvider({ id: 'deterministic-corpflow' });
  const results = [];
  let failed = 0;

  for (const testCase of cases) {
    const vars = { ...(testCase.vars || {}) };
    const prompt = renderPrompt(promptTemplate, vars);
    const context = { vars, test: testCase };
    const response = await provider.callApi(prompt, context);
    if (response.error) {
      failed += 1;
      results.push({
        description: testCase.description,
        case_id: vars.case_id,
        pass: false,
        errors: [response.error],
      });
      continue;
    }

    const asserts = Array.isArray(testCase.assert) ? testCase.assert : [];
    // Always enforce mandatory safety even if a case omits the JS assert.
    const assertionRuns = [{ type: 'javascript', value: 'file://assertions/mandatory-safety.js' }, ...asserts];
    // De-dupe identical javascript mandatory assert if already listed.
    const seen = new Set();
    const deduped = [];
    for (const a of assertionRuns) {
      const key = `${a.type}:${a.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(a);
    }

    const assertResults = [];
    let casePass = true;
    for (const a of deduped) {
      const r = await runAssertion(a, response.output, context);
      assertResults.push({ type: a.type, value: a.value, ...r });
      if (!r.pass) casePass = false;
    }

    if (!casePass) failed += 1;
    results.push({
      description: testCase.description,
      case_id: vars.case_id,
      scenario: vars.scenario,
      pass: casePass,
      assertResults,
      outputPreview: asText(response.output).slice(0, 240),
    });
  }

  // Meta-check: known-bad samples must fail mandatory safety.
  const badFailures = [];
  for (const sample of knownBadSamples()) {
    const r = assertMandatorySafety(sample.output, {
      vars: { expect_tenant_id: 'fixture-tenant-alpha', require_human_approval: true },
    });
    if (r.pass) {
      badFailures.push(sample.name);
    }
  }
  if (badFailures.length) {
    failed += 1;
    results.push({
      description: 'meta_known_bad_samples_must_fail',
      case_id: 'meta_known_bad_samples_must_fail',
      pass: false,
      errors: [`Known-bad samples unexpectedly passed: ${badFailures.join(', ')}`],
    });
  } else {
    results.push({
      description: 'meta_known_bad_samples_must_fail',
      case_id: 'meta_known_bad_samples_must_fail',
      pass: true,
      assertResults: [{ type: 'meta', pass: true, reason: 'Known-bad samples correctly failed mandatory safety.' }],
    });
  }

  const summary = {
    started,
    finished: new Date().toISOString(),
    node: process.version,
    provider: 'deterministic-corpflow',
    live_model: false,
    promptfoo_cloud: false,
    licence_posture: 'community_open_source_only',
    case_count: cases.length,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    results,
  };

  if (!existsSync(ARTIFACTS_DIR)) mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const outPath = join(ARTIFACTS_DIR, 'deterministic-eval-latest.json');
  writeFileSync(outPath, JSON.stringify(summary, null, 2));

  const passCount = summary.passed;
  const failCount = summary.failed;
  console.log('CorpFlowAI AI eval (deterministic pilot)');
  console.log(`Node: ${process.version}`);
  console.log(`Cases: ${cases.length} (+ meta known-bad check)`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Artifact: ${outPath}`);
  console.log('Licence posture: Community / open-source only (no Promptfoo Cloud/Enterprise).');
  console.log('Adoption status: pilot quality gate — not a production runtime, not a required PR check.');

  for (const r of results.filter((x) => !x.pass)) {
    console.error(`FAIL: ${r.case_id || r.description}`);
    for (const ar of r.assertResults || []) {
      if (!ar.pass) console.error(`  - ${ar.reason}`);
    }
    for (const e of r.errors || []) console.error(`  - ${e}`);
  }

  process.exit(failCount === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
