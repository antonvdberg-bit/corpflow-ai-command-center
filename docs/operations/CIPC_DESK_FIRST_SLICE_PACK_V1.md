# CIPC Desk — commercial first slice pack v1

**Status:** Docs + standing `corpflow_test` UI slice for GitHub **#640**. **NO IMPLEMENTATION AUTHORIZED** for live email/WhatsApp/SMS, payments, public launch, DNS purchase, schema migrations, or real CIPC client data.
**Environment:** `corpflow_test` on CorpFlowAI-hosted hosts (not `client_production`).
**Tenant id:** `cipc-desk`
**Primary live test URL:** `https://cipc.corpflowai.com/`
**Policy-aligned alias:** `https://cipc-desk.corpflowai.com/`
**Owner contact (preferred email):** `swart829@gmail.com`
**Subject-matter owner:** Serah Fourie
**Approval gate:** Anton van den Berg
**Anchor sentinel:** `<!-- CIPC_DESK_FIRST_SLICE_PACK_V1 -->`

<!-- CIPC_DESK_FIRST_SLICE_PACK_V1 -->

## 0. Status (required format)

| | |
|--|--|
| **What moved** | Standing tenant already live (PR #650). This pack adds dual SME + professional-partner email entry routes, standing-test copy (not “preview”), website_draft content refresh, magic-link host preference for `cipc*.corpflowai.com`, operator queue wording, research + reuse + Serah validation docs. |
| **What is blocked** | Merge/deploy of this PR; live email send; WhatsApp; payments; public brand/domain purchase; real client data. |
| **What is next** | Anton merge approval → Production spine deploy → verify `https://cipc.corpflowai.com/` shows dual routes + refreshed catalogue → Serah answers validation packet by email. |
| **Who owns it** | Cursor (PR); ChatGPT (coordination); Serah (professional validation); Anton (merge/deploy + protected gates). |
| **Anton needed** | **Yes** — merge + Production deploy only. **ANTON ACTION:** review/merge this PR; no DNS/secrets/schema requested in this slice. |

---

## 1. Delivery reality (honest)

| Check | State |
|-------|--------|
| Standing tenant hosts live | **YES** — `cipc.corpflowai.com` / `cipc-desk.corpflowai.com` |
| Email-intake usable on standing host | **YES** (fictional paste path; no live mailbox) |
| Live email / WhatsApp / SMS | **NO** (disabled by design) |
| Evidence rule | Use **CIPC Desk URLs only** — never Lux, Core health, or generic `/change` on another host |

Delivery path: `build → tests → PR → Anton approval → deploy to corpflow_test CIPC hosts → verify real CIPC URL → iterate`.

---

## 2. Research packet (brand / market / routes)

### 2.1 Provisional brand and short domain options

Working name remains **CIPC Desk** until Serah + Anton decide. Options beyond provisional (availability not purchased; research only):

| Option | Notes |
|--------|--------|
| **CIPC Desk** (current) | Clear; may feel generic; keep until research closes |
| **CIPC Admin Desk** | Emphasises administration, not “being CIPC” |
| **Company House SA Assist** | Risk: confusion with UK Companies House — **avoid** |
| **PtyReady** / **FilePty** | Short; weaker CIPC recognition |
| **Serah CIPC Desk** | Personal brand; good for warm network; weaker for partner white-label |
| Domains to evaluate later | `cipcdesk.co.za`, `cipcdesk.com`, `filewithserah.co.za` — **do not buy** without Anton |

**Positioning rule:** Never imply the business *is* CIPC, a regulator, a law firm, or an accredited representative unless Serah confirms a specific accreditation and Anton approves the claim.

### 2.2 Competitor positioning and public pricing language (external scan)

Public SA providers typically sell:

- **All-inclusive Pty Ltd registration** (example language: “R885 all-inclusive”, “register online in days”)
- **Annual returns + Beneficial Ownership** packages (service fee + **separate official CIPC fees** by turnover)
- Explicit BO hard-stop messaging (AR blocked until BO is current — CIPC notices from mid-2024)

Official CIPC fee bands (industry-reported 2025/2026 private company on-time AR examples): roughly **R100 → R3 000** by turnover; late penalties extra. **Always separate official fees from service fees in client copy.**

CIPC Desk first-slice language must stay **provisional / quote-after-review**, not a public rate card, until Serah validates.

### 2.3 Direct-SME vs professional-partner routes

| Route | Buyer | Email subject cue | Operating difference |
|-------|-------|-------------------|----------------------|
| Direct SME | Business owner / director | `Direct SME enquiry` | Single-company matter; plain-language checklist |
| Professional partner | Accountant / tax practitioner / firm | `Professional partner enquiry` | May batch/refer; capture firm name + which steps the firm retains |

Same OS: email → interpret → CMP ticket on `cipc-desk` → Serah queue in `/change` → draft reply → client decisions link. No second app.

### 2.4 Reusable free / open-source components (candidates only)

| Candidate | Use | Authorization |
|-----------|-----|---------------|
| Existing CorpFlow tenant shell + `website_draft` | Homepage / catalogue | **Reuse now** |
| Existing CMP `/change` + client-decisions magic link | Operator + client checkpoints | **Reuse now** |
| Existing communications design docs | Future inbound/outbound with approval | Design only — **no live wire** |
| CIPC eServices (official) | Filing destination Serah already uses | External; not embedded |
| Generic chatbot / Chatwoot / Open WebUI | — | **Not authorized** |

### 2.5 Conflict-of-interest safeguards (external launch)

1. Disclose CorpFlowAI owner relationship when commercially relevant.
2. Do not use Lux / other client data or brand assets for CIPC Desk marketing.
3. Keep `cipc-desk` tenant isolation fail-closed (intake/seed deny other tenants).
4. Fictional data only on corpflow_test until Anton approves real client data.
5. No public claims of guaranteed registration timelines or “CIPC accredited” without Serah evidence + Anton approval.
6. Partner route must not imply exclusivity that conflicts with Serah’s other professional duties without her confirmation.

---

## 3. Reuse inventory (safe vs avoid)

| Pattern | Source | Reuse? | Notes |
|---------|--------|--------|-------|
| Host → tenant map | Lux `lux` → `luxe-maurice` | **Yes** | `cipc` → `cipc-desk` explicit |
| `tenant_personas.website_draft` | Core tenant sites | **Yes** | Dual CTAs + routes section |
| CMP ticket + `/change` | Core | **Yes** | Canonical operator record |
| Client-decisions magic link | Core | **Yes** | Prefer CIPC host on standing URLs |
| Email-intake paste → ticket | CIPC #643/#650 | **Yes** | Still not a live mailbox |
| Lux cinematic marketing shell | Lux | **No** | Wrong brand; keep simple shell |
| Live Gmail/n8n send | Comms docs | **Not yet** | Needs Anton + #486 path |
| Second Postgres / app | — | **Never** | Single spine |

Tenant-boundary checks (automated in `node-tests/cipc-desk-standing-test-tenant.test.mjs`): standing hosts resolve to `cipc-desk`; Lux/other tenants cannot run CIPC workflow APIs.

---

## 4. Serah validation packet (email-ready)

**To:** Serah Fourie (`swart829@gmail.com`)  
**From / via:** Anton or ChatGPT coordination  
**Subject:** CIPC Desk — please validate these 8 items only

Copy/paste body:

```text
Hi Serah,

CIPC Desk is on the CorpFlowAI internal test site:
https://cipc.corpflowai.com/

This is fictional/test only. Please answer only what needs your CIPC expertise
(short answers are fine). Everything else we can leave provisional.

1) Which 3–5 services should stay on the public catalogue for first paying clients?
2) For private-company registration: what must the first client email always include?
3) For annual returns: confirm we must always separate official CIPC fees from your service fee, and note the BO hard-stop in client language — any wording you want?
4) Director appointment/resignation: minimum identity/consent documents you will not proceed without?
5) Professional-partner (accountant) route: what do you need from the firm on every referral?
6) Any service we should REMOVE or mark “not offered” immediately?
7) Preferred turnaround language for first-slice replies (e.g. “we confirm scope within X business days”) — no guarantees you’re unwilling to make?
8) Brand name: keep “CIPC Desk” for now, or do you already prefer another short name?

Please reply by email. No need to fill a long questionnaire.

Thank you,
CorpFlowAI / Anton
```

### Subject-matter checklist (operator-facing, not a broad business questionnaire)

- [ ] Catalogue trimmed to Serah-approved services  
- [ ] Required info list per top service  
- [ ] Exclusions / “not offered” list  
- [ ] Fee language: official CIPC vs service fee  
- [ ] Partner referral fields  
- [ ] Brand/domain decision deferred or confirmed  
- [ ] No “we are CIPC / law firm / accredited” claims without evidence  

---

## 5. Email-first operating model (smallest safe path)

```text
Client email (primary)
  → operator paste / future inbound (gated)
  → POST /api/cipc-desk/email-intake (fictional today)
  → CMP ticket on tenant cipc-desk
  → Serah reviews checklist + draft reply in /change
  → magic link for guided client decisions (on cipc host)
  → outbound send ONLY after separate Anton approval (not in this slice)
```

Rules:

- No simplistic yes/no when email has questions, conditions, or mixed feedback — keep status `pending` / draft text for human review.
- WhatsApp later only if Anton approves.
- `/change` remains canonical durable record.

---

## 6. Explicit non-actions

- No production merge/deploy without Anton  
- No env/secrets changes  
- No DB/schema migrations  
- No live client sends  
- No payment activation  
- No domain purchase  
- No real CIPC client data  

**NO IMPLEMENTATION AUTHORIZED** beyond the bounded PR linked to #640.
