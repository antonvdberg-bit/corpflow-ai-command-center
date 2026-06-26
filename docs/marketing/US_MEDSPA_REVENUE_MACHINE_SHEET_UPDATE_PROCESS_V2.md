# US Medspa Revenue Machine — Controlled Sheet Update Process v2 (design)

> **Status:** DESIGN PACKET (v2) — docs-only in this repo. **NOT YET OPERATOR-TESTED.**
> **NO IMPLEMENTATION AUTHORIZED beyond the Google Sheet.** This file changes no
> app runtime code, dependencies, env vars, `.env.template`, database schema/data,
> `POSTGRES_URL`, Vercel config, GitHub settings, routes, deployment, secrets, or
> `tenant_id` handling. The Apps Script below runs **inside the Google Sheet only**.
> **No outreach.** This process never sends email, never contacts prospects, never
> marks anything approved, and never sets a send channel.
> **Owner:** Anton (operator). **Author:** Cursor (docs).
> **Created:** 2026-06-26.
> **Anchor sentinel:** `<!-- MEDSPA_SHEET_UPDATE_PROCESS_V2 -->`

<!-- MEDSPA_SHEET_UPDATE_PROCESS_V2 -->

## 0. Why v2

v1 (`docs/marketing/US_MEDSPA_REVENUE_MACHINE_SHEET_UPDATE_PROCESS_V1.md`) is
**operator-tested across three Codex batches and ready for controlled normal use.**
v2 keeps every v1 guardrail but **reduces Anton's manual friction**:

- **One menu action** (`Apply Validated Queue`) instead of the v1 three-step
  validate → dry-run → apply sequence. Validation and the safety preview happen
  **inside** the apply action; the operator no longer runs a separate dry run.
- **Fail-closed**: if any queue row is invalid, the whole run aborts and writes
  nothing to `Prospects` (v1 applied valid rows and skipped invalid ones; v2 makes
  the operator fix the batch first, so a partial apply can never surprise anyone).
- **Fewer popups**: structured results go to an `Audit Update Run Log` tab; the
  operator sees **one** final summary popup.
- **Standard Codex drop-zone packet** (§2) so a Codex batch arrives as a fixed,
  contract-validatable set of files instead of ad-hoc CSV paste.

v2 does **not** change the trust model: Codex still cannot write the Sheet, open
PRs, or send outreach; approval and sending stay 100% manual.

This doc supplements and does **not** replace the canonical rules. If any conflict
arises, **those rules win**:

- `docs/operations/CODEX_INTEGRATION_CONTRACT_V1.md` (Codex output / handoff contract)
- `docs/marketing-automation-arm.md` (§8 human-approval, §9 n8n boundary, §12 tool ownership)
- `docs/marketing/US_MEDSPA_REVENUE_MACHINE_SHEET_AUDIT_WORKFLOW_V0.md` (audit-status flow + Anton gate)
- `.cursor/rules/delivery-reality.mdc`

## 1. Packet header

- **Goal.** Reduce Anton's manual friction while preserving **all** v1 guardrails.
- **Definition of Done (design).** This doc defines (a) a standard Codex drop-zone
  packet shape, (b) a simpler 3-item Apps Script v2 menu with a fail-closed
  single-action apply, and (c) a structured run log — with no v1 guardrail relaxed.
- **Scope.** Google Workspace side only: the existing `Prospects` and
  `Audit Update Queue` tabs, a new `Audit Update Run Log` tab, one bound Apps
  Script, one custom menu. v2 stays **manual-trigger** (Anton clicks the menu).
  No time-driven triggers, no n8n, no external calls.
- **Constraints.** Docs-only in repo; no app code; no production DB; no
  `POSTGRES_URL`; no env vars; no `.env.template`; no CRM; no n8n; no email; no
  outreach; no approval/send mutation; no Codex direct Sheet writes.
- **Owner.** Anton (operator). Cursor owns this repo doc and may validate a Codex
  drop-zone packet against the Codex Integration Contract before Anton imports it.
- **Rollback.** `Undo Last Apply` restores `Prospects` from the most recent
  automatic backup tab (see §6).

