# Secure temporary client content intake — repository inventory

**Status:** Research evidence only. No runtime changes.  
**Date:** 2026-07-16  
**Branch:** `research/secure-content-intake-assessment`  
**Base inspected:** `origin/main` @ `87a59e1c`

This inventory supports [`SECURE_CONTENT_INTAKE_ASSESSMENT.md`](./SECURE_CONTENT_INTAKE_ASSESSMENT.md). Paths are relative to the repository root.

---

## 1. Application architecture

| Path | Role | Evidence notes |
|------|------|----------------|
| `api/factory_router.js` | Sole serverless API entry; host tenancy; path dispatch | Rewrites from `vercel.json` `/api/(.*)` |
| `vercel.json` | Rewrites, crons, Hobby constraints | Crons are daily; no intake purge job |
| `pages/change.js` | Change Console UI; attachment upload UX | FileReader → base64 upload |
| `pages/index.js` and other `pages/*` | Marketing / tenant surfaces | Not intake gates |
| `lib/server/*` | HTTP handlers, auth, uploads, media | Server-side patterns to extend |
| `lib/cmp/router.js` | CMP `?action=` switch, gates | Operator control plane |
| `lib/cmp/_lib/*` | Ticket helpers, Lux attachments, telemetry, dispatch | |
| `next.config.mjs` | Prisma plugin | No Edge middleware file found |

**Request flow (simplified):** Browser → Vercel rewrite → `api/factory_router.js` → `applyCorpflowHostTenantResolution` → auth / cmp / change-attachment / cron handlers.

---

## 2. Authentication and session

| Path | Role |
|------|------|
| `lib/server/session.js` | `corpflow_session` HMAC-JWT cookie; domain scoping |
| `lib/server/auth.js` | Login, TTL (`CORPFLOW_SESSION_TTL_SEC`), password-reset sha256 |
| `lib/cmp/_lib/sovereign-session.js` | Compact HMAC token for dormant gate |
| `lib/server/tenant-preview-token.js` | `cf_preview` short-lived branding token on `*.vercel.app` |
| `lib/cmp/_lib/client-decisions-magic-link.js` | One-time client decisions links |
| `docs/operations/TENANT_CLIENT_LOGIN.md` | Canonical login / host / tenancy checklist |

**Gates in CMP:** `requireDormantGate`, `requireFactoryMasterOnly` in `lib/cmp/router.js` (approx. lines 1828–1878 region).

---

## 3. Tenant and host boundary

| Path | Role |
|------|------|
| `lib/server/host-tenant-context.js` | Sync host → surface / tenant derivation |
| `api/factory_router.js` | `attachTenantFromHostPg` / DB hostname overlay |
| `prisma/schema.prisma` | `Tenant`, `TenantHostname`, `AuthUser`, memberships |
| `docs/operations/TENANT_CLIENT_LOGIN.md` | Apex vs tenant hosts; Lux official host |
| `docs/operations/MULTI_TENANT_CONTAINMENT_AND_VISUAL_SEPARATION_AUDIT.md` | Containment audit |

---

## 4. Client-facing upload components

| Path | Role | Temporary-intake fit |
|------|------|---------------------|
| `lib/server/change-attachments.js` | Upload / list / download; session scope; MIME allowlist; size/count caps | Closest API; **permanent** Postgres store |
| `pages/change.js` | Upload UI (~attachment panels) | UX patterns; not security-checking lifecycle |
| `lib/client/lux-change-ticket-context.js` | Lux panel heuristics | |
| `lib/cmp/_lib/lux-request-attachments.js` | Review / link / publish / archive metadata | Archive-first; **no auto-delete of bytes** |
| `lib/server/lux-property-media.js` | Public media after publish gates | “No public URL before approval” pattern |
| `lib/server/lux-media-storage.js` | Postgres byte adapter; future S3/R2 noted as **not implemented** | Lines 1–14 comment future adapters |
| `lib/server/cloudinary-upload.js` | Cloudinary helper | **Not on main upload path** |
| `lib/server/tenant-intake.js` | Lead JSON intake | Not binary files |
| `lib/server/product-a-intake.js` | Product A structured intake | Not binary DMS |
| `docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md` | Lux attachment review notes | |
| `docs/LUX/LUX_MEDIA_GOVERNANCE.md` | Media governance | Distinct from temporary intake |

