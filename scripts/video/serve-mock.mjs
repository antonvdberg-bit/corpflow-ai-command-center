#!/usr/bin/env node
/**
 * scripts/video/serve-mock.mjs
 *
 * Tiny static HTTP server used by the LR-Proof-2 walkthrough pipeline.
 * Serves the *single* mock surface tree referenced by a walkthrough YAML
 * (mock.served_from) on http://127.0.0.1:<port>.
 *
 * No external deps. No directory listing. No write methods. Refuses any
 * path that escapes the served directory.
 *
 * Usage:
 *   node scripts/video/serve-mock.mjs --id CF-VID-0001
 *   node scripts/video/serve-mock.mjs --file data/walkthroughs/lead-rescue-walkthrough-v1.yml
 *
 * Reads the YAML's mock.served_from + mock.base_url to know where to root
 * the server and which port to bind. Background-friendly.
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

import yaml from "js-yaml";

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

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

function safeJoin(rootAbs, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  const normalized = path.posix.normalize(decoded.replace(/\\/g, "/"));
  if (normalized.startsWith("..")) return null;
  const abs = path.resolve(rootAbs, "." + normalized);
  if (!abs.startsWith(rootAbs + path.sep) && abs !== rootAbs) return null;
  return abs;
}

async function main() {
  const args = parseArgs(process.argv);
  const yamlPath = resolveYamlPath(args);
  if (!yamlPath || !existsSync(yamlPath)) {
    console.error("usage: node scripts/video/serve-mock.mjs --id CF-VID-NNNN");
    process.exit(2);
  }

  const raw = await readFile(yamlPath, "utf8");
  const parsed = yaml.load(raw, { schema: yaml.JSON_SCHEMA });
  const w = parsed?.walkthrough;
  if (!w?.mock?.served_from || !w?.mock?.base_url) {
    console.error("walkthrough YAML missing mock.served_from or mock.base_url");
    process.exit(2);
  }

  const baseUrl = new URL(w.mock.base_url);
  const port = parseInt(baseUrl.port || "4173", 10);
  const docRoot = path.resolve(repoRoot, w.mock.served_from);
  if (!existsSync(docRoot)) {
    console.error(`mock served_from does not exist: ${docRoot}`);
    process.exit(2);
  }

  const server = createServer(async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
      res.end("Method Not Allowed");
      return;
    }
    let abs = safeJoin(docRoot, req.url || "/");
    if (!abs) {
      res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      res.end("Bad Request");
      return;
    }
    try {
      let st = await stat(abs);
      if (st.isDirectory()) {
        abs = path.join(abs, "index.html");
        if (!existsSync(abs)) {
          res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
          res.end("Not Found");
          return;
        }
        st = await stat(abs);
      }
      const ext = path.extname(abs).toLowerCase();
      const contentType = MIME[ext] || "application/octet-stream";
      res.writeHead(200, {
        "content-type": contentType,
        "content-length": st.size,
        "cache-control": "no-cache, no-store, must-revalidate",
      });
      if (req.method === "HEAD") {
        res.end();
      } else {
        res.end(await readFile(abs));
      }
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not Found");
    }
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`serve-mock: http://127.0.0.1:${port} -> ${path.relative(repoRoot, docRoot)}`);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(`serve-mock fatal: ${err.stack || err.message}`);
  process.exit(2);
});
