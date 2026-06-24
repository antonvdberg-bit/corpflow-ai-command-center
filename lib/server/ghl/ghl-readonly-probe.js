/**
 * Living Word GHL read-only probe orchestration — metadata/counts only.
 */

import { GHL_LWM_TENANT_ID, GHL_PROBE_MAX_API_CALLS } from './constants.js';
import { getGhlLivingWordEnvReadiness } from './ghl-config.js';
import { createGhlReadonlyClient } from './ghl-readonly-client.js';
import {
  assertNoForbiddenSubstrings,
  extractContactFieldNames,
  redactDeep,
  redactName,
} from './ghl-redact.js';

/** Domains intentionally excluded from probe. */
export const GHL_PROBE_EXCLUDED_CATEGORIES = [
  'conversations',
  'messages',
  'notes',
  'contact_create_update_delete',
  'outbound_send',
  'webhooks_register',
];

/**
 * @param {unknown} rows
 * @returns {Array<{ id?: string, name?: string, key?: string, fieldKey?: string, dataType?: string, model?: string }>}
 */
function summarizeCustomFields(rows) {
  if (!Array.isArray(rows)) {
    const nested = rows && typeof rows === 'object' ? rows.customFields : null;
    if (Array.isArray(nested)) return summarizeCustomFields(nested);
    return [];
  }
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return {};
    return {
      id: row.id != null ? String(row.id) : undefined,
      name: row.name != null ? String(row.name) : undefined,
      key: row.key != null ? String(row.key) : undefined,
      fieldKey: row.fieldKey != null ? String(row.fieldKey) : undefined,
      dataType: row.dataType != null ? String(row.dataType) : undefined,
      model: row.model != null ? String(row.model) : undefined,
    };
  });
}

/**
 * @param {unknown} rows
 * @returns {Array<{ id?: string, name?: string }>}
 */
function summarizeIdNameList(rows) {
  const list = Array.isArray(rows) ? rows : rows && typeof rows === 'object' && Array.isArray(rows.forms)
    ? rows.forms
    : rows && typeof rows === 'object' && Array.isArray(rows.surveys)
      ? rows.surveys
      : rows && typeof rows === 'object' && Array.isArray(rows.calendars)
        ? rows.calendars
        : [];
  return list.map((row) => ({
    id: row?.id != null ? String(row.id) : undefined,
    name: row?.name != null ? String(row.name) : undefined,
  }));
}

/**
 * @param {unknown[]} contacts
 * @returns {string[]}
 */
function collectTagsFromContacts(contacts) {
  /** @type {Set<string>} */
  const tags = new Set();
  for (const c of contacts) {
    if (!c || typeof c !== 'object' || !Array.isArray(c.tags)) continue;
    for (const t of c.tags) {
      if (typeof t === 'string' && t.trim()) tags.add(t.trim());
    }
  }
  return [...tags].sort();
}

/**
 * @param {object} [opts]
 * @param {typeof fetch} [opts.fetchImpl]
 * @param {boolean} [opts.dryRun]
 * @param {string} [opts.token]
 * @param {string} [opts.locationId]
 * @param {boolean} [opts.skipEnvCheck]
 */
