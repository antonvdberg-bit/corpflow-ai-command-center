# Website AI chat-agent tool choice — decision note (v1)

**Library:** CorpFlow Candidate & Reference Library (`docs/product/README.md`)

**Status:** `SERIOUS-CANDIDATE / EVALUATE-FIRST` — docs/research only

**Verdict:** `NO IMPLEMENTATION AUTHORIZED`

**Owner:** Anton (operator); Cursor (research capture)

**Date (UTC):** 2026-07-27

**Trigger:** Re-evaluate website AI chat-agent tooling. Anton does not want to pay for a simple website AI chat agent if a free or low-cost self-hosted option can do the job.

**Hard constraints honoured:** No installs. No package changes. No production deployment. No env var changes. No client data. No paid tool approval.

**Related canonical docs:**

- `docs/operations/SERVER_SAFETY_BASELINE_AND_CHATWOOT_DECISION_V1.md` — Chatwoot deferred; human inbox ≠ AI agent
- `docs/product/PRODUCT_RADAR_CANDIDATES.md` — Chatwoot as inbox standard (not AI)
- `docs/product/CHAT_DESTINATION_REFERENCE_SOCIAL_INTENTS.md` — destination shape
- `docs/strategy/AI_LEAD_RESCUE_CHATBOT_VOICEBOT_OPTIONS_AUDIT_V1.md` — Lead Rescue pre-sale bot research (narrower scope)
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — § 5.5: Uptime Kuma only carve-out; new self-hosted tools need ADR + authorization packet
- `lib/server/chat-widget/` — native CorpFlow widget v0 (structured flows + optional Groq retrieval for tenants)

---

## Status

Research complete. **Chatwoot Community Edition is no longer a default free AI chat-agent option.** Captain AI is gated to paid self-hosted tiers and still requires an LLM API key. Chatwoot CE remains a **candidate human inbox / live-chat** tool only.

**Recommended first pilot for CorpFlowAI website AI chat:** **Flowise** (bounded sandbox on a disposable VPS — not on `corpflow-exec-01` without a separate authorization packet).

---

## Findings

### Verified facts (cited)

