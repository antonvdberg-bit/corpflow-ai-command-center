#!/usr/bin/env node
/**
 * Website Rescue Video Factory Phase A CLI (#1143).
 *
 * Zero-spend only. Live HeyGen calls are refused.
 *
 *   node scripts/video-factory/cli.mjs validate
 *   node scripts/video-factory/cli.mjs heygen-dry-run --id cf-vid-wr-what-it-does
 *   node scripts/video-factory/cli.mjs qc --id cf-vid-wr-what-it-does --fixture pass
 *   node scripts/video-factory/cli.mjs qc --id cf-vid-wr-what-it-does --fixture fail
 *   node scripts/video-factory/cli.mjs qc --id cf-vid-wr-what-it-does --fixture review
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { LIVE_HEYGEN_CALL_BLOCKED } from '../../lib/video-factory/constants.js';
import {
  blockLiveHeyGenCall,
  createHeyGenAdapter,
  credentialPresentButBlocked,
} from '../../lib/video-factory/heygen-adapter.js';
import { runQcReport } from '../../lib/video-factory/qc-report.js';
import { loadBundledVideoSpecs, loadVideoSpecFromFile, VIDEO_FACTORY_REPO_ROOT } from '../../lib/video-factory/video-spec.js';

const repoRoot = VIDEO_FACTORY_REPO_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function parseArgs(argv) {
  const out = { command: argv[2] || '', id: null, fixture: 'pass', live: false, writeExamples: false };
  for (let i = 3; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--id' && argv[i + 1]) out.id = argv[++i];
    else if (arg.startsWith('--id=')) out.id = arg.slice('--id='.length);
    else if (arg === '--fixture' && argv[i + 1]) out.fixture = argv[++i];
    else if (arg.startsWith('--fixture=')) out.fixture = arg.slice('--fixture='.length);
    else if (arg === '--live') out.live = true;
    else if (arg === '--write-examples') out.writeExamples = true;
  }
  return out;
}

function specPathForId(id) {
  return path.join(repoRoot, 'data/video-factory/specs', `${id}.v1.json`);
}

function printValidation(result, label) {
  if (result.ok) {
    console.log(`OK  ${label}  ${result.spec.id}  ${result.spec.status}  ${result.spec.duration.planned_seconds}s`);
    return;
  }
  console.error(`FAIL ${label}`);
  for (const err of result.errors) console.error(`  - ${err}`);
}

async function cmdValidate(args) {
  if (args.id) {
    const result = loadVideoSpecFromFile(specPathForId(args.id));
    printValidation(result, path.relative(repoRoot, result.path));
    process.exit(result.ok ? 0 : 1);
  }
  const results = loadBundledVideoSpecs();
  let failed = false;
  for (const result of results) {
    printValidation(result, path.relative(repoRoot, result.path));
    if (!result.ok) failed = true;
  }
  process.exit(failed ? 1 : 0);
}

async function cmdHeygenDryRun(args) {
  if (args.live) {
    try {
      blockLiveHeyGenCall('CLI --live flag');
    } catch (err) {
      console.error(err.message);
      console.error(JSON.stringify(credentialPresentButBlocked(), null, 2));
      process.exit(2);
    }
  }
  const id = args.id || 'cf-vid-wr-what-it-does';
  const loaded = loadVideoSpecFromFile(specPathForId(id));
  if (!loaded.ok) {
    printValidation(loaded, id);
    process.exit(1);
  }
  const adapter = createHeyGenAdapter({ mode: 'mock' });
  const built = adapter.buildGenerationInput(loaded.spec);
  if (!built.ok) {
    console.error(JSON.stringify(built, null, 2));
    process.exit(1);
  }
  const generated = await adapter.generate(loaded.spec);
  const status = await adapter.status(generated.job.video_id, { status: 'completed' });
  console.log(
    JSON.stringify(
      {
        transport: 'mock',
        live_call: false,
        blocked_if_live: LIVE_HEYGEN_CALL_BLOCKED,
        credential_probe: credentialPresentButBlocked(),
        generation_input_identities_pending: built.payload.identities_pending,
        generate: generated,
        status,
      },
      null,
      2,
    ),
  );
}

function loadMediaFixture(name) {
  const media = JSON.parse(
    readFileSync(path.join(repoRoot, 'data/video-factory/fixtures/qc', `${name}-media.json`), 'utf8'),
  );
  let captionsText = '';
  try {
    captionsText = readFileSync(
      path.join(repoRoot, 'data/video-factory/fixtures/qc', `${name}-captions.vtt`),
      'utf8',
    );
  } catch {
    captionsText = media.captions_text || '';
  }
  return { media, captionsText };
}

async function cmdQc(args) {
  const id = args.id || 'cf-vid-wr-what-it-does';
  const loaded = loadVideoSpecFromFile(specPathForId(id));
  if (!loaded.ok) {
    printValidation(loaded, id);
    process.exit(1);
  }
  const { media, captionsText } = loadMediaFixture(args.fixture);
  const report = runQcReport({
    spec: loaded.spec,
    media,
    captionsText,
    transcript: media.transcript,
    nowIso: '2026-08-27T00:00:00.000Z',
  });
  console.log(JSON.stringify(report, null, 2));
  if (args.writeExamples) {
    const outDir = path.join(repoRoot, 'artifacts/video-factory/website-rescue-phase-a');
    mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `qc-report-${args.fixture}.example.json`);
    writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
    console.error(`wrote ${path.relative(repoRoot, outPath)}`);
  }
  process.exit(report.verdict === 'FAIL' ? 1 : 0);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.command === 'validate') return cmdValidate(args);
  if (args.command === 'heygen-dry-run') return cmdHeygenDryRun(args);
  if (args.command === 'qc') return cmdQc(args);
  console.error('usage: node scripts/video-factory/cli.mjs <validate|heygen-dry-run|qc> [--id <id>] [--fixture pass|fail|review] [--write-examples]');
  process.exit(2);
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(2);
});
