#!/usr/bin/env node
/**
 * scripts/video/validate.mjs
 *
 * Validates a CorpFlowAI walkthrough YAML against the JSON Schema and a few
 * runtime safety assertions. Refuses the YAML if any "mock.real_*" flag is
 * true (LR-Proof-2 hard limit: no real client data, no real Telegram, no
 * real PII in any rendered video).
 *
 * Usage:
 *   node scripts/video/validate.mjs --id CF-VID-0001
 *   node scripts/video/validate.mjs --file data/walkthroughs/lead-rescue-walkthrough-v1.yml
 *
 * Exit codes:
 *   0 — YAML valid and safety-checked
 *   1 — schema validation failure or safety assertion failure
 *   2 — bad CLI usage or file not found
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

import yaml from "js-yaml";
import Ajv from "ajv";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  const out = { id: null, file: null };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--id" && argv[i + 1]) {
      out.id = argv[++i];
    } else if (arg.startsWith("--id=")) {
      out.id = arg.slice("--id=".length);
    } else if (arg === "--file" && argv[i + 1]) {
      out.file = argv[++i];
    } else if (arg.startsWith("--file=")) {
      out.file = arg.slice("--file=".length);
    }
  }
  return out;
}

function resolveYamlPath({ id, file }) {
  if (file) {
    return path.resolve(repoRoot, file);
  }
  if (id) {
    const slug = id.toLowerCase();
    if (slug === "cf-vid-0001") {
      return path.resolve(repoRoot, "data/walkthroughs/lead-rescue-walkthrough-v1.yml");
    }
    return path.resolve(repoRoot, "data/walkthroughs", `${slug}.yml`);
  }
  return null;
}

async function loadSchema() {
  const schemaPath = path.resolve(repoRoot, "data/walkthroughs/_shared/walkthrough.schema.json");
  if (!existsSync(schemaPath)) {
    throw new Error(`schema missing: ${schemaPath}`);
  }
  const raw = await readFile(schemaPath, "utf8");
  return JSON.parse(raw);
}

async function loadWalkthrough(yamlPath) {
  if (!existsSync(yamlPath)) {
    throw new Error(`walkthrough YAML not found: ${yamlPath}`);
  }
  const raw = await readFile(yamlPath, "utf8");
  return yaml.load(raw, { filename: yamlPath, schema: yaml.JSON_SCHEMA });
}

function assertMockSafety(walkthrough, yamlPath) {
  const flags = walkthrough?.walkthrough?.mock || {};
  const violations = [];
  if (flags.real_tenant_used !== false) violations.push("mock.real_tenant_used must be false");
  if (flags.real_telegram_used !== false) violations.push("mock.real_telegram_used must be false");
  if (flags.real_pii_present !== false) violations.push("mock.real_pii_present must be false");
  if (violations.length > 0) {
    throw new Error(
      `safety assertion failed in ${path.relative(repoRoot, yamlPath)}:\n  - ${violations.join("\n  - ")}`,
    );
  }
}

function assertBeatTimings(walkthrough) {
  const beats = walkthrough?.walkthrough?.beats || [];
  let cursor = 0;
  for (const beat of beats) {
    if (Math.abs(beat.start_seconds - cursor) > 0.01) {
      throw new Error(
        `beat ${beat.id}: start_seconds=${beat.start_seconds} does not match cumulative duration ${cursor.toFixed(2)}`,
      );
    }
    cursor += beat.duration_seconds;
  }
  const meta = walkthrough?.walkthrough?.meta || {};
  if (cursor < meta.target_duration_seconds_min || cursor > meta.target_duration_seconds_max) {
    throw new Error(
      `total duration ${cursor.toFixed(1)}s outside target window [${meta.target_duration_seconds_min}, ${meta.target_duration_seconds_max}]s`,
    );
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const yamlPath = resolveYamlPath(args);
  if (!yamlPath) {
    console.error("usage: node scripts/video/validate.mjs --id CF-VID-NNNN | --file <path-to-yml>");
    process.exit(2);
  }

  let schema;
  let walkthrough;
  try {
    schema = await loadSchema();
    walkthrough = await loadWalkthrough(yamlPath);
  } catch (err) {
    console.error(`load failure: ${err.message}`);
    process.exit(2);
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validateFn = ajv.compile(schema);
  const ok = validateFn(walkthrough);
  if (!ok) {
    console.error(`schema validation failed for ${path.relative(repoRoot, yamlPath)}:`);
    for (const e of validateFn.errors || []) {
      console.error(`  - ${e.instancePath || "(root)"} ${e.message}`);
    }
    process.exit(1);
  }

  try {
    assertMockSafety(walkthrough, yamlPath);
    assertBeatTimings(walkthrough);
  } catch (err) {
    console.error(`safety check failed: ${err.message}`);
    process.exit(1);
  }

  const w = walkthrough.walkthrough;
  const totalSeconds = w.beats.reduce((acc, b) => acc + b.duration_seconds, 0);
  console.log(`OK: ${path.relative(repoRoot, yamlPath)}`);
  console.log(`  id: ${w.id}`);
  console.log(`  status: ${w.status}`);
  console.log(`  beats: ${w.beats.length}`);
  console.log(`  total duration: ${totalSeconds.toFixed(1)}s (target ${w.meta.target_duration_seconds_min}-${w.meta.target_duration_seconds_max}s)`);
  console.log(`  resolution: ${w.meta.resolution} @ ${w.meta.framerate_fps}fps  audio=${w.meta.audio}`);
  console.log(`  mock.real_tenant_used: ${w.mock.real_tenant_used}`);
  console.log(`  mock.real_telegram_used: ${w.mock.real_telegram_used}`);
  console.log(`  mock.real_pii_present: ${w.mock.real_pii_present}`);
}

main().catch((err) => {
  console.error(`unexpected error: ${err.stack || err.message}`);
  process.exit(2);
});