| Fact | Verified | Source |
| ---- | -------- | ------ |
| Chatwoot CE does **not** include Captain AI | **Yes** | [Chatwoot self-hosted pricing](https://www.chatwoot.com/pricing/self-hosted-plans/) — Captain AI listed under Premium Support ($19/agent/mo) and Enterprise; CE is $0 but excludes Captain AI, custom branding, roles/permissions. [Chatwoot user guide](https://www.chatwoot.com/hc/user-guide/articles/1750735898-purchasing-a-paid-self_hosted-chatwoot-license-a-step-by-step-guide) — "Free Self-Hosted Community Edition… doesn't include premium support" and Captain AI is a Premium feature. |
| Flowise has an embeddable website chat widget | **Yes** | [Flowise embed docs](https://docs.flowiseai.com/using-flowise/embed) — `flowise-embed` script tag per chatflow; CORS/`IFRAME_ORIGINS` env vars required for cross-origin embed. |
| Dify has strong AI workflow/RAG but license restricts multi-tenant commercial use | **Yes** | [Dify LICENSE](https://github.com/langgenius/dify/blob/main/LICENSE) — modified Apache 2.0: multi-tenant use (one workspace = one tenant) requires written authorization or commercial license; frontend branding cannot be removed without exception. [Dify issue #21926](https://github.com/langgenius/dify/issues/21926) — maintainer confirms multi-tenant on-prem requires `business@dify.ai`. |
| n8n Chat can trigger AI workflows from an embeddable widget | **Yes** | [n8n Chat Trigger docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chattrigger) — Embedded Chat mode + `@n8n/chat` npm package; [@n8n/chat on npm](https://www.npmjs.com/package/@n8n/chat). CorpFlow already runs n8n (L2 spine). |
| Typebot is strong for guided lead-capture flows | **Yes** | [Typebot embed docs](https://docs.typebot.com/deploy/web/html-javascript) — bubble/popup/standard embed; input blocks for email/phone; optional OpenAI/Anthropic blocks. |
| Rasa is powerful but heavier to implement | **Yes** | [Rasa deployment guide](https://rasa.com/blog/the-complete-guide-to-deploying-your-rasa-assistant/) — Docker Compose for small/dev; Kubernetes recommended for production; Rasa Pro requires license. Legacy Rasa X Helm baseline ≈ 4+ vCPU, 8+ GiB RAM for worker pods. |

### Important repo context

1. **Native CorpFlow chat widget v0** already exists (`lib/server/chat-widget/`) with structured flows, lead capture, optional Groq retrieval, and per-tenant budget caps. Best for deterministic tenant flows (e.g. Living Word). This note evaluates **third-party AI-agent platforms** for website Q&A + lead capture on CorpFlowAI marketing surfaces.
2. **Chatwoot** is explicitly **deferred** for install (`SERVER_SAFETY_BASELINE_AND_CHATWOOT_DECISION_V1.md`) and ranked as **conversation inbox standard**, not AI agent (`PRODUCT_RADAR_CANDIDATES.md`).
3. **Standing self-hosted hold:** only Uptime Kuma is authorized on `corpflow-exec-01` without a new ADR (`SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5). Any pilot needs a **separate authorization packet** — sameness is not authorization.
4. **n8n hardening** should precede expanding public webhook/chat surface (`PRODUCT_RADAR_CANDIDATES.md` — n8n hardening track ranked #2).

---

## Comparison matrix

Legend: **H** high / **M** medium / **L** low / **—** not applicable or weak fit.

| Criterion | 1. Flowise | 2. Dify | 3. n8n Chat | 4. Typebot | 5. Rasa | 6. Chatwoot CE + CorpFlow AI bridge |
| --------- | ---------- | ------- | ----------- | --------- | ------- | ----------------------------------- |
| **Self-hosting fit** | **H** — Docker/K8s; CE Apache 2.0 | **M** — Docker Compose/Helm; heavier stack | **H** — n8n already on CorpFlow spine | **H** — Docker self-host | **L** — K8s/Compose; Python ML ops | **M** — Chatwoot CE inbox + separate AI service |
| **Server requirements** | **L–M** — ~2 GB RAM, 5 GB disk for Flowise; LLM backend separate ([Flowise self-host guide](https://selfhosting.sh/apps/flowise/)) | **M–H** — Postgres, Redis, vector DB, web+api containers | **M** — uses existing n8n host; AI nodes add latency | **M** — Postgres + app containers | **H** — 4+ vCPU, 8+ GiB for production workers; Postgres, Redis, optional Kafka | **H** — Chatwoot: Rails + Postgres + Redis (~4 GB RAM min per Chatwoot docs) **plus** AI bridge |
| **Website widget/embed** | **H** — first-class `flowise-embed` per chatflow | **M** — embeddable app/chat; branding restrictions on console | **M** — `@n8n/chat` or custom; webhook URL in page source | **H** — bubble/popup/inline `@typebot.io/js` | **L** — custom web channel integration | **H** — Chatwoot website widget (human chat); AI via bridge |
| **Answer from site/company knowledge** | **H** — visual RAG (vector stores, document loaders) | **H** — RAG + agent workflows (best-in-class) | **M** — via AI Agent + vector nodes in workflow; more DIY | **L–M** — AI blocks exist; not primary RAG product | **M** — custom NLU + knowledge; training-heavy | **M** — depends on CorpFlow/Flowise/n8n bridge quality |
| **Capture lead details** | **M** — via tool/webhook nodes; not form-first | **M** — variables + API; not form-first | **M** — workflow collects fields; custom logic | **H** — form-first conversational capture | **M** — custom slots/forms | **H** — pre-chat form native in Chatwoot |
| **Hand off to human/operator** | **L–M** — human-in-the-loop nodes; no native inbox | **L** — no support inbox | **L** — notify via n8n (email/Telegram/CMP webhook) | **L** — webhook to operator; no inbox | **L** — custom handoff | **H** — Chatwoot inbox is the point; AI is add-on |
| **Integrate with CorpFlow `/change` or CRM later** | **M** — webhook → `/api/tenant/intake` or `automation_events` | **M** — API/webhook; license risk for multi-workspace | **H** — native n8n → existing forward/ingest spine | **M** — webhooks → intake | **L** — significant custom integration | **H** for inbox sync; **M** for AI bridge |
| **No paid vendor subscription** | **H** — CE free (Apache 2.0); enterprise SSO/RBAC is separate paid dir | **L** for multi-tenant — commercial license likely required | **H** — n8n already licensed/self-hosted | **H** — OSS self-host | **L–M** — OSS core; Rasa Pro/Studio enterprise features paid | **H** for CE inbox; **L** for Captain AI ($19+/agent/mo) |
| **Likely AI model/API cost** | **M** — pay-per-token (Groq/OpenAI); no platform fee | **M** — same + possible Dify enterprise license | **M** — same; bounded by workflow design | **L–M** — low if deterministic; higher if AI blocks used | **M–H** — self-hosted models possible; ops cost high | **M** — CE bridge uses CorpFlow Groq/OpenAI; Captain adds vendor fee |
| **Multi-client licensing risk** | **L** — Apache 2.0 CE; enterprise dir is optional | **H** — explicit multi-workspace prohibition without commercial license | **L** — per-workflow isolation; no special license | **L** — AGPL/SSPL-style check needed; generally permissive for self-host per client | **L–M** — Apache 2.0 OSS; enterprise add-ons separate | **L** for CE MIT core; **M** if stacking paid Captain |
| **Implementation speed** | **H** — visual builder; widget in hours–days | **M** — powerful but more setup | **M–H** — fast if n8n + AI Agent pattern known | **H** for lead flows; **L** for knowledge Q&A | **L** — weeks+ for production NLU | **L** — two systems to wire |
| **Operational/security risk** | **M** — new container; CORS misconfig; token spend; JS code execution nodes | **M–H** — larger attack surface; license compliance | **M–H** — public webhook; n8n RCE history; must harden first | **L–M** — simpler surface; fewer AI foot-guns | **H** — ML ops, model training, K8s | **H** — two systems + PII in inbox |

---

## Ranked recommendation

| Rank | Option | Role | Rationale |
| ---- | ------ | ---- | --------- |
| **1** | **Flowise** | **First pilot — website AI Q&A + RAG** | Best balance of free self-host (Apache 2.0 CE), embed widget, RAG/knowledge answers, and speed. No multi-tenant license trap (unlike Dify). AI cost is API-only and can use existing Groq/OpenAI keys with caps. |
| **2** | **n8n Chat** | **Fallback / integration spine** | CorpFlow already runs n8n. Embedded chat → AI Agent workflow is viable and integrates cleanly with intake/automation. Ranked second because RAG authoring is less polished than Flowise, public webhooks need hardening, and webhook URL exposure is a security consideration. |
| **3** | **Typebot** | **Deterministic lead-capture layer** | Excellent for guided intake (name/email/path) but weak as primary knowledge AI agent. Pair with Flowise or native widget — do not use alone when buyer expects site Q&A. |
| **4** | **Chatwoot CE + CorpFlow AI bridge** | **Future human inbox + AI** | Right architecture long-term (AI answers → human takeover) but **slowest** for v1 and **Chatwoot CE does not include AI**. Defer until conversation-inbox need is proven; use Flowise/n8n for AI first. |
| **5** | **Dify** | **Watch / single-tenant internal only** | Strong product, **wrong license shape** for CorpFlow multi-client commercial hosting without enterprise deal. |
| **6** | **Rasa** | **Defer** | Overkill for marketing-site AI chat; heavy ops; slowest path to pilot. |

### Chatwoot boundary (unchanged)

| Use case | Chatwoot CE | Notes |
| -------- | ----------- | ----- |
| Human live-chat / support inbox | **Candidate** (deferred, gated) | `PRODUCT_RADAR_CANDIDATES.md`; needs ADR + authorization packet |
| Website AI agent / RAG Q&A | **Not suitable alone** | Captain AI not in CE; requires Premium Support + LLM key |
| Lead-capture chatbot (deterministic) | **Overkill** | Native CorpFlow widget or Typebot fit better |

---

## Risks

| Risk | Severity | Mitigation |
| ---- | -------- | ---------- |
| Self-hosted tool on exec-01 without authorization | **High** | Pilot on **disposable VPS**; separate ADR before any L3 install |
| Runaway LLM token spend | **High** | Hard caps, `gpt-4o-mini`/Groq class models, per-session limits; mirror `lib/server/chat-widget/retrieval/` budget pattern |
| Dify multi-tenant license violation | **High** | Do not deploy Dify as multi-client platform without commercial license |
| n8n public webhook abuse | **Medium–High** | Complete n8n hardening track first; rate limits; CORS allow-list; consider proxy |
| Flowise CORS/embed misconfiguration | **Medium** | Set `CORS_ORIGINS` / `IFRAME_ORIGINS` explicitly per pilot host |
| Buyer-facing doctrine drift (guarantees, hype) | **Medium** | Apply `BRAND_AND_CONVERSION_DOCTRINE.md` + Lead Rescue launch pack to system prompts |
| Confusing AI agent with support deflection | **Medium** | Pre-sale Q&A bot ≠ Freshdesk O7 support bot; keep scopes separate |
| PII in third-party store | **Medium** | Pilot with public marketing copy only; no client secrets; webhook → `/api/tenant/intake` for leads |

---

## Suggested first pilot

**Packet name (proposed):** `Website-AI-Chat-Flowise-Pilot-1`

**Scope:**

1. **Disposable VPS** (not `corpflow-exec-01`) — Docker Flowise CE + Postgres.
2. **One chatflow** for `corpflowai.com` (or preview host) — RAG over approved public pages (apex marketing copy, AI Lead Rescue FAQ text).
3. **Embed** via `flowise-embed` on a **preview/staging** route only until live verification.
4. **Lead capture** — Flowise tool/webhook → `POST /api/tenant/intake` with `meta.intake_channel = "chat"` (same contract as `AI_LEAD_RESCUE_CHATBOT_VOICEBOT_OPTIONS_AUDIT_V1.md` § 1.2).
5. **Model** — Groq or OpenAI mini-class via existing keys; monthly cap ≤ USD 25 for pilot.
6. **Human handoff** — v1: email/Telegram operator alert via n8n; no Chatwoot install in same packet.
7. **Kill switch** — env flag or remove embed script.

**Explicit non-actions:** No Chatwoot install. No Dify. No Rasa. No production client data. No exec-01 container. No paid Chatwoot Captain license.

**Success criteria:** Visitor can ask about AI Lead Rescue offer; bot answers from approved knowledge; visitor can leave name+email; operator receives alert; token spend within cap; Delivery Reality Audit on preview then production host.

---

## Files changed

| File | Change |
| ---- | ------ |
| `docs/product/WEBSITE_AI_CHAT_AGENT_TOOL_DECISION_NOTE_V1.md` | **Created** — this decision note |
| `docs/product/README.md` | Index row added |

---

## Verification

```bash
# Docs-only — confirm no runtime changes
git diff --name-only
# Expected: docs/product/WEBSITE_AI_CHAT_AGENT_TOOL_DECISION_NOTE_V1.md, docs/product/README.md

# Confirm decision note states NO IMPLEMENTATION AUTHORIZED
rg -n "NO IMPLEMENTATION AUTHORIZED" docs/product/WEBSITE_AI_CHAT_AGENT_TOOL_DECISION_NOTE_V1.md

# Confirm Chatwoot AI boundary is documented
rg -n "Captain AI" docs/product/WEBSITE_AI_CHAT_AGENT_TOOL_DECISION_NOTE_V1.md
```

**Delivery state:** Local docs only → **PARTIAL** by design (research delivered; pilot not authorized).

---

## Document history

| Version | Date (UTC) | Change |
| ------- | ---------- | ------ |
| v1 | 2026-07-27 | Initial decision note — six-option comparison; Flowise first pilot; Chatwoot CE demoted as AI default |
