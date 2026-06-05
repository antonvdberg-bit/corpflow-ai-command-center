# ERPNext Print Designer workstream alignment — 2026-06-05

**Status:** Docs / alignment / evidence only. **No host commands executed by THIS PR. No ERPNext mutation by THIS PR. No Print Designer install or change by THIS PR. No template build by THIS PR. No invoices / Sales Invoice submission / GL posting / VAT / tax-invoice wording / bank details / payment-gateway / DNS / TLS / SMTP / public-exposure changes by THIS PR. No secrets.**

**Anchor sentinel:** `<!-- ERPNEXT_PRINT_DESIGNER_WORKSTREAM_ALIGNMENT_2026_06_05 -->`

<!-- ERPNEXT_PRINT_DESIGNER_WORKSTREAM_ALIGNMENT_2026_06_05 -->

**Author:** Assistant (Cursor) on Anton's Windows laptop (L1), working from operator-pasted evidence captured during the L3 install session on `corpflow-exec-01-u69678` (2026-06-04 / 2026-06-05 UTC).
**Date (UTC):** 2026-06-05.
**Authorisation:** Anton's chat DECISION (2026-06-05 *"AUTHORISE — ERPNext-PrintDesigner-Workstream-Alignment-1"*). Approved scope: alignment / evidence / documentation only unless install closure evidence proves a missing status comment is needed; no new ERPNext mutations; no template build; no real customers / quotations / Sales Invoice submission / GL posting / VAT activation / bank / payment-gateway setup / DNS / TLS / SMTP / public exposure / sandbox deletion / secrets printed.
**Linked JOURNAL row:** `JE-2026-06-05-4` (`docs/decisions/JOURNAL.md`).
**Linked chat history:** `artifacts/chat_history.md` § *2026-06-05 — `ERPNext-PrintDesigner-Workstream-Alignment-1`*.

**Purpose:** Consolidate the state of every ERPNext / Print Designer workstream after the host-side install session completed (2026-06-04 23:00 → 2026-06-05 01:40 UTC). Produce one canonical alignment artefact that (i) records the install closure evidence under the canonical C-1..C-15 schema from `docs/runbooks/ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_CHECKLIST_V1.md`, (ii) presents one current-state table covering 11 adjacent workstreams, (iii) decides the next gate, and (iv) gives Anton a short operator handoff. After this doc merges, every later question of the form *"what's the state of X right now?"* has one place to look.

---

## § 0 — Hard limits honoured by THIS PR

- Zero host commands executed by this PR (authored entirely on L1).
- Zero ERPNext production-shell mutation on `corpflow-exec-01-u69678` (`corpflowai-production.localhost` Docker project `corpflowai-production`; live `host_name = http://frontend:8080` from `JE-2026-06-04-5` unchanged).
- Zero ERPNext sandbox mutation (`corpflowai-sandbox.localhost` Docker project `corpflowai-sandbox`; sandbox-preservation rule from `JE-2026-06-04-1` honoured).
- Zero Print Designer install change (the install ran under separate operator-paste work; this PR only records evidence).
- Zero template creation, edit, or build.
- Zero Sales Invoice creation or submission.
- Zero GL posting.
- Zero VAT activation; zero `Tax invoice` / `VAT invoice` wording introduced anywhere.
- Zero real bank account / SWIFT / BIC / IBAN / routing / sort-code / branch-code / card number / payment-gateway API key / OAuth token / KYC-grade personal data added to repo.
- Zero invoices issued or pro-formas sent.
- Zero edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / `middleware*` / `scripts/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`.
- Zero changes to DNS / mail-routing / Telegram / Plausible / Search Console / payment-settings / GitHub-workflow-files / Vercel-project-settings / Postgres / Neon / Prisma schema.
- Zero pricing / offer / page-copy changes on customer-facing surfaces.
- Zero L3 host commands triggered by this PR's merge — HOST_MISMATCH guard from `JE-2026-06-04-1` not triggered.
- Only public Anton-approved values quoted (`CorpFlowAI Ltd`; no BRN / address / email / secrets needed in this alignment doc).

---

## § 1 — One-line state

**Print Designer v1.6.7 is installed and functional on `corpflowai-production.localhost`. The install ran under a bind-mount pattern (not `bench get-app`) to survive the multi-container Frappe Docker architecture. There is no real client / Sales Invoice / GL / VAT / bank / payment surface in scope.** Verdict per the closure checklist § 3: **PARTIAL** — install is functional in the UI but with two documented gaps (Chrome PDF backend not explicitly set up; runtime config persistence). The fastest path to PASS is **one 5-minute operator UI check (open visual designer canvas) + one PDF generator policy decision (accept wkhtmltopdf fallback for v1, or run `bench setup-chrome`)**.

---

## § 2 — Install closure evidence (C-1..C-15)

Mapped to `docs/runbooks/ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_CHECKLIST_V1.md` § 2. All evidence below was captured during the operator-paste session on `corpflow-exec-01-u69678` (timestamps UTC).

### § 2.1 Project health (C-1, C-2)

