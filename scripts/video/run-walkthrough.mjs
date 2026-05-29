#!/usr/bin/env node
/**
 * scripts/video/run-walkthrough.mjs
 *
 * Drives headless Chromium through a walkthrough YAML and emits a single
 * WebM recording at .artifacts/raw/<basename>.webm plus a per-beat actual-
 * timing log at .artifacts/raw/<basename>.run.log.json.
 *
 * Behavior contract (LR-Proof-2 § 5.2):
 *   - Validates YAML against schema first; refuses to start otherwise.
 *   - Asserts mock.real_* flags are all false; refuses to start otherwise.
 *   - Verifies the local mock server is reachable at mock.base_url.
 *   - Records video at the YAML's resolution + framerate, no audio.
 *   - Executes beats sequentially, honouring start_seconds / duration_seconds.
 *   - Cursor moves offscreen unless beat.cursor === "visible".
 *   - Does not call any production URL. Does not load any non-mock domain.
 *
 * Usage:
 *   node scripts/video/run-walkthrough.mjs --id CF-VID-0001
 */

import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import http from "node:http";

import yaml from "js-yaml";
import Ajv from "ajv";
import { chromium } from "playwright";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  const out = { id: null, file: null };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--id" && argv[i + 1]) out.id = argv[++i];
    else if (arg.startsWith("--id=")) out.id = arg.slice("--id=".length);
    else if (arg === "--file" && argv[i + 1]) out.file = argv[++i];
    else if (arg.startsWith("--file=")) out.file = arg.slice("--file=".length);
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

async function loadYamlAndValidate(yamlPath) {
  if (!existsSync(yamlPath)) throw new Error(`walkthrough YAML not found: ${yamlPath}`);
  const schemaPath = path.resolve(repoRoot, "data/walkthroughs/_shared/walkthrough.schema.json");
  if (!existsSync(schemaPath)) throw new Error(`schema not found: ${schemaPath}`);
  const raw = await readFile(yamlPath, "utf8");
  const parsed = yaml.load(raw, { schema: yaml.JSON_SCHEMA });
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  if (!validate(parsed)) {
    const msgs = (validate.errors || []).map((e) => `${e.instancePath || "(root)"} ${e.message}`).join("; ");
    throw new Error(`schema validation failed: ${msgs}`);
  }
  const w = parsed.walkthrough;
  if (w.mock.real_tenant_used !== false) throw new Error("mock.real_tenant_used must be false");
  if (w.mock.real_telegram_used !== false) throw new Error("mock.real_telegram_used must be false");
  if (w.mock.real_pii_present !== false) throw new Error("mock.real_pii_present must be false");
  return w;
}

