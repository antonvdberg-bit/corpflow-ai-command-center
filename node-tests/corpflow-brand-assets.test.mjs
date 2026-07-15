import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

import {
  CORPFLOW_BRAND_ASSET_PATHS,
  CORPFLOW_BRAND_ASSET_VERSION,
  CORPFLOW_BRAND_THEME_COLOR,
  listCorpFlowBrandHeadTags,
  shouldEmitCorpFlowBrandAssets,
} from '../lib/public/corpflow-brand-assets.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function existsPublic(relPath) {
  return existsSync(path.join(ROOT, 'public', relPath.replace(/^\//, '')));
}

describe('CorpFlowAI brand assets — files present', () => {
  for (const rel of Object.values(CORPFLOW_BRAND_ASSET_PATHS)) {
    it(`ships ${rel}`, () => {
      assert.equal(existsPublic(rel), true, `missing ${rel}`);
    });
  }

  it('does not place a global root favicon.ico (tenant/Core leak risk)', () => {
    assert.equal(existsSync(path.join(ROOT, 'public/favicon.ico')), false);
  });

  it('does not retain the rejected SVG recreation as a master', () => {
    assert.equal(existsPublic('/brand/corpflowai/corpflowai-mark.svg'), false);
  });
});

describe('CorpFlowAI brand assets — host emit policy', () => {
  it('allows apex and www', () => {
    assert.equal(shouldEmitCorpFlowBrandAssets('corpflowai.com'), true);
    assert.equal(shouldEmitCorpFlowBrandAssets('www.corpflowai.com'), true);
    assert.equal(shouldEmitCorpFlowBrandAssets('CorpFlowAI.com:443'), true);
  });

  it('allows localhost for local verification', () => {
    assert.equal(shouldEmitCorpFlowBrandAssets('localhost'), true);
    assert.equal(shouldEmitCorpFlowBrandAssets('127.0.0.1'), true);
  });

  it('allows unscoped Vercel preview hosts', () => {
    assert.equal(shouldEmitCorpFlowBrandAssets('corpflow-ai-command-center-git-abc.vercel.app'), true);
  });

  it('denies signed tenant preview query on Vercel', () => {
    assert.equal(
      shouldEmitCorpFlowBrandAssets('corpflow-ai-command-center-git-abc.vercel.app', {
        search: '?cf_preview=signed-token',
      }),
      false,
    );
  });

  it('denies Core and client tenants', () => {
    for (const host of [
      'core.corpflowai.com',
      'lux.corpflowai.com',
      'luxe.corpflowai.com',
      'living-word-mauritius.corpflowai.com',
      'living-word.corpflowai.com',
      'aileadrescue.corpflowai.com',
      'acme-corp.corpflowai.com',
    ]) {
      assert.equal(shouldEmitCorpFlowBrandAssets(host), false, host);
    }
  });

  it('denies empty / unknown external hosts', () => {
    assert.equal(shouldEmitCorpFlowBrandAssets(''), false);
    assert.equal(shouldEmitCorpFlowBrandAssets(null), false);
    assert.equal(shouldEmitCorpFlowBrandAssets('example.com'), false);
  });
});

describe('CorpFlowAI brand assets — head tags and wiring', () => {
  it('uses existing CorpFlowAI navy theme colour', () => {
    assert.equal(CORPFLOW_BRAND_THEME_COLOR, '#06111f');
    const tags = listCorpFlowBrandHeadTags();
    assert.ok(tags.some((t) => t.name === 'theme-color' && t.content === '#06111f'));
    assert.ok(tags.some((t) => t.rel === 'manifest'));
    assert.ok(tags.some((t) => t.rel === 'apple-touch-icon'));
  });

  it('cache-busts icon hrefs when brand asset version is set', () => {
    assert.ok(CORPFLOW_BRAND_ASSET_VERSION);
    const tags = listCorpFlowBrandHeadTags();
    const icons = tags.filter((t) => t.rel === 'icon' || t.rel === 'apple-touch-icon');
    assert.ok(icons.length >= 3);
    for (const tag of icons) {
      assert.match(String(tag.href), new RegExp(`[?&]v=${CORPFLOW_BRAND_ASSET_VERSION}(?:&|$)`));
    }
  });

  it('manifest JSON is valid and points at brand icons', () => {
    const raw = readFileSync(path.join(ROOT, 'public/brand/corpflowai/site.webmanifest'), 'utf8');
    const json = JSON.parse(raw);
    assert.equal(json.name, 'CorpFlowAI');
    assert.equal(json.theme_color, '#06111f');
    assert.ok(json.icons.some((i) => i.src.includes('/brand/corpflowai/')));
  });

  it('CorpFlow shells and offer/policy pages import CorpFlowBrandMetadata', () => {
    const files = [
      'components/public/CorpFlowPublicPhotoShell.js',
      'components/public/CorpFlowPublicShell.js',
      'components/RapidDeliveryOfferPage.js',
      'components/PublicPolicyLayout.js',
      'components/AiLeadRescueLanding.js',
    ];
    for (const rel of files) {
      const src = readFileSync(path.join(ROOT, rel), 'utf8');
      assert.match(src, /CorpFlowBrandMetadata/, rel);
    }
  });

  it('does not wire brand icons into _document.js', () => {
    const src = readFileSync(path.join(ROOT, 'pages/_document.js'), 'utf8');
    assert.doesNotMatch(src, /corpflowai\/favicon|CorpFlowBrandMetadata|apple-touch-icon/);
  });

  it('does not alter Lux tenant presentation branding files', () => {
    const lux = readFileSync(path.join(ROOT, 'components/LuxeMauriceTenantPresentation.js'), 'utf8');
    assert.doesNotMatch(lux, /CorpFlowBrandMetadata|\/brand\/corpflowai\//);
    const luxStatic = readFileSync(path.join(ROOT, 'public/lux-landing-static.html'), 'utf8');
    assert.doesNotMatch(luxStatic, /\/brand\/corpflowai\//);
  });
});

describe('CorpFlowAI brand assets — white background derivatives', () => {
  it('approved source and key sizes have opaque white corners', () => {
    const files = [
      'public/brand/corpflowai/corpflowai-favicon-approved-source.png',
      'public/brand/corpflowai/favicon-16x16.png',
      'public/brand/corpflowai/favicon-32x32.png',
      'public/brand/corpflowai/apple-touch-icon.png',
      'public/brand/corpflowai/android-chrome-192x192.png',
      'public/brand/corpflowai/android-chrome-512x512.png',
    ];
    for (const rel of files) {
      const { width, height, getPixel } = readPngRgba(path.join(ROOT, rel));
      assert.ok(width >= 16 && height >= 16, rel);
      for (const [x, y] of [
        [0, 0],
        [width - 1, 0],
        [0, height - 1],
        [width - 1, height - 1],
      ]) {
        const [r, g, b, a] = getPixel(x, y);
        assert.equal(a, 255, `${rel} alpha at ${x},${y}`);
        assert.deepEqual([r, g, b], [255, 255, 255], `${rel} rgb at ${x},${y}`);
      }
    }
  });

  it('keeps the supplied blue/teal tile (does not flatten mark onto pure white)', () => {
    // Right-of-center sampling should hit cyan/teal face-or-tile paint from Anton's pack,
    // not a white-only canvas that erased the rounded tile.
    const { width, height, getPixel } = readPngRgba(
      path.join(ROOT, 'public/brand/corpflowai/favicon-32x32.png'),
    );
    const [r, g, b, a] = getPixel(Math.floor(width * 0.72), Math.floor(height * 0.45));
    assert.equal(a, 255);
    assert.ok(g > 120 && b > 140, `expected teal/cyan paint, got ${r},${g},${b}`);
    assert.ok(!(r > 245 && g > 245 && b > 245), 'mark must not be erased to white');
  });
});

/**
 * Minimal decoder for 8-bit RGBA/RGB PNGs used by favicon fixtures (no extra deps).
 * @param {string} filePath
 */
function readPngRgba(filePath) {
  const buf = readFileSync(filePath);
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let bitDepth = 0;
  const idat = [];
  while (offset + 8 <= buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + len;
  }
  assert.equal(bitDepth, 8, `unsupported bit depth in ${filePath}`);
  assert.ok(colorType === 2 || colorType === 6, `unsupported color type ${colorType} in ${filePath}`);
  const bpp = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const rowSize = 1 + stride;
  assert.equal(raw.length, rowSize * height, `unexpected inflate size for ${filePath}`);
  // Undo PNG filters (Paeth / Sub / Up / Average / None) into RGBA buffer.
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * rowSize];
    const row = raw.subarray(y * rowSize + 1, y * rowSize + 1 + stride);
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const x = row[i];
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let val = x;
      if (filter === 1) val = (x + a) & 255;
      else if (filter === 2) val = (x + b) & 255;
      else if (filter === 3) val = (x + Math.floor((a + b) / 2)) & 255;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        val = (x + pr) & 255;
      } else if (filter !== 0) {
        throw new Error(`unsupported PNG filter ${filter} in ${filePath}`);
      }
      cur[i] = val;
    }
    for (let x = 0; x < width; x++) {
      const si = x * bpp;
      const di = (y * width + x) * 4;
      out[di] = cur[si];
      out[di + 1] = cur[si + 1];
      out[di + 2] = cur[si + 2];
      out[di + 3] = bpp === 4 ? cur[si + 3] : 255;
    }
    prev = cur;
  }
  return {
    width,
    height,
    getPixel(x, y) {
      const i = (y * width + x) * 4;
      return [out[i], out[i + 1], out[i + 2], out[i + 3]];
    },
  };
}
