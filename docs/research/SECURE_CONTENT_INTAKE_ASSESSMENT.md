# Secure temporary client content intake — architecture and effort assessment

**Status:** Research only (docs). No runtime implementation. No schema migration. No storage integration. No ClamAV install. No secrets or env changes. No production deployment.

**Date:** 2026-07-16  
**Branch:** `research/secure-content-intake-assessment`  
**Repository:** `antonvdberg-bit/corpflow-ai-command-center`  
**Inspected base:** `origin/main` @ `87a59e1c` (includes reusable video optimisation workflow #614)

---

## 1. Executive summary

CorpFlowAI already has most of the **control-plane** pieces needed for a secure temporary content intake gate: authenticated sessions, host-bound tenancy, `/change` as operator control plane, Postgres as workflow/audit source of truth, append-only telemetry/automation events, ticket-scoped attachment APIs, Lux review/publish governance, and proven **trusted** FFmpeg tooling (walkthrough encode + website video optimisation).

What does **not** exist today is the **temporary intake product** itself:

- Uploaded files are stored as **permanent** Postgres `bytea` rows (`cmp_ticket_attachments`).
- MIME checks trust the **client-declared** `content_type`.
- There is **no malware scan**, no quarantine state machine, no hard-delete-after-consumption path, and no Destruction and Retention Record.
- Lux attachment lifecycle is **archive-first, never auto-delete** — the opposite of temporary intake.
- Cloudflare R2 is **ops-backup only** and must not be wired into the production app without a separate authorization that overturns the current hard boundary.
- ClamAV (or any AV worker) cannot run on Vercel serverless; hosting it on `corpflow-exec-01` requires a **new named §5.5 carve-out** (today only Uptime Kuma is authorized).

**Verdict:** A narrow **technical vertical slice** is feasible and worth doing as an internal proof of the full lifecycle, using free/open-source components and existing auth/tenant/audit patterns. A controlled two-tenant pilot is feasible after the slice, but production use with real client content must wait for deletion verification, scanner operations, and external security review gates.

**Recommendation:** Proceed with a technical vertical slice (Option A), gated on Anton’s approval of scanner hosting choice and a bounded implementation packet. Do **not** productise externally yet.

---

## 2. Product boundary (non-negotiable)

### In scope (required product)

A secure, tenant-aware, **temporary** content intake gate:

1. Client submits file  
2. Tenant and user verified  
3. Temporary private holding  
4. Deterministic validation  
5. Malware scan  
6. Accept or reject  
7. Rejected file deleted  
8. Accepted file available only to an authorised processing workflow  
9. Content consumed  
10. Original deleted  
11. Auditable Destruction and Retention Record produced  

### Out of scope

- Permanent file storage / shared drive / DMS  
- Dropbox / Nextcloud / FileCloud replacement  
- Long-term digital asset library  
- Second production application or second production database  
- Guaranteeing a file is “safe” in absolute terms  
- Real client content during this research phase  

### Core principles (assessment baseline)

Files temporary by default; unknown files untrusted; no AI / FFmpeg / document parsing before clearance; rejected files not retained; accepted originals deleted after consumption or expiry; only approved production derivatives retained; Postgres + `/change` remain sources of truth; fail closed; tenant boundaries strict; narrow allowlist; production publication separately approved; client UX simple and reassuring.

---

## 3. Current-state repository evidence

Companion inventory with paths and line references:  
[`SECURE_CONTENT_INTAKE_REPO_INVENTORY.md`](./SECURE_CONTENT_INTAKE_REPO_INVENTORY.md).

### 3.1 Application architecture

- Next.js **pages router**; single serverless API entry `api/factory_router.js` rewritten from `/api/(.*)` in `vercel.json`.
- No Next.js Edge `middleware.js`; host tenancy and auth enforced inside the factory router and handlers.
- Domains: `lib/server/*` (HTTP, session, uploads), `lib/cmp/*` (CMP actions, `/change` workflow), `pages/change.js` (operator/client control plane UI).

### 3.2 Authentication and session

- Cookie session `corpflow_session` (HMAC-JWT) in `lib/server/session.js` / `lib/server/auth.js`.
- Types: `admin` (factory) and `tenant` (scoped `tenant_id`).
- Sovereign session tokens for CMP dormant gate; short-lived patterns exist (preview token, password-reset hash, magic links).
- CMP gates: `requireDormantGate`, `requireFactoryMasterOnly`, host/session conflict checks.

### 3.3 Tenant and host boundary

- Canonical: `docs/operations/TENANT_CLIENT_LOGIN.md`.
- Host → tenant via `tenant_hostnames` + `CORPFLOW_TENANT_HOST_MAP`; Core hosts are factory surface.
- Session tenant must match host tenant for tenant CMP actions.

### 3.4 Existing uploads

| Path | Behavior | Fit for temporary intake |
|------|----------|--------------------------|
| `lib/server/change-attachments.js` | Authenticated base64 upload → Postgres `bytea` | Closest API pattern; **permanent store** |
| `lib/cmp/_lib/lux-request-attachments.js` | Review / link / publish / archive metadata | Governance patterns reusable; **archive ≠ delete** |
| `lib/server/lux-property-media.js` + `lux-media-storage.js` | Public serve only after publish gates | Publication separation reusable |
| `lib/server/cloudinary-upload.js` | Optional Cloudinary helper | **Not wired** into main upload path |
| R2 (`SELF_HOSTED_OPS_R2_RESTIC.md`) | Ops backups on L3 | **Hard: do not integrate into production app** |

### 3.5 Postgres / Prisma (relevant)

- `CmpTicket`, `CmpTicketAttachment` (bytes in DB; no checksum/scan/TTL).
- `TelemetryEvent`, `AutomationEvent` (append-only audit/ingest spine).
- `TechnicalLeadAudit` (delivery evidence, not file scan).
- No quarantine / intake / destruction models.

### 3.6 Background processing

- Vercel crons: billing, CMP monitor, overseer, stuck repair, Technical Lead — **no** file scan/purge.
- Automation ingest/forward → n8n (events, not binary workers).
- GitHub Actions: CI, factory loops, walkthrough video, video optimisation **verify** — no client-upload scanner.

### 3.7 FFmpeg (two distinct tools)

1. **Website optimisation (approved, tested):** `scripts/optimise-video.sh` + `docs/operations/VIDEO_OPTIMISATION_WORKFLOW.md` + GHA `video-optimisation-verify.yml`. Local MP4 → smaller H.264/AAC web MP4; SHA-256 on output; fails closed on probe/codec/duration/size; never overwrites; L3 interactive tool posture.
2. **Walkthrough encode:** `scripts/video/encode-mp4.mjs` — trusted Playwright WebM → captioned MP4; CI workflow; not for client uploads.

Neither tool should touch uncleared client bytes. Both assume **local trusted paths**.

### 3.8 Validation / checksum today

- Upload: size + client MIME allowlist only.
- Image dimension probe from buffer magic (`lib/cmp/_lib/image-dimensions.js`) — useful building block, not full MIME gate.
- SHA-256 used in video optimisation, provenance, auth hashes, visual-asset manifests — pattern reusable; **not** on attachment rows.

### 3.9 Architectural constraints that materially affect this feature

1. **One production app / one Postgres** — no second product DB.
2. **Vercel serverless** — no FFmpeg, no ClamAV, limited body size/duration; base64 upload roughly doubles payload.
3. **L3 box** — ClamAV needs named §5.5 authorization; not covered by Uptime Kuma carve-out.
4. **R2 ops-only** — app intake storage must be separately authorized or stay Postgres/temp-worker local.
5. **Lux archive doctrine** — must not conflate temporary intake with Lux permanent media governance.

---

## 4. Existing capabilities we can reuse

| Capability | Reuse how |
|------------|-----------|
| Session auth + tenant host binding | Authenticated, tenant-bound upload authorisation |
| Short-lived signed token patterns | Short-lived upload permission |
| `/change` + CMP action switch | Operator status, accept/reject visibility, processing handoff |
| `telemetry_events` / `automation_events` | Intake/scan/delete audit evidence |
| Change-attachment size/count limits | Starting point for limits (tighten + purpose-scoped) |
| Image magic-byte dimension probe | Seed for signature validation |
| `optimise-video.sh` + walkthrough encode | **Post-clearance only** processing for MP4 |
| Video SHA-256 / provenance patterns | Checksums + Destruction and Retention Record fields |
| GHA FFmpeg install pattern | Bounded worker for scan/optimise jobs |
| Vercel Preview + Agent CI | Preview of UI / API without production client rollout |
| Lux publish gates | Model for “no public URL before approval” |

---

## 5. Gaps (must be built)

| Gap | Why it matters |
|-----|----------------|
| Temporary holding store with hard delete | Current attachments are permanent `bytea` |
| Intake state machine | No CREATED→…→DELETED lifecycle |
| Magic-byte / true MIME validation | Client MIME is spoofable |
| Malware scanner + signature updates | Absent |
| Scanner timeout / fail-closed policy | Absent |
| Processing permission gate | FFmpeg/AI must be unreachable until ACCEPTED |
| Automatic expiry / purge job | No cron/worker for intake TTL |
| Destruction and Retention Record | No controlled deletion evidence object |
| Client status UX for security checking | Upload UI is ticket-attachment oriented |
| Direct-to-private-storage (presigned) | Today: app receives base64 into Postgres |
| Least-privilege worker identity | No intake worker role |
| Polyglot / encrypted / archive rejection beyond extension | Absent |
| Claims discipline (“checked”, not “guaranteed safe”) | Product copy + API wording |

---

## 6. Architecture options

### Option A — Smallest internal vertical slice

**Scope:** CorpFlowAI tenant only; one authenticated uploader; one MP4 **or** one PDF; temporary private holding; validation; ClamAV scan; accept/reject; one authorised processing action (e.g. record “ready for optimise” or run optimise on cleared MP4 in a bounded worker); deletion; Destruction and Retention Record; **no** client-facing production deployment.

**Architecture (conceptual):**

```text
Authenticated uploader (CorpFlowAI)
  → short-lived upload grant (session + purpose + size)
  → bytes to temporary private holding (Postgres quarantine table OR worker-local object keyed in Postgres)
  → validate (size, allowlist, magic bytes, SHA-256)
  → scan (ClamAV in GHA/L3 worker — fail closed)
  → ACCEPTED | REJECTED
  → REJECTED: delete bytes immediately + record
  → ACCEPTED: one authorised action (metadata handoff or post-clearance FFmpeg)
  → CONSUMED → delete original → Controlled Deletion Record
```

| Dimension | Assessment |
|-----------|------------|
| Files likely to change (when implemented) | New `lib/server/secure-intake/*`, Prisma models, CMP actions, minimal `/change` or internal page, worker script/workflow, tests, docs |
| New components | Intake record + events; validator; scanner client; purge job; deletion verifier; client status messages |
| Reused | Auth, tenancy, telemetry/automation, FFmpeg **after** clearance, GHA patterns |
| Schema | New intake tables (see §8); do **not** overload `CmpTicketAttachment` as permanent store |
| Security controls | AuthN/Z, allowlist, magic bytes, ClamAV, fail closed, no public URL, no FFmpeg before ACCEPTED |
| Failure modes | Scanner down → reject/hold with no processing; delete fail → DELETION_PENDING + alert; upload disconnect → expiry purge |
| Test plan | Unit validators; EICAR in isolated test env; tenant isolation; deletion verification; processing gate |
| Deployment | Preview only for UI; scanner worker separate; no production client surface |
| Maintenance | Signature updates; purge monitoring; disk/DB growth watch |
| Cost | Near-zero cash if scanner on existing L3/GHA; engineering time is the main cost |
| Effort | See §13 (vertical slice) |
| Risks | Scanner hosting authorization; turning Postgres into a quasi-DMS; Vercel payload limits |

### Option B — Controlled multi-tenant pilot

**Scope:** CorpFlowAI + LuxeMaurice; tenant-aware upload; full allowlist (images, mp4, pdf/docx/xlsx/csv/txt); status UI; processing handoff; automatic expiry/deletion; `/change` integration; destruction records; Preview + approval; **no external commercial customers**.

| Dimension | Assessment |
|-----------|------------|
| Architecture | Option A + tenant UI on Lux host, CMP status panel, cron/worker expiry, purpose routing, derivative retention policy hooks |
| Files | Broader: `pages/change.js`, Lux attachment coexistence rules, more validators (Office/PDF), rate limits, operator runbook |
| Schema | Same core + indexes on `tenant_id`, `status`, `expires_at`; optional link to `cmp_tickets` |
| Security | Stronger rate limits; tenant isolation tests mandatory; no cross-tenant download |
| Failure modes | Lux permanent media vs temporary intake confusion — must keep separate product surfaces |
| Deployment | Preview → approved Production for **internal tenants only**; still no external sale |
| Effort / cost | See §13 (controlled pilot) |
| Risks | Scope creep into DMS; ClamAV ops burden; real client content before external review |

**Not recommended yet:** Option C (external productisation) — see §14.

---

## 7. Threat and failure assessment

| Threat / failure | Control direction | Notes |
|------------------|-------------------|-------|
| Oversized uploads | Hard size caps per type; reject before store | Vercel body limits reinforce small caps |
| High volume / malicious repeats | Per-user/tenant rate limits; circuit breaker | Reuse chat rate-limit pattern as starting point |
| Spoofed extensions | Magic-byte + declared MIME + extension triangulation; mismatch → reject | Extension never trusted alone |
| Polyglot files | Fail closed on ambiguous signatures; narrow allowlist | External review before real clients |
| Corrupted media | ffprobe/validation fail → reject + delete | Align with optimise-video probe gates |
| Scanner unavailable / signatures stale | Fail closed: no ACCEPTED; DELETION or hold with alert | Do not process |
| Processing timeout | Worker timeout; leave PROCESSING → FAILED; do not keep forever | Expiry still deletes |
| Storage deletion failure | DELETION_PENDING + retry + operator alert | Record incomplete deletion honestly |
| Tenant ID tampering | Server derives tenant from session + host, never client body | Existing pattern |
| Expired upload auth | Short-lived grant; reject late PUTs | |
| Duplicates | SHA-256 dedupe policy (reject or link) | Decide in packet |
| Client disconnect | Incomplete → expiry purge (assessed 24h) | |
| Race conditions | Single-writer status transitions; optimistic locking | |
| Unconsumed files | 7-day accepted TTL (assessed) | |
| Insider misuse | Factory master gates; audit actor fields; least privilege | |
| Malicious filenames | Store only sanitized metadata; generate internal keys | |
| Archives / bombs | Reject archives entirely in v1 | |
| Encrypted / password-protected | Reject | |
| Unsupported codecs | Reject before FFmpeg | |
| Accidental public exposure | No public URL until separate publish approval | Lux pattern |
| Logs leaking content | Redact filenames/content in logs; store metadata in DB | |
| Absolute “all copies gone” claim | **Forbidden**; use Controlled Deletion Record wording | |

---

## 8. Data model proposal (do not implement yet)

### Challenge to the large model

A single wide `intake_items` row with every scan/deletion field is workable but heavy. Prefer:

1. **`content_intake_items`** — identity, tenant, purpose, status, object key, sizes, hashes, timestamps for accept/consume/delete.  
2. **`content_intake_events`** — append-only lifecycle events (validation, scan, delete, verification) with optional hash chain.  
3. **Avoid** storing file bytes in the same row as long-lived metadata after deletion (null out blob; keep record).

### Smallest safe alternative

**Reuse existing?**  
- Do **not** reuse `CmpTicketAttachment` as the temporary store (permanent semantics + Lux archive doctrine).  
- **Do** reuse `TelemetryEvent` / `AutomationEvent` for operator-visible mirrors, but keep a first-class intake event table for Destruction and Retention Record integrity.  
- Optional FK to `cmp_tickets` when intake is ticket-linked; not required for vertical slice.

**Minimum columns (item):**  
`id`, `tenant_id`, `submitted_by`, `original_filename` (metadata only), `internal_object_key`, `declared_content_type`, `detected_mime_type`, `size_bytes`, `sha256`, `requested_purpose`, `status`, `rejection_reason`, `accepted_at`, `consumed_at`, `deletion_requested_at`, `deleted_at`, `deletion_verification_json`, `retained_derivatives_json`, `created_at`, `updated_at`, `expires_at`.

**Minimum columns (event):**  
`id`, `intake_item_id`, `tenant_id`, `event_type`, `actor_type`, `actor_id`, `result`, `metadata_json`, `created_at`, optional `previous_event_hash` / `event_hash`.

**Simplified status model (recommended for v1):**

`CREATED` → `UPLOADED` → `VALIDATING` → `SCANNING` → `ACCEPTED` | `REJECTED` → (`PROCESSING` → `CONSUMED`) → `DELETION_PENDING` → `DELETED`  
Plus `FAILED` / `EXPIRED` as terminal-ish operational states.

Collapse `UPLOADING` into grant + incomplete expiry if it reduces complexity.

### Suggested retention (assess only — do not implement)

| Class | Assessed default |
|-------|------------------|
| Incomplete uploads | Delete after 24 hours |
| Rejected | Delete immediately after recording result |
| Accepted unconsumed | Delete after 7 days |
| Successfully consumed originals | Delete within 24 hours |
| Approved production derivatives | Retain only when required |
| Metadata / audit | Separate retention policy |

---

## 9. Client journey (smallest credible)

1. Sign in  
2. Choose files (allowlisted types only)  
3. State intended purpose (short picker)  
4. Upload progress  
5. “Security checking”  
6. Accepted or rejected  
7. Processing (if accepted and purpose requires it)  
8. Completion  
9. Access Destruction and Retention Record (summary, not internals)

**Must not expose:** storage paths, scanner internals, stack traces, credentials, cross-tenant data.

### Plain-language messages

| State | Client message |
|-------|----------------|
| Upload received | We received your file and locked it in a private holding area. |
| Scanning | We are running security checks. This can take a short time. |
| Accepted | Your file passed our checks and is ready for the next approved step. |
| Unsupported format | This file type is not supported. Please upload an approved format. |
| Failed security checks | We could not accept this file. It has been removed from our systems. |
| Processing | Your content is being prepared for the approved purpose. |
| Consumed | Processing finished. The original upload is scheduled for removal. |
| Deleted | The original file has been removed. A destruction and retention record is available. |
| Retry requested | Please upload a new file. The previous attempt was closed. |

**Wording rule:** Prefer “passed our checks” / “could not accept” — never “guaranteed malware-free” or “proven safe.”

---

## 10. Destruction and Retention Record (design)

**Name:** Destruction and Retention Record (also Controlled Deletion Record).

**Purpose:** Auditable evidence of controlled deletion of the **managed object**, not absolute proof that every possible copy everywhere has ceased to exist.

**Suggested fields:** intake item ID; tenant ID; submitting user; original filename (metadata); internal object identifier; SHA-256; upload timestamp; validation result; malware scan result (engine + signature version); acceptance/rejection; processing purpose; processing completion; deletion request; storage deletion result; verification that the object is no longer retrievable via intake APIs; retained derivatives (if any); retention exception (if any); audit event identifier; optional tamper-evident event hash chain.

**Verification method (assessed):** After delete, GET/download by internal key returns not found; optional storage HEAD miss; record both attempts.

---

## 11. FFmpeg reuse assessment

### Exact paths

| Tool | Path | Invocation |
|------|------|------------|
| Website optimise | `scripts/optimise-video.sh` | `npm run video:optimise -- <in.mp4> <out.mp4>` |
| Docs | `docs/operations/VIDEO_OPTIMISATION_WORKFLOW.md` | Operator L3 / local |
| Verify CI | `.github/workflows/video-optimisation-verify.yml` | Probe only |
| Walkthrough encode | `scripts/video/encode-mp4.mjs` | `npm run video:encode` |
| Walkthrough CI | `.github/workflows/generate-walkthrough-video.yml` | Trusted YAML → WebM → MP4 |

### Website optimise — evidence

- Input/output: MP4 → MP4 (H.264 + AAC, faststart).  
- Validation: ffprobe format/codec/duration/resolution/audio; refuses overwrite; removes failed outputs.  
- Checksum: SHA-256 of **output**.  
- Assumes **local files** on disk.  
- Can operate on a temporary downloaded object **if** that object is first written to a local path and only after clearance.  
- Suitable for bounded worker / CI / interactive L3 — **not** Vercel serverless.  
- Must be invoked **only after** ACCEPTED clearance.  
- Changes needed for intake: wrapper that (1) checks intake status ACCEPTED, (2) fetches to temp path, (3) runs script, (4) stores derivative metadata, (5) marks CONSUMED, (6) deletes original.  
- Duplication: Do **not** rewrite FFmpeg tooling; add a thin gated handoff only.

### Walkthrough encode

Not the primary client-intake processor (expects Playwright WebM + captions). Keep separate.

---

## 12. Free / open-source component assessment

| Component | Purpose | Licence (typical) | Hosting | Security responsibility | Maintenance | Integration difficulty | OpEx | Second app? | Essential? |
|-----------|---------|-------------------|---------|-------------------------|-------------|------------------------|------|-------------|------------|
| **ClamAV** | Malware scan | GPL-2.0 | GHA ephemeral **or** authorized L3 container/service | CorpFlow ops for signatures + availability | Signature updates; false positives | Medium (worker + client) | ~$0–low | No if worker-only | **Essential** for stated controls |
| **file-type / similar** (npm) | Magic-byte MIME | MIT (verify at pin) | In-app or worker | CorpFlow | Dependency bumps | Low | $0 | No | Essential for validation |
| **Existing Postgres** | Workflow + audit + optional quarantine bytes | — | Neon (approved) | Existing | Schema + purge | Low–medium | Existing | No | Essential |
| **Existing auth / tenancy** | AuthN/Z | — | App | Existing | — | Low | Existing | No | Essential |
| **Existing `/change`** | Operator control plane | — | App | Existing | UI | Medium | Existing | No | Essential for Option B; optional for A |
| **GitHub Actions** | Bounded scan/optimise jobs | — | GitHub | Workflow secrets discipline | Workflow maintain | Medium | Included in plan | No | Strong option for slice |
| **Vercel Preview** | UI/API preview | — | Vercel | Existing | — | Low | Existing | No | Useful |
| **FFmpeg** | Post-clearance video | LGPL/GPL components | L3/GHA | CorpFlow | Already installed path | Low (reuse script) | $0 | No | For MP4 purpose only |
| **Cloudinary** | Media CDN | Proprietary | Cloud | Vendor + CorpFlow | Unused today | — | Paid if used | No | **Not recommended** for temp intake |
| **R2 app storage** | Object store | — | Cloudflare | Would need new auth | — | Medium | Low | No | **Blocked** by current ops boundary unless new approval |

**Paid services:** Not required for the pilot controls if ClamAV + Postgres + GHA/L3 are used. Do not purchase scanners or DMS products for v1.

**ClamAV hosting decision (gate inside next packet):**

1. **Preferred for slice:** GitHub Actions or ephemeral runner pulls object, scans, reports, deletes working copy — no persistent L3 daemon.  
2. **Alternative:** Named §5.5 carve-out for ClamAV on `corpflow-exec-01` (ADR + authorization packet required).  
3. **Not allowed without approval:** Installing ClamAV “because Kuma exists.”

---

## 13. Effort and cost estimates

Estimates are **orders of magnitude**, not quotes. Confidence is moderate for engineering effort; lower for external review timing.

### Stage 0 — Repository assessment only (this work)

| | Optimistic | Likely | Conservative |
|--|------------|--------|--------------|
| Engineer-days | 1 | 1–2 | 3 |
| Calendar | 1 day | 1–2 days | 1 week |
| Specialist security | 0 | 0 | 0 |
| Direct cash | $0 | $0 | $0 |
| Monthly OpEx | $0 | $0 | $0 |
| Confidence | High | | |

### Stage 1 — Technical vertical slice (Option A)

| | Optimistic | Likely | Conservative |
|--|------------|--------|--------------|
| Internal engineering (days) | 8 | 15 | 25 |
| Calendar | 2 weeks | 3–4 weeks | 6–8 weeks |
| Specialist security input | 0.5 day review of design | 1–2 days | 3 days |
| Direct cash | $0 | $0–500 | $0–1.5k (if paid review hour block) |
| Monthly OpEx | ~$0 | ~$0–20 | ~$0–50 (runner minutes / storage) |
| Assumptions | ClamAV on GHA or existing L3 after carve-out; Postgres quarantine OK for small files; no client production | | |
| Confidence | Medium | | |
| Major drivers | Scanner hosting authorization; deletion verification; not overbuilding UI |

### Stage 2 — Controlled two-tenant pilot (Option B)

| | Optimistic | Likely | Conservative |
|--|------------|--------|--------------|
| Internal engineering (days) | 20 | 35 | 55 |
| Calendar | 1 month | 2 months | 3–4 months |
| Specialist security | 2 days | 3–5 days | 1–2 weeks |
| Direct cash | $0–1k | $2–5k (review) | $5–15k (review + optional pentest lite) |
| Monthly OpEx | ~$0–30 | ~$20–100 | ~$50–200 |
| Assumptions | Slice proven; Lux/CorpFlowAI only; no external customers; separate from Lux permanent media | | |
| Confidence | Medium-low | | |

### Stage 3 — Production hardening (real client content eligible)

| | Optimistic | Likely | Conservative |
|--|------------|--------|--------------|
| Internal engineering (days) | 15 | 30 | 50 |
| Calendar | 3–4 weeks | 2 months | 3+ months |
| External security review | Required | Required | Required |
| Penetration testing | Optional light | Recommended | Required before multi-tenant expansion |
| Direct cash | $3–8k | $8–20k | $20–40k+ |
| Monthly OpEx | $20–100 | $50–200 | $100–500 |
| Assumptions | Hardening includes monitoring, abuse controls, runbooks, signature SLAs, legal retention policy | | |

### Stage 4 — External productisation (shown separately — **not recommended yet**)

| | Optimistic | Likely | Conservative |
|--|------------|--------|--------------|
| Engineering | 60+ | 120+ | 200+ days |
| Cash / OpEx | Product, support, SLA, multi-tenant abuse, billing | | |
| Gate | Only after internal proof + demand evidence | | |

### Cost separation summary

| Bucket | Vertical slice (likely) | Pilot (likely) | Hardening (likely) |
|--------|-------------------------|----------------|--------------------|
| Internal engineering | Dominant cost | Dominant | Large |
| Infrastructure | Near $0 | Low | Low–moderate |
| External security review | Small/design | Moderate | Significant |
| Penetration testing | Not yet | Optional | Recommended |
| Ongoing maintenance | Signature updates + purge watch | + tenant ops | + incident response |

---

## 14. Commercial reuse assessment (brief)

**Preserves future productisation:**

- Tenant-bound records and host isolation  
- Purpose-scoped grants  
- Explicit temporary lifecycle + Destruction and Retention Record  
- Processing gated behind clearance  
- Separate publish approval  

**Shortcuts that would block productisation:**

- Storing all client files permanently in ticket attachments  
- Skipping scan “for trusted clients”  
- Shared global bucket without tenant prefixes  
- Coupling intake to a single tenant’s Lux media model  

**Defer explicitly:** shared drives, versioning CMS, external customer self-serve, SLA marketing, guaranteed-safe claims.

**Evidence that would justify commercialisation later:** repeated internal use; clean deletion audits; bounded OpEx; demand from agencies who already trust CorpFlowAI delivery — not speculative feature completeness.

---

## 15. Security review gate

### Can be implemented and tested internally

- AuthN/Z, tenant isolation, allowlist, magic-byte mismatch  
- State machine, expiry, deletion API not-found verification  
- EICAR in **isolated** test environment only  
- FFmpeg handoff gate unit/integration tests  
- Preview UI wording  

### Requires external specialist review before

| Milestone | Why |
|-----------|-----|
| Real client content | Residual risk of polyglots, AV gaps, logging leaks |
| Production use | Operational scanner failure modes, retention legality |
| Multi-tenant rollout | Isolation + abuse at scale |
| External sale | Liability, claims, support surface |

**ClamAV alone is not a complete security review.**

---

## 16. Operational burden

- Signature update cadence and alerting when stale  
- Purge job health (incomplete / rejected / unconsumed)  
- DELETION_PENDING escalation  
- Disk/DB growth of quarantine  
- False-positive handling (client-safe messaging)  
- Clear separation: temporary intake vs Lux permanent media vs marketing video masters  

---

## 17. Risks (top)

1. **Scope creep into DMS** — highest product risk.  
2. **Scanner hosting / §5.5 authorization delay** — highest delivery risk for real AV.  
3. **Vercel size limits + Postgres bytea** — may force object-store decision earlier than desired.  
4. **Conflating with Lux attachments** — operator confusion and retention policy conflict.  
5. **Overclaiming safety** in client copy.  
6. **Delete verification gaps** (replicas, backups, logs) — must use honest Controlled Deletion Record language.

---

## 18. Recommendation

**Proceed with a technical vertical slice** (Option A), after Anton approves:

1. Scanner hosting choice (GHA ephemeral vs L3 ClamAV carve-out packet).  
2. Quarantine storage choice for the slice (Postgres bytea quarantine table vs worker-local only).  
3. A bounded implementation packet that forbids DMS features and production client rollout.

Do **not** start Option B until Option A proves delete + scan + gated FFmpeg handoff with evidence.

Do **not** commercialise externally now.

---

## 19. Explicit go / no-go decision gates

| Gate | Go only if |
|------|------------|
| G0 Assessment complete | This doc + inventory + decision summary merged or accepted as research |
| G1 Vertical slice authorized | Anton approves packet + scanner host + storage choice; still no real client content |
| G2 Slice complete | Lifecycle proven in Preview/internal; Destruction and Retention Record sample exists |
| G3 Two-tenant pilot | Slice green; Lux/CorpFlowAI only; external security design review of threats |
| G4 Real client content | External security review passed; runbooks live; monitoring for purge/scan |
| G5 External product | Explicit commercial decision + evidence from §14 — default **NO-GO** |

**This research packet stops at G0 → request G1.**

---

## 20. Related documents

- [`SECURE_CONTENT_INTAKE_REPO_INVENTORY.md`](./SECURE_CONTENT_INTAKE_REPO_INVENTORY.md)  
- [`SECURE_CONTENT_INTAKE_DECISION_SUMMARY.md`](./SECURE_CONTENT_INTAKE_DECISION_SUMMARY.md)  
- `docs/operations/TENANT_CLIENT_LOGIN.md`  
- `docs/operations/VIDEO_OPTIMISATION_WORKFLOW.md`  
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`  
- `docs/operations/SELF_HOSTED_OPS_R2_RESTIC.md`  
- `.cursor/rules/delivery-reality.mdc`
