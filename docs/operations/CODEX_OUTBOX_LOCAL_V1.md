# Codex → Cursor outbox (local L1) v1

> **Status:** OPERATIONAL (local L1). Docs + one zero-dependency operator script.
> **No server (L3) change. No `codex_drop` user. No new credential. No gate.**
> This changes no app runtime code, dependencies, env vars, `.env.template`,
> database, `POSTGRES_URL`, Vercel config, or secrets. The validator runs **locally**
> and only reads files + moves folders. **No email, no network/external calls, no
> Google Sheet writes, no outreach, no approval/send mutation.**
> **Owner:** Anton (operator). **Author:** Cursor (L1). **Created:** 2026-06-26.
> **Anchor sentinel:** `<!-- CODEX_OUTBOX_LOCAL_V1 -->`

<!-- CODEX_OUTBOX_LOCAL_V1 -->

## 1. What this is (and why local, not the server)

A real, minimal, safe handoff so **Codex output files reach Cursor/operator and get
validated** before anything is imported into the Google Sheet.

A server drop on `corpflow-exec-01-u69678` (the originally-preferred
`/srv/corpflowai/codex-outbox/` with a restricted `codex_drop` SFTP user) was
evaluated and **deferred**: it is a brand-new L3 execution surface with a new
credential, which per
`docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` §5.3 + §10
requires an ADR, the Migration-to-Server checklist, a monitoring row, and Anton's
own SSH hands. It is **not** built here. (Codex also has **no authorized direct
server write path** today — it runs in OpenAI infra, not on the box;
`DELIVERY_ACCELERATION_V1.md` §4.3, `CODEX_UTILIZATION_PLAN_V1.md` §8.)

The local model gives Cursor a retrievable, validatable file packet **now**, with
zero box change and zero new credential. If a true server drop is wanted later,
open the ADR + gate per the boundary doc §10.

## 2. Access model (operator-mediated; Codex gets no key)

1. **Codex** produces the batch packet in its own workspace and returns it as
   transfer-safe content per `docs/operations/CODEX_INTEGRATION_CONTRACT_V1.md`
   (full file content / CSV / JSON manifest). **Codex does not write the Sheet,
   open PRs, send outreach, or hold any server/SSH credential.**
2. **Anton (operator)** saves those files into the local **incoming** folder as a
   `batch-###/` packet (copy-paste or download — a human action, no automation).
