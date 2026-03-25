/**
 * Thin Baserow REST client for CMP ticket (row) CRUD.
 * @see https://baserow.io/user-docs/database-api
 */

const DEFAULT_BASE_URL = 'https://crm.corpflowai.com';

/**
 * @typedef {Object} BaserowClientOptions
 * @property {string} [baseUrl]
 * @property {string} token
 * @property {string} [defaultTableId] - CMP Change Requests table; can override per call
 */

export class BaserowError extends Error {
  /**
   * @param {string} message
   * @param {number} [status]
   * @param {unknown} [body]
   */
  constructor(message, status, body) {
    super(message);
    this.name = 'BaserowError';
    this.status = status;
    this.body = body;
  }
}

/**
 * @param {BaserowClientOptions} options
 */
export function createBaserowClient(options) {
  const baseUrl = (options.baseUrl || process.env.BASEROW_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  const token = options.token || process.env.BASEROW_TOKEN;
  const tenantId = options.tenantId || process.env.TENANT_ID || null;
  const tenantFieldName =
    options.tenantFieldName ||
    process.env.BASEROW_TENANT_ID_FIELD ||
    'tenant_id';
  if (!token) {
    throw new BaserowError('BASEROW_TOKEN is not configured');
  }

  const defaultTableId =
    options.defaultTableId ||
    process.env.BASEROW_CMP_TABLE_ID ||
    process.env.BASEROW_TABLE_ID ||
    null;

  /**
   * @param {string} path - path starting with /api/
   * @param {RequestInit} [init]
   */
  async function request(path, init = {}) {
    const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    };
    const res = await fetch(url, { ...init, headers });
    const text = await res.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    if (!res.ok) {
      const msg =
        typeof body === 'object' && body !== null && 'error' in body
          ? String(body.error)
          : `Baserow request failed: ${res.status}`;
      throw new BaserowError(msg, res.status, body);
    }
    return body;
  }

  /**
   * @param {string} [tableId]
   */
  function resolveTableId(tableId) {
    const id = tableId || defaultTableId;
    if (!id) {
      throw new BaserowError('No table id: set BASEROW_CMP_TABLE_ID or pass tableId');
    }
    return String(id);
  }

  /**
   * @param {object} [query] - e.g. { page: 1, size: 100, user_field_names: 'true' }
   */
  function buildQueryString(query) {
    if (!query || Object.keys(query).length === 0) return '';
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      params.set(k, String(v));
    }
    const s = params.toString();
    return s ? `?${s}` : '';
  }

  return {
    baseUrl,

    /**
     * @param {string} tableId
     * @param {Record<string, string | number | boolean>} [query]
     */
    async listRows(tableId, query = {}) {
      const id = resolveTableId(tableId);
      if (query && query._allow_select_all) {
        throw new BaserowError('Tenant isolation: select-all capability is disabled for client assistants.');
      }

      const tenantKey = `filter__${tenantFieldName}__equal`;
      const q = { user_field_names: 'true', ...query };

      const tenantExpected = tenantId != null ? String(tenantId) : '';
      const tenantProvided = q[tenantKey] != null ? String(q[tenantKey]) : '';

      if (!tenantExpected) {
        throw new BaserowError(
          'Tenant isolation: missing TENANT_ID (or options.tenantId) for listRows().'
        );
      }

      if (!tenantProvided) {
        // Append tenant filter automatically to prevent “select all”.
        q[tenantKey] = tenantExpected;
      } else if (tenantProvided !== tenantExpected) {
        throw new BaserowError(
          `Tenant isolation: tenant filter mismatch (expected ${tenantExpected}, got ${tenantProvided}).`
        );
      }

      return request(`/api/database/rows/table/${id}/${buildQueryString(q)}`, { method: 'GET' });
    },

    /**
     * @param {string} tableId
     * @param {string|number} rowId
     */
    async getRow(tableId, rowId) {
      const id = resolveTableId(tableId);
      const row = await request(
        `/api/database/rows/table/${id}/${rowId}/${buildQueryString({ user_field_names: 'true' })}`,
        { method: 'GET' },
      );
      // Best-effort tenant mismatch validation when tenant field exists in the row.
      if (tenantId != null && row && typeof row === 'object') {
        const v = row[tenantFieldName];
        if (v != null && String(v) !== String(tenantId)) {
          throw new BaserowError('Tenant mismatch for getRow()');
        }
      }
      return row;
    },

    /**
     * @param {string} tableId
     * @param {Record<string, unknown>} fields - field names when user_field_names is used
     */
    async createRow(tableId, fields) {
      const id = resolveTableId(tableId);
      return request(`/api/database/rows/table/${id}/${buildQueryString({ user_field_names: 'true' })}`, {
        method: 'POST',
        body: JSON.stringify(fields),
      });
    },

    /**
     * @param {string} tableId
     * @param {string|number} rowId
     * @param {Record<string, unknown>} fields
     */
    async updateRow(tableId, rowId, fields) {
      const id = resolveTableId(tableId);
      return request(
        `/api/database/rows/table/${id}/${rowId}/${buildQueryString({ user_field_names: 'true' })}`,
        {
          method: 'PATCH',
          body: JSON.stringify(fields),
        },
      );
    },

    /**
     * @param {string} tableId
     * @param {string|number} rowId
     */
    async deleteRow(tableId, rowId) {
      const id = resolveTableId(tableId);
      return request(`/api/database/rows/table/${id}/${rowId}/`, { method: 'DELETE' });
    },
  };
}
