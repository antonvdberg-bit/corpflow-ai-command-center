/**
 * LuxeMaurice AI sandbox migration manifest — reads local files only, no secrets.
 */

import fs from 'node:fs';
import path from 'node:path';

import { LUX_AI_MIGRATION_ORDER_FILE, LUX_AI_MIGRATIONS_DIR } from './config.js';

/**
 * @param {string} line
 * @returns {string|null}
 */
function parseOrderLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  return path.basename(trimmed);
}

/**
 * @returns {string[]}
 */
export function readMigrationOrder() {
  if (!fs.existsSync(LUX_AI_MIGRATION_ORDER_FILE)) return [];
  const raw = fs.readFileSync(LUX_AI_MIGRATION_ORDER_FILE, 'utf8');
  return raw
    .split(/\r?\n/)
    .map(parseOrderLine)
    .filter(Boolean);
}

/**
 * @returns {string[]}
 */
export function listMigrationFilesOnDisk() {
  if (!fs.existsSync(LUX_AI_MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(LUX_AI_MIGRATIONS_DIR)
    .filter((name) => name.toLowerCase().endsWith('.sql'))
    .sort();
}

/**
 * @returns {{
 *   order_file_exists: boolean,
 *   migrations_dir_exists: boolean,
 *   ordered_files: string[],
 *   files_on_disk: string[],
 *   expected_count: number,
 *   present_count: number,
 *   missing_files: string[],
 *   extra_files: string[],
 *   ready_to_run: boolean,
 * }}
 */
export function buildMigrationManifest() {
  const order_file_exists = fs.existsSync(LUX_AI_MIGRATION_ORDER_FILE);
  const migrations_dir_exists = fs.existsSync(LUX_AI_MIGRATIONS_DIR);
  const ordered_files = readMigrationOrder();
  const files_on_disk = listMigrationFilesOnDisk();
  const diskSet = new Set(files_on_disk);
  const missing_files = ordered_files.filter((f) => !diskSet.has(f));
  const orderSet = new Set(ordered_files);
  const extra_files = files_on_disk.filter((f) => !orderSet.has(f));
  const present_count = ordered_files.filter((f) => diskSet.has(f)).length;
  const expected_count = ordered_files.length;
  const ready_to_run =
    order_file_exists && migrations_dir_exists && expected_count > 0 && missing_files.length === 0;

  return {
    order_file_exists,
    migrations_dir_exists,
    ordered_files,
    files_on_disk,
    expected_count,
    present_count,
    missing_files,
    extra_files,
    ready_to_run,
  };
}
