/**
 * Zero-dependency image dimension probe for buffers stored in cmp_ticket_attachments.
 * Supports PNG, JPEG, GIF; partial WebP (VP8 / VP8L / VP8X).
 *
 * @param {Buffer} buf
 * @returns {{ width: number, height: number, format: string } | null}
 */
export function probeImageDimensions(buf) {
  if (!buf || buf.length < 24) return null;

  // PNG — IHDR at offset 16
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    if (buf.length < 24) return null;
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    if (w > 0 && w < 65536 && h > 0 && h < 65536) return { width: w, height: h, format: 'png' };
    return null;
  }

  // GIF
  const head3 = buf.slice(0, 3).toString('ascii');
  if (head3 === 'GIF') {
    if (buf.length < 10) return null;
    const w = buf.readUInt16LE(6);
    const h = buf.readUInt16LE(8);
    if (w > 0 && h > 0) return { width: w, height: h, format: 'gif' };
    return null;
  }

  // JPEG — find SOF0–SOF15 (except markers without dimensions)
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2;
    let guard = 0;
    while (o + 9 < buf.length && guard++ < 4000) {
      if (buf[o] !== 0xff) {
        o++;
        continue;
      }
      const marker = buf[o + 1];
      if (marker === 0xd8 || marker === 0xd9) {
        o += 2;
        continue;
      }
      if (o + 4 > buf.length) break;
      const segLen = buf.readUInt16BE(o + 2);
      if (segLen < 2 || o + 2 + segLen > buf.length) break;
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const h = buf.readUInt16BE(o + 5);
        const w = buf.readUInt16BE(o + 7);
        if (w > 0 && h > 0) return { width: w, height: h, format: 'jpeg' };
      }
      o += 2 + segLen;
    }
    return null;
  }

  // WebP — prefer VP8X canvas (lossless/lossy containers)
  if (buf.length >= 30 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') {
    let p = 12;
    while (p + 8 <= buf.length) {
      const tag = buf.slice(p, p + 4).toString('ascii');
      const chunkSize = buf.readUInt32LE(p + 4);
      const chunkDataOff = p + 8;
      const pad = chunkSize % 2;
      const next = chunkDataOff + chunkSize + pad;
      if (tag === 'VP8X' && chunkDataOff + 10 <= buf.length) {
        const w = 1 + buf.readUIntLE(chunkDataOff + 4, 3);
        const h = 1 + buf.readUIntLE(chunkDataOff + 7, 3);
        if (w > 0 && h > 0 && w < 65536 && h < 65536) return { width: w, height: h, format: 'webp' };
      }
      if (next <= p || next > buf.length) break;
      p = next;
    }
  }

  return null;
}
