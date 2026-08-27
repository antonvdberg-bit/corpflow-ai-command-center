/**
 * Small Frappe REST client for standard DocType API calls (#1009 WP1).
 *
 * Token auth only: ERPNEXT_API_KEY / ERPNEXT_API_SECRET.
 * Never logs secret values, Authorization headers, or raw env.
 * Not a general integration framework — WP2 (#1018) reuses this client; WP3–WP5 may too.
 */

const DEFAULT_TIMEOUT_MS = 45000;
const SECRETISH =
  /token\s+[A-Za-z0-9_\-:]{8,}|ERPNEXT_API_(?:KEY|SECRET)\s*[:=]\s*\S+|POSTGRES_URL\s*[:=]\s*\S+|eyJhbGci[A-Za-z0-9._\-]+/gi;

/**
 * @param {unknown} value
 * @param {number} [max]
 * @returns {string}
 */
export function redactText(value, max = 240) {
  let text = value == null ? '' : String(value);
  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(SECRETISH, '[redacted]');
  text = text.replace(/https?:\/\/[^\s"'\\]+/gi, '[url]');
  text = text.replace(/[A-Za-z0-9_\-]{24,}/g, '***');
  return text.slice(0, max);
}

function asTrimmed(v) {
  return v == null ? '' : String(v).trim();
}

function encodeDoc(name) {
  return encodeURIComponent(asTrimmed(name));
}

function buildListPath(doctype, { fields, filters, limit } = {}) {
  const params = new URLSearchParams();
  params.set('limit_page_length', String(limit && Number(limit) > 0 ? Number(limit) : 50));
  if (Array.isArray(fields) && fields.length) {
    params.set('fields', JSON.stringify(fields));
  }
  if (Array.isArray(filters) && filters.length) {
    params.set('filters', JSON.stringify(filters));
  }
  return `/api/resource/${encodeDoc(doctype)}?${params.toString()}`;
}

function parseBody(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: redactText(text) };
  }
}

/**
 * @param {{
 *   baseUrl: string,
 *   apiKey: string,
 *   apiSecret: string,
 *   fetchImpl?: typeof fetch,
 *   timeoutMs?: number,
 * }} opts
 */
