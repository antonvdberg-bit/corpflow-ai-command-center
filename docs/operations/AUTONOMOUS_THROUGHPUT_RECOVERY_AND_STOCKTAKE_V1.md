# Autonomous throughput recovery + delivery stocktake (v1)

**Status:** Docs/operating packet only. **No runtime, no deploy, no env/secrets, no DB/schema, no payment integration, no automated WhatsApp/SMS/email sends, no client-facing launch, no paid tools, no second app/database.**
**Owner:** Anton (operator) for every hard gate; Cursor for docs/PR execution; Codex for bounded research/review only.
**Created:** 2026-06-30.
**Implements:** GitHub issue [#507](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/507) — *Autonomous throughput recovery + delivery stocktake*. Refs [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249), [#493](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/493), [#495](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/495).
**Anchor sentinel:** `<!-- AUTONOMOUS_THROUGHPUT_RECOVERY_V1 -->`

<!-- AUTONOMOUS_THROUGHPUT_RECOVERY_V1 -->

## 0. The problem in one paragraph

CorpFlowAI already has the assets it needs. The bottleneck is **Anton as courier**: progress stalls because Anton hand-relays instructions and status between ChatGPT, Cursor, Codex, n8n, and GitHub. The current heartbeat is **read-only + Telegram** — it wakes *Anton*, not the *work system*. This packet is a stocktake plus a 48-hour board that (a) makes stale/action-needed work land in a durable, machine-readable queue the executors already watch (#249/#493/#507), and (b) names exactly what can move **without Anton** this afternoon versus what genuinely needs him. It does **not** build new systems or widen any trust boundary.

This packet **sequences existing canon**. Where it disagrees with a canonical doc, **the canonical doc wins** (§10). It authorizes nothing by itself.

---

## 1. Current built asset map

What already exists and works. (State legend: **Live** = in production; **Sandbox** = tenant/sandbox-verified; **Docs** = designed, not built; **Gated** = built behind an operator gate.)

### 1.1 Core / Factory / `/change`

| Asset | State | Reference |
|---|---|---|
| One production app (Next.js, pages router) + one Postgres (Neon via `POSTGRES_URL`) | **Live** | `docs/operations/POSTGRES_PROVIDER.md` |
| Factory health + production-pulse runtime endpoints | **Live** | `docs/operations/PRODUCTION_PULSE_V1.md` |
| Factory control loop (daily drift: `origin/main` ↔ Vercel ↔ health ↔ cron) | **Live** (GitHub Action) | `docs/operations/FACTORY_CONTROL_LOOP.md` |
| CMP router + tenant/factory gates (`requireDormantGate` / `requireFactoryMasterOnly`) | **Live** | `lib/cmp/README.md` |
| `/change` Change Console (client-facing delivery view) + workflow-state derivation | **Live** | `docs/runbooks/CHANGE_CONSOLE_INSPECTION.md`, `.cursor/rules/delivery-reality.mdc` |
| Technical Lead observer (Phase A/B) — audits into `technical_lead_audits` | **Live** | `AGENTS.md` § Technical Lead |
| CMP PR delivery gate + delivery verdict/alerts | **Live** | `docs/operations/CMP_PR_DELIVERY_GATE.md`, `docs/operations/DELIVERY_VERDICT_AND_ALERTS.md` |

### 1.2 CorpFlowAI business systems

| Asset | State | Reference |
|---|---|---|
| Tenant Workflow Foundation (`workflow_definitions` / `workflow_runs` / `workflow_steps`) | **Live** | `artifacts/quality-audits/2026-06-11-living-word-mauritius/workflow-engine-adoption-review.md` |
| `automation_events` spine (append-only, idempotent, optional n8n forward) | **Live** | `docs/automation-framework.md` |
| Transactional email — `password_reset` golden path (n8n + Gmail) | **Live** | `docs/n8n/password-reset-email-recipe.md` |
| Chat widget platform (config, loader, retrieval AI adapter, AI kill-switch) | **Live** | `lib/server/chat-widget/*` |
| Admin / operator cockpits (`/admin/lead-rescue`, factory routes) | **Live** | `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` |
| Analytics v1 (Plausible) design + adapter contract | **Docs** (runtime install gated) | `docs/analytics/CORPFLOW_ANALYTICS_V1.md` |

### 1.3 Client tenant surfaces

| Tenant | Surfaces | State | Reference |
|---|---|---|---|
| **LuxeMaurice** (`luxe-maurice`, `lux.corpflowai.com`) | Marketing site, property pages, `/change` console | **Live** | `docs/operations/TENANT_CLIENT_LOGIN.md`, quality audits |
| **Living Word Mauritius** (`living-word-mauritius`) | site-preview, chat widget (AI retrieval v1), tenant workflows, lead follow-up operator view, GHL read-only probe | **Sandbox** (verified) | `artifacts/quality-audits/2026-06-11-living-word-mauritius/*` |

### 1.4 Product lineup / go-to-market surfaces

| Surface | Route | State | Reference |
|---|---|---|---|
| AI Lead Rescue (pan-vertical wedge) | `/lead-rescue` | **Live** | `components/AiLeadRescueLanding.js` |
| AI Lead Rescue — Mauritius property (wedge) | `/lead-rescue/property-mauritius` | **Live** | `components/AiLeadRescuePropertyMauritiusLanding.js` |
| Product A — US clinics (premium) | `/product-a/us-clinics` | **Live** | `components/ProductAUsClinicLanding.js` |
| Product A — Mauritius property (premium) | `/product-a/mauritius` | **Live** (PR #506) | `docs/marketing/PRODUCT_A_MAURITIUS_PROPERTY_OFFER_V1.md` |
| US Medspa revenue machine (Sheet + audit workflow, human-run) | n/a (process) | **Docs/process** | `docs/marketing/US_MEDSPA_REVENUE_MACHINE_SHEET_AUDIT_WORKFLOW_V0.md` |

### 1.5 n8n workflows

| Workflow | State | Reference |
|---|---|---|
| Password-reset email forward (Gmail) | **Live** | `docs/n8n/password-reset-email-recipe.md` |
| GitHub heartbeat checker (read-only → Telegram) | **Docs/template, inactive** (Stage 1) | `docs/runbooks/N8N_GITHUB_HEARTBEAT_CHECKER_V1.md`, `..._ACTIVATION_READINESS_V1.md` |
| Operator Dispatch Router (watch #249 → notify owner) | **Docs/proposal** (unbuilt) | `docs/operations/OPERATOR_DISPATCH_ROUTER.md` |
| Automation-forward spine (ingest/forward HMAC) | **Live** (gated) | `docs/automation-framework.md`, `docs/n8n/automation-forward-recipe.md` |

n8n is the **governed integration spine** and stays **notify-only / outbound-on-approval**. It is not the tenant system of record.

### 1.6 Codex capabilities + limits

| Aspect | Rule |
|---|---|
| Mode | Research / data / review / bounded patch artifacts only. **Never owns a PR.** |
| Output | Transfer-safe (full file content, CSV, `git diff` patch, JSON). A local-only branch/SHA is **not** a valid handoff. |
| Branch | `codex/*` only (when Codex Cloud installed); imported by Cursor. |
| Install | Codex Cloud activation is **operator-pending** (Packet 7.2). |
| Forbidden | Merge, deploy, secrets/env, outreach, runtime paths. |
| Reference | `docs/operations/CODEX_INTEGRATION_CONTRACT_V1.md`, `docs/execution/CODEX_UTILIZATION_PLAN_V1.md`, `docs/execution/DELIVERY_ACCELERATION_V1.md` |

### 1.7 Cursor role + limits

Repo/docs/code **PR executor**. Drafts on lane-named branches, opens PRs, runs `npm test`/`npm run build`, posts digests to #249/#493. **Never self-merges; never deploys; never touches secrets/DB/DNS.** Reference: `docs/operations/CURSOR_DISPATCHER_CHECKLIST_V1.md`, `docs/operations/OPERATOR_DISPATCH_ROUTER.md` §3.

### 1.8 ERPNext / POP process

| Aspect | State | Reference |
|---|---|---|
| ERPNext sandbox plan + install runbook | **Docs** (sandbox-first; production-shell gated) | `docs/finance/ERPNEXT_SANDBOX_PLAN_V1.md`, `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` |
| Manual proof-of-payment (POP) workflow | **Docs/process** (manual, local) | `docs/operations/MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` |
| Manual pro-forma template (canonical until Print Designer clears) | **Docs** | `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` |

### 1.9 Onboarding process

| Aspect | State | Reference |
|---|---|---|
| AI Lead Rescue paid-pilot onboarding | **Docs** | `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` |
| Sales → delivery handoff | **Docs** | `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md` |
| Tenant client login / tenancy model | **Live + docs** | `docs/operations/TENANT_CLIENT_LOGIN.md` |
| General new-client onboarding (cross-product) | **Gap** — no single canonical doc | see §2 |

### 1.10 Living Word Mauritius (built assets)

| Asset | State | Reference |
|---|---|---|
| Chat widget with Groq retrieval AI v1 (approved atoms/schedules, safety refusals, usage logged) | **Sandbox — Live verified** (PR #425, deploy `5120442528`) | `artifacts/quality-audits/2026-06-11-living-word-mauritius/retrieval-ai-v1-live-verification.md` |
| Tenant workflow foundation (member onboarding, lead follow-up, etc.) | **Sandbox** | `lib/server/tenant-workflow/definitions.js` |
| Lead follow-up operator view | **Sandbox — verified** | `..._living-word-mauritius/lead-follow-up-operator-view-v1-live-verification.md` |
| GHL read-only data inventory probe | **Sandbox** | `lib/server/ghl/ghl-readonly-probe.js` |
| Public-website knowledge intake design | **Docs** | `..._living-word-mauritius/public-website-knowledge-intake-design.md` |

### 1.11 LuxeMaurice (built assets)

Live marketing tenant on `lux.corpflowai.com`; host-aware sitemap/robots/404; quality audits run (v1 system, score ~59/100\* with named remaining fixes); `/change` console live. Reference: `artifacts/quality-audits/2026-05-27-luxe-maurice-quality-v1.md`, `docs/operations/TENANT_CLIENT_LOGIN.md`.

### 1.12 Lead Rescue / Product A / Medspa / Mauritius outreach

Covered in §1.4. Commercial canon: `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` (single USD 150 wedge, Mauritius-first, warm-network), `docs/marketing/PRODUCT_A_MAURITIUS_PROPERTY_OFFER_V1.md` (premium tier), `docs/operations/MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` (POP).

---

## 2. Work still outstanding

| # | Area | Outstanding gap | Type |
|---|---|---|---|
| O1 | **Onboarding process** | No single canonical cross-product onboarding doc (identity → login → tenant surface → first value). Pieces exist per-product but not unified. | Docs |
| O2 | **ERPNext documentation** | Sandbox install not executed; production-shell gated; POP is manual. Needs the sandbox stood up and the POP loop dry-run documented end-to-end. | Docs + operator |
| O3 | **Living Word Tuesday demo readiness** | Assets are sandbox-verified but **no single "demo script + minimum-viable-demo checklist"** exists for a live presentation (see §6). | Docs |
| O4 | **Factory/`change` ↔ internal delivery** | Internal delivery (Cursor PRs) and the CMP/`/change` Factory workflow run partly in parallel; relationship not explicitly mapped (see §8). | Docs |
| O5 | **n8n write-back / digest writer** | Heartbeat is read-only + Telegram. No durable machine-readable queue write-back to #249/#493/#507 (see §7). | Docs → operator gate |
| O6 | **Codex dispatch model** | Codex Cloud install operator-pending (Packet 7.2); dispatch via #249 markers designed but not exercised at cadence. | Operator + docs |
| O7 | **Client tenant completion gaps** | Lux remaining quality fixes; Living Word still sandbox (not promoted to a client-live posture); per-tenant migration audit (Lux) not fully closed. | Mixed |

---

## 3. Work that can proceed WITHOUT Anton (this afternoon)

Per `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §2 and the Parallel Execution Board §6, the following are docs-only / read-only and need **no fresh approval** — Cursor (or Codex as research) proceeds and reports.

| # | Task | Owner | Next action | Codex? |
|---|---|---|---|---|
| W1 | Draft canonical **cross-product onboarding doc** (O1) | Cursor | Write `docs/operations/CLIENT_ONBOARDING_V1.md` skeleton sequencing existing per-product onboarding; open PR. | Codex: gather/normalize the existing onboarding fragments as a research index first. |
| W2 | **Living Word demo script + MVD checklist** (O3) | Cursor | Write the §6 demo runbook as a doc; verify each surface read-only against the sandbox URLs. | No |
| W3 | **Factory ↔ internal delivery alignment** map (O4/§8) | Cursor | Write the §8 mapping into a short doc / this packet; identify duplications. | No |
| W4 | **n8n issue-comment writer recommendation** (O5/§7) | Cursor | This packet §7 — least-privilege spec; no credential created. | No |
| W5 | **Lux remaining quality fixes** — re-confirm top-5 open items read-only | Cursor | Re-probe `lux.corpflowai.com` public surfaces; refresh the open-fix list. | Codex: optional read-only probe pass. |
| W6 | **ERPNext POP loop dry-run doc** (O2, docs only) | Cursor | Document the manual POP sequence end-to-end (no install). | No |
| W7 | **Docs consistency audit** (Codex first live packet 7.3) | Codex (after install) | Verify every `AGENTS.md` Must-read path resolves; write to `artifacts/audits/`. | **Yes** — this is the designated first Codex packet. |
| W8 | **Dispatcher digests** to #249/#493/#507 at 2–3×/day cadence | Cursor | Post digest after each lane movement. | No |

**Default posture:** if it is docs-only or read-only and inside a lane, **proceed and report** — do not wait for a click.

---

## 4. Work that genuinely requires Anton

Per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3 and Parallel Execution Board §7 — these **stop and ask** every time.

| # | Gate | Why Anton |
|---|---|---|
| A1 | **Merging any PR** | Operator owns every merge. |
| A2 | **Production deploy / promote / rollback** | Live customer surface. |
| A3 | **Secrets / env** (Vercel, GitHub, Neon, n8n, Telegram, GHL, Groq, providers) | Trust boundary. |
| A4 | **`POSTGRES_URL` / DB schema / destructive DB** | Data integrity. |
| A5 | **DNS / domain** changes | Routing/tenancy. |
| A6 | **Billing / payment** (incl. SBM) | Money + bank. |
| A7 | **Outreach / first real send** (email, WhatsApp, SMS — Mauritius pilots) | Human-approved only; no cold/bulk. |
| A8 | **Client-facing launch / promote Living Word from sandbox to client-live** | Client decision. |
| A9 | **Installing the n8n GitHub issue-comment credential / GitHub App** (§7) | New credential placement. |
| A10 | **Codex Cloud install** (Packet 7.2) | App install + key. |
| A11 | **New self-hosted tool / second app / second DB / new vendor** | Standing hold. |
| A12 | **Editing governance/doctrine files** | Serialized, explicit approval. |

**Anton approval queue (drain order, highest leverage first):** A10 (Codex install — unblocks W7 + a second executor) → A9 (n8n write-back credential — unblocks durable dispatch) → A2/A1 for ready PRs → A6 (SBM, revenue-blocking) → A8 (Living Word client-live, after demo).

---

## 5. Next 48-hour execution board

Sits **inside** the Parallel Execution Board lanes (`docs/operations/PARALLEL_EXECUTION_BOARD_V1.md` §3). WIP limits unchanged (≤2 open Cursor PRs; ≤2 Codex packets in flight).

| Lane | Owner | Next action | Output expected | Hard gate | Codex? |
|---|---|---|---|---|---|
| **Recovery / this packet** | Cursor | Ship this stocktake; post digest to #249/#507 | Merged docs packet + dispatch digest | Merge (A1) | No |
| **Onboarding (O1/W1)** | Cursor | Draft `CLIENT_ONBOARDING_V1.md` | Docs PR | Merge (A1) | Research index (optional) |
| **Living Word demo (O3/W2)** | Cursor | Demo script + MVD checklist (§6); read-only verify sandbox | Docs PR + verified URL list | Merge (A1); client-live = A8 | No |
| **n8n write-back (O5/§7)** | Cursor (spec) → Anton (credential) | This packet §7 spec; then Anton creates the fine-grained token / App | Spec (now) → working digest writer (after A9) | Credential (A9) | No |
| **Codex enablement (O6)** | Anton (install) → Codex (W7) | Anton runs Packet 7.2 checklist; Codex runs docs-consistency audit | Codex live as 2nd executor; first audit in `artifacts/audits/` | Install (A10) | **Yes** |
| **Factory alignment (O4/§8)** | Cursor | §8 mapping doc; flag duplications | Docs (this packet §8) | Merge (A1) | No |
| **Lux quality (O7/W5)** | Cursor | Read-only re-probe; refresh open-fix list | Updated fix list | Per-fix merge (A1) | Optional probe |
| **ERPNext POP (O2/W6)** | Cursor (docs) → Anton (install) | POP loop dry-run doc | Docs PR | Sandbox install (operator) | No |

---

## 6. Living Word Mauritius — Tuesday presentation path

> **Date note:** confirm the exact Tuesday with Anton. The path below is **ready now** because the core asset (retrieval AI chat widget) is already **sandbox live-verified** (PR #425, deploy `5120442528`), so it de-risks regardless of which Tuesday.

### 6.1 What can be demonstrated today (sandbox-verified)

| Capability | Surface | Public vs admin-gated |
|---|---|---|
| **Demo site** | `https://living-word-mauritius.corpflowai.com/site-preview` (200) | Public preview |
| **Chatbot (AI)** | chat widget loader (`/api/chat-widget/loader.js`, enabled) — 9 menu options incl. *Ask a question*; Groq retrieval over approved atoms/schedules; safety refusals for emergencies | Public widget |
| **Data onboarding** | Approved knowledge atoms + schedules feed retrieval; knowledge-intake design exists | Admin-gated ingest |
| **Workflows** | Tenant workflow foundation (member onboarding, lead follow-up) | Admin/operator view |
| **Forms / lead capture** | Lead follow-up operator view (verified) | Admin-gated |
| **Admin-gated vs public** | Public: site-preview + chat widget. Admin-gated: workflow operator list, lead follow-up, knowledge ingest, GHL probe. | — |

### 6.2 Minimum viable demo by Tuesday (no new build required)

1. **Public demo site** loads (`/site-preview`) — confirm 200 the morning of.
2. **Chat widget** answers a real "where/when" question via Groq retrieval, shows a **safety refusal** on an emergency prompt, and logs usage. (All three already verified.)
3. **Operator view** (admin-gated) shows a lead/workflow row landing from a chat interaction — narrate the human follow-up loop.
4. **Data story:** "answers come only from approved church content" (approved atoms) — the trust message.

### 6.3 What is NOT in the MVD (and stays out unless Anton approves)

- Promoting Living Word from **sandbox** to **client-live** posture (gate **A8**).
- Any real member-data write, GHL write-back, or outbound message (gates A4/A7).
- Any new chatbot scope (clinical/financial/legal answers are refused by design).

### 6.4 Cursor pre-demo action (no Anton needed)

Read-only re-verify the §6.1 URLs the morning of the demo and post a one-line "demo-ready" confirmation to #249 with the live statuses. If any surface is down, that is an **A2/A8** escalation, not a silent failure.

---

## 7. n8n autonomous monitoring fix — least-privilege GitHub write-back

### 7.1 Recommendation

Add a **single, narrow, repo-scoped issue-comment writer** so n8n can post heartbeat **digests** to #249/#493/#507 — turning the read-only heartbeat into a durable, machine-readable dispatch queue the executors already watch. This is the smallest step that "wakes the work system," not just Anton.

**Preferred: GitHub App** (fine-grained token is the acceptable fallback).

| Property | Value |
|---|---|
| Identity | A dedicated GitHub App (e.g. `corpflow-heartbeat-bot`) **installed on `antonvdberg-bit/corpflow-ai-command-center` only** — never "all repositories". |
| Permission | **Issues: Read & write** only (needed to create issue comments). **Pull requests: Read.** Nothing else. |
| Explicitly NOT granted | Contents (no code write), Workflows, Actions, Administration, Deployments, Secrets, Environments, Packages, Webhooks admin, Members. **No `repo` classic scope. No org-wide scope.** |
| Where the credential lives | **n8n credential store only.** Never in the repo, `.env.template`, chat, digests, or screenshots. |
| What it may do | Create **issue comments** on #249 / #493 / #507 containing heartbeat digests + machine-readable dispatch blocks. |
| What it may never do | Write code, open/merge PRs, push branches, change Actions/workflows, deploy, touch secrets/env/DB, send any customer-facing message, comment outside the named issues. |

**Fallback (fine-grained PAT):** Resource owner `antonvdberg-bit`; **Only select repositories → this repo**; Repository permissions **Issues: Read and write**, **Pull requests: Read**; everything else **No access**; short expiry with a renewal reminder. Same storage rule (n8n only).

### 7.2 Why this is safe

- **Smallest capability that closes the loop:** issue comments are coordination chatter, not code or deploys. `main` stays the durable source of truth (`OPERATOR_DISPATCH_ROUTER.md` §2).
- **No widening of any executor's authority.** A routed/written dispatch block is **not** authorization to act beyond the packet + canonical rules.
- **All §4 hard gates remain.** No merge, deploy, secret, DB, payment, or outreach capability is added.
- **Reversible:** uninstall the App / revoke the token; the heartbeat silently returns to read-only + Telegram.

### 7.3 Sequence

1. **Now (Cursor, no Anton):** this spec (done). Heartbeat stays Stage 1 (read-only + Telegram). Manual fallback per `..._HEARTBEAT_ACTIVATION_READINESS_V1.md` §7 continues.
2. **Gate A9 (Anton):** create the App/token with the §7.1 permissions; store in n8n.
3. **After A9 (operator + Cursor):** extend the heartbeat workflow to post a digest comment to #249/#493/#507; run the silent-success + forced-alert tests (readiness packet §4); register the monitor row in `MONITORING_ARCHITECTURE.md` in the activation PR.
4. **Boundaries:** no code write, no deploy, no secrets in repo, no DB, no runtime change — comment write-back only.

---

## 8. Factory relationship — internal delivery vs `/change` / Factory workflows

### 8.1 The two delivery paths today

| Path | What it is | Source of truth |
|---|---|---|
| **Internal delivery** | Cursor opens PRs → Anton merges → Vercel deploys → live-verify (`delivery-reality.mdc`). Coordination on #249/#493. | `main` + #249 |
| **Factory / CMP `/change`** | CMP tickets (Approved/Build) → PR/preview → Technical Lead observer → `/change` client-facing workflow-state → delivery verdict. | `cmp_tickets` + `console_json` + `technical_lead_audits` |

### 8.2 How they should align

- **CMP/`/change` is the client-facing accountability layer; internal delivery is the engine.** A change that touches a **client tenant surface** (Lux, Living Word client-live) should be represented as a CMP ticket so `/change` shows the client a truthful workflow-state, and the delivery verdict (`delivery-reality.mdc`) gates "Closed".
- **Pure internal/docs/infra work** (this packet, execution-board docs, monitoring) does **not** need a CMP ticket — #249 + the execution queue is the right ledger. Forcing every docs PR through CMP would be ceremony without client value.
- **Rule of thumb:** *client-visible outcome → CMP ticket + `/change`; internal capability → #249 + execution queue.* Both still obey one merge gate (Anton) and `delivery-reality.mdc`.

### 8.3 Where we are duplicating or bypassing Factory mechanisms

| Observation | Risk | Correction |
|---|---|---|
| Recent buyer-facing PRs (#504/#506 Lead Rescue + Product A) shipped via **internal delivery only**, not as CMP tickets. | `/change` does not reflect these client-relevant marketing surfaces; verdict discipline lives only in PR text. | For **client-tenant** surfaces, open a CMP ticket so `/change` + the delivery verdict stay canonical. For **apex marketing** (corpflowai.com), internal delivery + Delivery Reality Audit in the PR is acceptable — but record the audit verdict, not just "merged". |
| Heartbeat/monitoring digests post to #249/#493 (coordination), not into CMP. | Correct — monitoring is not a client deliverable. | Keep as-is; do **not** create CMP tickets for monitoring. |
| Codex research lands as `artifacts/` + import PRs, outside CMP. | Correct — research is input, not delivery. | Keep as-is. |

**Net:** we are not running a parallel control plane — we are **under-using CMP/`/change` for client-tenant marketing changes**. The fix is routing *client-visible* changes through CMP, not building anything new.

---

## 9. Boundaries (carried from #507 and the operator rules)

- Docs-only. No runtime code, no production deploy, no env/secrets, no DB/schema, no payment integration.
- No automated WhatsApp/SMS/email sends. No client-facing launch. No paid tools. No second app/database.
- No broad repo/admin token; no all-repositories credential; the §7 write-back is **issue-comment write only**, on this repo only, in n8n's store only.
- Cursor does not self-merge; Anton owns every merge and every §4 gate.
- Does not reopen the parked automation-forward-secret rotation. One app, one Postgres via `POSTGRES_URL` — unchanged.

---

## 10. Source-of-truth order

```
.cursor/rules/* and AGENTS.md doctrine        ← always wins
  > #249 / #493 / #507 operator decisions (command ledger)
    > CORPFLOW_OPERATOR_CONTROL_BOARD_V1.md (priority + workstreams)
      > PARALLEL_EXECUTION_BOARD_V1.md (concurrency/lanes)
        > this packet (48-hour recovery snapshot)
          > WEEKEND_EXECUTION_QUEUE.md (packet-level DoD + evidence)
```

If this packet disagrees with a canonical doc or a safety gate, **the canonical doc / gate wins**. Update the canonical doc first, then this packet.

---

## 11. Cross-references

- `docs/operations/CORPFLOW_OPERATOR_CONTROL_BOARD_V1.md` — priority + workstream board.
- `docs/operations/PARALLEL_EXECUTION_BOARD_V1.md` — concurrency lanes, WIP, anti-conflict, §6 pre-approved / §7 hard-gated.
- `docs/operations/OPERATOR_DISPATCH_ROUTER.md` — dispatch mechanism + executor boundaries + n8n notify-only shape.
- `docs/operations/CODEX_INTEGRATION_CONTRACT_V1.md`, `docs/execution/CODEX_UTILIZATION_PLAN_V1.md`, `docs/execution/CODEX_CLOUD_ACTIVATION_PACKET_V1.md` — Codex model + activation.
- `docs/execution/DELIVERY_ACCELERATION_V1.md` — multi-executor protocol (Cursor + Codex Cloud).
- `docs/runbooks/N8N_GITHUB_HEARTBEAT_CHECKER_V1.md`, `docs/runbooks/N8N_GITHUB_HEARTBEAT_ACTIVATION_READINESS_V1.md` — heartbeat design + activation path.
- `docs/operations/MONITORING_ARCHITECTURE.md` — monitor map (where §7 write-back registers).
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` — §2 allowed without approval / §3 Anton-only gates.
- `docs/operations/MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` — Mauritius outreach + ERPNext + POP.
- `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md`, `docs/marketing/PRODUCT_A_MAURITIUS_PROPERTY_OFFER_V1.md` — commercial canon.
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/*` — Living Word built assets + verifications.
- `.cursor/rules/delivery-reality.mdc` — only **live verified** is `COMPLETE`.

---

## 12. Status block

- **Delivery state:** Local → intended **Merged** after operator review. Docs/packet only; nothing to deploy, nothing to live-verify (no customer-facing surface changed).
- **Implementation:** none. No runtime code, no env, no secrets, no DB, no `POSTGRES_URL`, no DNS, no second app/database, no package installs, no new vendor dependency. The §7 write-back is a **recommendation**; no credential is created by this doc.
- **Verdict:** PARTIAL by design — the stocktake + 48-hour board are documented; all execution continues through #249/#493/#507 + the queue under existing gates. The autonomy gain (n8n issue-comment write-back, Codex enablement) is gated on Anton (A9, A10).
- **Decision provenance:** implements #507; refs #249/#493/#495. This status block is the in-repo decision record.
