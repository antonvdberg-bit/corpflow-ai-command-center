# Codex Worker Environment v1

> **Status:** DESIGN PACKET (v1) — **not implemented**. **NO IMPLEMENTATION
> AUTHORIZED** beyond this document.
> **Verdict:** **production app server REJECTED for v1.**
> **Scope:** worker / sandbox **design only**. No runtime changes authorized.
> No app code, no server install, no second app, no second database,
> `POSTGRES_URL` change, env vars, `.env.template` edits, production DB change,
> Google Workspace write automation, or n8n automation. **No automated outreach.**
> **Owner:** Anton (operator). **Author:** Cursor (docs).
> **Created:** 2026-06-26.
> **Anchor sentinel:** `<!-- CODEX_WORKER_ENVIRONMENT_V1 -->`

<!-- CODEX_WORKER_ENVIRONMENT_V1 -->

## 0. What this packet decides (and what it does not)

This packet evaluates whether CorpFlowAI should run a **persistent, controlled
Codex worker environment**, and defines a **safe v1 architecture** for one. It is
a design document: it chooses an architecture and writes the security rules; it
**does not** install, provision, configure, or connect anything.

This doc supplements and does **not** replace the canonical execution rules. If
any conflict arises, **those rules win**:

- `.cursor/rules/delivery-reality.mdc`
- `.cursor/rules/predeploy-decision-checks.mdc`
- `.cursor/rules/commit-push-doc-constraints.mdc`
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
- `docs/operations/CODEX_INTEGRATION_CONTRACT_V1.md` (Codex output / handoff contract)
- `docs/operations/OPERATOR_DISPATCH_ROUTER.md` (§7.1 Codex boundary)
- `docs/operations/CORPFLOW_OPERATOR_CONTROL_BOARD_V1.md`

The **Codex role** is unchanged by this packet: Codex remains a **research / data /
script worker only**. This packet only decides **where that worker may run** and
**how the workspace is bounded**. It does not widen Codex's authority.

## 1. Status header

- **Status:** design packet / **not implemented**.
- **Verdict:** production app server **rejected** for v1.
- **Scope:** worker / sandbox **design only**.
- **No runtime changes authorized.** No install, no provisioning, no credentials,
  no connection to any production surface results from this document.

## 2. Problem

Codex produces useful research, data, and script output, but the way that output
reaches the rest of the operation is unreliable, and there is no defined, repeatable
place for Codex to work.

- **Handoff is unreliable.** Codex output is useful, but moving it to Cursor / the
  Sheet process / the operator has repeatedly required human interpretation and
  reshaping. The `Codex Integration Contract v1`
  (`docs/operations/CODEX_INTEGRATION_CONTRACT_V1.md`) fixes the **format** of the
  handoff; it does not define **where Codex runs**.