3. **Cursor (L1)** runs the validator (§5). Valid packets move to **processed/**;
   invalid packets move to **rejected/** with a `validation_report.txt`. A human
   then imports a processed `audit_update_queue.csv` into the Google Sheet's
   `Audit Update Queue` tab and runs the Sheet's own `Apply Validated Queue`
   (`US_MEDSPA_REVENUE_MACHINE_SHEET_UPDATE_PROCESS_V2.md`).

Nothing in this path sends, approves, or contacts anyone.

## 3. Location & folder structure

The outbox lives **outside the repo** so prospect data is never committed:

```text
C:\CorpFlow\codex-outbox\medspa-audits\
  incoming\    <- operator drops batch-### packets here
  processed\   <- Cursor moves VALID batches here (+ validation_report.txt)
  rejected\    <- Cursor moves INVALID batches here (+ validation_report.txt)
```

Override the root with `--root <path>` or the `CODEX_OUTBOX_ROOT` env var (a local
process var only — not an app/Vercel env var).

## 4. Expected Codex batch packet

```text
batch-###/
  audit_update_queue.csv   (required) - exact Audit Update Queue headers, values only
  manifest.json            (required) - Codex Integration Contract v1 §2.D manifest
  source_rows.json         (optional) - public evidence per row; audit trail ONLY,
                                        never imported into the Sheet
```

`audit_update_queue.csv` allowed headers (exact set; the only writable fields):
`business_name`, `website_url`, `audit_status` (`Not started` / `Audited` /
`Outreach drafted` only), `cta_clarity_score_1_5`, `booking_path_score_1_5`,
`mobile_trust_speed_score_1_5`, `service_clarity_score_1_5`, `lead_capture_score_1_5`,
`lead_rescue_rating` (`High`/`Medium`/`Low`), `personalized_angle`,
`draft_outreach_subject`, `draft_outreach_body`, `last_reviewed_date` (`YYYY-MM-DD`),
`owner`.

`manifest.json` required keys: `artifact_name`, `intended_destination`, `owner`,
`source_context`, `status`, `allowed_use`, `prohibited_use`,
`required_approval_gate`, `generated_at`.

## 5. Validator (Cursor/operator runs this)

```bash
# Validate every batch-* folder in incoming/ and move them to processed/ or rejected/
node scripts/codex-outbox-validate.mjs --root "C:\CorpFlow\codex-outbox\medspa-audits"

# Validate a single batch
node scripts/codex-outbox-validate.mjs --batch batch-004

# Inspect only, do not move
node scripts/codex-outbox-validate.mjs --dry-run
```

The validator (`scripts/codex-outbox-validate.mjs`, Node built-ins only) rejects a
batch if any of these hold (mirrors the Codex Integration Contract + Sheet schema):

- a required file (`audit_update_queue.csv` / `manifest.json`) is missing;
- the CSV has a **forbidden** column (`anton_approval_status`,
  `approved_send_channel`, `date_added`, `do_not_contact_reason`,
  `next_action_date`, or any identity/contact/source column) or an unknown column;
- a row is missing `business_name` or `website_url`;
- a score is not an integer 1–5; `lead_rescue_rating` not High/Medium/Low;
  `audit_status` outside the safe subset (so `Sent` / `Anton approved` are rejected);
  `last_reviewed_date` not `YYYY-MM-DD`; a text field over 2000 chars;
- any cell looks like a formula (`=`, `+`, `@`);
- `manifest.json` is invalid JSON, missing a required key, or references a
  forbidden approval/send field.

It is **read + move only**: no email, no network call, no Sheet write, no DB.

## 6. Smoke test result (2026-06-26)

Run on three sample batches in `incoming/`:

- **batch-002 (valid, 2 rows × 14 cols)** → verdict **VALID** → moved to
  `processed/batch-002` with `validation_report.txt`.
- **batch-003 (invalid)** → verdict **INVALID** → moved to `rejected/batch-003`.
  Errors correctly caught: forbidden `anton_approval_status` column;
  `cta_clarity_score_1_5 = 9` out of range; `audit_status = Sent` rejected;
  seven missing `manifest.json` keys.
- **batch-001 (manifest had a UTF-8 BOM)** → initially INVALID; the validator was
  hardened to strip a leading BOM, after which clean batches pass.

Test batches were removed afterward; the outbox starts empty
(`incoming/`, `processed/`, `rejected/` all clean).

## 7. What Codex should output next

A `batch-###/` packet (§4) returned as transfer-safe content per the Codex
Integration Contract — `audit_update_queue.csv` + `manifest.json` (+ optional
`source_rows.json`). Codex must **not** include approval/send fields, must **not**
set `audit_status` to `Sent`/`Anton approved`, must **not** add formulas, and must
**not** attempt to write the Sheet or the server.

## 8. What Cursor does after files arrive

Run `node scripts/codex-outbox-validate.mjs` (§5). Report the verdict + the
`processed/`|`rejected/` destination. For a processed batch, hand the CSV to the
human to import into the Sheet's `Audit Update Queue` and run `Apply Validated
Queue`. Approval and sending stay 100% manual and outside this tool.

## 9. Guardrails (carried forward, non-negotiable)

- **No Codex direct Sheet writes; no Codex server/SSH credential.**
- **No `MailApp` / `GmailApp` / `UrlFetchApp`; no outreach automation.**
- **No approval/send mutation; no `anton_approval_status` / `approved_send_channel`
  writes.**
- **No production app/runtime change, no DB, no `POSTGRES_URL`, no env vars, no
  `.env.template`, no app dependencies, no second app/database.**
- **No L3 server change** — the local outbox needs none. A server drop is a
  separate ADR + Migration-to-Server gate (`SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`
  §10).

## 10. Cross-references

- `docs/operations/CODEX_INTEGRATION_CONTRACT_V1.md` — packet shape + handoff contract.
- `docs/marketing/US_MEDSPA_REVENUE_MACHINE_SHEET_UPDATE_PROCESS_V2.md` — the Sheet-side `Apply Validated Queue` flow that consumes a processed CSV.
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — why the server drop is gated (§5.3, §6, §10).
- `docs/operations/OPERATOR_DISPATCH_ROUTER.md` §7.1 — Codex boundary (no PRs, no direct writes).
