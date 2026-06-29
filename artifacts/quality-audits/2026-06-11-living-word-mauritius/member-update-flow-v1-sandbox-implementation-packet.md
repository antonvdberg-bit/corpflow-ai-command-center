# Packet: Member Update Flow v1 — Living Word test-tenant pilot build

**Status:** IN PROGRESS (code on branch; DB migration **not** applied)
**Type:** Implementation packet (Living Word test-tenant pilot — not a separate sandbox abstraction)
**Tenant:** `living-word-mauritius` (already the test tenant / test site)
**Standard:** `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`
**Design source:** [`member-update-flow-schema-form-design-v1.md`](./member-update-flow-schema-form-design-v1.md) (merged PR #480)
**DB proposal (gate):** [`member-update-flow-v1-db-migration-proposal-v1.md`](./member-update-flow-v1-db-migration-proposal-v1.md)
**Companion:** [`production-deployment-options-data-residency-decision-v1.md`](./production-deployment-options-data-residency-decision-v1.md) §8A, [`pilot-privacy-consent-notice-draft-v1.md`](./pilot-privacy-consent-notice-draft-v1.md)

---

## 1. Goal

Build a **Living Word test-tenant pilot** two-step Member Update Flow v1 (identify → confirm/update) on the **existing** Living Word tenant route/surface, **admin-gated and non-public** until approved — using **synthetic or manually seeded test records first**, with operator review before any real update.

No separate sandbox layer unless technically necessary (it is not).

## 2. Definition of Done

- [x] Admin-gated API routes on Living Word tenant surface: schema `GET`, identify `POST`, submit `POST`.
- [x] Step 1 identify performs match on **synthetic seed** only (email → phone → name) and returns `matched` / `unconfirmed` / `ambiguous`.
- [x] Step 2 validation uses **only the in-scope field allowlist**; provisional enums are sandbox-only (not GHL truth).
- [x] Submit returns operator-review payload with `canonical_write: false`, blank-overwrite-safe diff, no persistence until DB gate cleared.
- [x] **Excluded fields rejected** (youth, prayer, notes, medical/legal/financial, donation, business network, team assignment).
- [x] `consent_acknowledged` required on submit.
- [x] Unit tests: match, exclusions, blank-overwrite, prefill allowlist (23 tests).
- [x] `npm test` (1220 pass) and `npm run build` on branch.
- [ ] Two-step form UI exercised on Preview with admin session (preview smoke).
- [ ] PR opened against `main`, CI green. **No merge** without Anton.
- [ ] DB migration **not** applied until explicit approval of proposed SQL.

**Still out of scope:** production public launch, GHL writes, WordPress/DNS/embed, outbound messaging, real member import.

## 3. Scope

**In scope (this build):**

- Living Word tenant routes under `/api/tenant/living-word/member-update/*` (via factory router).
- Non-public HTML at `/living-word-member-update.html` (noindex; admin session required for API).
- Identify/match + prefill + validation + review payload (in-memory synthetic seed).
- Proposed migration SQL for durable tables — **approval gate only**, not applied.

**Out of scope (later packets):**

- Production public launch / volunteer pilot with real people (`GATE-PILOT`, `GATE-PRIVACY`).
- GHL writes, GHL contact import, WordPress embed/cutover, DNS.
- Outbound email/WhatsApp/SMS.
- Multilingual UI.
- Live GHL enum fetch (provisional enums only until church-approved set).

## 4. Constraints (hard rules — unchanged)

- No youth/Trinity Kids, prayer/counselling free-text, medical/legal/financial, donation/payment, business network, free-text notes, team-leader assignment.
- No GHL API calls, no GHL writes, no contact import.
- No WordPress/DNS/embed/cutover.
- No outbound messaging.
- No automatic overwrite of existing data; operator review required (`canonical_write` always false in v1).
- No `MASTER_ADMIN_KEY` in operator processes — admin `corpflow_session` only.
- No secrets or real member data in repo/artifacts.
- **Non-public:** `MEMBER_UPDATE_PUBLIC_LAUNCH_AUTHORIZED = false` until a separate gate.

## 5. Routes and surfaces (implemented)

| Surface | Path | Gate |
|---------|------|------|
| Form UI | `/living-word-member-update.html` | Visible URL; API calls require admin session |
| Schema | `GET /api/factory_router?__path=tenant/living-word/member-update` | Admin session |
| Identify | `POST …/member-update/identify` | Admin session |
| Submit | `POST …/member-update/submit` | Admin session |

Synthetic test records (examples for operator exercise):

- `test.alpha@example.test` / `+23050000001` → matched
- `test.bravo@example.test` → matched
- Unknown email → `unconfirmed`

## 6. Approval gates

1. **Packet approval** — proceed with test-tenant pilot build (this correction).
2. **DB schema gate** — [`member-update-flow-v1-db-migration-proposal-v1.md`](./member-update-flow-v1-db-migration-proposal-v1.md) — **STOP until Anton approves SQL**.
3. **Privacy gate (`GATE-PRIVACY`)** — board-approved consent copy before real people.
4. **Pilot gate (`GATE-PILOT`)** — 10 adult volunteers before real member data.
5. **Public launch gate** — flip `MEMBER_UPDATE_PUBLIC_LAUNCH_AUTHORIZED` only after explicit approval.

## 7. Verification evidence

- `node-tests/living-word-member-update.test.mjs` — 23 pass.
- Full `npm test` — 1220 pass.
- `npm run build` — (record on PR).
- Preview: admin login → load form → identify synthetic record → submit → verify `review_required: true`, `canonical_write: false`.

## 8. Rollback

Revert the PR. No DB migration applied in this phase, so no schema rollback needed. If migration was later approved and applied, use down-migration in the proposal doc.

## 9. Status block

```text
Packet status:
- State: IN PROGRESS
- Last update: 2026-06-29
- Branch: (local — not yet pushed)
- PR: (none yet)
- Local checks: npm test = 1220 pass, npm run build = (see CI)
- Persistence: in-memory synthetic seed only; DB proposal awaiting approval
- Live URLs tested: n/a until Preview deploy
- Verdict: LOCAL ONLY — not COMPLETE
```