async function probeMockServer(baseUrl, attempts = 30, delayMs = 500) {
  const url = new URL("/", baseUrl);
  for (let i = 0; i < attempts; i++) {
    const ok = await new Promise((resolve) => {
      const req = http.get(url, { timeout: 1000 }, (res) => {
        res.resume();
        resolve(res.statusCode != null && res.statusCode < 500);
      });
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

function parseResolution(res) {
  const m = /^([0-9]{3,4})x([0-9]{3,4})$/.exec(res);
  if (!m) throw new Error(`invalid resolution: ${res}`);
  return { width: parseInt(m[1], 10), height: parseInt(m[2], 10) };
}

async function main() {
  const args = parseArgs(process.argv);
  const yamlPath = resolveYamlPath(args);
  if (!yamlPath) {
    console.error("usage: node scripts/video/run-walkthrough.mjs --id CF-VID-NNNN");
    process.exit(2);
  }

  const w = await loadYamlAndValidate(yamlPath);
  const { width, height } = parseResolution(w.meta.resolution);
  const baseUrl = w.mock.base_url;
  const servedFrom = path.resolve(repoRoot, w.mock.served_from);

  const reachable = await probeMockServer(baseUrl);
  if (!reachable) {
    throw new Error(`mock server unreachable at ${baseUrl} — start it with scripts/video/serve-mock.mjs first`);
  }

  const artifactsDir = path.resolve(repoRoot, ".artifacts");
  const rawDir = path.join(artifactsDir, "raw");
  await mkdir(rawDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--mute-audio", "--disable-features=AudioServiceOutOfProcess"],
  });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme: "light",
    reducedMotion: "reduce",
    recordVideo: { dir: rawDir, size: { width, height } },
  });
  const page = await context.newPage();
  if (typeof page.mouse?.move === "function") {
    await page.mouse.move(width + 50, height + 50).catch(() => {});
  }

  const beatStartedAt = Date.now();
  const beatLog = [];

  const overlayInjectionId = "lr-proof-2-overlay-frame";
  const navUrl = (p) => new URL(p, baseUrl).toString();

  for (const beat of w.beats) {
    const beatActualStart = (Date.now() - beatStartedAt) / 1000;
    const action = beat.action || {};
    try {
      switch (action.type) {
        case "navigate": {
          await page.goto(navUrl(action.url), { waitUntil: "domcontentloaded" });
          break;
        }
        case "wait": {
          break;
        }
        case "wait_and_highlight": {
          if (action.selector) {
            await page.locator(action.selector).first().waitFor({ state: "visible", timeout: 5000 });
            await page.evaluate(
              ({ selector }) => {
                document.querySelectorAll("[data-walkthrough-highlight='on']").forEach((el) => {
                  el.removeAttribute("data-walkthrough-highlight");
                });
                const el = document.querySelector(selector);
                if (el) el.setAttribute("data-walkthrough-highlight", "on");
              },
              { selector: action.selector },
            );
          }
          break;
        }
        case "click": {
          if (action.selector) {
            await page.locator(action.selector).first().click({ trial: false });
          }
          break;
        }
        case "scroll": {
          await page.evaluate((y) => window.scrollTo({ top: Number(y) || 0, behavior: "instant" }), action.scroll_y || 0);
          break;
        }
        case "show_overlay": {
          if (action.overlay_html_ref) {
            const overlayPath = path.resolve(repoRoot, action.overlay_html_ref);
            if (!existsSync(overlayPath)) throw new Error(`overlay HTML not found: ${overlayPath}`);
            const overlayHtml = await readFile(overlayPath, "utf8");
            await page.evaluate(
              ({ id, html }) => {
                let frame = document.getElementById(id);
                if (!frame) {
                  frame = document.createElement("iframe");
                  frame.id = id;
                  frame.setAttribute("data-walkthrough", "overlay-iframe");
                  Object.assign(frame.style, {
                    position: "fixed",
                    inset: "0",
                    width: "100vw",
                    height: "100vh",
                    border: "0",
                    pointerEvents: "none",
                    background: "transparent",
                    zIndex: "2147483646",
                  });
                  document.body.appendChild(frame);
                }
                const doc = frame.contentDocument || frame.contentWindow?.document;
                if (doc) {
                  doc.open();
                  doc.write(html);
                  doc.close();
                }
              },
              { id: overlayInjectionId, html: overlayHtml },
            );
          }
          break;
        }
        case "hide_overlay": {
          await page.evaluate((id) => {
            const f = document.getElementById(id);
            if (f) f.remove();
          }, overlayInjectionId);
          break;
        }
        case "show_disclosure_card": {
          const cardPath = path.resolve(repoRoot, w.disclosure.final_card_html_ref);
          if (!existsSync(cardPath)) throw new Error(`disclosure card not found: ${cardPath}`);
          const fileUrl = "file:///" + cardPath.replace(/\\/g, "/");
          await page.goto(fileUrl, { waitUntil: "domcontentloaded" });
          break;
        }
        default: {
          throw new Error(`unknown action type: ${action.type}`);
        }
      }
    } catch (err) {
      beatLog.push({
        beat_id: beat.id,
        action_type: action.type,
        actual_start_seconds: beatActualStart,
        error: err.message,
      });
      throw err;
    }

    if (beat.cursor !== "visible" && typeof page.mouse?.move === "function") {
      await page.mouse.move(width + 50, height + 50).catch(() => {});
    }

    await page.waitForTimeout(Math.round((beat.duration_seconds || 0) * 1000));

    beatLog.push({
      beat_id: beat.id,
      action_type: action.type,
      actual_start_seconds: beatActualStart,
      planned_duration_seconds: beat.duration_seconds,
      caption: beat.caption || "",
    });
  }

  await context.close();
  await browser.close();

  const videoFile = page.video();
  const recordedPath = videoFile ? await videoFile.path() : null;
  const finalRawWebm = path.join(rawDir, `${w.meta.output_basename}.webm`);
  if (recordedPath && existsSync(recordedPath) && recordedPath !== finalRawWebm) {
    await writeFile(finalRawWebm, await readFile(recordedPath));
  }

  const logPath = path.join(rawDir, `${w.meta.output_basename}.run.log.json`);
  const logEnvelope = {
    walkthrough_id: w.id,
    output_basename: w.meta.output_basename,
    started_at_iso: new Date(beatStartedAt).toISOString(),
    finished_at_iso: new Date().toISOString(),
    elapsed_seconds: (Date.now() - beatStartedAt) / 1000,
    beats: beatLog,
  };
  await writeFile(logPath, JSON.stringify(logEnvelope, null, 2));

  let webmSize = 0;
  if (existsSync(finalRawWebm)) {
    webmSize = (await stat(finalRawWebm)).size;
  }

  console.log(`run-walkthrough OK: ${w.id}`);
  console.log(`  webm: ${path.relative(repoRoot, finalRawWebm)} (${webmSize} bytes)`);
  console.log(`  log:  ${path.relative(repoRoot, logPath)}`);
}

main().catch((err) => {
  console.error(`run-walkthrough fatal: ${err.stack || err.message}`);
  process.exit(1);
});
