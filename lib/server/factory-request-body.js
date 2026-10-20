/**
 * Body handling for the single Pages API function `api/factory_router.js`.
 *
 * Vercel serves that file as one Node function. With the default Next.js
 * body parser enabled, `apiResolver` reads the request stream and replaces it
 * with a parsed value before this handler runs. Paddle verifies
 * `Paddle-Signature` against the exact original bytes, so a parsed object
 * cannot be turned back into a valid payload.
 *
 * The router sets `bodyParser: false` so the stream stays intact. This module
 * then keeps those bytes on `req.rawBody` for `paddle/webhook` only, and
 * parses every other route the same way Next's `parseBody` does. It never
 * rebuilds a Paddle body with `JSON.stringify(req.body)`.
 */
import querystring from 'node:querystring';

export const FACTORY_REQUEST_BODY_LIMIT = '1mb';
export const FACTORY_REQUEST_BODY_LIMIT_BYTES = 1024 * 1024;
export const PADDLE_WEBHOOK_PATH = 'paddle/webhook';

function isReadableStream(req) {
  if (!req || typeof req[Symbol.asyncIterator] !== 'function') return false;
  if (req.readable === false) return false;
  if (req.readableEnded === true) return false;
  return true;
}

function contentTypeOf(header) {
  const value = Array.isArray(header) ? header[0] : header;
  const raw = value == null || String(value).trim() === '' ? 'text/plain' : String(value);
  const [typePart, ...params] = raw.split(';');
  const type = typePart.trim().toLowerCase();
  if (!type.includes('/')) return { type: 'text/plain', charset: 'utf-8' };
  let charset = 'utf-8';
  for (const param of params) {
    const eq = param.indexOf('=');
    if (eq < 0) continue;
    const key = param.slice(0, eq).trim().toLowerCase();
    let paramValue = param.slice(eq + 1).trim();
    if (paramValue.startsWith('"') && paramValue.endsWith('"') && paramValue.length >= 2) {
      paramValue = paramValue.slice(1, -1);
    }
    if (key === 'charset' && paramValue) charset = paramValue.toLowerCase();
  }
  return { type, charset };
}

/**
 * Match Next.js `parseBody` once the raw bytes are already in hand.
 *
 * @param {Buffer} rawBuffer
 * @param {string | string[] | undefined} contentTypeHeader
 * @returns {unknown}
 */
export function parsePreservedRequestBody(rawBuffer, contentTypeHeader) {
  const { type, charset } = contentTypeOf(contentTypeHeader);
  let text;
  try {
    text = rawBuffer.toString(charset);
  } catch {
    const error = new Error('Invalid body');
    error.statusCode = 400;
    throw error;
  }
  if (type === 'application/json' || type === 'application/ld+json') {
    if (text.length === 0) return {};
    try {
      return JSON.parse(text);
    } catch {
      const error = new Error('Invalid JSON');
      error.statusCode = 400;
      throw error;
    }
  }
  if (type === 'application/x-www-form-urlencoded') {
    return querystring.decode(text);
  }
  return text;
}

async function readLimitedRawBuffer(req) {
  const chunks = [];
  let total = 0;
  try {
    for await (const chunk of req) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buf.length;
      if (total > FACTORY_REQUEST_BODY_LIMIT_BYTES) {
        return {
          ok: false,
          statusCode: 413,
          message: `Body exceeded ${FACTORY_REQUEST_BODY_LIMIT} limit`,
        };
      }
      chunks.push(buf);
    }
  } catch {
    return { ok: false, statusCode: 400, message: 'Invalid body' };
  }
  return { ok: true, raw: Buffer.concat(chunks) };
}

/**
 * @param {import('http').IncomingMessage & { body?: unknown, rawBody?: string | Buffer, headers?: Record<string, string | string[] | undefined> }} req
 * @param {string} pathSeg
 * @returns {Promise<{ ok: true } | { ok: false, statusCode: number, message: string }>}
 */
export async function preserveFactoryRequestBody(req, pathSeg) {
  if (pathSeg === PADDLE_WEBHOOK_PATH) {
    if (typeof req.rawBody === 'string' || Buffer.isBuffer(req.rawBody)) return { ok: true };
    if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
      req.rawBody = req.body;
      return { ok: true };
    }
    if (!isReadableStream(req)) return { ok: true };
    const read = await readLimitedRawBuffer(req);
    if (!read.ok) return read;
    req.rawBody = read.raw;
    return { ok: true };
  }

  if (req.body) return { ok: true };
  if (!isReadableStream(req)) return { ok: true };
  const read = await readLimitedRawBuffer(req);
  if (!read.ok) return read;
  try {
    req.body = parsePreservedRequestBody(read.raw, req.headers?.['content-type']);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      statusCode: error.statusCode || 400,
      message: error.message || 'Invalid body',
    };
  }
}
