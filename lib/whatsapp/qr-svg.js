/**
 * Lightweight local QR Code (byte mode, ECC-M) SVG encoder.
 *
 * No npm dependency, no paid/hosted QR service, no network call.
 * Intended for WhatsApp Tier 1 `wa.me` links (print / desktop). Versions 1–10.
 */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
})();

function gfMul(a, b) {
  if (!a || !b) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rsGenerator(ecCount) {
  let g = [1];
  for (let i = 0; i < ecCount; i += 1) {
    const next = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j += 1) {
      next[j] ^= g[j];
      next[j + 1] ^= gfMul(g[j], EXP[i]);
    }
    g = next;
  }
  return g;
}

function rsEncode(data, ecCount) {
  const gen = rsGenerator(ecCount);
  const ecc = new Array(ecCount).fill(0);
  for (let i = 0; i < data.length; i += 1) {
    const factor = data[i] ^ ecc[0];
    ecc.shift();
    ecc.push(0);
    if (!factor) continue;
    for (let j = 0; j < ecCount; j += 1) {
      ecc[j] ^= gfMul(gen[j + 1], factor);
    }
  }
  return ecc;
}

/** ECC-M block layout (ISO/IEC 18004 Table 9). */
const ECC_M = {
  1: [{ count: 1, data: 16, ec: 10 }],
  2: [{ count: 1, data: 28, ec: 16 }],
  3: [{ count: 1, data: 44, ec: 26 }],
  4: [{ count: 2, data: 32, ec: 18 }],
  5: [{ count: 2, data: 43, ec: 24 }],
  6: [{ count: 4, data: 27, ec: 16 }],
  7: [{ count: 4, data: 31, ec: 18 }],
  8: [
    { count: 2, data: 38, ec: 22 },
    { count: 2, data: 39, ec: 22 },
  ],
  9: [
    { count: 3, data: 36, ec: 22 },
    { count: 2, data: 37, ec: 22 },
  ],
  10: [
    { count: 4, data: 43, ec: 26 },
    { count: 1, data: 44, ec: 26 },
  ],
};

const REMAINDER_BITS = [0, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0];

const ALIGNMENT = {
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

function dataCodewordCount(version) {
  return ECC_M[version].reduce((sum, g) => sum + g.count * g.data, 0);
}

function byteCapacity(version) {
  const bits = dataCodewordCount(version) * 8;
  const countBits = version <= 9 ? 8 : 16;
  return Math.floor((bits - 4 - countBits) / 8);
}

function chooseVersion(byteLength) {
  for (let v = 1; v <= 10; v += 1) {
    if (byteLength <= byteCapacity(v)) return v;
  }
  return 0;
}

function pushBits(bits, value, n) {
  for (let i = n - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
}

function encodeData(bytes, version) {
  const totalBits = dataCodewordCount(version) * 8;
  const countBits = version <= 9 ? 8 : 16;
  const bits = [];
  pushBits(bits, 0b0100, 4);
  pushBits(bits, bytes.length, countBits);
  for (const b of bytes) pushBits(bits, b, 8);
  const terminator = Math.min(4, totalBits - bits.length);
  for (let i = 0; i < terminator; i += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const pads = [0xec, 0x11];
  let p = 0;
  while (bits.length + 8 <= totalBits) {
    pushBits(bits, pads[p % 2], 8);
    p += 1;
  }
  while (bits.length < totalBits) bits.push(0);
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j += 1) v = (v << 1) | bits[i + j];
    codewords.push(v);
  }
  return codewords;
}

function interleave(data, version) {
  const groups = ECC_M[version];
  const blocks = [];
  let offset = 0;
  for (const g of groups) {
    for (let i = 0; i < g.count; i += 1) {
      const blockData = data.slice(offset, offset + g.data);
      offset += g.data;
      blocks.push({ data: blockData, ec: rsEncode(blockData, g.ec) });
    }
  }
  const out = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  const maxEc = Math.max(...blocks.map((b) => b.ec.length));
  for (let i = 0; i < maxData; i += 1) {
    for (const b of blocks) if (i < b.data.length) out.push(b.data[i]);
  }
  for (let i = 0; i < maxEc; i += 1) {
    for (const b of blocks) if (i < b.ec.length) out.push(b.ec[i]);
  }
  return out;
}

function moduleSize(version) {
  return 21 + 4 * (version - 1);
}

function inFinder(row, col, size) {
  const in7 = (r, c) => r >= 0 && r < 7 && c >= 0 && c < 7;
  return in7(row, col) || in7(row, col - (size - 7)) || in7(row - (size - 7), col);
}

function finderValue(r, c) {
  if (r === 0 || r === 6 || c === 0 || c === 6) return 1;
  if (r >= 2 && r <= 4 && c >= 2 && c <= 4) return 1;
  return 0;
}

function placeFinders(grid, size) {
  const origins = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ];
  for (const [or, oc] of origins) {
    for (let r = 0; r < 7; r += 1) {
      for (let c = 0; c < 7; c += 1) {
        grid[or + r][oc + c] = finderValue(r, c);
      }
    }
  }
}