**Env knobs (template only):** `.env.template` — `CORPFLOW_CHANGE_UPLOAD_MAX_BYTES`, `CORPFLOW_CHANGE_UPLOAD_MAX_FILES_PER_TICKET`, `CORPFLOW_CHANGE_UPLOAD_ALLOWED_MIME`.

---

## 5. Object storage / R2

| Path | Role |
|------|------|
| `docs/operations/SELF_HOSTED_OPS_R2_RESTIC.md` | R2 + restic **ops backups**; hard boundary: do not integrate into production app (≈L109–111) |
| `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` | Self-hosted stack inventory; supporting services only |
| `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` | L1/L2/L3; §5.5 Uptime Kuma only carve-out |

**Finding:** No production-app S3/R2 SDK intake path. Quarantine storage for a future slice must be newly designed and authorized.

---

## 6. Postgres / Prisma models (relevant)

| Model | File | Relevance |
|-------|------|-----------|
| `CmpTicket` | `prisma/schema.prisma` ≈L71–91 | Workflow ticket; `console_json` |
| `CmpTicketAttachment` | ≈L111–127 | `fileName`, `contentType`, `byteSize`, `data Bytes` — **no** sha256/scan/TTL |
| `TelemetryEvent` | ≈L190–207 | Append-only events |
| `AutomationEvent` | ≈L266–288 | Ingest spine + forward |
| `TechnicalLeadAudit` | ≈L95–108 | Delivery audits |
| `TenantHostname` / `Tenant` / `AuthUser` | schema | Tenancy + auth |
| `LuxListing` | ≈L130+ | `mediaRefsJson` — not raw upload store |
| `Lead` | ≈L11–29 | Form intake |

**DDL mirror:** `lib/server/postgres-ensure-schema-statements.js` (attachments as `bytea`).

**Absent:** quarantine, intake item, destruction record, scan job tables.

---

## 7. `/change` and CMP action patterns

| Path | Role |
|------|------|
| `lib/cmp/router.js` | Action resolution, tenant boundary, large `switch (action)` |
| Lux attachment actions | `lux-attachment-review-set`, property link/publish, archive/restore (router regions ≈L883–1543+) |
| Binary upload | **Not** a CMP action — `/api/change-attachment/*` via factory router |
| `lib/cmp/README.md` | CMP API surface documentation |
| `docs/runbooks/CHANGE_CONSOLE_INSPECTION.md` | `/change` inspection / smoke |

---

## 8. API routing and server-side actions

| Path | Role |
|------|------|
| `api/factory_router.js` | Dispatch including `change-attachment/{upload,list,download,public}` |
| `lib/server/change-attachments.js` | Handlers for upload/list/download |
| `lib/automation/gateway.js` | Automation ingest |
| `lib/automation/forward.js` | Best-effort n8n forward |
| `lib/automation/internal.js` | Trusted automation event recording |

**Note:** Inventory agents observed `handleChangeAttachmentPublic` import/route may be incomplete relative to exports — treat as a hygiene item, not an intake building block, if confirmed during implementation.

---

## 9. Background jobs / async patterns

| Path | Role |
|------|------|
| `vercel.json` crons | billing-sentinel, cmp-monitor, overseer, stuck-self-repair, technical-lead |
| `lib/cmp/_lib/github-dispatch.js` | `repository_dispatch` for CMP sandboxes |
| `docs/automation-framework.md` | Automation spine |
| `docs/n8n/automation-forward-recipe.md` | Forward recipe |

**Absent:** intake scan worker, quarantine purge cron, deletion retry worker.

---

## 10. GitHub Actions