export function createFrappeRestClient(opts) {
  const baseUrl = asTrimmed(opts?.baseUrl).replace(/\/+$/, '');
  const apiKey = asTrimmed(opts?.apiKey);
  const apiSecret = asTrimmed(opts?.apiSecret);
  const fetchImpl = opts?.fetchImpl || globalThis.fetch;
  const timeoutMs = Number(opts?.timeoutMs) > 0 ? Number(opts.timeoutMs) : DEFAULT_TIMEOUT_MS;

  if (!baseUrl || !apiKey || !apiSecret) {
    throw new Error('FRAPPE_CLIENT_MISSING_CREDENTIAL_NAMES');
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('FRAPPE_CLIENT_MISSING_FETCH');
  }

  async function request(method, path, payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = {
        Authorization: `token ${apiKey}:${apiSecret}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };
      const init = { method, headers, signal: controller.signal };
      if (payload !== undefined) init.body = JSON.stringify(payload);
      const res = await fetchImpl(`${baseUrl}${path}`, init);
      const text = await res.text();
      const parsed = parseBody(text);
      const http = Number(res.status) || 0;
      const data = parsed && typeof parsed === 'object' ? parsed : {};
      if (http >= 200 && http < 300) {
        return { ok: true, http, data, error: null };
      }
      return {
        ok: false,
        http,
        data,
        error: redactText(data.exc_type || data.exception || data._error_message || data._server_messages || `HTTP_${http}`),
      };
    } catch (err) {
      const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : 'Error';
      return {
        ok: false,
        http: 0,
        data: {},
        error: name === 'AbortError' ? 'TIMEOUT' : redactText(name),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    kind: 'frappe-rest',
    async getLoggedUser() {
      const result = await request('GET', '/api/method/frappe.auth.get_logged_user');
      const user = result.ok && result.data && typeof result.data === 'object' ? asTrimmed(result.data.message) : '';
      return { ...result, user };
    },
    async list(doctype, options = {}) {
      const result = await request('GET', buildListPath(doctype, options));
      const rows =
        result.ok && result.data && Array.isArray(result.data.data) ? result.data.data : [];
      return { ...result, rows };
    },
    async get(doctype, name) {
      const result = await request('GET', `/api/resource/${encodeDoc(doctype)}/${encodeDoc(name)}`);
      const row =
        result.ok && result.data && result.data.data && typeof result.data.data === 'object'
          ? result.data.data
          : null;
      return { ...result, row };
    },
    async create(doctype, payload) {
      const result = await request('POST', `/api/resource/${encodeDoc(doctype)}`, payload);
      const row =
        result.ok && result.data && result.data.data && typeof result.data.data === 'object'
          ? result.data.data
          : null;
      return { ...result, row };
    },
    async update(doctype, name, payload) {
      const result = await request('PUT', `/api/resource/${encodeDoc(doctype)}/${encodeDoc(name)}`, payload);
      const row =
        result.ok && result.data && result.data.data && typeof result.data.data === 'object'
          ? result.data.data
          : null;
      return { ...result, row };
    },
    /**
     * Standard Frappe print PDF. Binary GET only. Never logs bytes or secrets.
     * Selling/quote-to-cash (#1056/#1166) and Commercial quotation evidence (#1160) reuse this.
     */
    async downloadPdf(doctype, name, printFormat = 'Standard') {
      const params = new URLSearchParams({
        doctype: asTrimmed(doctype),
        name: asTrimmed(name),
        format: asTrimmed(printFormat) || 'Standard',
        no_letterhead: '0',
      });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetchImpl(
          `${baseUrl}/api/method/frappe.utils.print_format.download_pdf?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              Authorization: `token ${apiKey}:${apiSecret}`,
              Accept: 'application/pdf',
            },
            signal: controller.signal,
          },
        );
        const http = Number(res.status) || 0;
        const contentType = asTrimmed(res.headers.get('content-type'));
        const bytes = Buffer.from(await res.arrayBuffer());
        const isPdf = bytes.length >= 5 && bytes.subarray(0, 5).toString('utf8') === '%PDF-';
        if (http >= 200 && http < 300 && isPdf) {
          return { ok: true, http, bytes, contentType, isPdf: true, error: null };
        }
        const errText = isPdf ? `HTTP_${http}` : redactText(bytes.toString('utf8').slice(0, 240));
        return { ok: false, http, bytes: Buffer.alloc(0), contentType, isPdf: false, error: errText };
      } catch (err) {
        const errName = err && typeof err === 'object' && 'name' in err ? String(err.name) : 'Error';
        return {
          ok: false,
          http: 0,
          bytes: Buffer.alloc(0),
          contentType: '',
          isPdf: false,
          error: errName === 'AbortError' ? 'TIMEOUT' : redactText(errName),
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {boolean}
 */
export function frappeCredentialsPresent(env = process.env) {
  return Boolean(
    asTrimmed(env?.ERPNEXT_BASE_URL) && asTrimmed(env?.ERPNEXT_API_KEY) && asTrimmed(env?.ERPNEXT_API_SECRET),
  );
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function frappeClientFromEnv(env = process.env) {
  return createFrappeRestClient({
    baseUrl: env.ERPNEXT_BASE_URL,
    apiKey: env.ERPNEXT_API_KEY,
    apiSecret: env.ERPNEXT_API_SECRET,
  });
}

/**
 * GET/read-only helper. Never invents credentials. Returns null when names are absent.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function tryFrappeClientFromEnv(env = process.env) {
  if (!frappeCredentialsPresent(env)) return null;
  try {
    return frappeClientFromEnv(env);
  } catch {
    return null;
  }
}
