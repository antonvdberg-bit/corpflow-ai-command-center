# US Medspa Revenue Machine — Controlled Sheet Update Process v1

> **Status:** OPERATING PROCESS + EMBEDDED APPS SCRIPT — docs-only in this repo.
> **NO IMPLEMENTATION AUTHORIZED beyond the Google Sheet.** This file changes no
> app runtime code, dependencies, env vars, `.env.template`, database schema/data,
> `POSTGRES_URL`, Vercel config, GitHub settings, routes, deployment, secrets, or
> `tenant_id` handling. The Apps Script below runs **inside the Google Sheet only**.
> **No outreach.** This process never sends email, never contacts prospects, never
> marks anything approved, and never sets a send channel.

Authorized by the Marketing Automation Arm work (Operator Bridge issue #249).
Companion docs: `docs/marketing-automation-arm.md` (§6 tracker fields, §8 human-
approval policy, §9 n8n boundary) and `docs/marketing/MARKETING_COLLATERAL_INVENTORY.md`.

---

## 1. Packet header

- **Goal.** Let Anton bulk-apply AI/Codex audit outputs to the `Prospects` tab of
  the Google Sheet **`CorpFlowAI - US Medspa Revenue Machine`** without manual
  row-by-row editing, while approval/send fields stay untouched and every draft
  stays pending Anton review.
- **Definition of Done.** Anton pastes/imports a CSV of audit updates into a
  staging tab `Audit Update Queue`, runs **one menu action**, and the **allowed**
  draft/audit fields are applied to matching `Prospects` rows (matched by
  `business_name` + `website_url`). Protected approval/send/identity fields are
  never written by this process.
- **Scope.** Google Workspace side only: two tabs (`Prospects`, `Audit Update
  Queue`), one bound Apps Script, one custom menu. v1 is **manual-trigger** (Anton
  clicks the menu). No time-driven triggers, no n8n, no external calls.
- **Constraints.** Docs-only in repo; no app code; no production DB; no
  `POSTGRES_URL`; no env vars; no `.env.template`; no CRM; no n8n in v1 unless
  separately approved; no email; no outreach; no approval/send mutation.
- **Risks & mitigations.**
  - *Wrong row updated* → strict two-key match; 0 or >1 matches are skipped, not
    guessed.
  - *Protected field overwritten* → script writes an allow-list of columns only;
    queue is rejected if it contains any forbidden protected header.
  - *Bad data* → validation pass (scores 1–5, enum ratings, safe `audit_status`
    subset, date format, text length) before any write.
  - *Accidental approval/outreach* → `audit_status` queue values are restricted to
    a non-approval subset; approval/send columns are never in the write map.
  - *Destructive mistake* → full `Prospects` snapshot before every apply +
    one-click Undo.
- **Owner.** Anton (operator). Cursor owns this repo doc. Codex may produce queue
  CSVs but does not own PRs and cannot apply updates.
- **Rollback.** Undo Last Apply restores `Prospects` from the most recent
  automatic backup tab (see §6).

---

## 2. Tab schema — `Audit Update Queue`

Create a tab named exactly `Audit Update Queue`. Row 1 is the header. Columns
(exact names, exact order recommended):

| Column | Required | Meaning |
|--------|----------|---------|
| `business_name` | Yes (match key) | Must equal a `Prospects.business_name`. |
| `website_url` | Yes (match key) | Must equal that row's `Prospects.website_url`. |
| `audit_status` | Optional | One of: `Not started`, `Audited`, `Outreach drafted`. **No approval/sent values allowed.** |
| `cta_clarity_score_1_5` | Optional | Integer 1–5. |
| `booking_path_score_1_5` | Optional | Integer 1–5. |
| `mobile_trust_speed_score_1_5` | Optional | Integer 1–5. |
| `service_clarity_score_1_5` | Optional | Integer 1–5. |
| `lead_capture_score_1_5` | Optional | Integer 1–5. |
| `lead_rescue_rating` | Optional | One of `High`, `Medium`, `Low`. |
| `personalized_angle` | Optional | Free text (≤ 2000 chars). |
| `draft_outreach_subject` | Optional | Free text draft (≤ 2000 chars). Stays pending. |
| `draft_outreach_body` | Optional | Free text draft (≤ 2000 chars). Stays pending. |
| `last_reviewed_date` | Optional | `YYYY-MM-DD`. If blank, script sets today on apply. |
| `owner` | Optional | Free text (e.g. `Anton`). |
| `validation_status` | Script-managed | `VALID` / `INVALID` (do not fill manually). |
| `validation_message` | Script-managed | Reason if invalid / notes. |
| `apply_status` | Script-managed | `Applied (n fields)` / `Skipped` / blank. |
| `applied_at` | Script-managed | Timestamp set by apply. |

The last four columns are written by the script. If they do not exist, the script
creates them on first run.

**Forbidden in the queue (the run aborts if any appear as a header):**
`anton_approval_status`, `approved_send_channel`, `date_added`,
`do_not_contact_reason`, `next_action_date`, and the original identity/contact/
source columns (`city`, `state`, `category`, `contact_page_url`, `booking_url`,
`public_email_if_visible`, `phone_if_visible`, `source_url`, `initial_fit_reason`,
`suspected_lead_rescue_opportunity`, `notes`). `business_name` and `website_url`
are allowed **only** as match keys and are never written.

---

## 3. Validation rules

A run validates the whole queue first. Per-row checks:

1. **Header safety (whole run).** If the queue contains any forbidden protected
   header (§2), the entire run aborts with a message and writes nothing.
2. **Match keys present.** `business_name` and `website_url` must both be
   non-empty.
3. **Exactly one match.** Normalize (trim + lowercase) both keys and find
   `Prospects` rows where both match. `0` matches → `INVALID: no match`. `>1` →
   `INVALID: ambiguous match (n)`. Exactly `1` → proceed.
4. **Scores.** Each provided score must parse to an integer `1..5`. Empty = no
   change. Non-integer or out-of-range → `INVALID`.
5. **`lead_rescue_rating`.** If provided, must be `High` / `Medium` / `Low`
   (case-insensitive; normalized to Title case). Else `INVALID`.
6. **`audit_status`.** If provided, must be in the safe subset `Not started` /
   `Audited` / `Outreach drafted`. Approval/sent values (`Anton approved`, `Sent`,
   `Follow-up due`, `Closed`) are rejected → `INVALID` (prevents implying outreach
   approval).
7. **`last_reviewed_date`.** If provided, must match `YYYY-MM-DD`. Else `INVALID`.
8. **Text length.** `personalized_angle`, `draft_outreach_subject`,
   `draft_outreach_body`, `owner` ≤ 2000 chars. Else `INVALID`.
9. **At least one allowed field.** A row with only match keys and no allowed value
   is `INVALID: nothing to update`.

Only `VALID` rows are applied. Drafts always remain pending because
`anton_approval_status` is never touched (stays whatever it was, e.g. `Pending`).

---

## 4. Apps Script

Bound script: open the Sheet → **Extensions → Apps Script** → paste into `Code.gs`
→ Save → reload the Sheet. A **Revenue Machine** menu appears.

```javascript
/**
 * CorpFlowAI - US Medspa Revenue Machine
 * Controlled Sheet Update Process v1 (Google Sheets bound Apps Script).
 *
 * Applies AI/Codex audit outputs from the "Audit Update Queue" tab to the
 * "Prospects" tab by matching business_name + website_url. Writes an allow-list
 * of columns only. Never touches approval/send/identity columns. Never sends
 * email or contacts anyone. Snapshots Prospects before every apply for rollback.
 */

const RM = {
  prospects: 'Prospects',
  queue: 'Audit Update Queue',
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
  // Columns that must never be written by this process, and (except match keys)
  // must never appear as queue headers.
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
  outputCols: ['validation_status', 'validation_message', 'apply_status', 'applied_at'],
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
    .addItem('1. Validate Audit Update Queue', 'rmValidateQueue')
    .addItem('2. Apply Audit Updates (DRY RUN)', 'rmApplyDryRun')
    .addItem('3. Apply Audit Updates', 'rmApplyUpdates')
    .addSeparator()
    .addItem('Undo Last Apply (restore latest backup)', 'rmUndoLastApply')
    .addToUi();
}

function rmValidateQueue() { rmRun_({ apply: false, dryRun: false }); }
function rmApplyDryRun() { rmRun_({ apply: true, dryRun: true }); }
function rmApplyUpdates() { rmRun_({ apply: true, dryRun: false }); }

function rmRun_(opts) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const qSheet = ss.getSheetByName(RM.queue);
  const pSheet = ss.getSheetByName(RM.prospects);
  if (!qSheet) { ui.alert('Missing tab: "' + RM.queue + '".'); return; }
  if (!pSheet) { ui.alert('Missing tab: "' + RM.prospects + '".'); return; }

  const q = rmReadTable_(qSheet);
  const p = rmReadTable_(pSheet);

  // Header safety: no forbidden protected columns in the queue.
  const forbidden = RM.protectedFields.filter(function (f) { return RM.matchKeys.indexOf(f) === -1; });
  const present = forbidden.filter(function (f) { return q.headers.indexOf(f) !== -1; });
  if (present.length) {
    ui.alert('ABORTED. The queue contains protected columns that may not be bulk-updated:\n\n' +
      present.join(', ') + '\n\nRemove these columns and try again. Nothing was changed.');
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

  rmEnsureOutputCols_(qSheet, q);
  const q2 = rmReadTable_(qSheet); // re-read with output columns present

  // Build a match index for Prospects.
  const index = {};
  p.rows.forEach(function (row) {
    const key = rmNorm_(row.values['business_name']) + '\u0000' + rmNorm_(row.values['website_url']);
    (index[key] = index[key] || []).push(row.rowNumber);
  });

  const plan = [];
  q2.rows.forEach(function (row) {
    const res = rmValidateRow_(row, index, p);
    plan.push({ queueRow: row.rowNumber, matchRow: res.matchRow, updates: res.updates, status: res.status, message: res.message });
  });

  // Write validation results back to the queue.
  rmWriteQueueStatus_(qSheet, q2, plan, 'validation');

  const validCount = plan.filter(function (x) { return x.status === 'VALID'; }).length;
  const invalidCount = plan.length - validCount;

  if (!opts.apply) {
    ui.alert('Validation complete.\n\nVALID rows: ' + validCount + '\nINVALID rows: ' + invalidCount +
      '\n\nSee validation_status / validation_message in the queue.');
    return;
  }

  if (opts.dryRun) {
    let preview = 'DRY RUN — no changes written.\n\nWould apply ' + validCount + ' row(s):\n';
    plan.filter(function (x) { return x.status === 'VALID'; }).slice(0, 20).forEach(function (x) {
      preview += '\n• Prospects row ' + x.matchRow + ': ' + Object.keys(x.updates).join(', ');
    });
    if (validCount > 20) preview += '\n…and ' + (validCount - 20) + ' more.';
    ui.alert(preview);
    return;
  }

  if (validCount === 0) { ui.alert('Nothing to apply. No VALID rows.'); return; }

  const confirm = ui.alert('Apply ' + validCount + ' update(s) to Prospects?\n\n' +
    'A full backup of Prospects will be created first. Approval/send columns will NOT be changed.',
    ui.ButtonSet.OK_CANCEL);
  if (confirm !== ui.Button.OK) { ui.alert('Cancelled. Nothing changed.'); return; }

  // Snapshot Prospects before any write.
  const backupName = rmSnapshotProspects_(ss, pSheet);

  // Apply.
  const pHeaderIndex = {};
  p.headers.forEach(function (h, i) { pHeaderIndex[h] = i + 1; }); // 1-based columns
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  let applied = 0;

  plan.forEach(function (x) {
    if (x.status !== 'VALID') return;
    let n = 0;
    Object.keys(x.updates).forEach(function (field) {
      if (RM.allowedFields.indexOf(field) === -1) return; // hard guard
      const col = pHeaderIndex[field];
      if (!col) return;
      pSheet.getRange(x.matchRow, col).setValue(x.updates[field]);
      n++;
    });
    // Auto-stamp last_reviewed_date if not provided and column exists.
    if (!('last_reviewed_date' in x.updates) && pHeaderIndex['last_reviewed_date']) {
      pSheet.getRange(x.matchRow, pHeaderIndex['last_reviewed_date']).setValue(today);
      n++;
    }
    x.applyStatus = 'Applied (' + n + ' fields)';
    applied++;
  });

  rmWriteQueueStatus_(qSheet, q2, plan, 'apply');

  ui.alert('Done.\n\nApplied: ' + applied + ' row(s)\nSkipped/invalid: ' + (plan.length - applied) +
    '\nBackup tab: ' + backupName + '\n\nApproval/send columns were not changed. Drafts remain pending Anton review.');
}

function rmValidateRow_(row, index, p) {
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
  const range = sheet.getDataRange();
  const values = range.getValues();
  const headers = (values[0] || []).map(function (h) { return String(h).trim(); });
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const obj = {};
    headers.forEach(function (h, c) { obj[h] = values[r][c]; });
    // Skip fully empty rows.
    if (headers.every(function (h) { return obj[h] === '' || obj[h] === null; })) continue;
    rows.push({ rowNumber: r + 1, values: obj });
  }
  return { headers: headers, rows: rows };
}

function rmEnsureOutputCols_(sheet, table) {
  let next = sheet.getLastColumn();
  RM.outputCols.forEach(function (c) {
    if (table.headers.indexOf(c) === -1) {
      next++;
      sheet.getRange(1, next).setValue(c);
    }
  });
}

function rmWriteQueueStatus_(sheet, table, plan, phase) {
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim(); });
  const col = {};
  RM.outputCols.forEach(function (c) { col[c] = headerRow.indexOf(c) + 1; });
  plan.forEach(function (x) {
    if (phase === 'validation') {
      if (col['validation_status']) sheet.getRange(x.queueRow, col['validation_status']).setValue(x.status);
      if (col['validation_message']) sheet.getRange(x.queueRow, col['validation_message']).setValue(x.message);
    } else if (phase === 'apply') {
      if (col['apply_status']) sheet.getRange(x.queueRow, col['apply_status']).setValue(x.applyStatus || (x.status === 'VALID' ? '' : 'Skipped'));
      if (col['applied_at'] && x.applyStatus) sheet.getRange(x.queueRow, col['applied_at']).setValue(new Date());
    }
  });
}

function rmSnapshotProspects_(ss, pSheet) {
  const name = RM.backupPrefix + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const copy = pSheet.copyTo(ss);
  copy.setName(name);
  return name;
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
  ui.alert('Restored Prospects from "' + latest + '". You may delete that backup tab when satisfied.');
}

function rmNorm_(s) { return String(s === null || s === undefined ? '' : s).trim().toLowerCase(); }
function rmHas_(obj, k) { const x = obj[k]; return !(x === '' || x === null || x === undefined); }
function rmTitle_(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s; }
```

Design guarantees:

- The write step iterates **only** `RM.allowedFields` and re-checks the allow-list
  before every `setValue` — protected columns are unreachable by construction.
- `anton_approval_status`, `approved_send_channel`, `date_added`,
  `do_not_contact_reason`, `next_action_date`, and all identity/contact/source
  columns are never written, so imported drafts stay **pending** and no send
  channel is ever set.
- No `MailApp` / `GmailApp` / `UrlFetchApp` calls exist — the script cannot send
  email, contact prospects, or call external services.

---

## 5. Test plan — first 5 audited prospects

1. In the Sheet, create the `Audit Update Queue` tab with the §2 headers.
2. Paste the CSV below into `Audit Update Queue` (File → Import → paste, or paste
   into A1 and split to columns).
3. Run **Revenue Machine → 1. Validate Audit Update Queue**. Expect all 5 rows
   `validation_status = VALID` (assuming the 5 `Prospects` rows exist with matching
   `business_name` + `website_url`).
4. Run **Revenue Machine → 2. Apply Audit Updates (DRY RUN)**. Confirm the preview
   lists 5 rows and the fields to be written; confirm `Prospects` is unchanged.
5. Run **Revenue Machine → 3. Apply Audit Updates**, click OK. Confirm:
   - The 5 `Prospects` rows now show the scores, `lead_rescue_rating`,
     `personalized_angle`, draft subject/body, `audit_status = Audited`,
     `last_reviewed_date`, `owner`.
   - `anton_approval_status` is still `Pending`; `approved_send_channel` still
     `None`; `date_added`, `do_not_contact_reason`, contact/source columns
     unchanged.
   - A `Backup_Prospects_<timestamp>` tab was created.
6. Negative tests (recommended):
   - Add a row with `audit_status = Anton approved` → expect `INVALID`.
   - Add a row with `cta_clarity_score_1_5 = 7` → expect `INVALID: must be 1-5`.
   - Add a row whose `website_url` does not match → expect `INVALID: no match`.
   - Add a column `anton_approval_status` to the queue → expect the whole run to
     **ABORT** with nothing changed.

### Test CSV (paste into `Audit Update Queue`)

```csv
business_name,website_url,audit_status,cta_clarity_score_1_5,booking_path_score_1_5,mobile_trust_speed_score_1_5,service_clarity_score_1_5,lead_capture_score_1_5,lead_rescue_rating,personalized_angle,draft_outreach_subject,draft_outreach_body,last_reviewed_date,owner
"SculptME Med Spa","https://sculptmemedspa.com/","Audited",4,3,3,3,3,"Medium","Consultation form captures treatment interest, but monthly specials are gated behind a phone call, there is no online booking, and no stated response time.","A quick note on your Alamo Botox enquiry path","Hi SculptME team - I was looking at your public Botox page and noticed your consultation form captures treatment interest. With specials only by phone and no online booking or stated response time, high-intent visitors may bounce between calling and the form. Happy to send a short 5-point screenshot audit, observations only. (Draft only - pending Anton approval.)","2026-06-26","Anton"
"B.TOX.BAR.","https://www.btoxbar.com/","Audited",4,4,4,5,4,"Medium","Strong service pages, online booking and transparent pricing; opportunity is whether Book Online, pricing, consultation, phone, and form enquiries across two locations land in one follow-up view.","Enquiry-path note for B.TOX.BAR. (Los Gatos + Burlingame)","Hi B.TOX.BAR. team - your treatment pages and online booking are strong and pricing transparency is a plus. With several enquiry paths across two locations, I wondered whether they land in one place you can follow up from. Glad to send a 5-point screenshot audit, observations only. (Draft only - pending Anton approval.)","2026-06-26","Anton"
"Be You Medical","https://beyouthful.com/pages/sacramento","Audited",3,3,4,3,3,"High","Enquiries can enter via online booking, app, call, text, email and newsletter across four locations - high fragmentation risk with no single owner-visible follow-up list.","Enquiry routing idea for Be You Medical (4 locations)","Hi Be You Medical team - the booking options across online, app, call, text and email are clearly built for demand. Across four locations, my question is whether every enquiry ends up in one owner-visible follow-up list. Happy to send a 5-point screenshot audit, observations only. (Draft only - pending Anton approval.)","2026-06-26","Anton"
"Rejuvify Med Spa","https://www.rejuvifymedspa.com/med-spa-in-los-angeles","Audited",4,4,4,5,3,"Medium","Online booking and phone are clear and the physician-led story is strong; opportunity is routing concierge at-home, membership and missed-call enquiries quickly, with no stated response time.","Quick note on Rejuvify's booking + concierge enquiries","Hi Rejuvify team - your page is clear with online booking and phone front and centre and a strong physician-led story. Concierge at-home, membership and call enquiries route differently with no stated response time, so some could slip. Glad to send a 5-point screenshot audit, observations only. (Draft only - pending Anton approval.)","2026-06-26","Anton"
"The Botox Spot","https://www.thebotoxspot.com/","Audited",4,3,4,4,3,"Medium","Book Now is prominent and the new-client offer is clear, but visitors self-route between Riverside, Redlands and mobile service; opportunity is ensuring each enquiry lands in the right calendar with timely follow-up.","Enquiry-path note for The Botox Spot (Riverside/Redlands/mobile)","Hi Botox Spot team - your Book Now path is prominent and the new-client offer is clear. Because visitors choose between Riverside, Redlands and mobile service, I wondered whether each enquiry lands in the right calendar and gets timely follow-up. Happy to send a 5-point screenshot audit, observations only. (Draft only - pending Anton approval.)","2026-06-26","Anton"
```

---

## 6. Rollback procedure

- **One-click:** **Revenue Machine → Undo Last Apply (restore latest backup)**.
  Confirms, then overwrites `Prospects` with the most recent
  `Backup_Prospects_<timestamp>` tab.
- **Manual:** open the relevant `Backup_Prospects_<timestamp>` tab, copy its full
  range, and paste over the `Prospects` tab; or right-click the backup tab → Copy
  to → rename to `Prospects` after deleting the broken one.
- **Housekeeping:** backups accumulate as tabs. Delete old `Backup_Prospects_*`
  tabs once an apply is confirmed good. Backups are full-fidelity copies, so a
  rollback also restores any protected columns to their pre-apply state.
- **Hard stop:** if anything looks wrong mid-process, do nothing else and run Undo
  Last Apply, or restore from Google Sheets **version history** (File → Version
  history), which is independent of this script.

---

## 7. Operator instructions for Anton

One-time setup:

1. Open **`CorpFlowAI - US Medspa Revenue Machine`**.
2. **Extensions → Apps Script**, paste the §4 code into `Code.gs`, **Save**.
3. Reload the Sheet. Authorize the script when prompted (it only edits this Sheet;
   it has no email/contact permissions because it uses none).
4. Create a tab named exactly **`Audit Update Queue`** with the §2 headers.

Each time you receive audit updates (e.g. a CSV from Codex/Cursor):

1. Paste/import the CSV into **`Audit Update Queue`** (replace previous queue rows).
2. **Revenue Machine → 1. Validate Audit Update Queue** — fix any `INVALID` rows
   shown in `validation_message`.
3. **Revenue Machine → 2. Apply Audit Updates (DRY RUN)** — sanity-check the
   preview.
4. **Revenue Machine → 3. Apply Audit Updates** — click OK. A backup is made
   automatically.
5. Review the updated `Prospects` rows. **Approval and sending stay 100% manual:**
   nothing was approved and no send channel was set. To act on a draft, you edit
   `anton_approval_status` yourself, by hand, per the human-approval policy in
   `docs/marketing-automation-arm.md` §8.

What this process will **never** do: send email, contact a prospect, mark a row
approved, set a send channel, or change identity/contact/source/date columns.

---

## 8. Guardrails & future work

- **v1 is manual-trigger only.** No time-driven triggers, no n8n, no external
  calls. Adding any automation (e.g. n8n watching the Sheet) requires separate
  approval per `docs/marketing-automation-arm.md` §9.
- **No outreach automation** is introduced or implied. Sending remains a separate,
  human, per-prospect decision.
- **No repo/app coupling.** This process is entirely Google-Workspace-side; it does
  not touch the production app, DB, `POSTGRES_URL`, env vars, or `.env.template`.
- **Future (proposal only):** if queue volume grows, a `dry-run diff` export or a
  per-field change log tab could be added — still Sheet-side, still no outreach.