| Workflow | Path | Relevance |
|----------|------|-----------|
| Agent CI | `.github/workflows/test.yml` | `npm test`, build, marketing gate |
| Vercel env check | `vercel-env-check.yml` | Required keys present |
| Production deploy hook | `vercel-production-deploy-hook.yml` | Manual |
| Walkthrough video | `generate-walkthrough-video.yml` | FFmpeg + Playwright; trusted content |
| **Video optimisation verify** | `video-optimisation-verify.yml` | Installs FFmpeg; probes `public/media/corpflowai/**/*.mp4` |
| Factory control / health / dispatcher / housekeeping | `factory-*.yml` | Ops loops |
| CMP branch / PR gates | `cmp-*.yml` | Ticket sandbox discipline |
| Domain routing / Postgres diagnose / smoke | other workflows | Manual probes |

---

## 11. Vercel build and preview

| Path | Role |
|------|------|
| `docs/VERCEL_DEPLOYMENT.md` | Production = `main`; Hobby cron limits; Technical Lead |
| `vercel.json` | Rewrites + crons |
| Preview smoke docs | `docs/runbooks/CHANGE_CONSOLE_INSPECTION.md` §7 for `/change` layout |

---

## 12. FFmpeg scripts and commands

### 12.1 Website video optimisation (primary reusable processor for cleared MP4)

| Path | Role |
|------|------|
| `scripts/optimise-video.sh` | FFmpeg H.264/AAC optimise; ffprobe gates; SHA-256 output; no overwrite; cleanup on failure |
| `docs/operations/VIDEO_OPTIMISATION_WORKFLOW.md` | Operator runbook; L3 interactive posture; size targets |
| `package.json` script `video:optimise` | `bash scripts/optimise-video.sh` |
| `.github/workflows/video-optimisation-verify.yml` | Syntax + probe tracked web MP4s |
| `node-tests/video-optimisation-workflow.test.mjs` | Asserts script/workflow wiring |
| `artifacts/video-masters/.gitignore` | Masters ignored |

**Invocation:** `npm run video:optimise -- <input.mp4> <output.mp4>`  
**Assumes:** local files; input must be probeable MP4 with audio.  
**Not for:** uncleared client uploads; Vercel serverless.

### 12.2 Walkthrough encode pipeline

| Path | Role |
|------|------|
| `scripts/video/encode-mp4.mjs` | WebM → captioned MP4 |
| `scripts/video/validate.mjs` | YAML schema + mock safety |
| `scripts/video/run-walkthrough.mjs` | Playwright record |
| `scripts/video/write-provenance.mjs` | SHA-256 provenance |
| `scripts/video/serve-mock.mjs` | Local mock server |
| `scripts/video/README.md` | Operator notes |
| `docs/marketing/LR_PROOF_2_VIDEO_PIPELINE_PROPOSAL.md` | Design |
| `.github/workflows/generate-walkthrough-video.yml` | CI chain |
| `data/walkthroughs/` | YAML sources |
| `public/assets/video/lead-rescue/*.provenance.json` | Signed-off example |

---

## 13. Video optimisation workflow (approved)

See §12.1 and `docs/operations/VIDEO_OPTIMISATION_WORKFLOW.md`.  
**Separation rule (existing):** use only after content approval; does not publish/deploy/upload.

---

## 14. File validation / checksum utilities

| Path | Role |
|------|------|
| `lib/server/change-attachments.js` ≈L96–149 | Size/count; **client-declared** MIME allowlist |
| `lib/cmp/_lib/image-dimensions.js` | PNG/JPEG/GIF/WebP magic-byte dimension probe |
| `scripts/optimise-video.sh` | ffprobe validation + SHA-256 |
| `scripts/video/write-provenance.mjs` | Multi-file sha256 |
| Visual asset manifests under `data/visual-assets/*.manifest.json` | `content_hash` sha256 pattern |
| `docs/marketing/CORPFLOW_ASSET_GOVERNANCE.md` | Asset hash governance |

**package.json:** No `file-type`, `clamav`, `multer`, `busboy` dependencies found for upload sniffing.

---

## 15. Logging and monitoring

| Path | Role |
|------|------|
| `docs/operations/MONITORING_ARCHITECTURE.md` | Monitor map; no intake/scan queue monitor today |
| `docs/operations/DELIVERY_VERDICT_AND_ALERTS.md` | Delivery verdict alerts |
| `docs/operations/PRODUCTION_PULSE_V1.md` | DB pulse |
| `lib/automation/internal.js` | Trusted automation events |
| Telemetry emit helpers in CMP libs | Operator-visible events |

