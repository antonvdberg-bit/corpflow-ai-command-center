# CIPC Desk — service-factory readiness v1

**Status:** Mapping and readiness overlay for GitHub **#988**.  
**Parents:** [#640](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/640) (CIPC Desk tenant), [#984](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/984) (commercial campaign — separate).  
**Tenant / working name:** `cipc-desk` / **CIPC Desk** (internal working name only).  
**Subject-matter owner:** Sarah Fourie.  
**Environment:** `corpflow_test` for existing standing review URLs; this packet itself is overlay + fictional tests (`local` until a later runtime slice is authorised).  
**Verdict:** Existing Postgres / Change Console / email-intake primitives are enough for a repeatable factory **template**. Routine clean cases can now be classified without a new data model. **This is not a live filing factory.** **Not a public launch.**

<!-- CIPC_SERVICE_FACTORY_READINESS_V1 -->

**Machine contract:** `config/cipc-service-factory.v1.json` · `lib/cipc-desk/service-factory.js`

**ANTON ACTION: NONE** for this overlay. Anton is needed only for the exact later consequential actions listed in §8 (merge of this PR if required, live CIPC submit, payment, live send, schema, secrets, or `client_production`).

---

## What is true when this pack is in use

CIPC Desk already has three first-service process packs that share the same six-layer shape:

| Service | Pack | Boundary status | Standing corpflow_test URL |
|---------|------|-----------------|----------------------------|
| Annual Returns | `docs/operations/CIPC_DESK_ANNUAL_RETURNS_PROCESS_PACK_V1.md` | Sarah-approved v1 (2026-08-07) | https://cipc.corpflowai.com/annual-returns |
| Director Changes | `docs/operations/CIPC_DESK_DIRECTOR_CHANGES_PROCESS_PACK_V1.md` | Review-ready on PR **#982** (not required on `main` for this overlay) | https://cipc.corpflowai.com/director-changes (404 until #980 is merged and published) |
| Beneficial Ownership | `docs/operations/CIPC_DESK_BENEFICIAL_OWNERSHIP_PROCESS_PACK_V1.md` | Review-ready; not Sarah-approved | https://cipc.corpflowai.com/beneficial-ownership |

Those packs are the **service content**. This file is the **common factory**: one template, one state map, one exception workbench rule, one evidence rule, one partner-portfolio rule.

The target path from #988 is:

`qualified_lead → scoped_service → mandate → structured_intake → document completeness → prerequisite checks → exception classifier → human specialist gate only when triggered → ready_to_file → controlled external CIPC action → proof capture → client status → completion → renewal/reminder`

That path is now an overlay on **existing** rows. It does not create a second production app, a second Postgres, or a new DocType.

---

## 1. Existing primitives — do not invent a second model

| Factory need | Reuse this | Do not create |
|--------------|------------|---------------|
| Durable matter | `cmp_tickets` for tenant `cipc-desk` | A CIPC-only ticket table |
| Service selection | `console_json.brief.service` (email-intake already infers a slug) | Per-service workflow engines |
| Client / partner route | `console_json.client_view.cipc_desk.client_route` (`direct_sme` / `professional_partner`) | A partner CRM |
| Intake checklist | `console_json.client_view.cipc_desk.checklist.items` | A new checklist product |
| Guided questions | `console_json.client_decisions` | A second decisions store |
| Operator control plane | `/change` + `cmp_tickets.status` / `stage` + `client_view.workflow_state` | A new workbench app |
| Document metadata | `cipc_desk.attachments` (name / type / note) and, when a file must be kept, existing `cmp_ticket_attachments` | GitHub storage or a new vault |
| Audit trail | `telemetry_events` and `automation_events` (`cmp_ticket_id`, `event_type`, `payload_json`) | A CIPC audit database |
| Optional commercial lead | Postgres `leads` + `qualification_json` | A second CRM (see `docs/operations/CRM_OPERATING_BASELINE_V1.md`) |
| First inbound capture | `POST /api/cipc-desk/email-intake` | A new intake API |

**CMP vs factory language:** `cmp_tickets.status` / `stage` remain the Change Console lifecycle (`Approved` / `Build`, `Closed`, …). Factory states live in the CIPC overlay and map onto the Layer 5 words Sarah already uses (`received`, `information incomplete`, `specialist review`, `ready for submission`, …). `/change` does **not** need a new workflow enum for this packet.

---

## 2. Common service template

Annual Returns, Director Changes, and Beneficial Ownership share one template. Only the service-specific flags change.

Each first service records:

- `service_id` and email-intake slugs;
- process-pack path and standing review URL;
- v1 entity scope: **private company** and **close corporation** only;
- what the standard path includes, and what must be identified and referred;
- whether an OTP step exists (Director Changes only);
- whether a yearly renewal reminder applies (Annual Returns and BO).

**Do not** write a custom workflow for each service. Add a new CIPC service later by filling the same template and pointing at a six-layer pack.

---

## 3. Which moves are deterministic, and which need Sarah

### Deterministic (the system may decide)

- Infer service from the existing email-intake cue / `brief.service`.
- Mark **information incomplete** when required facts, mandate, or checklist rows are missing.
- Run the exception classifier; if any red flag is present, set **specialist review**.
- Mark **ready for submission** only when the case is in v1 scope, mandate is signed, intake is complete, prerequisites are satisfied **or** separately referred/engaged, and no exception flag remains.
- Refuse **completed** unless proof-of-filing metadata is on the matter and the client has been marked informed.
- Group partner-portfolio tickets by `partner_key`.
- Show Sarah only exception / further-action items.
- Flag clerical work stale after 48 hours in incomplete/mandate/intake (internal SLA only — never a client CIPC promise).
- Draft a missing-information request and a client status update. Drafts are **not** sent.

### Human gates that remain (Sarah / operator / Anton)

| Gate | Who | Why it stays human |
|------|-----|--------------------|
| Ambiguous authority / mandate | Sarah | Do not guess authority to act |
| Statutory / legal interpretation | Sarah | Not a filing clerk decision |
| Complex beneficial ownership (trust, juristic, layered, foreign, unclear, affected) | Sarah | Desk must not determine who a beneficial owner is |
| Historic registry discrepancies | Sarah | Risk of filing the wrong record |
| Restoration, deregistration, MOI, share restructure | Sarah | Out of standard v1 |
| Director death or removal | Sarah | Not a standard resignation |
| Financial / accounting judgment (FAS/AFS preparation, audit route) | Accountant / Sarah | Annual Returns v1 is check-only |
| Pilot commercial acceptance | Anton / commercial owner | First paying / partner acceptance |
| **Controlled external CIPC submission** | Named operator + exact later authorisation | Protected consequence |
| **Payment or client-facing commitment** | Anton | Protected consequence |
| **Live email / WhatsApp / SMS** | Anton | Protected consequence |

Ready-to-file means “the overlay says the file **could** be lodged.” It does **not** lodge anything.

---

## 4. Documents and evidence — nothing sensitive in GitHub

Required evidence is a **checklist of references**, not files in this repository.

Allowed overlay kinds:

- engagement / mandate on file;
- intake checklist complete;
- CIPC fee-funding confirmed (funding path only — no Desk price);
- filing confirmation reference;
- filing certificate / CoR39 reference;
- OTP-finalised note (Director Changes);
- client-informed note.

Store files, when they must be stored, on the existing ticket attachment path (`cmp_ticket_attachments`) or an operator vault **outside Git**. The overlay keeps `kind`, `file_name`, and a pointer such as `cmp_ticket_attachments:<id>`.

**Never** place in GitHub, PR text, tests, or docs:

- identity-document or passport images;
- certified-ID bytes;
- live CIPC customer-code secrets;
- real client personal data.

Fictional registration numbers in tests (for example `K2026/000001/07`) are labels only.

---

## 5. Partner batch / portfolio mode

Accounting practices are the primary commercial market (#984). Delivery must support **one firm → many client entities** without a new partner table.

Reuse:

- `client_route = professional_partner` (already inferred by email-intake when the inbound text looks like an accountant / firm);
- `cipc_desk.partner_key` to group entities;
- `cipc_desk.entity_key` for the enterprise number of each referred company.

The portfolio view is: partner key, entity count, how many matters are ready, how many need Sarah, how many are complete. Sarah still sees only the exception subset.

---

## 6. SLA / queue and the exception-only workbench

Two queues, one database:

1. **Clerical queue** (system / operator): incomplete intake, missing mandate, stale 48-hour reminders, draft client updates. Sarah does **not** sit here.
2. **Exception workbench** (Sarah): `specialist_gate`, `further_action_required`, or any classified exception flag.

That is the low-touch target from #988: routine clean cases should need a person only for pilot commercial acceptance, an exception flag, or the controlled submission/payment gate.

Internal stale flags are **not** client promises. CIPC “Immediate” / 10-day / 30-day language stays in the process packs and must not be converted into Desk guarantees.

---

## 7. Completion evidence and audit trail

A matter may move to **completed** only when:

1. proof-of-filing metadata is on the overlay (Annual Returns: confirmation **and** certificate reference; Director Changes: CoR39 / confirmation, plus OTP-finalised where the electronic path needs it);
2. the client has been marked informed (draft or later approved send — this packet does not send);
3. no open specialist red flag is being hidden inside “completed”.

Payment alone is not completion. That is already the Annual Returns pack rule.

Audit events, when a later runtime slice writes them, belong on existing `telemetry_events` / `automation_events` with `cmp_ticket_id` and a factory event type such as `cipc.factory.state_derived`. This packet does not add writers or schema.

Renewal / calendar reminders (Annual Returns and BO) may later be an `automation_events` row for n8n. This packet defines the state; it does not activate n8n or any reminder send.

---

## 8. Protected actions — mentions are not the gate

This overlay talks about payment, email, CIPC, and schema so operators can see the boundary. Talking about them does **not** perform them.

| Exact action | Authorised by this packet? |
|--------------|----------------------------|
| Docs + mapper + fictional tests + PR | Yes |
| Merge of this PR | No — factory workers do not merge unless the issue gives that exact authority |
| Live CIPC login / submit / OTP | No |
| Payment activation or live payment | No |
| Live email / WhatsApp / SMS | No |
| Schema or new infrastructure | No |
| Secrets / CIPC credential automation | No |
| `client_production` or public launch | No |

If a later issue authorises one exact row above, authorise **that row only**.

---

## 9. Fictional end-to-end proofs

`lib/cipc-desk/service-factory.js` ships three first-service fixtures plus a partner batch. They use invented enterprise numbers only.

| Scenario | Expected overlay result |
|----------|-------------------------|
| Clean private-company Annual Return | `ready_to_file` / Layer 5 `ready for submission`; submit intent stays blocked |
| Director death | `specialist_gate` / `specialist review`; not treated as a resignation |
| Beneficial ownership via a trust | `specialist_gate` / `specialist review`; Desk does not name a beneficial owner |
| One fictional firm with three entities | Portfolio groups all three; Sarah sees only the BO exception |
| Annual Return with fictional proof + client informed | `completed`; still not a live filing |

Run:

```bash
node --test node-tests/cipc-service-factory-readiness.test.mjs
```

---

## 10. Gaps this overlay closes vs gaps that remain

**Closed by this packet (readiness, not live factory):**

- common template for the three first services;
- map from existing CMP / email-intake / attachment / audit primitives;
- deterministic vs human-gate split;
- evidence rules that keep sensitive documents out of GitHub;
- partner portfolio grouping;
- exception-only workbench filter;
- completion-requires-proof rule;
- fictional E2E coverage for AR, Director Changes, and BO.

**Still open (expected; not this PR):**

- live client intake at production volume;
- Sarah-approved Director Changes and BO operating boundaries;
- mandate template file selection (AR v1 already requires a signed mandate);
- commercial Desk pricing;
- n8n reminder heartbeat;
- actual CIPC execution, payment, and outbound send;
- Director Changes standing URL until PR #982 is merged and published to `corpflow_test`.

Factory success target remains: a routine clean case should need a person mainly at pilot commercial acceptance, an exception, or the controlled submission/payment gate. This overlay makes that rule executable. It does not yet run the live factory.

---

## Explicit non-actions

This pack does **not** authorise:

- public launch or `client_production`;
- schema / migration / new infrastructure;
- CIPC credential automation or production secret changes;
- payment activation or live payment;
- live email / WhatsApp / SMS / external outreach;
- storing identity documents in GitHub;
- merging this PR from the factory worker;
- claiming operational completion of any standing CIPC URL from this overlay alone.

---

## Document control

| Field | Value |
|-------|-------|
| Controlling issue | #988 |
| Parents | #640, #984 |
| First-service packs | Annual Returns #791 / #761; Director Changes #980 / PR #982; Beneficial Ownership #981 |
| Pack version | v1 — readiness overlay 2026-08-18 |
| Standing test URLs | Existing process-pack URLs only; this packet adds none |
| Public launch | **Not authorised** |
