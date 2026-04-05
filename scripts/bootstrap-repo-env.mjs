/**
 * Loads repo-root `.env` then `.env.local` into `process.env` once per Node process.
 *
 * Precedence (highest first): variables already set in the shell → `.env.local` → `.env`.
 * Shell exports always win so one-off overrides still work.
 *
 * Aliases (after merge): `VERCEL_AUTH_TOKEN` → `VERCEL_TOKEN`;
 * `CORPFLOW_PUBLIC_BASE_URL` → `FACTORY_HEALTH_URL` / `CORPFLOW_FACTORY_HEALTH_URL` when those are unset.
 *
 * Import as the first side effect in any script that reads `process.env`:
 *   import './bootstrap-repo-env.mjs';
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let didRun = false;

function stripBom(s) {
  if (s.charCodeAt(0) === 0xfeff) return s.slice(1);
  return s;
}

function parseEnvFile(content) {
  const out = {};
  const text = stripBom(content);
  for (let line of text.split(/\r?\n/)) {
    line = line.trimEnd();
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    let t = trimmed;
    if (/^export\s+/i.test(t)) t = t.replace(/^export\s+/i, '').trim();
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function loadFile(rel) {
  const p = path.join(ROOT, rel);
  if (!existsSync(p)) return {};
  try {
    return parseEnvFile(readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}

export function bootstrapRepoEnv() {
  if (didRun) return;
  didRun = true;

  const fromEnv = loadFile('.env');
  const fromLocal = loadFile('.env.local');
  const merged = { ...fromEnv, ...fromLocal };

  for (const [key, val] of Object.entries(merged)) {
    if (process.env[key] === undefined) process.env[key] = val;
  }

  if (!String(process.env.VERCEL_TOKEN || '').trim() && String(process.env.VERCEL_AUTH_TOKEN || '').trim()) {
    process.env.VERCEL_TOKEN = process.env.VERCEL_AUTH_TOKEN;
  }

  const hasHealth =
    String(process.env.FACTORY_HEALTH_URL || '').trim() ||
    String(process.env.CORPFLOW_FACTORY_HEALTH_URL || '').trim();
  const pub = String(process.env.CORPFLOW_PUBLIC_BASE_URL || '').trim();
  if (!hasHealth && pub) {
    const base = pub.replace(/\/+$/, '');
    process.env.FACTORY_HEALTH_URL = base;
  }
}

bootstrapRepoEnv();