## 2. Codex output handoff — standard drop-zone packet

A Codex batch is delivered as a **fixed packet** of transfer-safe files (per
`docs/operations/CODEX_INTEGRATION_CONTRACT_V1.md` §2). Codex produces the packet;
**a human places the files** in the agreed drop zone (e.g. a Drive folder or a
local folder Anton controls). Codex never writes the Sheet and never opens PRs.

| File | Required | Shape | Purpose |
|---|---|---|---|
| `audit_update_queue.csv` | **Yes** | Exactly the §3 allowed headers; one row per prospect; values only, no formulas. | The rows Anton imports into the `Audit Update Queue` tab. |
| `manifest.json` | **Yes** | The Codex Integration Contract §2.D manifest (keys below). | Routes the packet to an owner + approval gate; lets Cursor validate before import. |
| `source_rows.json` | Optional | One object per prospect with the public evidence behind each score/angle. | Audit trail / spot-check; **never imported into the Sheet**. |

### 2.1 `manifest.json` shape

```json
{
  "artifact_name": "us-medspa-audit-update-batch-4",
  "intended_destination": "Google Sheet: CorpFlowAI - US Medspa Revenue Machine (Audit Update Queue)",
  "owner": "Anton (operator)",
  "source_context": "Codex public-page audit pass over 5 medspa prospects",
  "status": "DRAFT — pending Anton approval",
  "allowed_use": "Operator imports audit_update_queue.csv into Audit Update Queue and runs Apply Validated Queue",
  "prohibited_use": "No sending, no approval, no contact, no Sheet write by Codex, no production change",
  "required_approval_gate": "Anton approval in the Sheet before any send",
  "generated_at": "2026-06-26T00:00:00Z",
  "row_count": 5,
  "queue_headers": [
    "business_name","website_url","audit_status","cta_clarity_score_1_5",
    "booking_path_score_1_5","mobile_trust_speed_score_1_5","service_clarity_score_1_5",
    "lead_capture_score_1_5","lead_rescue_rating","personalized_angle",
    "draft_outreach_subject","draft_outreach_body","last_reviewed_date","owner"
  ]
}
```

### 2.2 Boundaries on the handoff (unchanged from v1 + the contract)

- **Codex must not write directly to Google Sheets.** It emits files; a human
  imports them.
- **Codex must not open PRs.** Cursor owns repo/docs PRs.
- **Codex must not send outreach** and must not include approval/send fields
  (`anton_approval_status`, `approved_send_channel`) or any contact-implying status.
- **Cursor may validate** the packet against the Codex Integration Contract
  (header allow-list, `audit_status` subset, no protected columns, no formulas,
  every row keyed by `business_name` + `website_url`) **before** Anton imports it.
  This is a read/validate step on files — it does not write the Sheet either.
- **Future non-production worker / outbox (design-only).** The drop-zone shape is
  deliberately chosen so a future *non-production* worker could one day drop a
  validated packet into an **outbox** for Anton to import. v2 **does not implement
  that worker**, defines no credentials, and authorizes no automation. Building it
  is a separate, gated packet (and would still never send outreach or write the
  Sheet without the human apply step).

## 3. Tab schema (unchanged allow-list)

The `Audit Update Queue` headers and allow-list are **identical to v1 §2**. Allowed
(writable) fields, matched to `Prospects` by `business_name` + `website_url`:

`audit_status` (subset `Not started` / `Audited` / `Outreach drafted` only),
`cta_clarity_score_1_5`, `booking_path_score_1_5`, `mobile_trust_speed_score_1_5`,
`service_clarity_score_1_5`, `lead_capture_score_1_5`, `lead_rescue_rating`
(`High`/`Medium`/`Low`), `personalized_angle`, `draft_outreach_subject`,
`draft_outreach_body`, `last_reviewed_date` (`YYYY-MM-DD`, auto-stamped if blank),
`owner`.

