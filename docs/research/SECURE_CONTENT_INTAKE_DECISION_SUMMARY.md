# Secure temporary client content intake — decision summary

**For:** Anton (CEO / operator)  
**Date:** 2026-07-16  
**Status:** Research complete — implementation deferred by final operator decision  
**Full write-up:** [`SECURE_CONTENT_INTAKE_ASSESSMENT.md`](./SECURE_CONTENT_INTAKE_ASSESSMENT.md)  
**File map:** [`SECURE_CONTENT_INTAKE_REPO_INVENTORY.md`](./SECURE_CONTENT_INTAKE_REPO_INVENTORY.md)

---

## Final operator decision

CorpFlowAI will **not implement the secure temporary content intake capability now**.

Current priority remains getting the existing CorpFlowAI product set to market and pursuing active revenue goals. The business will continue using the existing content-handling methods until further notice.

This capability is retained as a **next product-set / post-go-live roadmap candidate**, not as current delivery work.

Reactivation is permitted only when one of these conditions is met:

1. Core go-to-market priorities are live and stable, and Anton explicitly reprioritises this product; or
2. A client funds the implementation at a level that covers interruption, implementation, productionisation and operating cost.

No vertical slice, pilot, scanner deployment, schema work, storage integration or production rollout is authorised by this decision.

### Indicative funded-client commercial position

For ordinary commercial content such as product/property images, MP4 videos, testimonials, brochures and standard business documents:

- Indicative implementation price: **USD 3,000 once-off**
- Indicative operating charge: **USD 75/month after the first three months**
- Indicative included usage: up to roughly **250 submissions or 50 GB/month**, subject to final technical confirmation
- Highly sensitive personal information, identity documents, financial information, medical information, biometric information or unusual formats require a separate security/privacy assessment and separate quote

These figures are planning guidance only and are not a formal quotation.

---

## What already exists

- One production app, one Postgres, `/change` as the operator control plane.
- Solid login, session, and tenant/host isolation.
- Ticket file uploads today (into Postgres) with size limits and a basic MIME allowlist.
- Lux review → publish → archive flow for lasting media (archive keeps the file).
- Audit event patterns (`telemetry` / `automation` events).
- Proven **FFmpeg video optimisation** script (tested) for approved local MP4s, plus a separate walkthrough video encoder.
- GitHub Actions and Vercel Preview patterns for safe testing.
- Free FFmpeg already aligned with L3 / CI — not paid SaaS.

## What must be built when reactivated

- A **temporary** intake path, not the current permanent ticket attachment store.
- Real file checks (magic bytes / type mismatch), not extension trust.
- Malware scanning with fail-closed behaviour.
- Accept / reject / process / **delete** lifecycle and a **Destruction and Retention Record**.
- A small worker path — Vercel cannot run the scanner or FFmpeg.
- Client-facing status language that never claims “guaranteed safe.”

## What can be reused

| Keep using | Do not reuse as-is |
|------------|-------------------|
| Auth, tenancy, `/change`, Postgres audit events | Permanent `cmp_ticket_attachments` as the quarantine store |
| FFmpeg optimise script **after** clearance | FFmpeg on unknown uploads |
| GHA FFmpeg install / verify patterns | R2 ops bucket as app upload store (blocked today) |
| Lux “no public URL until approved” idea | Lux “archive forever” retention doctrine |

## Likely time if reactivated

| Stage | Likely calendar | Likely engineer-days |
|-------|-----------------|----------------------|
| Research assessment | Done | ~1–2 |
| Technical vertical slice | **3–4 weeks** | **~15** (range 8–25) |
| Two-tenant pilot | **~2 months** | **~35** (range 20–55) |
| Production hardening | **~2 months more** | **~30** (range 15–50) |
| External product | Separate later decision | 120+ days class effort |

## Likely direct cash cost if reactivated

| Stage | Likely |
|-------|--------|
| Assessment | **$0** |
| Vertical slice | **$0–500** |
| Two-tenant pilot | **$2–5k** if a focused external design/security review is purchased |
| Production hardening | **$8–20k** class, depending on review and penetration-testing scope |
| External product | Separate commercial decision |

## Likely monthly operating cost

| Stage | Likely |
|-------|--------|
| Slice / early pilot | **~$0–100** |
| Hardened production | **~$50–200** unless abuse or large video volume grows |

The main cost remains engineering and operational attention rather than SaaS invoices.

## Primary risks

1. Scope creep into a shared drive or document-management system.
2. Scanner hosting and maintenance responsibility.
3. Mixing temporary intake with Lux permanent media governance.
4. Overclaiming that a file is safe.
5. Deletion records must remain honest: controlled deletion of CorpFlowAI-managed copies, not proof that every possible copy anywhere has ceased to exist.

## Roadmap position

**Classification:** Deferred product-set candidate after go-live / funded-client trigger.

**Current action:** Use existing content-handling processes until further notice.

**Do not start:** G1 vertical slice, schema migration, scanner hosting, storage changes, paid services, production integration or client launch.

**Reactivation gate:** New explicit Anton approval supported by either post-go-live prioritisation or client funding.

## Next approval required

None now.

When reactivated, return with a fresh bounded implementation packet based on the then-current repository and infrastructure. Do not rely blindly on this estimate if architecture or pricing has changed.