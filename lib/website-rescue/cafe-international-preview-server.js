/**
 * Server-only Café International fixture loaders (Node fs).
 * Import only from getStaticProps / tests — not from client components.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { buildCafeInternationalPreviewViewModel } from './cafe-international-preview.js';

const TRUTH_REL = 'fixtures/website-rescue/cafe-international-client-truth.json';
const MENU_REL = 'fixtures/website-rescue/cafe-international-menu-preview.json';

function readJson(rel) {
  const abs = path.join(process.cwd(), rel);
  return JSON.parse(readFileSync(abs, 'utf8'));
}

export function loadCafeInternationalClientTruth() {
  return readJson(TRUTH_REL);
}

export function loadCafeInternationalMenuPreview() {
  return readJson(MENU_REL);
}

export function getCafeInternationalPreviewProps() {
  const truth = loadCafeInternationalClientTruth();
  const menu = loadCafeInternationalMenuPreview();
  return buildCafeInternationalPreviewViewModel(truth, menu);
}