**Never written / forbidden as queue headers** (run aborts if present):
`anton_approval_status`, `approved_send_channel`, `date_added`,
`do_not_contact_reason`, `next_action_date`, and all identity/contact/source
columns (`city`, `state`, `category`, `contact_page_url`, `booking_url`,
`public_email_if_visible`, `phone_if_visible`, `source_url`, `initial_fit_reason`,
`suspected_lead_rescue_opportunity`, `notes`). `business_name` / `website_url` are
match keys only and are never written.

Validation rules are identical to v1 §3 (header safety, exactly-one match, scores
1–5, enum rating, safe `audit_status` subset, date format, text length ≤ 2000, at
least one allowed field). The difference in v2 is **enforcement timing**: see §5.

### 3.1 New tab — `Audit Update Run Log`

The script creates this tab on first run if absent. Header row:

`run_id`, `run_at`, `outcome`, `rows_total`, `rows_valid`, `rows_invalid`,
`rows_applied`, `fields_written`, `backup_tab`, `invalid_detail`, `notes`.

`outcome` is one of: `APPLIED`, `ABORTED_INVALID`, `ABORTED_HEADER`, `NO_ROWS`.
Each run appends exactly one row. This is where per-run detail lives instead of
multiple popups.

## 4. Apps Script v2 (embedded — paste into the bound script)

> This is a **proposed** script for the Google Sheet. It is **not** app/runtime
> code in this repo and changes nothing in the codebase. Paste it into the Sheet's
> bound Apps Script (`Extensions → Apps Script → Code.gs`) only when the operator
> chooses to adopt v2.