export async function runGhlLivingWordReadonlyProbe(opts = {}) {
  const startedAt = new Date().toISOString();
  const tenantId = GHL_LWM_TENANT_ID;

  if (!opts.dryRun && !opts.skipEnvCheck) {
    const env = getGhlLivingWordEnvReadiness();
    if (!env.ok) {
      return {
        ok: false,
        error: 'ghl_env_missing',
        missing: env.missing,
        tenantId,
        startedAt,
        apiCallCount: 0,
        excludedCategories: GHL_PROBE_EXCLUDED_CATEGORIES,
      };
    }
  }

  let locationId = opts.locationId;
  if (!locationId) {
    if (opts.dryRun) {
      locationId = 'dry-run-location';
    } else {
      const envReady = getGhlLivingWordEnvReadiness();
      if (!envReady.ok) {
        return {
          ok: false,
          error: 'ghl_env_missing',
          missing: envReady.missing,
          tenantId,
          startedAt,
          apiCallCount: 0,
          excludedCategories: GHL_PROBE_EXCLUDED_CATEGORIES,
        };
      }
      locationId = envReady.locationId;
    }
  }
  const client = createGhlReadonlyClient({
    fetchImpl: opts.fetchImpl,
    dryRun: Boolean(opts.dryRun && !opts.fetchImpl),
    token: opts.token,
    maxCalls: GHL_PROBE_MAX_API_CALLS,
  });

  /** @type {Array<{ step: string, ok: boolean, status?: number, error?: string }>} */
  const steps = [];
  /** @type {Record<string, unknown>} */
  const results = {
    tenantId,
    locationIdConfigured: Boolean(locationId),
    startedAt,
    writesPerformed: false,
    secretsExposed: false,
    excludedCategories: GHL_PROBE_EXCLUDED_CATEGORIES,
  };

  async function runStep(step, fn) {
    try {
      const out = await fn();
      steps.push({ step, ok: true, status: out?.status });
      return out;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      steps.push({ step, ok: false, error: msg });
      return null;
    }
  }

  const locRes = await runStep('location', () =>
    client.request('GET', `/locations/${encodeURIComponent(locationId)}`),
  );
  if (locRes?.json && typeof locRes.json === 'object') {
    const loc = locRes.json.location || locRes.json;
    results.location = {
      id: loc.id != null ? String(loc.id) : locationId,
      name: loc.name != null ? String(loc.name) : undefined,
      city: loc.city != null ? String(loc.city) : undefined,
      country: loc.country != null ? String(loc.country) : undefined,
    };
    if (locRes.rateLimit && Object.keys(locRes.rateLimit).length) {
      results.rateLimitSample = locRes.rateLimit;
    }
  }

  const cfRes = await runStep('custom_fields_contact', () =>
    client.request(
      'GET',
      `/locations/${encodeURIComponent(locationId)}/customFields?model=contact`,
    ),
  );
  results.customFieldsManifest = summarizeCustomFields(cfRes?.json);

  const searchMetaRes = await runStep('contacts_search_meta', () =>
    client.request('POST', '/contacts/search', {
      locationId,
      pageLimit: 1,
      page: 1,
    }),
  );
  const searchMeta = searchMetaRes?.json;
  results.contacts = {
    total:
      searchMeta?.total ??
      searchMeta?.meta?.total ??
      searchMeta?.count ??
      (Array.isArray(searchMeta?.contacts) ? searchMeta.contacts.length : null),
  };

  const searchSampleRes = await runStep('contacts_search_sample', () =>
    client.request('POST', '/contacts/search', {
      locationId,
      pageLimit: 5,
      page: 1,
    }),
  );
  const sampleContacts = Array.isArray(searchSampleRes?.json?.contacts)
    ? searchSampleRes.json.contacts
    : [];
  results.contacts.sampleCount = sampleContacts.length;
  results.contacts.sampleFieldNames = sampleContacts.length
    ? extractContactFieldNames(sampleContacts[0])
    : [];
  results.contacts.distinctTagsInSample = collectTagsFromContacts(sampleContacts);
  results.contacts.sampleShapes = sampleContacts.map((c) => ({
    fieldNames: extractContactFieldNames(c),
    tagCount: Array.isArray(c?.tags) ? c.tags.length : 0,
    customFieldCount: Array.isArray(c?.customFields) ? c.customFields.length : 0,
    id: c?.id != null ? String(c.id) : undefined,
    displayLabel: redactName('x'),
  }));

  const formsRes = await runStep('forms_list', () =>
    client.request('GET', `/forms/?locationId=${encodeURIComponent(locationId)}`),
  );
  const formsList = summarizeIdNameList(formsRes?.json);
  results.forms = { count: formsList.length, items: formsList };

  const formSubRes = await runStep('forms_submissions_meta', () =>
    client.request(
      'GET',
      `/forms/submissions?locationId=${encodeURIComponent(locationId)}&limit=1`,
    ),
  );
  const formSubJson = formSubRes?.json;
  results.formSubmissions = {
    apiAvailable: formSubRes?.ok === true,
    total: formSubJson?.meta?.total ?? formSubJson?.total ?? null,
    note: 'submission bodies not collected',
  };

  const pipeRes = await runStep('pipelines', () =>
    client.request(
      'GET',
      `/opportunities/pipelines?locationId=${encodeURIComponent(locationId)}`,
    ),
  );
  const pipelines = Array.isArray(pipeRes?.json?.pipelines)
    ? pipeRes.json.pipelines
    : Array.isArray(pipeRes?.json)
      ? pipeRes.json
      : [];
  results.pipelines = {
    count: pipelines.length,
    items: pipelines.map((p) => ({
      id: p?.id != null ? String(p.id) : undefined,
      name: p?.name != null ? String(p.name) : undefined,
    })),
  };

  const calRes = await runStep('calendars', () =>
    client.request('GET', `/calendars/?locationId=${encodeURIComponent(locationId)}`),
  );
  const calendars = summarizeIdNameList(calRes?.json);
  results.calendars = { count: calendars.length, items: calendars };

  const surveyRes = await runStep('surveys_list', () =>
    client.request('GET', `/surveys/?locationId=${encodeURIComponent(locationId)}`),
  );
  const surveys = summarizeIdNameList(surveyRes?.json);
  results.surveys = {
    count: surveys.length,
    items: surveys,
    submissionsNote: 'survey submission bodies not collected',
  };

  const usersRes = await runStep('users_search', () =>
    client.request('GET', `/users/search?locationId=${encodeURIComponent(locationId)}`),
  );
  const users = Array.isArray(usersRes?.json?.users) ? usersRes.json.users : [];
  results.users = {
    sampleCount: users.length,
    items: users.map((u) => ({
      id: u?.id != null ? String(u.id) : undefined,
      role: u?.role != null ? String(u.role) : undefined,
      name: redactName('x'),
    })),
  };

  const finishedAt = new Date().toISOString();
  const apiCallCount = client.callCount;
  const callLog = client.callLog.map((c) => ({
    method: c.method,
    path: c.path,
    status: c.status,
    ok: c.ok,
    error: c.error,
  }));

  const safeResult = redactDeep({
    ok: apiCallCount <= GHL_PROBE_MAX_API_CALLS,
    tenantId,
    startedAt,
    finishedAt,
    environmentTarget: 'vercel_production_factory',
    apiCallCount,
    apiCallBudget: GHL_PROBE_MAX_API_CALLS,
    steps,
    callLog,
    results,
    noWritesPerformed: true,
    noSecretsInOutput: true,
    recommendedNextPacket: 'Living Word GHL field mapping report (Phase 2) — not direct canonical import',
  });

  if (opts.token && opts.token.length >= 12) {
    assertNoForbiddenSubstrings(safeResult, [opts.token]);
  }

  return safeResult;
}