function placeSeparators(grid, size) {
  const paintWhite = (r, c) => {
    if (r >= 0 && c >= 0 && r < size && c < size && grid[r][c] === null) grid[r][c] = 0;
  };
  for (let i = 0; i < 8; i += 1) {
    paintWhite(7, i);
    paintWhite(i, 7);
    paintWhite(7, size - 8 + i);
    paintWhite(i, size - 8);
    paintWhite(size - 8, i);
    paintWhite(size - 8 + i, 7);
  }
}

function placeTiming(grid, size) {
  for (let i = 8; i < size - 8; i += 1) {
    if (grid[6][i] === null) grid[6][i] = i % 2 === 0 ? 1 : 0;
    if (grid[i][6] === null) grid[i][6] = i % 2 === 0 ? 1 : 0;
  }
}

function placeAlignments(grid, version, size) {
  const pos = ALIGNMENT[version];
  if (!pos) return;
  for (const r of pos) {
    for (const c of pos) {
      if (inFinder(r, c, size)) continue;
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const rr = r + dr;
          const cc = c + dc;
          const edge = Math.abs(dr) === 2 || Math.abs(dc) === 2;
          const center = dr === 0 && dc === 0;
          grid[rr][cc] = edge || center ? 1 : 0;
        }
      }
    }
  }
}

function reserveFormat(grid, size) {
  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) {
      if (grid[8][i] === null) grid[8][i] = 0;
      if (grid[i][8] === null) grid[i][8] = 0;
    }
  }
  for (let i = 0; i < 8; i += 1) {
    if (grid[8][size - 1 - i] === null) grid[8][size - 1 - i] = 0;
    if (grid[size - 1 - i][8] === null) grid[size - 1 - i][8] = 0;
  }
  grid[size - 8][8] = 1;
}

function reserveVersion(grid, version, size) {
  if (version < 7) return;
  for (let i = 0; i < 6; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      grid[i][size - 11 + j] = 0;
      grid[size - 11 + j][i] = 0;
    }
  }
}

function formatBits(mask) {
  const data = (0b00 << 3) | mask;
  let d = data << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if ((d >>> i) & 1) d ^= 0x537 << (i - 10);
  }
  return ((data << 10) | (d & 0x3ff)) ^ 0x5412;
}

function versionBits(version) {
  let d = version << 12;
  for (let i = 17; i >= 12; i -= 1) {
    if ((d >>> i) & 1) d ^= 0x1f25 << (i - 12);
  }
  return (version << 12) | (d & 0xfff);
}

function placeFormat(grid, size, mask) {
  const bits = formatBits(mask);
  for (let i = 0; i < 15; i += 1) {
    const bit = (bits >> (14 - i)) & 1;
    if (i < 6) {
      grid[i][8] = bit;
      grid[8][size - 1 - i] = bit;
    } else if (i < 8) {
      grid[i + 1][8] = bit;
      grid[8][size - 1 - i] = bit;
    } else {
      grid[8][14 - i] = bit;
      grid[size - 15 + i][8] = bit;
    }
  }
  grid[8][7] = (bits >> 8) & 1;
  grid[7][8] = (bits >> 6) & 1;
  grid[size - 8][8] = 1;
}

function placeVersion(grid, version, size) {
  if (version < 7) return;
  const bits = versionBits(version);
  let k = 0;
  for (let c = 0; c < 6; c += 1) {
    for (let r = 0; r < 3; r += 1) {
      const bit = (bits >> k) & 1;
      grid[size - 11 + r][c] = bit;
      grid[c][size - 11 + r] = bit;
      k += 1;
    }
  }
}

