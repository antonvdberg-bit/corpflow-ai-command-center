import { cfg } from './runtime-config.js';
import { verifyFactoryMasterAuth } from './factory-master-auth.js';

function json(res, status, body) {
  res.status(status).json(body);
}

function baserowBaseUrl() {
  return String(cfg('BASEROW_URL', 'https://api.baserow.io')).replace(/\/$/, '');
}

function baserowToken() {
  return String(cfg('BASEROW_TOKEN', '')).trim();
}

function baserowCmpTableId() {
  return String(cfg('BASEROW_CMP_TABLE_ID', '') || cfg('BASEROW_TABLE_ID', '')).trim();
}

function consoleFieldName() {
  return String(cfg('BASEROW_CMP_CONSOLE_JSON_FIELD', 'console_json')).trim() || 'console_json';
}

async function fetchJsonWithTimeout(url, init, ms) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Ensure the CMP table has the Change Console persistence field.
 * Factory-master only; safe to call repeatedly (idempotent).
 *
 * Route: POST /api/factory/baserow/ensure-console-field
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  if (!verifyFactoryMasterAuth(req)) {
    return json(res, 403, { error: 'Factory master authentication required.' });
  }

  const baseUrl = baserowBaseUrl();
  const token = baserowToken();
  const tableId = baserowCmpTableId();
  const fieldName = consoleFieldName();

  if (!token || !tableId) {
    return json(res, 503, {
      error: 'BASEROW_CONFIG_MISSING',
      hint: 'Set BASEROW_TOKEN and BASEROW_CMP_TABLE_ID (or BASEROW_TABLE_ID).',
      missing: {
        BASEROW_TOKEN: !token,
        BASEROW_CMP_TABLE_ID: !tableId,
      },
    });
  }

  const headers = {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };

  const listUrl = `${baseUrl}/api/database/fields/table/${encodeURIComponent(tableId)}/`;
  const list = await fetchJsonWithTimeout(listUrl, { method: 'GET', headers }, 5000);
  if (!list.ok) {
    return json(res, list.status >= 400 && list.status < 600 ? list.status : 502, {
      error: 'BASEROW_LIST_FIELDS_FAILED',
      detail: list.body,
      url: listUrl,
    });
  }

  const fields = Array.isArray(list.body) ? list.body : [];
  const existing = fields.find((f) => String(f?.name || '').trim() === fieldName) || null;
  if (existing) {
    return json(res, 200, {
      ok: true,
      created: false,
      table_id: tableId,
      field_name: fieldName,
      field: { id: existing.id, name: existing.name, type: existing.type },
    });
  }

  const createUrl = listUrl;
  const payload = { name: fieldName, type: 'long_text' };
  const created = await fetchJsonWithTimeout(
    createUrl,
    { method: 'POST', headers, body: JSON.stringify(payload) },
    7000,
  );
  if (!created.ok) {
    return json(res, created.status >= 400 && created.status < 600 ? created.status : 502, {
      error: 'BASEROW_CREATE_FIELD_FAILED',
      detail: created.body,
      url: createUrl,
      payload,
    });
  }

  return json(res, 200, {
    ok: true,
    created: true,
    table_id: tableId,
    field_name: fieldName,
    field: created.body,
  });
}

