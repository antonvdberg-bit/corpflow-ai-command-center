# CorpFlow Candidate & Reference Library

**Canonical library name:** `CorpFlow Candidate & Reference Library`

**Purpose:** Standing home for small **docs-only** captures of products, tools, articles, benchmarks, and future destination shapes worth tracking — **not** implementation authorization.

**Governance rule:** `.cursor/rules/library-capture-auto-merge.mdc`

---

## What belongs in this library

- Product candidates
- Tool references
- Article references
- Benchmark products
- Future roadmap references
- Destination-shape notes
- Marketing automation candidates
- AI video / article generation candidates
- Future chat / concierge references

**Default home:** `docs/product/**` unless an existing repo convention places a capture elsewhere (`docs/strategy/**`, `docs/research/**`, `docs/tools/**`).

---

## Allowed capture statuses

Use one or more of:

| Status | Meaning |
| ------ | ------- |
| `REFERENCE-ONLY` | External benchmark or shape note; not a vendor selection |
| `DESTINATION-SHAPE` | Future CorpFlow destination capabilities described |
| `CANDIDATE-CAPTURED` | Candidate recorded for later evaluation |
| `SERIOUS-CANDIDATE / EVALUATE-FIRST` | High-priority candidate; evaluate before build |
| `SERIOUS-CANDIDATE / DEPLOY-FIRST-PILOT` | Proven manual path; API or pilot deployment is the next bounded step — not production automation |
| `NO IMPLEMENTATION AUTHORIZED` | Required on every capture — no install, no runtime, no env |

**Do not use** `AUTHORIZED`, `SELECTED`, `IMPLEMENTING`, or `COMPLETE` unless Anton **separately and explicitly** authorizes implementation.

---

## Index (current entries)

| Entry | Status | Captured |
| ----- | ------ | -------- |
| [CHAT_DESTINATION_REFERENCE_SOCIAL_INTENTS.md](./CHAT_DESTINATION_REFERENCE_SOCIAL_INTENTS.md) | `REFERENCE-ONLY / DESTINATION-SHAPE` | 2026-06-18 |
| [MARKETING_AUTOMATION_CONTENT_ENGINE_CANDIDATES.md](./MARKETING_AUTOMATION_CONTENT_ENGINE_CANDIDATES.md) | Google Vids `EVALUATE-FIRST`; GPT Image `DEPLOY-FIRST-PILOT` | 2026-06-18 |
| [../execution/DEV_TOOLING_CANDIDATES.md](../execution/DEV_TOOLING_CANDIDATES.md) | GitHits `SERIOUS-CANDIDATE / DEV-CAPABILITY ACCELERATOR` | 2026-06-18 |
| [PRODUCT_RADAR_CANDIDATES.md](./PRODUCT_RADAR_CANDIDATES.md) | Issue #429: Guild.ai, Retool, TAAFT, ownAI; Issue #435: claude-code-local, gpt4free (rejected prod), AnyVids, Drafted (Lux priority), MakeInfographic — **NO INSTALLATION AUTHORIZED** | 2026-06-20 |

### Product A — US clinics revenue machine

| Doc | Role |
| --- | ---- |
| [PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md](./PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md) | Canonical plan — offer, stack, phases |
| [PRODUCT_A_INTAKE_WEBHOOK.md](./PRODUCT_A_INTAKE_WEBHOOK.md) | Intake API payload, env vars, deploy checklist |
| [PRODUCT_A_NON_GHL_DATA_WORKFLOW_PACKET.md](./PRODUCT_A_NON_GHL_DATA_WORKFLOW_PACKET.md) | Sheets schema, CSV templates, n8n specs, audit rubric, Florida sample batch |

CSV templates: [product-a-csv-templates/](./product-a-csv-templates/)

---

## Adding a new entry

1. Add a capture doc under `docs/product/` (or approved sibling folder).
2. Set status + **`NO IMPLEMENTATION AUTHORIZED`** in the doc header.
3. Append a dated bullet to `artifacts/chat_history.md`.
4. Add a row to the index table above in the same PR.
5. Open a docs-only PR clearly belonging to the **CorpFlow Candidate & Reference Library**.

Standing auto-merge permission applies only when the PR meets all guardrails in `.cursor/rules/library-capture-auto-merge.mdc`.
