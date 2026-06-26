# Packet: Member Update Flow v1 — sandbox-only build

**Status:** DRAFT (awaiting Anton approval)
**Type:** Implementation packet (sandbox-only)
**Tenant:** `living-word-mauritius`
**Standard:** `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`
**Design source:** [`member-update-flow-schema-form-design-v1.md`](./member-update-flow-schema-form-design-v1.md) (merged PR #480, `4866c76a`)
**Companion:** [`production-deployment-options-data-residency-decision-v1.md`](./production-deployment-options-data-residency-decision-v1.md) §8A, [`pilot-privacy-consent-notice-draft-v1.md`](./pilot-privacy-consent-notice-draft-v1.md)

---

## 1. Goal

Build a **sandbox-only** two-step Member Update Flow v1 (identify → confirm/update) for Living Word, on a Preview/sandbox surface, writing to **sandbox-scoped** storage with operator review — **no** production deploy, **no** real member data, **no** GHL writes, **no** public cutover.

## 2. Definition of Done

- [ ] New sandbox form routes exist: `GET` form render + `POST` identify + `POST` submit, gated to `living-word-mauritius` and **non-production env only**.
- [ ] Step 1 identify performs match on **synthetic/seed** data only (email → phone → name+key) and returns `matched` / `unconfirmed` / `ambiguous` without leaking other records.
- [ ] Step 2 renders prefilled (matched) or blank (unconfirmed) form using **only the in-scope field allowlist** from the design doc §2.3 / §3.3.
- [ ] Submit writes (a) raw evidence row, (b) a staged member upsert with **no blank-overwrite**, (c) an operator-review workflow event — all **sandbox-scoped**.
- [ ] **Excluded fields are not present** in the form, schema, or persisted payload (see §4 Constraints).
- [ ] `consent_acknowledged` is required; `consent_version` recorded; copy matches the board-review draft placeholder (final text gated on `GATE-PRIVACY`).
- [ ] Unit tests cover: match priorities, ambiguous→operator, blank-overwrite protection, excluded-field rejection, env gate (prod refusal), anti-enumeration copy.
- [ ] `npm test` and `npm run build` pass on the branch.
- [ ] PR opened against `main`, CI green. **Preview smoke** run against the Vercel Preview URL with synthetic data; screenshots/JSON captured.
- [ ] No production deploy; no real member import; no GHL/WordPress/DNS/outbound.

## 3. Scope

**In scope:**

- Sandbox form UI (2 steps) + server handlers for `living-word-mauritius` on **Preview/sandbox only**.
- Identify/match service over **seed/synthetic** records.
- Prefill adapter from a **sandbox-staged read model** (seeded, not live GHL import).
- Sandbox persistence: raw submission evidence + staged member upsert + operator-review workflow event.
- New Prisma model(s) for sandbox member + sandbox submission **if** approved at the DB gate (§7), else use an existing generic store scoped by tenant + a `sandbox` flag.
- Tests + preview smoke + verification artifact.

**Out of scope (defer to later packets):**

- Production deploy / production env wiring.
- Real member data import or live GHL read/sync into canonical tables.
- GHL writes of any kind.
- WordPress embed, DNS, public cutover.
- Outbound messaging (email/WhatsApp/SMS).
- Multilingual (Afrikaans/Kreol/French) — English only.
- Select-option enums sourced live from GHL (use operator-supplied enum JSON; see design §6 Q2).
- Any field outside the design §2.3 allowlist.

## 4. Constraints (hard rules — exclusions intact)

The following must **not** appear in the form, request schema, validation allowlist, persisted payload, or tests as accepted input:

- **No youth/Trinity Kids fields** (`contact.trinity_kids_*`).
- **No prayer/counselling free-text** (`contact.i_have_a_prayer_request`, `contact.update_your_profile`).
- **No medical / legal / financial fields.**
- **No donation fields** (`contact.to_celebrate_we_will_pledge_a_rs_200_donation…`).
- **No team-leader assignment fields** (all `*_leader` TEXT fields).
- **No business network fields** (`contact.business_name` etc.).
- **No free-text notes field** of any kind.

Additional constraints:

- **Non-production only:** handlers must refuse to run when `VERCEL_ENV === 'production'` (return 404/403), mirroring the GHL probe env gate.
- **No GHL API calls** in this packet (prefill uses seeded sandbox data only).
- **No `MASTER_ADMIN_KEY`** in any process; operator/admin actions use the admin `corpflow_session` channel.
- **No secrets** in repo, chat, logs, or artifacts.
- **No blank overwrite** of populated staged fields; **no auto-merge** on ambiguous match.
- Tenant isolation: a submitter can only ever see/confirm **their own** matched record.
- Server-side validation rejects any field key not on the allowlist (defensive denylist test required).

## 5. Risks

- Risk: excluded field slips into schema via prefill mapping. Blast radius: sandbox only; mitigated by explicit allowlist + denylist test. 
- Risk: match logic returns another member's data. Blast radius: sandbox synthetic data only; mitigated by isolation tests + anti-enumeration copy.
- Risk: new Prisma migration touches shared DB. Blast radius: schema; mitigated by DB approval gate (§7) and sandbox-scoped tables/flags + reversible migration.
- Risk: handler accidentally live on production. Blast radius: prod; mitigated by hard env gate + test asserting prod refusal.

## 6. Allowed actions

- Read repo, read merged design docs.
- Create branch `feat/lwm-member-update-flow-sandbox-v1`.
- Add server handlers, form UI, match/prefill services, tests under sandbox/non-prod gating.
- Add Prisma model + migration **only after** the DB approval gate (§7) is cleared by Anton.
- Run `npm test`, `npm run build`.
- Deploy **Preview** (not production); run preview smoke with synthetic data; capture evidence.
- Open a PR (no merge).

Not allowed without a further gate: production deploy, secret changes, DNS, GHL calls, real-data seeding, outbound messaging.

## 7. Approval gates

1. **Packet approval** — Anton approves this DRAFT before any code.
2. **DB schema gate** — before adding/running any Prisma migration (new sandbox tables), stop and get explicit approval; present the proposed migration SQL. (Per policy, destructive/DB changes need sign-off.)
3. **Privacy gate (`GATE-PRIVACY`)** — final consent copy requires church board approval before any pilot with real people.
4. **Pilot gate (`GATE-PILOT`)** — 10 adult volunteers + consent required before the flow touches any real member data (a **later** packet, not this one).
5. **Pre-merge gate** — PR opened, CI + preview smoke green, await Anton.
6. **Pre-production gate** — hard stop; this packet never deploys production.

## 8. Verification evidence

- Branch name, PR URL, base + head SHA.
- `npm test` summary (incl. new tests), `npm run build` summary.
- Preview deployment URL + deployment ID; preview smoke result with **synthetic** data (screenshots + JSON of the 3 match outcomes).
- Negative checks: production-env refusal; excluded-field rejection; cross-record isolation; blank-overwrite protection.
- Delivery Reality Audit block (verdict PARTIAL until live verification — which is **out of scope** here, so this packet tops out at "sandbox verified, awaiting pilot gates").

## 9. Rollback plan

Sandbox-only and non-production-gated: revert the PR. If the DB migration was applied (after §7 gate), run the paired down-migration to drop the sandbox tables; no production data is touched because handlers never run in production and no real import occurs.

## 10. Owner

- Approver: Anton
- Executor: Cursor agent
- Reviewer: Anton (+ church board for `GATE-PRIVACY` copy)

## 11. Open inputs needed before/within build

From design doc §6:

1. Field allowlist confirmation (gender, emergency contact, member_type for self-serve adults).
2. Operator-supplied **enum JSON** for SINGLE_OPTIONS/RADIO fields (no live GHL fetch).
3. Address fields in v1 or defer.
4. Team-serving checkboxes in v1 or defer.

## 12. Status block

```text
Packet status:
- State: DRAFT
- Started:
- Last update: 2026-06-26
- Branch: (none yet)
- PR: (none yet)
- Local checks: npm test = ?, npm run build = ?
- Live URLs tested: n/a (sandbox/preview only when built)
- Deployment ID: n/a
- Verdict: pending
- Notes: Implementation NOT started. Awaiting packet approval + DB schema gate.
```
