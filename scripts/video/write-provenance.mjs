#!/usr/bin/env node
/**
 * scripts/video/write-provenance.mjs
 *
 * Emits the .provenance.json audit-trail anchor required by
 * docs/marketing/PROOF_VALIDATION_ASSET_PLAN_LR_V1.md § 6.3 and
 * docs/marketing/LR_PROOF_2_VIDEO_PIPELINE_PROPOSAL.md § 7.
 *
 * Three sign-off fields (final_cut_signed_off_by, final_cut_signed_off_at_iso,
 * phase_2_authorisation_comment_url) stay null here. They are filled in
 * by the LR-Proof-1 Phase 2 PR after Anton signs off the cut.
 *
 * Usage:
 *   node scripts/video/write-provenance.mjs --id CF-VID-0001
 */

import { readFile, writeFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

import yaml from "js-yaml";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  const out = { id: null, file: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--id" && argv[i + 1]) out.id = argv[++i];
    else if (a.startsWith("--id=")) out.id = a.slice("--id=".length);
    else if (a === "--file" && argv[i + 1]) out.file = argv[++i];
    else if (a.startsWith("--file=")) out.file = a.slice("--file=".length);
  }
  return out;
}

function resolveYamlPath({ id, file }) {
  if (file) return path.resolve(repoRoot, file);
  if (id) {
    const slug = id.toLowerCase();
    if (slug === "cf-vid-0001") {
      return path.resolve(repoRoot, "data/walkthroughs/lead-rescue-walkthrough-v1.yml");
    }
    return path.resolve(repoRoot, "data/walkthroughs", `${slug}.yml`);
  }
  return null;
}

async function fileSha256(absPath) {
  if (!existsSync(absPath)) return null;
  const raw = await readFile(absPath);
  return createHash("sha256").update(raw).digest("hex");
}

function readGitSha() {
  try {
    const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
    if (r.status === 0) return r.stdout.trim();
  } catch {}
  return process.env.GITHUB_SHA || null;
}

function readPlaywrightVersion() {
  try {
    const pkg = JSON.parse(readFileSync(path.resolve(repoRoot, "package.json"), "utf8"));
    return pkg?.devDependencies?.playwright || pkg?.dependencies?.playwright || null;
  } catch {
    return null;
  }
}

function readChromiumVersion() {
  try {
    const r = spawnSync("npx", ["--no-install", "playwright", "--version"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    if (r.status === 0) return r.stdout.trim();
  } catch {}
  return null;
}

function readFfmpegVersion() {
  try {
    const r = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
    if (r.status === 0) {
      const m = /ffmpeg version ([^\s]+)/.exec(r.stdout);
      return m ? m[1] : null;
    }
  } catch {}
  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  const yamlPath = resolveYamlPath(args);
  if (!yamlPath || !existsSync(yamlPath)) {
    console.error("usage: node scripts/video/write-provenance.mjs --id CF-VID-NNNN");
    process.exit(2);
  }

  const raw = await readFile(yamlPath, "utf8");
  const parsed = yaml.load(raw, { schema: yaml.JSON_SCHEMA });
  const w = parsed.walkthrough;
  const basename = w.meta.output_basename;

  const artifactsDir = path.resolve(repoRoot, ".artifacts");
  const mp4 = path.join(artifactsDir, `${basename}.mp4`);
  const vtt = path.join(artifactsDir, `${basename}.vtt`);
  const provenancePath = path.join(artifactsDir, `${basename}.provenance.json`);

  const yamlSha256 = await fileSha256(yamlPath);
  const mp4Sha256 = await fileSha256(mp4);
  const vttSha256 = await fileSha256(vtt);
  const mp4Size = existsSync(mp4) ? (await stat(mp4)).size : null;
  const vttSize = existsSync(vtt) ? (await stat(vtt)).size : null;

  const provenance = {
    walkthrough_id: w.id,
    output_basename: basename,
    walkthrough_yaml_path: path.relative(repoRoot, yamlPath),
    walkthrough_yaml_sha256: yamlSha256,
    repo_commit_sha: readGitSha(),
    workflow_run_id: process.env.GITHUB_RUN_ID || null,
    workflow_run_url: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null,
    playwright_version: readPlaywrightVersion(),
    chromium_version: readChromiumVersion(),
    ffmpeg_version: readFfmpegVersion(),
    node_version: process.version,
    generated_at_iso: new Date().toISOString(),
    artifact: {
      mp4_path: existsSync(mp4) ? path.relative(repoRoot, mp4) : null,
      mp4_size_bytes: mp4Size,
      mp4_sha256: mp4Sha256,
      vtt_path: existsSync(vtt) ? path.relative(repoRoot, vtt) : null,
      vtt_size_bytes: vttSize,
      vtt_sha256: vttSha256,
    },
    safety_assertions: {
      ai_tooling_disclosed: true,
      human_review_required: true,
      real_tenant_used: w.mock.real_tenant_used,
      real_telegram_used: w.mock.real_telegram_used,
      real_pii_present: w.mock.real_pii_present,
    },
    sign_off: {
      final_cut_signed_off_by: null,
      final_cut_signed_off_at_iso: null,
      phase_2_authorisation_comment_url: null,
    },
  };

  await writeFile(provenancePath, JSON.stringify(provenance, null, 2) + "\n");
  console.log(`OK: ${path.relative(repoRoot, provenancePath)}`);
}

main().catch((err) => {
  console.error(`write-provenance fatal: ${err.stack || err.message}`);
  process.exit(1);
});