- **Local-only branch/SHA artifacts caused recovery friction.** We already lost a
  Codex artifact to a local-only workspace: the US medspa research artifact's
  original branch `work` / SHA `5a216e35…` never reached GitHub and had to be
  recovered via operator-supplied transfer-safe text (imported in PR #462). A
  workspace nobody else can read is not a safe place to produce work.
- **Sheet updates require standardized, machine-readable output.** The
  `Audit Update Queue` CSV schema (contract §4) only pays off if Codex consistently
  produces it from a stable workspace, not ad hoc.
- **We need a persistent, controlled workspace without granting production
  authority.** The operating need is a place Codex can return to, with its tools and
  context, that **never** touches production secrets, the production database, the
  production app, or any send/approval surface.

The question this packet answers: **can we give Codex a stable home without giving
it any production power?** The answer is yes — but **not** on the production app
server.

## 3. Options comparison

Three candidate locations for a persistent Codex worker environment.

### A. Local controlled operator machine

A controlled machine the operator owns (e.g. a dedicated profile / VM / container on
Anton's machine) running official OpenAI Codex tooling, with **no** production
credentials present.

- **Benefits:** zero new infrastructure cost; fully under operator control; easy to
  wipe/reset; no public attack surface; already how most Codex work happens today;
  no new provider relationship.
- **Risks:** depends on the operator's laptop (the burn-down we are trying to reduce
  — `docs/execution/LAPTOP_DEPENDENCY_BURN_DOWN_V1.md`); risk of accidental presence
  of real credentials if the machine is also used for production work; not always-on;
  state can drift if not disciplined.
- **Allowed use:** research, data gathering, draft artifacts, script drafting, CSV /
  JSON / markdown / patch generation per the Codex Integration Contract; producing
  transfer-safe outputs into an `outbox/` convention or pasted to operator / Cursor.
- **Rejected use:** holding production secrets or `POSTGRES_URL`; connecting to the
  production DB; sending email/outreach; writing the Sheet; owning/merging PRs;
  deploying the app.
- **v1 verdict:** **ACCEPTABLE.** Lowest-friction safe option; the right choice if no
  always-on worker is needed yet.

### B. Separate non-production VPS / container / worker

A dedicated, isolated worker (separate VPS, container, or sandbox) **distinct from
the production app server**, running official OpenAI Codex tooling, with **no**
production credentials, DB access, or deploy authority.

- **Benefits:** persistent and always-on; isolated from the operator's laptop and
  from production; disposable/resettable by design; can be locked down (no inbound
  public ports, egress-limited) so it has no production blast radius; supports a
  clean `outbox/` handoff convention.
- **Risks:** new infrastructure to provision, patch, and pay for; another machine to
  secure and monitor; temptation to "just add" production access later (scope creep)
  — must be resisted; must not become a "second app" or a second data plane.
- **Allowed use:** everything in option A, plus persistence — a stable place Codex
  returns to with its tooling and approved input context; scheduled / repeatable
  research passes that produce transfer-safe artifacts only.
- **Rejected use:** any production secret, `POSTGRES_URL`, production DB connection,
  Gmail/email send, Google Sheet write, GitHub PR ownership, app deploy, becoming a
  second production app or a second database.
- **v1 verdict:** **PREFERRED — if and only if a persistent always-on worker is
  actually needed.** Build it isolated, disposable, and credential-free. Until that
  need is proven, option A is sufficient. **This packet does not authorize building
  it; that is a separate, approvable step (see §10).**

### C. Production app server

Installing Codex on the server that runs (or co-locates with) the production
CorpFlowAI app and/or production Postgres.

- **Benefits:** (apparent only) one fewer machine; Codex "near" the app.
- **Risks:** **unacceptable.** Co-locating an autonomous code/research worker with
  production secrets, `POSTGRES_URL`, the live database, deploy paths, and customer
  data creates direct blast radius: secret exposure, accidental DB mutation,
  accidental deploy, and a far larger attack surface. It violates the
  factory/tenant and brain/hands separation
  (`docs/EXECUTION_BRAIN_VS_HANDS.md`,
  `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`) and the hard
  boundaries in the Operator Control Board (one production app, one production DB,
  no second app/database).
- **Allowed use:** **none.**
- **Rejected use:** **all of it** — no install, no co-location, no production
  credential access, no DB access, no deploy authority.
- **v1 verdict:** **REJECTED.** Do **not** install Codex on the production app
  server for v1. This is a hard line, not a default to be argued around.

### Recommendation (summary)

| Option | v1 verdict |
|---|---|
| **A. Local controlled operator machine** | **ACCEPTABLE** — lowest-friction safe option. |
| **B. Separate non-production worker / container** | **PREFERRED** *if* a persistent always-on worker is needed; build it isolated, disposable, credential-free. |
| **C. Production app server** | **REJECTED** — hard line; no install, ever, in v1. |

**Net recommendation:** prefer a **separate non-production worker/container if a
persistent worker is needed**; otherwise a **local controlled operator machine** is
acceptable. The **production app server is rejected**.

## 4. Security model

These rules bind any Codex worker environment chosen under §3 (A or B). They are
non-negotiable for v1.

- **No production secrets** of any kind present in the worker (no API keys, tokens,
  credentials, passwords, private URLs, chat IDs, Infisical paths).
- **No `POSTGRES_URL`** — the production connection string never exists in the
  worker.
- **No production DB access** — no connection, no read, no write, no tunnel, no
  replica.
- **No Gmail / email sending** from the worker.
- **No Google Sheets write access in v1** — Codex proposes values (CSV); a human
  applies them per the Sheet/Audit workflow.
- **No GitHub PR ownership by Codex** — Codex never opens, owns, merges, or closes
  PRs (Cursor owns repo/docs PR execution).
- **No app deployment authority** — the worker cannot deploy, promote, or trigger a
  deploy of the production app.
- **No second production app** — the worker is not, and does not host, an app that
  serves clients.
- **No second database** — the worker is not, and does not host, a production data
  plane.
- **Official OpenAI tooling only** — use only official OpenAI / Codex tooling.
- **No third-party Codex UI / lookalike packages** — no unofficial "Codex" clients,
  wrappers, or lookalike front-ends.
- **No npm / app-store lookalikes** — do not install lookalike or typosquat packages
  claiming to be Codex / OpenAI tooling.
- **No credentials in repo, logs, artifacts, or chat** — nothing secret is ever
  written to the repository, log files, `outbox/` artifacts, or chat.
- **Disposable / resettable workspace preferred** — the environment should be cheap
  to wipe and rebuild from scratch, with no irreplaceable state.

## 5. Allowed inputs

The worker may consume only:

- **Approved repo docs** — canonical docs the operator points it at.
- **Approved public URLs** — specific public pages the operator approves.
- **Operator-provided CSV / context** — input files or context the operator hands in.
- **Public-web research pages where allowed** — public pages for the research task
  at hand, within the approved scope.

The worker may **not** consume:

- **No private client / patient data** — no PHI, health conditions, patient records,
  payment instruments, or any non-public client information.
- **No secrets** — no credentials, tokens, keys, private URLs, chat IDs, or
  Infisical paths.

## 6. Allowed outputs

Outputs use the **Codex Integration Contract v1** formats
(`docs/operations/CODEX_INTEGRATION_CONTRACT_V1.md` §2) — and only those:

- **Markdown artifact** — full file content with intended repo path, status header,
  provenance, and boundaries (Format A).
- **CSV block** — clean table with exact destination headers (e.g. the
  `Audit Update Queue` schema, contract §4) (Format B).
- **git diff patch** — unified `git diff` for Cursor to apply; Codex does not own the
  PR (Format C).
- **JSON manifest** — machine-readable descriptor routing the artifact to an owner
  and a gate (Format D).

**Handling:** outputs land in an **`outbox/` convention** inside the worker (a plain
directory of transfer-safe artifact files) **or** are pasted back to the operator /
Cursor. They are **never directly applied** — Cursor imports markdown/patch
artifacts and owns the PR; the operator copies approved CSV values into the Sheet.
Nothing in the worker writes the repo, the Sheet, or any production surface directly.

## 7. Forbidden actions

The worker (and Codex within it) must never:

- **No production server install** — no Codex install on the production app server.
- **No production DB connection** — no connection to the production database.
- **No direct Google Workspace writes** — no Sheet/Drive/Docs writes.
- **No Gmail / email sending.**
- **No outreach approval** — the worker cannot approve outreach.
- **No autonomous outreach** — no cold email, bulk send, or any automated contact.
- **No PR creation / merge / closure** — Codex does not own PRs.
- **No secret handling** — no reading, storing, or emitting secrets.
- **No server mutation** — no changes to any production or shared server.
- **No app deploys.**

## 8. Test plan

Use the **first 5 US medspa audits** as the v1 test case (the same first-five
payload as the Codex Integration Contract §6 and
`docs/marketing/US_MEDSPA_REVENUE_MACHINE_SHEET_AUDIT_WORKFLOW_V0.md`):

1. **Codex reads approved prospect inputs** — the first five rows from the approved
   captured research inputs (public pages only); no private data.
2. **Codex outputs an `Audit Update Queue` CSV** — exact §4.1 contract headers,
   `audit_status` in `{Audited, Outreach drafted}`, draft-only, every row keyed by
   `business_name` + `website_url`.
3. **Codex outputs a JSON manifest** — Format D, naming destination, owner, status
   (`DRAFT — pending Anton approval`), allowed/prohibited use, and the approval gate.
4. **No Sheet write** — Codex does not touch the Google Sheet.
5. **No outreach** — nothing is sent; no send/approval/follow-up fields appear.
6. **No PR** — Codex opens no PR; output is a transfer-safe artifact / `outbox/`
   file.
7. **Operator validates** — Anton reviews the CSV against contract §5 validation
   rules and the manifest.
8. **Sheet update process applies only allowed fields later** — a human copies
   approved values into the Sheet per the Sheet/Audit workflow; the worker never
   advances a prospect toward contact.

**Pass criteria:** the artifacts are transfer-safe and import-safe (no local-only
branch/SHA), the CSV passes every contract §5 rule, and at no point did the worker
touch a secret, the DB, the Sheet, email, or a PR.

## 9. Rollback / shutdown

Because the worker holds no production authority, rollback is simple and total.

- **Wipe / reset the worker:**
  - **Option A (local):** delete the Codex working directory / profile and the
    `outbox/`; if a VM/container, destroy and recreate it from a clean image.
  - **Option B (separate worker):** destroy the container/VM (it is disposable by
    design) and, if needed, rebuild from a clean, credential-free image. No
    production state is lost because none ever existed there.
- **Revoke credentials:** the only credential is the operator's own OpenAI/Codex
  login. Sign out / revoke the session or rotate that account credential per OpenAI;
  there are **no** CorpFlow production secrets to rotate because none were ever
  placed in the worker.
- **Discard `outbox/` artifacts:** delete the `outbox/` directory; artifacts are
  transfer-safe text already reviewed/imported elsewhere, so nothing unique is lost.
- **Verify no production access exists:** confirm the worker has no `POSTGRES_URL` /
  DB connection, no production secrets/env, no Google Workspace write credential, no
  GitHub write/PR credential, and no deploy path. (Grep the worker for secret-shaped
  strings; confirm no `.env` with production values; confirm no DB client configured.)
  If any production access is found, that is an incident — remove it, rotate the
  exposed secret, and follow `docs/runbooks/SECURITY_OR_INCIDENT.md`.

## 10. Definition of done

This design packet is **done** when all of the following hold:

- A **safe v1 architecture** is documented (worker location + bounds).
- The **production server is explicitly rejected** for v1.
- A **separate worker / local option is defined** (preferred: separate
  non-production worker/container; acceptable: local controlled operator machine).
- The **security rules are clear** (§4 — no production secrets / DB / sends / Sheet
  writes / PR ownership / deploy authority; official tooling only; disposable
  workspace).
- **No implementation is included** (no install, no provisioning, no credentials, no
  connection to any production surface).
- The **next implementation step is separately approvable** — e.g. "provision the
  isolated worker (option B)" or "formalize the local worker bounds (option A)"
  becomes its own packet under
  `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`, gated by
  `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3 and the security review
  checklist. This packet authorizes none of it.

## 11. Cross-references

- `docs/operations/CODEX_INTEGRATION_CONTRACT_V1.md` — Codex output / handoff
  contract (transfer-safe formats A–D, forbidden actions, `Audit Update Queue` CSV
  schema, validation rules). The worker environment **produces** outputs in those
  formats; this packet decides **where** the worker runs.
- `docs/operations/CORPFLOW_OPERATOR_CONTROL_BOARD_V1.md` — priority + workstream
  board; Codex remains research/data/script worker only, never owns PRs.
- `docs/operations/OPERATOR_DISPATCH_ROUTER.md` — §7.1 Codex boundary (scope,
  no PR ownership, transfer-safe handoff).
- `docs/marketing/US_MEDSPA_REVENUE_MACHINE_SHEET_AUDIT_WORKFLOW_V0.md` — the
  human-run Sheet/Audit process the §8 test plan feeds; the worker proposes values, a
  human applies approved fields.
- `docs/EXECUTION_BRAIN_VS_HANDS.md`,
  `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — execution-layer
  separation that the §3 option C rejection upholds.
- `docs/execution/LAPTOP_DEPENDENCY_BURN_DOWN_V1.md` — context for option A's
  laptop-dependency trade-off.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md`,
  `docs/runbooks/SECURITY_OR_INCIDENT.md` — required before any future implementation
  step and for the §9 verification.

## 12. Scope boundaries (carried forward, non-negotiable)

- **Docs-only.**
- **No app code.**
- **No server changes.**
- **No production DB.**
- **No second app / database.**
- **No `POSTGRES_URL`.**
- **No env vars.**
- **No `.env.template` edits.**
- **No secrets.**
- **No Google Workspace automation.**
- **No n8n automation.**
- **No outreach sending.**

## 13. Status block

- **Delivery state:** Local → intended **Merged** after operator review. Docs-only;
  nothing to deploy.
- **Implementation:** none. No worker provisioned, no install, no credentials, no env,
  no secrets, no DB, no Sheet/Workspace automation, no n8n, no deployment.
- **Verdict:** PARTIAL by design — architecture documented; the production app server
  is rejected for v1; building any worker (option A bounds or option B provisioning)
  is a separate, separately approvable step. This document is **design only and is
  not an install.**