function maskFn(mask, row, col) {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function isFunctionModule(row, col, size, version) {
  if (inFinder(row, col, size)) return true;
  if (row === 6 || col === 6) return true;
  if (row === 8 && (col <= 8 || col >= size - 8)) return true;
  if (col === 8 && (row <= 8 || row >= size - 8)) return true;
  const pos = ALIGNMENT[version];
  if (pos) {
    for (const r of pos) {
      for (const c of pos) {
        if (inFinder(r, c, size)) continue;
        if (Math.abs(row - r) <= 2 && Math.abs(col - c) <= 2) return true;
      }
    }
  }
  if (version >= 7) {
    if (row < 6 && col >= size - 11 && col < size - 8) return true;
    if (col < 6 && row >= size - 11 && row < size - 8) return true;
  }
  return false;
}

function placeData(grid, size, version, dataBits) {
  let bitIndex = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (let i = 0; i < size; i += 1) {
      const row = upward ? size - 1 - i : i;
      for (let dc = 0; dc < 2; dc += 1) {
        const c = col - dc;
        if (grid[row][c] !== null) continue;
        const bit = bitIndex < dataBits.length ? dataBits[bitIndex] : 0;
        grid[row][c] = bit;
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
}

function cloneGrid(grid) {
  return grid.map((row) => row.slice());
}

function applyMask(grid, size, version, mask) {
  const out = cloneGrid(grid);
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (isFunctionModule(r, c, size, version)) continue;
      if (maskFn(mask, r, c)) out[r][c] = out[r][c] ? 0 : 1;
    }
  }
  return out;
}

function penalty(grid, size) {
  let score = 0;
  for (let r = 0; r < size; r += 1) {
    let run = 1;
    for (let c = 1; c < size; c += 1) {
      if (grid[r][c] === grid[r][c - 1]) run += 1;
      else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) score += 3 + (run - 5);
  }
  for (let c = 0; c < size; c += 1) {
    let run = 1;
    for (let r = 1; r < size; r += 1) {
      if (grid[r][c] === grid[r - 1][c]) run += 1;
      else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) score += 3 + (run - 5);
  }
  for (let r = 0; r < size - 1; r += 1) {
    for (let c = 0; c < size - 1; c += 1) {
      const v = grid[r][c];
      if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) score += 3;
    }
  }
  const finderLike = (seq) => {
    const s = seq.join('');
    const n = (s.match(/00001011101|10111010000/g) || []).length;
    return n * 40;
  };
  for (let r = 0; r < size; r += 1) score += finderLike(grid[r]);
  for (let c = 0; c < size; c += 1) {
    const col = [];
    for (let r = 0; r < size; r += 1) col.push(grid[r][c]);
    score += finderLike(col);
  }
  let dark = 0;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) if (grid[r][c]) dark += 1;
  }
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;
  return score;
}

function toBitArray(codewords, remainder) {
  const bits = [];
  for (const cw of codewords) pushBits(bits, cw, 8);
  for (let i = 0; i < remainder; i += 1) bits.push(0);
  return bits;
}

function utf8Bytes(text) {
  return Array.from(new TextEncoder().encode(String(text || '')));
}

/**
 * Build a QR module matrix (0/1) for `text`. Returns null when the payload
 * is empty or longer than version-10 ECC-M byte capacity.
 *
 * @param {string} text
 * @returns {{ version: number, size: number, modules: number[][] } | null}
 */
export function encodeQrMatrix(text) {
  const bytes = utf8Bytes(text);
  if (!bytes.length) return null;
  const version = chooseVersion(bytes.length);
  if (!version) return null;
  const data = encodeData(bytes, version);
  const interleaved = interleave(data, version);
  const bits = toBitArray(interleaved, REMAINDER_BITS[version] || 0);
  const size = moduleSize(version);
  const reserved = Array.from({ length: size }, () => new Array(size).fill(null));
  placeFinders(reserved, size);
  placeSeparators(reserved, size);
  placeAlignments(reserved, version, size);
  placeTiming(reserved, size);
  reserveFormat(reserved, size);
  reserveVersion(reserved, version, size);
  const dataGrid = cloneGrid(reserved);
  placeData(dataGrid, size, version, bits);
  let best = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    const masked = applyMask(dataGrid, size, version, mask);
    placeFormat(masked, size, mask);
    placeVersion(masked, version, size);
    const score = penalty(masked, size);
    if (score < bestScore) {
      bestScore = score;
      best = masked;
    }
  }
  return { version, size, modules: best };
}

/**
 * Render a QR SVG for `text`. Quiet zone is 4 modules. Returns empty string
 * when the payload cannot be encoded locally.
 *
 * @param {string} text
 * @param {{ label?: string }} [opts]
 * @returns {string}
 */
export function encodeQrSvg(text, opts = {}) {
  const encoded = encodeQrMatrix(text);
  if (!encoded) return '';
  const quiet = 4;
  const dim = encoded.size + quiet * 2;
  const label = String(opts.label || 'QR code').replace(/[<>&"]/g, '');
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" role="img" aria-label="${label}">`,
    `<rect width="${dim}" height="${dim}" fill="#ffffff"/>`,
  ];
  const d = [];
  for (let r = 0; r < encoded.size; r += 1) {
    for (let c = 0; c < encoded.size; c += 1) {
      if (encoded.modules[r][c]) d.push(`M${c + quiet} ${r + quiet}h1v1h-1z`);
    }
  }
  parts.push(`<path fill="#111111" d="${d.join('')}"/>`);
  parts.push('</svg>');
  return parts.join('');
}

export function qrByteCapacity(version) {
  return byteCapacity(version);
}

export const QR_MAX_VERSION = 10;
export const QR_ECC_LEVEL = 'M';
export const QR_USES_EXTERNAL_SERVICE = false;