```javascript
/**
 * CorpFlowAI - US Medspa Revenue Machine
 * Controlled Sheet Update Process v2 (Google Sheets bound Apps Script).
 *
 * One-action apply: validates the full queue, FAILS CLOSED if any row is invalid
 * (writes nothing to Prospects), backs up Prospects, applies an allow-list of
 * audit fields only, never touches approval/send/identity/contact/source columns,
 * never sends email, never calls external services, writes a structured row to the
 * "Audit Update Run Log" tab, and shows ONE final summary popup.
 *
 * Hard guardrails: no MailApp, no GmailApp, no UrlFetchApp, no approval/send
 * mutation, no anton_approval_status / approved_send_channel writes.
 */

const RM = {
  prospects: 'Prospects',
  queue: 'Audit Update Queue',
  runLog: 'Audit Update Run Log',
  matchKeys: ['business_name', 'website_url'],
  allowedFields: [
    'audit_status',
    'cta_clarity_score_1_5',
    'booking_path_score_1_5',
    'mobile_trust_speed_score_1_5',
    'service_clarity_score_1_5',
    'lead_capture_score_1_5',
    'lead_rescue_rating',
    'personalized_angle',
    'draft_outreach_subject',
    'draft_outreach_body',
    'last_reviewed_date',
    'owner'
  ],
  // Never written; (except match keys) must never appear as queue headers.
  protectedFields: [
    'anton_approval_status',
    'approved_send_channel',
    'date_added',
    'do_not_contact_reason',
    'next_action_date',
    'city', 'state', 'category', 'contact_page_url', 'booking_url',
    'public_email_if_visible', 'phone_if_visible', 'source_url',
    'initial_fit_reason', 'suspected_lead_rescue_opportunity', 'notes'
  ],
  queueOutputCols: ['validation_status', 'validation_message'],
  runLogCols: [
    'run_id', 'run_at', 'outcome', 'rows_total', 'rows_valid', 'rows_invalid',
    'rows_applied', 'fields_written', 'backup_tab', 'invalid_detail', 'notes'
  ],
  scoreFields: [
    'cta_clarity_score_1_5', 'booking_path_score_1_5',
    'mobile_trust_speed_score_1_5', 'service_clarity_score_1_5',
    'lead_capture_score_1_5'
  ],
  allowedAuditStatus: ['Not started', 'Audited', 'Outreach drafted'],
  allowedLeadRescue: ['High', 'Medium', 'Low'],
  maxTextLen: 2000,
  backupPrefix: 'Backup_Prospects_',
  textFields: ['personalized_angle', 'draft_outreach_subject', 'draft_outreach_body', 'owner']
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Revenue Machine')
    .addItem('Apply Validated Queue', 'rmApplyValidatedQueue')
    .addItem('Undo Last Apply', 'rmUndoLastApply')
    .addItem('View Last Run Log', 'rmViewLastRunLog')
    .addToUi();
}

function rmApplyValidatedQueue() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const qSheet = ss.getSheetByName(RM.queue);
  const pSheet = ss.getSheetByName(RM.prospects);
  const runId = 'run_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');

  if (!qSheet) { ui.alert('Missing tab: "' + RM.queue + '".'); return; }
  if (!pSheet) { ui.alert('Missing tab: "' + RM.prospects + '".'); return; }

  const q = rmReadTable_(qSheet);
  const p = rmReadTable_(pSheet);

  // (1) Header safety — fail closed before anything else.
  const forbidden = RM.protectedFields.filter(function (f) { return RM.matchKeys.indexOf(f) === -1; });
  const present = forbidden.filter(function (f) { return q.headers.indexOf(f) !== -1; });
  if (present.length) {
    rmLogRun_(ss, { run_id: runId, outcome: 'ABORTED_HEADER', rows_total: q.rows.length,
      rows_valid: 0, rows_invalid: q.rows.length, rows_applied: 0, fields_written: 0,
      backup_tab: '', invalid_detail: 'forbidden headers: ' + present.join(', '),
      notes: 'Nothing written. Remove protected columns from the queue.' });
    ui.alert('ABORTED — nothing changed.\n\nThe queue contains protected columns:\n' +
      present.join(', ') + '\n\nRemove them and re-run. See "' + RM.runLog + '".');
    return;
  }
  if (RM.matchKeys.some(function (k) { return q.headers.indexOf(k) === -1; })) {
    ui.alert('ABORTED. The queue must contain headers: ' + RM.matchKeys.join(', '));
    return;
  }
  if (RM.matchKeys.some(function (k) { return p.headers.indexOf(k) === -1; })) {
    ui.alert('ABORTED. The Prospects tab must contain headers: ' + RM.matchKeys.join(', '));
    return;
  }

  if (q.rows.length === 0) {
    rmLogRun_(ss, { run_id: runId, outcome: 'NO_ROWS', rows_total: 0, rows_valid: 0,
      rows_invalid: 0, rows_applied: 0, fields_written: 0, backup_tab: '',
      invalid_detail: '', notes: 'Queue had no data rows.' });
    ui.alert('Nothing to apply — the queue has no data rows.');
    return;
  }

  rmEnsureQueueOutputCols_(qSheet, q);
  const q2 = rmReadTable_(qSheet);

  // Build match index.
  const index = {};
  p.rows.forEach(function (row) {
    const key = rmNorm_(row.values['business_name']) + '\u0000' + rmNorm_(row.values['website_url']);
    (index[key] = index[key] || []).push(row.rowNumber);
  });

  // (2) Validate the WHOLE queue first.
  const plan = q2.rows.map(function (row) {
    const res = rmValidateRow_(row, index);
    return { queueRow: row.rowNumber, matchRow: res.matchRow, updates: res.updates,
      status: res.status, message: res.message };
  });
  rmWriteQueueValidation_(qSheet, q2, plan);

  const invalid = plan.filter(function (x) { return x.status !== 'VALID'; });
  const valid = plan.filter(function (x) { return x.status === 'VALID'; });

  // (3) FAIL CLOSED if any invalid row exists.
  if (invalid.length) {
    const detail = invalid.slice(0, 10).map(function (x) {
      return 'queue row ' + x.queueRow + ': ' + x.message;
    }).join(' | ');
    rmLogRun_(ss, { run_id: runId, outcome: 'ABORTED_INVALID', rows_total: plan.length,
      rows_valid: valid.length, rows_invalid: invalid.length, rows_applied: 0,
      fields_written: 0, backup_tab: '', invalid_detail: detail,
      notes: 'Fail-closed: no rows applied. Fix INVALID rows and re-run.' });
    ui.alert('ABORTED — nothing changed.\n\n' + invalid.length + ' invalid row(s) of ' +
      plan.length + '. Fix the rows flagged in validation_message, then re-run.\n\n' +
      'Details in "' + RM.runLog + '".');
    return;
  }

  // (4) Backup Prospects before any write.
  const backupName = rmSnapshotProspects_(ss, pSheet);

  // (5) Apply allow-list fields only.
  const pHeaderIndex = {};
  p.headers.forEach(function (h, i) { pHeaderIndex[h] = i + 1; });
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  let appliedRows = 0;
  let fieldsWritten = 0;

  valid.forEach(function (x) {
    let n = 0;
    Object.keys(x.updates).forEach(function (field) {
      if (RM.allowedFields.indexOf(field) === -1) return; // hard guard
      const col = pHeaderIndex[field];
      if (!col) return;
      pSheet.getRange(x.matchRow, col).setValue(x.updates[field]);
      n++;
    });
    if (!('last_reviewed_date' in x.updates) && pHeaderIndex['last_reviewed_date']) {
      pSheet.getRange(x.matchRow, pHeaderIndex['last_reviewed_date']).setValue(today);
      n++;
    }
    appliedRows++;
    fieldsWritten += n;
  });

  // (6) Run log + ONE summary popup.
  rmLogRun_(ss, { run_id: runId, outcome: 'APPLIED', rows_total: plan.length,
    rows_valid: valid.length, rows_invalid: 0, rows_applied: appliedRows,
    fields_written: fieldsWritten, backup_tab: backupName, invalid_detail: '',
    notes: 'Approval/send columns not changed. Drafts remain pending Anton review.' });

  ui.alert('Applied.\n\nRows applied: ' + appliedRows + '\nFields written: ' + fieldsWritten +
    '\nBackup tab: ' + backupName + '\n\nApproval/send columns were NOT changed. ' +
    'Drafts remain pending Anton review. See "' + RM.runLog + '" for the record.');
}

function rmValidateRow_(row, index) {
  const v = row.values;
  const bn = v['business_name'], wu = v['website_url'];
  if (!String(bn || '').trim() || !String(wu || '').trim()) {
    return { status: 'INVALID', message: 'missing business_name or website_url', matchRow: null, updates: {} };
  }
  const key = rmNorm_(bn) + '\u0000' + rmNorm_(wu);
  const matches = index[key] || [];
  if (matches.length === 0) return { status: 'INVALID', message: 'no match in Prospects', matchRow: null, updates: {} };
  if (matches.length > 1) return { status: 'INVALID', message: 'ambiguous match (' + matches.length + ')', matchRow: null, updates: {} };

  const updates = {};
  const errs = [];

  RM.scoreFields.forEach(function (f) {
    const raw = v[f];
    if (raw === '' || raw === null || raw === undefined) return;
    const num = Number(raw);
    if (!Number.isInteger(num) || num < 1 || num > 5) { errs.push(f + ' must be 1-5'); return; }
    updates[f] = num;
  });

  if (rmHas_(v, 'lead_rescue_rating')) {
    const norm = rmTitle_(String(v['lead_rescue_rating']).trim());
    if (RM.allowedLeadRescue.indexOf(norm) === -1) errs.push('lead_rescue_rating must be High/Medium/Low');
    else updates['lead_rescue_rating'] = norm;
  }

  if (rmHas_(v, 'audit_status')) {
    const s = String(v['audit_status']).trim();
    if (RM.allowedAuditStatus.indexOf(s) === -1) errs.push('audit_status must be one of: ' + RM.allowedAuditStatus.join(' / '));
    else updates['audit_status'] = s;
  }

  if (rmHas_(v, 'last_reviewed_date')) {
    const d = String(v['last_reviewed_date']).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) errs.push('last_reviewed_date must be YYYY-MM-DD');
    else updates['last_reviewed_date'] = d;
  }

  RM.textFields.forEach(function (f) {
    if (!rmHas_(v, f)) return;
    const t = String(v[f]);
    if (t.length > RM.maxTextLen) { errs.push(f + ' exceeds ' + RM.maxTextLen + ' chars'); return; }
    updates[f] = t;
  });

  if (errs.length) return { status: 'INVALID', message: errs.join('; '), matchRow: matches[0], updates: {} };
  if (Object.keys(updates).length === 0) return { status: 'INVALID', message: 'nothing to update', matchRow: matches[0], updates: {} };
  return { status: 'VALID', message: 'ok', matchRow: matches[0], updates: updates };
}

function rmReadTable_(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = (values[0] || []).map(function (h) { return String(h).trim(); });
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const obj = {};
    headers.forEach(function (h, c) { obj[h] = values[r][c]; });
    if (headers.every(function (h) { return obj[h] === '' || obj[h] === null; })) continue;
    rows.push({ rowNumber: r + 1, values: obj });
  }
  return { headers: headers, rows: rows };
}

function rmEnsureQueueOutputCols_(sheet, table) {
  let next = sheet.getLastColumn();
  RM.queueOutputCols.forEach(function (c) {
    if (table.headers.indexOf(c) === -1) { next++; sheet.getRange(1, next).setValue(c); }
  });
}

function rmWriteQueueValidation_(sheet, table, plan) {
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim(); });
  const col = {};
  RM.queueOutputCols.forEach(function (c) { col[c] = headerRow.indexOf(c) + 1; });
  plan.forEach(function (x) {
    if (col['validation_status']) sheet.getRange(x.queueRow, col['validation_status']).setValue(x.status);
    if (col['validation_message']) sheet.getRange(x.queueRow, col['validation_message']).setValue(x.message);
  });
}

function rmSnapshotProspects_(ss, pSheet) {
  const name = RM.backupPrefix + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const copy = pSheet.copyTo(ss);
  copy.setName(name);
  return name;
}

function rmEnsureRunLog_(ss) {
  let sheet = ss.getSheetByName(RM.runLog);
  if (!sheet) {
    sheet = ss.insertSheet(RM.runLog);
    sheet.getRange(1, 1, 1, RM.runLogCols.length).setValues([RM.runLogCols]);
  }
  return sheet;
}

function rmLogRun_(ss, rec) {
  const sheet = rmEnsureRunLog_(ss);
  rec.run_at = new Date();
  const row = RM.runLogCols.map(function (c) { return (c in rec) ? rec[c] : ''; });
  sheet.appendRow(row);
}

function rmViewLastRunLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const sheet = ss.getSheetByName(RM.runLog);
  if (!sheet || sheet.getLastRow() < 2) { ui.alert('No runs logged yet.'); return; }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const last = sheet.getRange(sheet.getLastRow(), 1, 1, sheet.getLastColumn()).getValues()[0];
  let msg = 'Last run:\n';
  headers.forEach(function (h, i) { if (last[i] !== '') msg += '\n' + h + ': ' + last[i]; });
  sheet.activate();
  ui.alert(msg);
}

function rmUndoLastApply() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const backups = ss.getSheets()
    .map(function (s) { return s.getName(); })
    .filter(function (n) { return n.indexOf(RM.backupPrefix) === 0; })
    .sort();
  if (!backups.length) { ui.alert('No backup tabs found. Nothing to undo.'); return; }
  const latest = backups[backups.length - 1];
  const confirm = ui.alert('Restore Prospects from backup "' + latest + '"?\n\n' +
    'This overwrites the current Prospects values with the backup.', ui.ButtonSet.OK_CANCEL);
  if (confirm !== ui.Button.OK) { ui.alert('Cancelled.'); return; }

  const backup = ss.getSheetByName(latest);
  const pSheet = ss.getSheetByName(RM.prospects);
  const data = backup.getDataRange().getValues();
  pSheet.clearContents();
  pSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  rmLogRun_(ss, { run_id: 'undo_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss'),
    outcome: 'APPLIED', rows_total: '', rows_valid: '', rows_invalid: '', rows_applied: '',
    fields_written: '', backup_tab: latest, invalid_detail: '',
    notes: 'Undo: Prospects restored from backup.' });
  ui.alert('Restored Prospects from "' + latest + '". You may delete that backup tab when satisfied.');
}

function rmNorm_(s) { return String(s === null || s === undefined ? '' : s).trim().toLowerCase(); }
function rmHas_(obj, k) { const x = obj[k]; return !(x === '' || x === null || x === undefined); }
function rmTitle_(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s; }
```

