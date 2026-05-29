#!/usr/bin/env node
/**
 * scripts/video/encode-mp4.mjs
 *
 * Takes the raw WebM emitted by run-walkthrough.mjs plus the per-beat
 * runtime log and produces:
 *   .artifacts/<basename>.mp4   -- H.264, no audio, +faststart, with
 *                                  burned-in captions per beat
 *   .artifacts/<basename>.vtt   -- HTML5 <track kind="captions"> companion
 *                                  with the same timings (machine-readable)
 *
 * Captions are sourced from the *log* (so timings reflect what was actually
 * recorded, not what the YAML claimed), with text from the YAML's beats[i].
 *
 * Usage:
 *   node scripts/video/encode-mp4.mjs --id CF-VID-0001
 */

import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
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

function escapeDrawText(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,")
    .replace(/%/g, "\\%");
}

function vttTimestamp(seconds) {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total - h * 3600 - m * 60;
  const ms = Math.floor((s - Math.floor(s)) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(Math.floor(s)).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

function buildVttFromBeats(beats) {
  const lines = ["WEBVTT", ""];
  let cursor = 0;
  beats.forEach((beat) => {
    const start = beat.actual_start_seconds ?? cursor;
    const dur = beat.planned_duration_seconds ?? 0;
    const end = start + dur;
    const caption = (beat.caption || "").trim();
    if (caption.length > 0) {
      lines.push(`${vttTimestamp(start)} --> ${vttTimestamp(end)}`);
      lines.push(caption);
      lines.push("");
    }
    cursor = end;
  });
  return lines.join("\n");
}

function buildDrawTextFilters(beats, captionStyle, fontPath) {
  const filters = [];
  let cursor = 0;
  for (const beat of beats) {
    const start = beat.actual_start_seconds ?? cursor;
    const dur = beat.planned_duration_seconds ?? 0;
    const end = start + dur;
    const caption = (beat.caption || "").trim();
    if (caption.length > 0) {
      const text = escapeDrawText(caption);
      const fontSize = captionStyle.font_size_px || 28;
      const fontColor = captionStyle.font_color || "white";
      const shadowX = captionStyle.shadow_x ?? 1;
      const shadowY = captionStyle.shadow_y ?? 1;
      const shadowColor = captionStyle.shadow_color || "black";
      const padH = captionStyle.background_band?.padding_horizontal_px ?? 16;
      const padV = captionStyle.background_band?.padding_vertical_px ?? 10;
      const bandColor = captionStyle.background_band?.color || "black";
      const bandOpacity = captionStyle.background_band?.opacity ?? 0.55;
      const marginBottom = captionStyle.position?.margin_bottom_px ?? 40;
      const enableExpr = `between(t,${start.toFixed(3)},${end.toFixed(3)})`;
      const parts = [
        `text='${text}'`,
        `fontsize=${fontSize}`,
        `fontcolor=${fontColor}`,
        `box=1`,
        `boxcolor=${bandColor}@${bandOpacity}`,
        `boxborderw=${Math.max(padH, padV)}`,
        `x=(w-text_w)/2`,
        `y=h-text_h-${marginBottom}`,
        `shadowx=${shadowX}`,
        `shadowy=${shadowY}`,
        `shadowcolor=${shadowColor}`,
        `enable='${enableExpr}'`,
      ];
      if (fontPath) {
        parts.unshift(`fontfile='${fontPath.replace(/\\/g, "/").replace(/:/g, "\\:")}'`);
      }
      filters.push(`drawtext=${parts.join(":")}`);
    }
    cursor = end;
  }
  return filters.join(",");
}

function spawnFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "inherit", "inherit"] });
    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

async function captureFfmpegVersion() {
  return new Promise((resolve) => {
    const proc = spawn("ffmpeg", ["-version"], { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    proc.stdout.on("data", (c) => (out += c.toString()));
    proc.on("error", () => resolve("unknown"));
    proc.on("close", () => {
      const m = /ffmpeg version ([^\s]+)/.exec(out);
      resolve(m ? m[1] : "unknown");
    });
  });
}

async function findAvailableFont() {
  const candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/arial.ttf",
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  const yamlPath = resolveYamlPath(args);
  if (!yamlPath || !existsSync(yamlPath)) {
    console.error("usage: node scripts/video/encode-mp4.mjs --id CF-VID-NNNN");
    process.exit(2);
  }

  const raw = await readFile(yamlPath, "utf8");
  const parsed = yaml.load(raw, { schema: yaml.JSON_SCHEMA });
  const w = parsed.walkthrough;
  const basename = w.meta.output_basename;

  const artifactsDir = path.resolve(repoRoot, ".artifacts");
  const rawDir = path.join(artifactsDir, "raw");
  const webm = path.join(rawDir, `${basename}.webm`);
  const logPath = path.join(rawDir, `${basename}.run.log.json`);
  if (!existsSync(webm)) throw new Error(`raw webm not found: ${webm}`);
  if (!existsSync(logPath)) throw new Error(`runner log not found: ${logPath}`);

  const log = JSON.parse(await readFile(logPath, "utf8"));
  const captionStylePath = path.resolve(repoRoot, w.caption_style_ref);
  const captionStyle = JSON.parse(await readFile(captionStylePath, "utf8"));
  const fontPath = await findAvailableFont();
  const beatsForCaptions = log.beats.map((b, i) => ({
    actual_start_seconds: b.actual_start_seconds,
    planned_duration_seconds: b.planned_duration_seconds,
    caption: b.caption || w.beats[i]?.caption || "",
  }));
  const drawText = buildDrawTextFilters(beatsForCaptions, captionStyle, fontPath);

  const mp4 = path.join(artifactsDir, `${basename}.mp4`);
  const vtt = path.join(artifactsDir, `${basename}.vtt`);

  const filterChain = drawText.length > 0 ? drawText : "null";
  const ffmpegArgs = [
    "-hide_banner",
    "-loglevel", "warning",
    "-y",
    "-i", webm,
    "-an",
    "-vf", filterChain,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", "22",
    "-preset", "medium",
    "-r", String(w.meta.framerate_fps),
    "-movflags", "+faststart",
    mp4,
  ];

  console.log(`encode-mp4: ffmpeg ${webm} -> ${path.relative(repoRoot, mp4)}`);
  await spawnFfmpeg(ffmpegArgs);

  const vttBody = buildVttFromBeats(beatsForCaptions);
  await writeFile(vtt, vttBody);

  const sz = (await stat(mp4)).size;
  const ffmpegVersion = await captureFfmpegVersion();
  console.log(`OK: ${path.relative(repoRoot, mp4)} (${sz} bytes), captions burned in`);
  console.log(`OK: ${path.relative(repoRoot, vtt)} (${vttBody.length} chars)`);
  console.log(`ffmpeg version: ${ffmpegVersion}`);

  const summaryPath = path.join(artifactsDir, `${basename}.encode.summary.json`);
  await writeFile(
    summaryPath,
    JSON.stringify(
      {
        basename,
        mp4_path: path.relative(repoRoot, mp4),
        vtt_path: path.relative(repoRoot, vtt),
        webm_size_bytes: (await stat(webm)).size,
        mp4_size_bytes: sz,
        font_used: fontPath || "ffmpeg-default",
        ffmpeg_version: ffmpegVersion,
        encoded_at_iso: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(`encode-mp4 fatal: ${err.stack || err.message}`);
  process.exit(1);
});