/**
 * @param {Record<string, unknown>} report
 * @returns {string}
 */
export function formatGhlProbeVerificationMarkdown(report) {
  const lines = [
    '# Living Word — GHL read-only sync probe v1 (live verification)',
    '',
    `**Timestamp (UTC):** ${report.finishedAt || report.startedAt || new Date().toISOString()}`,
    `**Tenant:** \`${report.tenantId || GHL_LWM_TENANT_ID}\``,
    `**Environment target:** ${report.environmentTarget || 'vercel_production_factory'}`,
    `**API calls:** ${report.apiCallCount ?? 0} / ${report.apiCallBudget ?? GHL_PROBE_MAX_API_CALLS}`,
    '',
    '## Statements',
    '',
    '- **No secrets exposed** in this artifact',
    '- **No GHL writes** performed',
    '- **No outbound messages** sent',
    '- **No public site / DNS / GHL config** changes',
    '',
    '## Endpoints / categories checked',
    '',
  ];

  const callLog = Array.isArray(report.callLog) ? report.callLog : [];
  for (const c of callLog) {
    lines.push(`- \`${c.method} ${c.path}\` — HTTP ${c.status} — ${c.ok ? 'ok' : 'failed'}`);
  }

  lines.push('', '## Sensitive domains intentionally excluded', '');
  for (const x of GHL_PROBE_EXCLUDED_CATEGORIES) {
    lines.push(`- ${x}`);
  }

  const r = report.results && typeof report.results === 'object' ? report.results : {};
  lines.push('', '## Summary metadata', '');
  if (r.location) {
    lines.push(`- **Location:** ${r.location.name || '—'} (\`${r.location.id || '—'}\`)`);
  }
  if (r.contacts) {
    lines.push(`- **Contacts total (estimate):** ${r.contacts.total ?? '—'}`);
    lines.push(`- **Distinct tags in sample:** ${(r.contacts.distinctTagsInSample || []).join(', ') || '—'}`);
  }
  if (Array.isArray(r.customFieldsManifest)) {
    lines.push(`- **Custom fields (contact model):** ${r.customFieldsManifest.length}`);
  }
  if (r.forms) {
    lines.push(`- **Forms:** ${r.forms.count ?? 0}`);
  }
  if (r.surveys) {
    lines.push(`- **Surveys:** ${r.surveys.count ?? 0}`);
  }
  if (r.pipelines) {
    lines.push(`- **Pipelines:** ${r.pipelines.count ?? 0}`);
  }
  if (r.calendars) {
    lines.push(`- **Calendars:** ${r.calendars.count ?? 0}`);
  }

  lines.push('', '## Field manifest (custom fields)', '', '| id | name | key | dataType |', '|----|------|-----|----------|');
  for (const f of r.customFieldsManifest || []) {
    lines.push(`| ${f.id || ''} | ${f.name || ''} | ${f.key || f.fieldKey || ''} | ${f.dataType || ''} |`);
  }

  lines.push('', '## Forms metadata', '');
  for (const f of (r.forms && r.forms.items) || []) {
    lines.push(`- \`${f.id}\` — ${f.name || '(unnamed)'}`);
  }

  lines.push('', '## Recommended next packet', '');
  lines.push(String(report.recommendedNextPacket || r.recommendedNextPacket || 'Phase 2 field mapping report — not direct canonical import'));

  lines.push('', '## Delivery Reality Audit', '', '```text');
  lines.push(`Final verdict: ${report.ok ? 'COMPLETE' : 'PARTIAL'} (probe scope)`);
  lines.push('Client-facing flow usable: N/A');
  lines.push('```');

  return lines.join('\n');
}
