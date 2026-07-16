# Secure temporary client content intake — decision summary

**For:** Anton (CEO / operator)  
**Date:** 2026-07-16  
**Status:** Research complete — no build, no deploy, no merge required for the decision itself  
**Full write-up:** [`SECURE_CONTENT_INTAKE_ASSESSMENT.md`](./SECURE_CONTENT_INTAKE_ASSESSMENT.md)  
**File map:** [`SECURE_CONTENT_INTAKE_REPO_INVENTORY.md`](./SECURE_CONTENT_INTAKE_REPO_INVENTORY.md)

---

## What already exists

- One production app, one Postgres, `/change` as the operator control plane.
- Solid login, session, and tenant/host isolation.
- Ticket file uploads today (into Postgres) with size limits and a basic MIME allowlist.
- Lux review → publish → archive flow for ** lasting** media (archive keeps the file).
- Audit event patterns (`telemetry` / `automation` events).
- Proven **FFmpeg video optimisation** script (tested) for approved local MP4s, plus a separate walkthrough video encoder.
- GitHub Actions and Vercel Preview patterns for safe testing.
- Free FFmpeg already aligned with L3 / CI — not paid SaaS.

## What must be built

- A **temporary** intake path (not the current permanent ticket attachment store).
- Real file checks (magic bytes / type mismatch), not “trust the extension.”
- Malware scanning (ClamAV is the free candidate) with fail-closed behaviour.
- Accept / reject / process / **delete** lifecycle and a **Destruction and Retention Record**.
- A small worker path (GitHub Actions or an explicitly approved L3 service) — Vercel cannot run the scanner or FFmpeg.
- Client-facing status language that never claims “guaranteed safe.”

## What can be reused

| Keep using | Do not reuse as-is |
|------------|-------------------|
| Auth, tenancy, `/change`, Postgres audit events | Permanent `cmp_ticket_attachments` as the quarantine store |
| FFmpeg optimise script **after** clearance | FFmpeg on unknown uploads |
| GHA FFmpeg install / verify patterns | R2 ops bucket as app upload store (blocked today) |
| Lux “no public URL until approved” idea | Lux “archive forever” retention doctrine |

## Likely time

| Stage | Likely calendar | Likely engineer-days |
|-------|-----------------|----------------------|
| This assessment | Done | ~1–2 |
| Technical vertical slice (internal proof) | **3–4 weeks** | **~15** (range 8–25) |
| Two-tenant pilot (CorpFlowAI + LuxeMaurice) | **~2 months** | **~35** (range 20–55) |
| Production hardening (real client files) | **~2 months more** | **~30** (range 15–50) |
| Sell as external product | Not recommended yet | 120+ days class effort |

Optimistic is faster if scanner hosting is decided immediately and scope stays tiny. Conservative assumes authorization delays and extra security review loops.

## Likely direct cash cost

| Stage | Likely |
|-------|--------|
| Assessment | **$0** |
| Vertical slice | **$0–500** (usually $0 if we stay on free ClamAV + existing infra) |
| Two-tenant pilot | **$2–5k** if you buy a focused external design/security review |
| Production hardening | **$8–20k** class (review; pentest if you expand tenants) |
| External product | Separate commercial decision — do not budget yet |

## Likely monthly operating cost

| Stage | Likely |
|-------|--------|
| Slice / early pilot | **~$0–100** (mostly runner minutes + a little storage) |
| Hardened production | **~$50–200** unless abuse or large video volume grows |

Main cost remains **your / engineering time**, not SaaS invoices.

## Primary risks

1. This quietly becomes a Dropbox/DMS (scope creep).  
2. ClamAV needs a home — Vercel cannot host it; L3 needs a **new named approval** (Kuma’s carve-out does not cover it).  
3. Mixing temporary intake with Lux permanent property media.  
4. Saying “safe” when we only mean “passed our checks.”  
5. Deletion records must stay honest: controlled deletion of **our** object, not proof every copy on earth is gone.

## Smallest safe next step

Approve a **technical vertical slice** only:

- CorpFlowAI tenant  
- One uploader  
- One MP4 **or** one PDF  
- Validate → ClamAV scan → accept/reject → one cleared processing step → delete → Destruction and Retention Record  
- Preview / internal only — **no** production client rollout, **no** real client files yet  

## Is the vertical slice worth doing?

**Yes.** Enough of the control plane already exists that a thin slice will answer the remaining hard questions (scanner ops, delete proof, FFmpeg handoff) without building a platform. Skipping the slice and jumping to a multi-tenant pilot would cost more and teach less.

## Exact approval required next

**Approve G1 — Technical vertical slice packet**, including your choice of:

1. **Scanner hosting:** GitHub Actions ephemeral scan **or** a separate L3 ClamAV authorization packet (not “just install it”).  
2. **Quarantine store for the slice:** small Postgres quarantine table **or** worker-local files keyed in Postgres (no R2-in-app unless you separately overturn the ops boundary).  
3. **Hard scope lock:** temporary intake only — no shared drive, no DMS, no external customers, no real client content until a later gate.

Reply with: **Approve G1** (and the two choices above), **Defer**, or **Stop**.