Design guarantees (same as v1, enforced at apply time):

- The write step iterates **only** `RM.allowedFields` and re-checks the allow-list
  before every `setValue` — protected columns are unreachable by construction.
- `anton_approval_status`, `approved_send_channel`, and all identity/contact/source
  columns are never written, so imported drafts stay **pending** and no send
  channel is ever set.
- No `MailApp` / `GmailApp` / `UrlFetchApp` calls exist — the script cannot send
  email, contact prospects, or call external services.

## 5. Operator flow (v2)

One-time setup:

1. Open **`CorpFlowAI - US Medspa Revenue Machine`**.
2. **Extensions → Apps Script**, replace `Code.gs` with the §4 code, **Save**.
3. Reload the Sheet. Authorize when prompted (it only edits this Sheet; it has no
   email/contact permissions because it uses none).
4. Ensure the `Audit Update Queue` tab exists (§3 headers). The
   `Audit Update Run Log` tab is created automatically on first run.

Each batch (now a single operator action):

1. Receive the Codex **drop-zone packet** (§2). Optionally have Cursor validate the
   files against the Codex Integration Contract first.
2. Import `audit_update_queue.csv` into **`Audit Update Queue`** (replace previous
   rows). Leave `last_reviewed_date` blank or format that column as plain text to
   avoid Sheets date coercion (carried from v1 §5).
