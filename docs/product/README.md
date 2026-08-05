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
| [PRODUCT_RADAR_CANDIDATES.md](./PRODUCT_RADAR_CANDIDATES.md) | Weekly radar + Product A sync 2026-06-22: Langfuse, Chatwoot (inbox standard), Twenty/EspoCRM bake-off, Postiz/Mixpost discovery, AgentSpan verified watch — **NO INSTALLATION AUTHORIZED** | 2026-06-22 |
| [WEBSITE_AI_CHAT_AGENT_TOOL_DECISION_NOTE_V1.md](./WEBSITE_AI_CHAT_AGENT_TOOL_DECISION_NOTE_V1.md) | Website AI chat-agent re-evaluation: Flowise first pilot; Chatwoot CE ≠ free AI (Captain gated); Dify multi-tenant license risk — **NO IMPLEMENTATION AUTHORIZED** | 2026-07-27 |
| [AI_RECEPTIONIST_PIPECAT_BROWSER_PILOT_V1.md](./AI_RECEPTIONIST_PIPECAT_BROWSER_PILOT_V1.md) | **SUPERSEDED** — browser-voice / Pipecat build-pilot closed; prototype removed — see ElevenLabs website voice-chat pilot | 2026-08-03 (superseded 2026-08-05) |
| [ELEVENLABS_WEBSITE_VOICE_CHAT_PILOT_V1.md](./ELEVENLABS_WEBSITE_VOICE_CHAT_PILOT_V1.md) | ElevenLabs Agents website voice-chat pilot (CorpFlowAI pages); gated placeholder; **NO ACTIVATION AUTHORIZED** | 2026-08-05 |

### Product A — US clinics revenue machine

| Doc | Role |
| --- | ---- |
| [PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md](./PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md) | Canonical plan — Langfuse, Chatwoot inbox, GHL legacy, Twenty/EspoCRM bake-off, social discovery, AgentSpan watch (v2, 2026-06-22) |
| [PRODUCT_A_INTAKE_WEBHOOK.md](./PRODUCT_A_INTAKE_WEBHOOK.md) | Intake API payload, env vars, deploy checklist |
| [PRODUCT_A_NON_GHL_DATA_WORKFLOW_PACKET.md](./PRODUCT_A_NON_GHL_DATA_WORKFLOW_PACKET.md) | Sheets schema, CSV templates, n8n specs, audit rubric, Florida sample batch |
| [PRODUCT_A_BEAUTY_LAYER_IMPLEMENTATION_PACKET_V1.md](./PRODUCT_A_BEAUTY_LAYER_IMPLEMENTATION_PACKET_V1.md) | Human-First Beauty Layer adoption (photo + frosted glass) for `/product-a/us-clinics` — reusable primitives, a11y/perf, asset governance, Plausible before/after; docs-only, runtime gated |

CSV templates: [product-a-csv-templates/](./product-a-csv-templates/)

---

## Adding a new entry

1. Add a capture doc under `docs/product/` (or approved sibling folder).
2. Set status + **`NO IMPLEMENTATION AUTHORIZED`** in the doc header.
3. Append a dated bullet to `artifacts/chat_history.md`.
4. Add a row to the index table above in the same PR.
5. Open a docs-only PR clearly belonging to the **CorpFlow Candidate & Reference Library**.

Standing auto-merge permission applies only when the PR meets all guardrails in `.cursor/rules/library-capture-auto-merge.mdc`.