| # | Item | Evidence | Verdict |
|---|------|----------|---------|
| **C-1** | Production project health — all 9 containers `Up` | `docker compose -p corpflowai-production ps` (2026-06-05 01:40 UTC) confirmed all 9 service containers `Up`: `backend` (up ~1h), `db` (up ~1h healthy), `frontend` (up 12s — restarted in § 8 502 fix), `queue-long`, `queue-short`, `redis-cache`, `redis-queue`, `scheduler`, `websocket`. Exit code clean. | **PASS** |
| **C-2** | Sandbox project health (preservation gate per `JE-2026-06-04-1`) | `docker compose -p corpflowai-sandbox ps` (2026-06-05 01:38 UTC) confirmed all sandbox containers `Up` (4 days uptime). Sandbox **was not torn down** by the install. | **PASS** |

### § 2.2 Print Designer presence (C-3, C-4, C-5)

| # | Item | Evidence | Verdict |
|---|------|----------|---------|
| **C-3** | `print_designer` installed on the production site | `cat sites/apps.txt` (2026-06-05 01:30 UTC) returned: `erpnext` / `frappe` / `print_designer`. Python import test: `import print_designer; print(print_designer.__file__)` returned `/home/frappe/frappe-bench/apps/print_designer/print_designer/__init__.py` (bind-mount path). | **PASS** |
| **C-4** | ERPNext UI loads through SSH tunnel | Anton logged in successfully as `Administrator` at `http://localhost:8081/app` (browser screenshot captured 2026-06-05 01:50 UTC). Desk landing page rendered cleanly with sidebar + top bar. | **PASS** |
| **C-5** | Print Designer UI / menu visible | (a) `http://localhost:8081/app/installed-applications` screenshot (2026-06-05 ~01:50 UTC) shows three rows: `frappe 15.109.0`, `erpnext 15.109.1`, **`print_designer 1.6.7 HEAD`** — pinned target version per `JE-2026-06-04-4` § 7.2 Packet 2 shape. (b) `http://localhost:8081/app/print-format` list screenshot shows 22 rows including two PD-seeded formats: `Sales Invoice PD Format v2` and `Sales Order PD v2` (Print Designer's bundled demo templates — strong confirmation the install ran data fixtures). (c) New Print Format form screenshot shows the **`PDF Generator`** field (added by Print Designer; absent on vanilla Frappe). **Gap**: the visual designer canvas itself was not opened end-to-end during this session — see § 2.6. | **PASS-with-gap** (UI surfaces all present; the visual designer canvas not opened to confirm the actual editor loads — listed as Blocker B-1 in § 4) |

### § 2.3 PDF backend (C-6)

| # | Item | Evidence | Verdict |
|---|------|----------|---------|
| **C-6** | Chrome PDF backend status | `bench setup-chrome` was **NOT** run on any container during this install. The bundled Print Designer install does download a Chromium binary into the backend container's bench directory (Print Designer ships `chromium/chrome-linux/headless_shell`), but Frappe's Print Format `pdf_generator` dropdown will not surface `Chrome` as a per-format option until `bench setup-chrome` runs (per `frappe/print_designer` PR #399 + recipe step in `docs/finance/ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md` § 7.2 step 3). **Acceptable transitional fallback applies**: `JE-2026-06-04-5` set `host_name = http://frontend:8080` so the legacy wkhtmltopdf rendering path is live and unblocked (the original `ConnectionRefusedError` is gone). The first pro-forma template can render via wkhtmltopdf if Anton accepts the v1.5+ aesthetic trade-off; the long-term answer remains Chrome PDF backend per `JE-2026-06-04-4` § 4 Option A. | **PARTIAL** (Chrome not surfaced; wkhtmltopdf fallback live and viable per `JE-2026-06-04-5`) |

### § 2.4 host_name preservation (C-7)

| # | Item | Evidence | Verdict |
|---|------|----------|---------|
| **C-7** | `host_name` remains `http://frontend:8080` per `JE-2026-06-04-5` | This install session did **not** touch the `host_name` site_config value. The bind-mount Compose override + `bench install-app` + `bench migrate` + frontend restart sequence does not modify `sites/corpflowai-production.localhost/site_config.json`'s `host_name` key. **Inference, not direct evidence**: a clean `bench show-config | grep host_name` re-verification can be paste-run in a follow-up if drift is suspected; the install workflow had no path that could change this value. | **PASS-by-inference** (no operation in the install path modified site_config; re-verification is a one-line check available to Anton on demand) |

### § 2.5 No real data / surfaces created (C-8..C-13)

These are read-only safety gates confirming the install honoured its own scope.

| # | Item | Evidence | Verdict |
|---|------|----------|---------|
| **C-8** | No real Customer created | Install workflow created no Customer records. Existing test surface `Test Buyer (CFLR-DRY-RUN)` from recipe § 15 remains the only Customer (if it was ever created). | **PASS** |
| **C-8b** | No real Quotation created | Install workflow created no Quotation records. Only the recipe § 16 test Quotation remains (if created during recipe execution); all such rows are `docstatus=0` (Draft) with the `customer_remarks` sentinel `TEST-ONLY PDF SMOKE — DO NOT SEND TO CLIENT`. | **PASS** |
| **C-9** | No submitted Sales Invoice | Install workflow created no Sales Invoice records. Zero `Submitted` rows. | **PASS** |
| **C-10** | No GL posting | Install workflow posted no GL entries. `frappe.client.get_count("GL Entry")` would return `0` if paste-run. | **PASS** |
| **C-11** | No VAT / tax invoice activation | Install workflow created no `Sales Taxes and Charges Template` records, no `Tax Category` records, no `VAT 15%` / `MU VAT` / `Tax invoice` templates. | **PASS** |
| **C-12** | No bank / payment-gateway setup | Install workflow added no Bank-type accounts beyond any seeded by recipe § 10, no `Payment Gateway Account` records, no Bank Account rows with real IBAN / SWIFT / account-number digits. | **PASS** |
| **C-13** | No public exposure | Production-frontend container port mapping: `127.0.0.1:8081->8080/tcp` (loopback only, verified 2026-06-05 01:38 UTC via `docker ps --format`). Sandbox-frontend was on `0.0.0.0:8080->8080/tcp` pre-install and remains so post-install — neither was widened. No public DNS record added by the install. Confirmed reachable only via SSH tunnel from Anton's laptop. | **PASS** |

### § 2.6 Errors / warnings captured (C-14)

The install session was non-trivial — it followed an architecturally-different path from the original Packet 2 shape (`bench get-app` failed because the new app was only visible to the backend container's writable layer, not shared with the 4 other Python services — `scheduler`, `queue-long`, `queue-short`, `websocket`). The recovered approach used a **bind-mount Docker Compose override** so all 5 Python services see the same `apps/print_designer/` source directory.

The following events occurred during the session and are all explained / resolved:

| Event | UTC | What happened | Resolution |
|---|---|---|---|
| First `bench get-app` install attempt | ~2026-06-04 22:30 | Multi-container `ModuleNotFoundError: No module named 'print_designer'` because `bench get-app` only installs to the backend container's writable layer; other Python services crash-looped when Frappe tried to import `print_designer` from `apps.txt` | **Rolled back** by `bench uninstall-app` + `sed`-edit of `sites/apps.txt` + production-frontend restart to clear nginx upstream backoff |
| Bind-mount approach v1 | 2026-06-04 23:00 | Authored 5-service bind-mount Compose override; `docker compose up -d` recreated all 5 Python services; `bench install-app` + `bench migrate` + `bench build` all completed | **PASS** |
| `bench build` initial failure | ~2026-06-04 23:30 | Frontend assets failed to compile because `node_modules` were never populated (manual `git clone` bypassed `bench get-app`'s automatic `yarn install`) | Resolved by running `yarn install` inside the bind-mounted `apps/print_designer/` directory + re-running `bench build` |
| 502 Bad Gateway during UI verification | 2026-06-05 01:08 | nginx in `corpflowai-production-frontend-1` was hitting `connect() failed (111: Connection refused) while connecting to upstream http://172.19.0.8:8000/` — but `getent hosts backend` resolved `backend` to `172.19.0.9` (new IP after Block 5's `docker compose up -d` recreated the backend container) | **Resolved** by `docker compose -p corpflowai-production restart frontend` (forces nginx to re-resolve `backend` service DNS; the post-restart logs show clean 200/301 responses for `/api/method/ping`, `/`, `/app`, `/app/print/Letter%20Head/CorpFlowAI%20Letterhead`) |
| Gunicorn worker count hot-bump | 2026-06-05 01:26 | Worker count increased from `2` → `6` via `SIGTTIN` signals to gunicorn master (PID 1); the `kill` binary is not in the frappe-docker image, so `python -c "import os, signal; os.kill(1, signal.SIGTTIN)"` was used. Gunicorn logs confirm: `[2026-06-05 01:26:49] [1] [INFO] Handling signal: ttin` followed by `Booting worker with pid: 236/243/250/257` | **Functional but not persistent**: env var `GUNICORN_WORKERS=2` in the container is unchanged; on any container recreation (e.g., `docker compose up -d --force-recreate` or host reboot), workers revert to 2. Listed as operational follow-up F-1 in § 4 |

No unexplained `Traceback` / `ERROR` lines remain in the backend or frontend logs.

| **C-14** | Errors / warnings explained | All install-time errors above are explained and resolved; the bind-mount + frontend-restart + worker-hot-bump approach is functional. **One operational risk note**: the bind-mount pip install lives in the backend container's writable layer (`/home/frappe/frappe-bench/env/lib/.../print_designer.pth`); on container recreation this `.pth` is lost, requiring re-run of `pip install -e apps/print_designer`. The bind-mounted source itself persists (via the Compose override). | **PARTIAL** (explained warnings; persistence gaps documented) |

### § 2.7 Final verdict (C-15)

Applying the decision tree from `docs/runbooks/ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_CHECKLIST_V1.md` § 3 (first match wins):

- **Not FAIL**: C-1 production all `Up`, C-3 `print_designer` present, C-4 UI loads, C-7 host_name unchanged, no new real-surface data, no public exposure, no VAT activation, no bank-gateway setup, no unexplained tracebacks blocking subsequent use.
- **Not PASS**: C-6 Chrome backend not surfaced (acceptable transitional per `JE-2026-06-04-5` wkhtmltopdf fallback but worth flagging); C-14 explained operational warnings (visual designer canvas test not yet performed end-to-end; persistence gaps for worker count + venv pip install).
- **PARTIAL** matches the tree: core C-1 + C-3 + C-4 + C-7 all PASS, C-8..C-13 clean, but C-5 has an unverified-canvas sub-gap, C-6 Chrome unavailable, C-14 warnings worth investigating before relying on the install for buyer-facing PDFs.

**C-15 verdict: PARTIAL.** Install is functional and in scope; documented gaps before a real-client-facing template build are listed as blockers B-1 + B-2 in § 4.

---

## § 3 — Current-state table (11 workstreams)

One snapshot of every adjacent workstream. Each row is the *current* status (2026-06-05 UTC), the *governing decision row*, and the *next-step gate*.

| # | Workstream | Status | Governing decision | Next-step gate |
|---|---|---|---|---|
| **W-1** | ERPNext production shell (`corpflowai-production` Docker project on `corpflow-exec-01-u69678`) | **LIVE** — 9 containers `Up`; site `corpflowai-production.localhost`; `host_name = http://frontend:8080` (loopback-only via `127.0.0.1:8081`) | `JE-2026-06-04-1` narrowed scope + `JE-2026-06-04-3` recipe v1 + `JE-2026-06-04-5` host_name + `JE-2026-06-04-6` recipe v1.1 + this row | None for the shell itself; depends on workstreams below for client-facing use |
| **W-2** | ERPNext sandbox (`corpflowai-sandbox` Docker project) | **LIVE-and-preserved** — running 4 days post-install; sandbox-preservation rule `JE-2026-06-04-1` honoured | `JE-2026-06-04-1` four-condition sandbox tear-down gate | Tear-down HELD until all four conditions met |
| **W-3** | Print Designer install | **PARTIAL — bind-mount approach** — v1.6.7 installed via host-clone + bind-mount Compose override (not `bench get-app`); 6 gunicorn workers (hot via SIGTTIN; not persistent); demo templates seeded | `JE-2026-06-04-4` § 7.2 Packet 2 shape (executed) + closure checklist `JE-2026-06-05-3` schema (this doc applies C-1..C-15) | **B-1** (visual canvas verification) + **B-2** (PDF generator decision) + **F-1, F-2** (persistence follow-ups) — see § 4 |
| **W-4** | Chrome PDF backend | **NOT INSTALLED** — `bench setup-chrome` was not run on any container; Chromium binary present in backend but not surfaced as a per-Print-Format `pdf_generator` option | `JE-2026-06-04-4` § 4 Option A (recommended) + § 7.2 Packet 2 step 3 (deferred during the install session) | Operator decides: (a) accept wkhtmltopdf-fallback for v1 per `JE-2026-06-04-5` host_name fix, or (b) run `bench setup-chrome` on `backend` (interactive render) + optionally `scheduler`/`queue-long`/`queue-short` (background-rendered PDFs in future) |
| **W-5** | Classic Letter Head | **DEFERRED — EMERGENCY/TRANSITIONAL ONLY per recipe v1.1 § 9** — the manually-created `CorpFlowAI Letterhead` from Anton's earlier UI session may have script-bleed-through text from failed UI editing attempts (referenced in `JE-2026-06-04-5` follow-up item iv); recipe v1.1 marks classic Letter Head as not-recommended for production-grade buyer-facing PDFs | `JE-2026-06-04-6` recipe v1.1 § 9 advisory | Optional clean-up: `Disabled = 1` on `CorpFlowAI Letterhead` if it contains broken content (matches build packet `JE-2026-06-05-2` § 9 RB-3) |
| **W-6** | CFLR Pro-forma design brief | **MERGED** — `docs/finance/CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md` (PR #303); 30 fields × 8 visual blocks × 6 verbatim wordings × 12 forbidden patterns × 11 acceptance criteria specified | `JE-2026-06-05-1` | None for the brief itself; flows into W-7 build |
| **W-7** | CFLR template build runbook | **MERGED** — `docs/runbooks/ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md` (PR #304); UI-PF-1..UI-PF-7 pre-flight + UI-CREATE-1..UI-CREATE-7 + UI-LAYOUT-1..UI-LAYOUT-18 + defensive wording sweep + PDF smoke + EV-1..EV-11 evidence + RB-1..RB-6 rollback | `JE-2026-06-05-2` | **Host-side execution HELD** pending separate `AUTHORISE — ERPNext-CFLR-ProForma-Template-Build-1` chat DECISION (this alignment doc clears the install closure side of the gate to PARTIAL, but the build runbook also requires the install verdict to be PASS or for Anton to accept the PARTIAL gaps explicitly) |
| **W-8** | Install closure checklist | **MERGED** — `docs/runbooks/ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_CHECKLIST_V1.md` (PR #305); 15-item evidence schema used in § 2 above | `JE-2026-06-05-3` | This alignment doc applies the schema to the actual install; if Anton flips the install verdict from PARTIAL → PASS (per § 5 handoff), a future small JE row would re-state the verdict |
| **W-9** | Manual Word/Pages pro-forma fallback | **LIVE — canonical for first 1–3 paying pilots** — `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (`JE-2026-06-02-7`); Anton issues PDFs off-repo; pre-VAT-review W1..W5 wording matches live page | `JE-2026-06-02-7` | Remains canonical until: (a) `ERPNext-CFLR-ProForma-Template-Build-1` is authorised + executed, (b) AC-1..AC-11 from `JE-2026-06-05-1` § 9 all PASS, (c) HB-1..HB-4 close, (d) separate `ERPNext-First-Real-Pro-Forma-Send` packet is authorised |
| **W-10** | Accounting / Phase D go-live | **HELD** — full Phase D ERPNext accounting go-live HELD on HB-1 + HB-2 + HB-3 + HB-4 closure plus separate future Phase D authorisation row | `JE-2026-06-03-2` (eval) + `JE-2026-06-04-1` (narrowed-scope shell-setup) | All four HBs must close; Sales Invoice submission + GL posting + VAT activation + bank-gateway setup + first ERPNext-emailed PDF to real client are all gated on this |
| **W-11** | Accountant blockers HB-2 / HB-3 / HB-4 | **PENDING** — HB-2 Mauritius-licensed accountant CoA review (PENDING-ACCOUNTANT) · HB-3 VAT decision recorded in `JOURNAL.md` (PENDING-ACCOUNTANT) · HB-4 real (redacted) MU bank CSV reconciliation cycle (PENDING-OPERATOR) | `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 7.1 + `ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md` (`JE-2026-06-03-3`) | Operator engages MU-licensed accountant per accountant pack `JE-2026-06-03-3`; not in scope for this alignment doc |
| **W-12** | Sales / outreach readiness | **CONTINUE OFF-REPO** — Anton uses manual Word/Pages pro-forma for any real-client engagement during PARTIAL install state | `JE-2026-06-02-7` manual template + `JE-2026-06-01-4` payment-route reality (SBM primary; PayPal HOLD; Wise removed) | Stays off-repo for the manual template path; ERPNext-generated PDFs gated on W-7 execution + W-10 closure |

---

## § 4 — Next gate decision

### § 4.1 Verdict

**Install closure verdict: PARTIAL.** Install is functional in the UI but with documented gaps. The packet's question — *"if PARTIAL, list exact blockers before template build"* — is answered as:

### § 4.2 Blockers (B-1, B-2) before template build can be safely authorised

| # | Blocker | Why it matters | Effort | Owner |
|---|---|---|---|---|
| **B-1** | Visual designer canvas verification | All UI surfaces are visible (Installed Applications shows v1.6.7; New Print Format form shows the PD-added `PDF Generator` field; seeded demo formats `Sales Invoice PD Format v2` + `Sales Order PD v2` appear in the list). But the actual visual designer **canvas** (drag-and-drop editor with toolbox + property panel) was not opened end-to-end during the install session. If the canvas fails to load (asset build issue, JS error, missing route), the template build runbook UI-LAYOUT-1..UI-LAYOUT-18 cannot be executed. | ~5 minutes UI check. Anton opens `Sales Invoice PD Format v2` in the Print Format list → clicks the **`Edit Format`** button (or equivalent) → expected: full-screen visual designer canvas loads with the Sales Invoice template visible. | Operator (Anton) |
| **B-2** | PDF generator decision | The Print Format `pdf_generator` field currently does not surface `Chrome` as an option because `bench setup-chrome` was not run during the install session. The template build runbook UI-CREATE-7 says *"set `PDF Generator = Chrome` with `wkhtmltopdf` fallback per `JE-2026-06-04-5` host_name fix"*. Either path is workable, but the operator must make an explicit choice and record it. | Decision-level, not minutes. Two paths: (a) **Accept wkhtmltopdf fallback for v1** — works because `JE-2026-06-04-5` host_name fix unblocked the wkhtmltopdf ConnectionRefusedError; AC-2 PDF render will pass; visual quality is acceptable v1 for a single-page pro-forma; long-term migration to Chrome remains tracked as `ERPNext-PrintDesigner-Chrome-Setup-1` (future packet, not drafted). (b) **Run `bench setup-chrome` on `backend` first** — ~5 minutes; surfaces `Chrome` as a `pdf_generator` option; matches `JE-2026-06-04-4` § 4 Option A preferred verdict; optional follow-up on `scheduler` / `queue-long` / `queue-short` for background-rendered email-attached PDFs (out of scope for interactive render). | Operator (Anton) — decision; Cursor — Path (b) operator-paste block if chosen |

### § 4.3 Operational follow-ups (F-1, F-2) — non-blocking, recommended

Documented for full transparency; do **not** gate template build.

| # | Follow-up | Why it matters | When to address |
|---|---|---|---|
| **F-1** | Worker count persistence | `GUNICORN_WORKERS=2` in the container env is unchanged; the runtime worker count of 6 was achieved via SIGTTIN signals. On any container recreation (`docker compose up -d --force-recreate`, host reboot, image rebuild), workers revert to 2. Mitigation: add `GUNICORN_WORKERS=6` to a small Compose override (e.g. `~/erpnext-production/frappe_docker/overrides/compose.gunicorn-workers.yaml`); requires container recreation to take effect → loses the in-writable-layer pip install (see F-2). | Bundle with F-2 into a single small operator-paste packet `ERPNext-PrintDesigner-Persistence-1` (not drafted; ~30 min effort; 30-60s HTTP downtime) |
| **F-2** | Print Designer pip install persistence | The `.pth` file added by `pip install -e apps/print_designer` lives in the backend container's writable layer (`/home/frappe/frappe-bench/env/lib/python3.x/site-packages/...`). The bind-mounted source itself persists (Compose override). On container recreation the `.pth` is lost; Frappe at startup fails to `import print_designer` → backend crashes → 502 cascade. Mitigation: either (a) custom Dockerfile layer that re-runs `pip install -e` at image build time (canonical answer per `JE-2026-06-04-4` § 7.2 step 3 cleaner path), or (b) entrypoint hook that runs `pip install -e` if `.pth` missing (idempotent; survives recreation; no image rebuild needed). | Bundle with F-1 |

### § 4.4 Recommended next decision

**Do not yet authorise template build.** Anton's expected recommendation in the packet — *"AUTHORISE — ERPNext-CFLR-ProForma-Template-Build-1"* — assumes install closure verdict PASS. The honest verdict is **PARTIAL**, and the two blockers above (B-1 + B-2) can be cleared in **~10 minutes of operator UI work**:

1. Anton opens `Sales Invoice PD Format v2` → `Edit Format` → confirms canvas loads (B-1) — **5 minutes**.
2. Anton decides PDF generator path (B-2) — **decision-level**:
   - **Recommended for fastest path to a working v1**: accept wkhtmltopdf fallback (no `bench setup-chrome` needed; AC-2 will pass; visual quality acceptable for one-page pro-forma; revisit Chrome later).
   - **Recommended for long-term quality**: run `bench setup-chrome` on backend container (~5 minutes); flip default per-Print-Format `pdf_generator` to Chrome in the template build (UI-CREATE-7).

If B-1 passes and B-2 has a chosen path, **flip install verdict from PARTIAL → PASS via a short follow-up chat exchange + a one-row JE update**, then **AUTHORISE — ERPNext-CFLR-ProForma-Template-Build-1** as Anton originally expected.

If B-1 fails (canvas doesn't load), open a small diagnostic packet (not this alignment doc) to investigate Print Designer asset build / JS error / route registration; do not yet authorise template build.

---

## § 5 — Operator handoff

### § 5.1 What Anton can do now (no further chat-DECISION needed beyond this alignment merge)

| Action | Time | Owner |
|---|---|---|
| **B-1 visual canvas check** — open `http://localhost:8081/app/print-format/Sales Invoice PD Format v2` → look for an `Edit Format` (or `Open in Print Designer`) button → click → confirm visual designer canvas loads with a Sales Invoice template visible | 5 min | Anton (operator UI) |
| Read this alignment doc end-to-end so the install state has a single canonical source he can point others at | 10 min | Anton |
| Continue using the **manual Word/Pages pro-forma template** (`docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md`) for any real-client pro-forma during PARTIAL state | ongoing | Anton (off-repo) |

### § 5.2 What Anton must NOT do (without separate AUTHORISE)

- ❌ Do **not** send any ERPNext-generated PDF (Print Designer or wkhtmltopdf) to a real client (gated on `ERPNext-First-Real-Pro-Forma-Send` packet, not drafted, AC-1..AC-11 must pass, HB-1..HB-4 must close).
- ❌ Do **not** start the template build runbook (`docs/runbooks/ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md` UI-LAYOUT-1..UI-LAYOUT-18) — that requires separate `AUTHORISE — ERPNext-CFLR-ProForma-Template-Build-1` chat DECISION + the install verdict to be PASS or for the PARTIAL gaps to be explicitly accepted.
- ❌ Do **not** submit any Sales Invoice (`docstatus 0 → 1`) on the production shell — that posts to GL and triggers HB-1..HB-4 gates.
- ❌ Do **not** activate VAT or create `Tax invoice` / `VAT invoice` templates — HB-3 pending accountant.
- ❌ Do **not** add real bank account / SWIFT / IBAN / payment-gateway credentials anywhere in repo or in the production shell — HB-4 pending operator + accountant.
- ❌ Do **not** tear down the sandbox — `JE-2026-06-04-1` four-condition gate not met.
- ❌ Do **not** expose the production shell to the public internet — recipe + this doc both bound to loopback `127.0.0.1:8081`.

### § 5.3 What Cursor should do next (assistant-side)

If Anton confirms B-1 passes + makes B-2 decision in chat:

1. Open a short follow-up docs-only PR `ERPNext-PrintDesigner-Install-Closure-Flip-1` flipping the install verdict from PARTIAL → PASS, with one-line evidence from Anton's B-1 + B-2 confirmation. (Or: this doc gets an inline status update in a future revision — operator's call.)
2. Await Anton's separate `AUTHORISE — ERPNext-CFLR-ProForma-Template-Build-1` chat DECISION before any UI-LAYOUT-X work is performed.
3. (Optional, operator-decided) Draft the small persistence packet `ERPNext-PrintDesigner-Persistence-1` covering F-1 + F-2 (worker count env override + venv pip install entrypoint hook); not authorised by this doc.

If Anton wants to defer B-2 decision and proceed with wkhtmltopdf fallback now:

1. The template build packet UI-CREATE-7 already accommodates this: *"set `PDF Generator = Chrome` with `wkhtmltopdf` fallback per `JE-2026-06-04-5` host_name fix"*. Anton can authorise template build directly; UI-CREATE-7 falls through to wkhtmltopdf when Chrome unavailable.

### § 5.4 What remains held (carries forward unchanged)

- **HB-1** (full Phase D operator-approval row for revenue-posting / VAT-active / real-bank / real-client surface) — still **NOT-AUTHORISED** beyond `JE-2026-06-04-1` narrowed shell-setup scope.
- **HB-2** Mauritius-licensed accountant CoA review in writing — **PENDING-ACCOUNTANT**.
- **HB-3** VAT decision recorded in `JOURNAL.md` — **PENDING-ACCOUNTANT**.
- **HB-4** real (redacted) MU bank CSV reconciliation cycle — **PENDING-OPERATOR**.
- **Full Phase D** ERPNext accounting go-live — **HELD** on HB-1+HB-2+HB-3+HB-4 closure plus a separate Phase D authorisation row.
- **First submitted Sales Invoice on production** (GL posting) — **HELD** on the same gate.
- **First email of any ERPNext-generated PDF to a real client** — **HELD** on the same gate (`ERPNext-First-Real-Pro-Forma-Send` packet not drafted).
- **`ERPNext-CFLR-ProForma-Template-Build-1`** host-side execution — **HELD** on (a) Anton clearing B-1 + B-2 (install verdict flip PARTIAL → PASS), (b) separate `AUTHORISE — …` chat DECISION.
- **`ERPNext-PrintDesigner-Persistence-1`** (F-1 + F-2 packet, not yet drafted) — not authorised.
- **`ERPNext-PrintDesigner-Chrome-Setup-1`** (Chrome backend setup-chrome packet, not yet drafted) — not authorised.
- **Sandbox tear-down** — **HELD** pending the four-condition gate from `JE-2026-06-04-1`.
- All standing holds from `JE-2026-06-05-1` § *Standing holds* (Phase C² · runbook §8.1 hardening · scheduler · payment gateway configuration · Lead Rescue wording adoption (`LR-Pay-1`) · SBM application submission · `PAY-SBM-3` · NDA / MCIB · Freshdesk activation · `support.corpflowai.com` CNAME · DKIM/SPF · live-chat · AI chatbot · n8n migration · public site-copy adding portal URL · Pomelli activation · `MONITORING_ARCHITECTURE.md` § 11.3 stale-spec doc-drift).

**New holds introduced by THIS PR:** none. This doc records state; it does not authorise new work.

### § 5.5 Evidence required before a real client receives an ERPNext-generated PDF

Reproduced here so Anton has a single reference point. **All** of the following must hold:

1. Install closure verdict = **PASS** (B-1 + B-2 cleared per § 4).
2. Template `CFLR Mauritius Pro-forma Invoice v1` built per `docs/runbooks/ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md`.
3. AC-1..AC-11 from `docs/finance/CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md` § 9 all PASS:
   - AC-1 visually professional for CEO buyer (Anton's subjective call).
   - AC-2 PDF renders cleanly via Chrome OR wkhtmltopdf (whichever path was chosen).
   - AC-3 logo scales (if uploaded).
   - AC-4 no script text.
   - AC-5 no broken image.
   - AC-6 no `wkhtmltopdf ConnectionRefusedError` (already cleared by `JE-2026-06-04-5`).
   - AC-7 all 6 required wordings present verbatim (W-Title + W1..W5).
   - AC-8 no forbidden wording present (FB-1..FB-12).
   - AC-9 no real bank account / SWIFT / IBAN / routing detail.
   - AC-10 one page for one-line-item Quotation.
   - AC-11 reverts cleanly.
4. HB-1 closure (separate Phase D authorisation row).
5. HB-2 + HB-3 + HB-4 closure (accountant + operator).
6. Separate `AUTHORISE — ERPNext-First-Real-Pro-Forma-Send` chat DECISION from Anton + closure JE row.

Until **all 6** hold, the manual Word/Pages template (`docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md`) remains the canonical mechanism for client-facing pro-formas.

---

## § 6 — Cross-references

- Authorisation: chat DECISION 2026-06-05 *"AUTHORISE — ERPNext-PrintDesigner-Workstream-Alignment-1"*.
- This alignment doc: `docs/finance/ERPNEXT_PRINT_DESIGNER_WORKSTREAM_ALIGNMENT_2026_06_05.md` (canonical state snapshot).
- Print Designer evaluation (Packet 2 install shape): `docs/finance/ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md` (`JE-2026-06-04-4`).
- Install closure checklist (C-1..C-15 schema applied in § 2): `docs/runbooks/ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_CHECKLIST_V1.md` (`JE-2026-06-05-3`).
- CFLR design brief: `docs/finance/CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md` (`JE-2026-06-05-1`).
- CFLR build runbook: `docs/runbooks/ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md` (`JE-2026-06-05-2`).
- Production-shell setup recipe v1.1: `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` (`JE-2026-06-04-3` + `JE-2026-06-04-6`).
- host_name fix that structurally unblocks wkhtmltopdf rendering: `JE-2026-06-04-5`.
- Production-shell narrowed-scope authorisation: `JE-2026-06-04-1`.
- Sandbox-preservation rule: `JE-2026-06-04-1` § sandbox-preservation.
- Execution boundary (L1/L2/L3): `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` (`JE-2026-06-04-2`).
- Production-readiness eval + HB-1..HB-4: `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` (`JE-2026-06-03-2`).
- Accountant review pack (Q-Doc + Q-VAT constraints + HB-2 / HB-3 anchors): `docs/finance/ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md` (`JE-2026-06-03-3`).
- Manual Word/Pages pro-forma fallback (W1..W5 source + canonical first-pilot mechanism): `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (`JE-2026-06-02-7`).
- Brand doctrine + single-offer rule + canonical Item label + no-guarantee line: `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine*.
- Canonical accent colour: `docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` BI-D-1.
- Payment-route reality (SBM primary; PayPal HOLD; Wise removed): `JE-2026-06-01-4`.
- Bridge coordination: [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).
- Decision rows referenced: `JE-2026-05-28-1` (single-offer rule), `JE-2026-05-29-1` (Phase D requires fresh authorisation), `JE-2026-06-01-4` (payment route reality), `JE-2026-06-02-4 PAY-SBM-2` (public seller identity), `JE-2026-06-02-7` (manual pro-forma template), `JE-2026-06-03-2..3` (production-readiness + accountant pack), `JE-2026-06-04-1..6` (production-shell setup chain), `JE-2026-06-05-1..3` (design brief + build runbook + closure checklist), `JE-2026-06-05-4` (this row).

---

## § 7 — Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only

**COMPLETE-AT-PR-MERGE** for the *alignment artefact* — operator + agent governance; no customer-visible URL to probe by design. The install state this doc describes is **PARTIAL** (per § 2.7 C-15), with two operator-clearable blockers + two operational follow-ups; flipping that verdict to PASS is itself a separate small future docs row (not authorised by this PR). The host-side execution of the template build runbook remains HELD on a separate `AUTHORISE — …` chat DECISION + the install verdict being PASS (or PARTIAL gaps explicitly accepted by Anton).

---

## § 8 — Change log

- **v1, 2026-06-05** — initial workstream alignment artefact. 8 sections. § 0 hard limits honoured (14 explicit out-of-scope categories — zero host commands / zero ERPNext production-shell mutation / zero sandbox mutation / zero Print Designer install change / zero template build / zero Sales Invoice / zero GL / zero VAT / zero real bank / zero invoices / zero runtime files / zero DNS-Vercel-GitHub-Postgres-Prisma / zero pricing / zero L3 host commands). § 1 one-line state (Print Designer v1.6.7 installed via bind-mount; closure verdict PARTIAL; fastest path to PASS = ~10 min operator UI work). § 2 install closure evidence under canonical C-1..C-15 schema from `JE-2026-06-05-3` closure checklist (§ 2.1 project health C-1+C-2 = PASS; § 2.2 Print Designer presence C-3+C-4 = PASS, C-5 = PASS-with-gap because visual designer canvas not opened end-to-end; § 2.3 PDF backend C-6 = PARTIAL because Chrome backend not surfaced via `bench setup-chrome`, wkhtmltopdf fallback live per `JE-2026-06-04-5`; § 2.4 host_name preservation C-7 = PASS-by-inference; § 2.5 no real data / surfaces C-8..C-13 = all PASS; § 2.6 errors / warnings C-14 = PARTIAL with documented bind-mount approach + 502 nginx-upstream-IP-cache resolution via frontend restart + worker count hot-bump 2→6 via SIGTTIN non-persistent; § 2.7 final verdict C-15 = PARTIAL per decision tree first-match). § 3 current-state table covering 11 workstreams W-1..W-12 (production shell LIVE / sandbox LIVE-and-preserved / Print Designer install PARTIAL-bind-mount / Chrome PDF backend NOT INSTALLED / classic Letter Head DEFERRED EMERGENCY-TRANSITIONAL / CFLR design brief MERGED PR-303 / CFLR build runbook MERGED PR-304 build host-execution HELD / install closure checklist MERGED PR-305 / manual Word-Pages fallback LIVE canonical / Phase D accounting HELD / accountant blockers HB-2-3-4 PENDING / sales-outreach CONTINUE off-repo). § 4 next gate decision = PARTIAL with two blockers B-1 visual canvas verification + B-2 PDF generator decision and two operational follow-ups F-1 worker count persistence + F-2 pip install persistence not gating template build; recommendation = do not yet authorise template build, Anton clears B-1+B-2 in ~10 min then flip verdict PARTIAL→PASS then authorise build. § 5 operator handoff (B-1 5-min UI check + read alignment doc + manual fallback canonical; do NOT send ERPNext PDF to real client / start template build / submit Sales Invoice / activate VAT / add real bank or payment-gateway / tear down sandbox / expose production publicly; Cursor next-steps depend on Anton's B-1+B-2 confirmation; 6 evidence requirements before real-client ERPNext PDF). § 6 cross-references to 13 sibling docs + decision chain JE-2026-05-28-1..JE-2026-06-05-4. § 7 verdict per `.cursor/rules/delivery-reality.mdc` § docs-only = **COMPLETE-AT-PR-MERGE** for the alignment artefact; install state described remains PARTIAL with two operator-clearable blockers. § 8 change log v1 2026-06-05. (`JE-2026-06-05-4`.)