3. **Revenue Machine → Apply Validated Queue.** The script validates the whole
   queue, **fails closed** if any row is invalid (writes nothing, logs the run), or
   otherwise backs up `Prospects`, applies the allow-list fields, writes a run-log
   row, and shows **one** summary popup.
4. If it aborted, fix the rows flagged in `validation_message` (or **View Last Run
   Log**) and re-run. Approval and sending stay 100% manual.

What v2 removes vs v1: the separate **Validate** and **Apply (DRY RUN)** menu
steps. Validation is now internal to `Apply Validated Queue`, and the fail-closed
behavior means a run either applies the whole valid batch or changes nothing.

## 6. Rollback procedure (unchanged)

- **One-click:** **Revenue Machine → Undo Last Apply** restores `Prospects` from
  the most recent `Backup_Prospects_<timestamp>` tab and logs an undo row.
- **Manual:** copy a `Backup_Prospects_<timestamp>` tab's full range over
  `Prospects`, or use Google Sheets **File → Version history**.
- **Housekeeping:** delete old `Backup_Prospects_*` tabs once an apply is confirmed
  good.

## 7. Required hard guardrails (carried forward, non-negotiable)

- **No `MailApp`. No `GmailApp`. No `UrlFetchApp`.** The script cannot send email or
  call external services.