---

## 16. Test frameworks

| Path | Role |
|------|------|
| `package.json` → `npm test` | `scripts/run-node-tests.mjs` → `node --test` on `node-tests/*.mjs` |
| `node-tests/lux-request-attachments.test.mjs` | Lux attachment metadata lifecycle |
| `node-tests/lux-attachment-panel-readability.test.mjs` | UI readability |
| `node-tests/lux-content-sprint-upload-button.test.mjs` | Upload button presence |
| `node-tests/video-optimisation-workflow.test.mjs` | Optimise workflow wiring |
| `node-tests/client-decisions-client.test.mjs` | Client decisions |
| `.github/workflows/test.yml` | Also runs pytest under `core/engine/tests/` (legacy) |

**Absent:** malware scan tests, deletion verification tests, magic-byte mismatch upload tests.

---

## 17. Tenant-specific UI surfaces

| Path | Role |
|------|------|
| `pages/change.js` | Shared control plane; Lux-specific panels |
| Lux marketing / listing pages under `pages/` | Client site; published media only |
| CorpFlowAI marketing pages | Public; not upload gates |
| `docs/operations/TENANT_CLIENT_LOGIN.md` | Host mapping |

---

## 18. Access-control helpers

| Path | Role |
|------|------|
| `lib/cmp/router.js` | `requireDormantGate`, `requireFactoryMasterOnly`, host conflict, membership enforcement |
| `lib/server/change-attachments.js` | `resolveUploadScope`, `assertTicketAccess` |
| `lib/server/session.js` / `auth.js` | Session mint/verify |
| Factory-only action allowlists in CMP router | Prevent factory actions on tenant hosts |

---

## 19. Temporary-file handling

| Path | Pattern |
|------|---------|
| Video pipeline | Repo-local `.artifacts/` / `.artifacts/raw/` (gitignored) |
| `scripts/optimise-video.sh` | Local paths; trap removes failed output |
| `node-tests/*` | Occasional `os.tmpdir` fixtures |
| Change uploads | **No** temp files — bytes → Postgres immediately |

---

## 20. Architectural constraints (material)

| Constraint | Source |
|------------|--------|
| One production app / one Postgres | Operator doctrine / shared TODO / ops stack docs |
| No R2 in production app without new approval | `SELF_HOSTED_OPS_R2_RESTIC.md` |
| No extra Docker on L3 except named §5.5 carve-outs | `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` |
| Vercel cannot run FFmpeg/ClamAV | Serverless limits; existing FFmpeg docs place work on L3/GHA |
| Lux archive ≠ temporary delete | `lux-request-attachments.js` archive-first comments |
| Delivery Reality | `.cursor/rules/delivery-reality.mdc` — live prod required for COMPLETE |

---

## 21. Documentation index for this research

| Document | Path |
|----------|------|
| Full assessment | `docs/research/SECURE_CONTENT_INTAKE_ASSESSMENT.md` |
| This inventory | `docs/research/SECURE_CONTENT_INTAKE_REPO_INVENTORY.md` |
| CEO/operator summary | `docs/research/SECURE_CONTENT_INTAKE_DECISION_SUMMARY.md` |

---

## 22. Evidence snapshot — change attachment MIME gate

From `lib/server/change-attachments.js` (upload handler):

- Max bytes from env, capped at 20 MiB; default ≈3 MiB.  
- Allowed MIME from env default `image/,video/,application/pdf`.  
- Validation compares **declared** `content_type` string prefixes — not buffer magic bytes.

From `prisma/schema.prisma` `CmpTicketAttachment`:

- Stores `data Bytes` with filename/contentType/byteSize — no scan or checksum columns.

From `scripts/optimise-video.sh`:

- Requires `ffmpeg`, `ffprobe`, sha256 tool.  
- Input must exist as local file and probe as MP4 with audio.  
- Prints `VIDEO_OPTIMISATION_RESULT` including SHA-256.