- **No approval/send mutation.** No `anton_approval_status` writes. No
  `approved_send_channel` writes.
- **No Codex direct Sheet writes.** Codex emits files; a human imports them.
- **No outreach automation.** Sending stays a separate, human, per-prospect action
  per `docs/marketing-automation-arm.md` §8.
- **No n8n automation.** v2 is manual-trigger only; any future automation is
  separately approved per `docs/marketing-automation-arm.md` §9.
- **No production app changes, no DB changes, no `POSTGRES_URL`, no env vars, no
  `.env.template`.** Entirely Google-Workspace-side.

## 8. Status & next steps

- **Delivery state:** Local → intended **Merged** after operator review. Docs-only;
  nothing to deploy.
- **Implementation:** none in this repo. The v2 script is adopted by the operator
  pasting it into the Sheet when they choose; this doc authorizes no automation and
  no worker/outbox.
- **Testing:** v2 is **not yet operator-tested**. Recommended adoption path —
  run v2 on a copy of the Sheet (or after a manual `Prospects` backup), confirm a
  clean batch applies and a deliberately-invalid batch aborts with nothing written,
  then record evidence like v1 §9 before marking v2 ready for normal use.
- **Verdict:** PARTIAL by design — v2 designed and documented; adoption and
  operator testing are the next gated steps. All v1 guardrails preserved.
