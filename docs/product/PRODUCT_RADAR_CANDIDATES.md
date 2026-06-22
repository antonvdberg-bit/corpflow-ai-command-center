# Product radar candidates — CorpFlow Candidate & Reference Library

**Library:** CorpFlow Candidate & Reference Library (`docs/product/README.md`)

**Purpose:** Capture **product radar intake** — platform patterns, governance tools, internal-app builders, discovery surfaces, and local-AI companions — for technical-direction evaluation without authorizing install or production dependency.

**Default verdict on every entry:** `NO IMPLEMENTATION AUTHORIZED` unless Anton separately approves evaluation or install.

**Captured:**

- 2026-06-20 — issue [#429](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/429) — Guild.ai, Retool, TAAFT Launch, ownAI.
- 2026-06-20 — issue [#435](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/435) — claude-code-local, gpt4free, AnyVids, Drafted, MakeInfographic.ai.
- 2026-06-22 — **weekly product radar** — Langfuse, Chatwoot, OpenJarvis, OpenClaw, Agyn, Twenty CRM, Mixpost, Cal.diy, AgentSight / AgentTrace, n8n hardening track.
- 2026-06-22 — **Product A direction sync** — AgentSpan verified; Twenty/EspoCRM bake-off; Postiz social discovery; Chatwoot as standard inbox (see `PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md` v2).

**Overall repo verdict (issue #429):** `RADAR INTAKE CAPTURED: GUILD.AI, RETOOL, TAAFT LAUNCH, OWNAI — NO INSTALLATION AUTHORIZED`

**Overall repo verdict (issue #435):** `RADAR INTAKE CAPTURED: CLAUDE-CODE-LOCAL, GPT4FREE, ANYVIDS, DRAFTED, MAKEINFOGRAPHIC — NO INSTALLATION AUTHORIZED`

**Overall repo verdict (weekly radar 2026-06-22):** `WEEKLY PRODUCT RADAR CAPTURED — LANGFUSE, CHATWOOT, OPENJARVIS, OPENCLAW, AGYN, TWENTY, MIXPOST, CAL.DIY, AGENTSIGHT/AGENTTRACE, N8N HARDENING — NO INSTALLATION AUTHORIZED`

---

## Weekly product radar — 2026-06-22 (ranked shortlist)

**Cadence:** Anton's weekly peripheral radar — ranked recommendations, adoption risks, self-hosting posture, and pilot gates. **Recommendations are directional only**; every entry below still carries **`NO IMPLEMENTATION AUTHORIZED`** until Anton approves a separate authorization packet.

| Rank | Entry | Recommendation | Self-host | Pilot gate (bounded next step) |
| ---- | ----- | -------------- | --------- | ------------------------------ |
| 1 | [Langfuse](#langfuse--llm-observability--prompt-management) | **ADOPT / PILOT IMMEDIATELY** | Yes (OSS + cloud) | Sandbox Langfuse instance; instrument **one** non-production Lead Rescue / chatbot flow only |
| 2 | [n8n hardening track](#n8n-hardening-track--workflow-spine-security-process) | **ADOPT PROCESS** | Already on `corpflow-exec-01` | Trusted users only; no public editor; version pin + update policy; credential inventory; backup/restore test; review Code nodes; isolate secret-touching workflows |
| 3 | [Chatwoot](#chatwoot--customer-support--live-chat-inbox) | **PILOT / PRODUCT A INBOX STANDARD** | Yes (OSS) | Demo medspa inbox: widget, pre-chat form, lead classification, human handoff, n8n sync (not CRM) |
| 4 | [Social scheduling discovery](#social-scheduling-discovery--postiz-mixpost) | **DISCOVERY / PILOT LIGHTLY** | Varies | Postiz + Mixpost + others; internal accounts only; no GHL-native scheduling |
| 5 | [OpenJarvis](#openjarvis--local-personal-ai-architecture) | **WATCH / RESEARCH** | Yes (local) | Research-only until repo maturity and deployment path verified |
| 6 | [OpenClaw](#openclaw--self-hosted-agentic-operator-assistant) | **WATCH / SANDBOX ONLY** | Yes (self-hosted) | Disposable VPS only; no production credentials, client data, production DB, or broad network permissions |
| 7 | [AgentSight / AgentTrace](#agentsight--agenttrace--agent-observability-alternatives) | **WATCH AS AGENTSPAN ALTERNATIVES** | Varies | No install; compare against [AgentSpan](#agentspan--durable-agent-execution-runtime) |
| 8 | [Agyn](#agyn--zero-trust-agent-runtime-reference) | **WATCH / ARCHITECTURE REFERENCE** | K8s-style (heavy) | No install; likely too early and too heavy |
| 9 | [Twenty CRM](#twenty-crm--crm-bake-off-candidate) | **CRM BAKE-OFF CANDIDATE** | Yes (OSS) | Sandbox bake-off vs EspoCRM; GHL migration-away |
| 10 | [Cal.diy](#caldiy--scheduling-infrastructure-reference) | **REVISIT / DO NOT USE FOR CLIENT PRODUCTION NOW** | Community self-host | Not for client production; repo warns personal/non-production intent |

**Cross-cutting adoption risks (this week):**

| Risk | Affected entries | Mitigation |
| ---- | ---------------- | ---------- |
| Standing § 5.5 carve-out is **Uptime Kuma only** | Langfuse, Chatwoot, OpenClaw, Mixpost | Separate ADR + authorization packet + § 10 gate before any L3 install |
| n8n RCE-class and agentic workflow hijacking | n8n hardening, Chatwoot/n8n sync pilots | Adopt hardening process **before** expanding n8n surface area |
| CRM duplication / GHL lock-in | Twenty, EspoCRM, legacy GHL at clients | GHL migration-away; Twenty vs EspoCRM bake-off; prefer maintained product sets |
| Community scheduling not production-grade | Cal.diy | Reference only for client production scheduling |
| Agent execution runtime premature | AgentSpan | Revisit after Langfuse + Chatwoot + CRM bake-off |

---

## Index

| Entry | Status | Captured |
| ----- | ------ | -------- |
| [Guild.ai](#guildai--agent-control-plane--governance-pattern) | `PILOT / STUDY PATTERN` | 2026-06-20 |
| [Retool](#retool--internal-app-builder--ai-assisted-operations-console) | `PILOT / STUDY PATTERN` | 2026-06-20 |
| [There Is An AI For That Launch](#there-is-an-ai-for-that-launch--ai-product-radar-source) | `WATCH / RADAR SOURCE` | 2026-06-20 |
| [ownAI](#ownai--local-self-evolving-ai-companion--memory-pattern) | `WATCH / SANDBOX LATER` | 2026-06-20 |
| [claude-code-local](#claude-code-local--local-offline-coding-assistant-pattern) | `WATCH / LOCAL OPERATOR AI PATTERN` | 2026-06-20 |
| [gpt4free](#gpt4free--multi-provider-api-risk-reference) | `REJECT FOR PRODUCTION / RISK REFERENCE ONLY` | 2026-06-20 |
| [AnyVids](#anyvids--unverified-media-tool) | `WATCH / UNVERIFIED` | 2026-06-20 |
| [Drafted](#drafted--ai-house-plans--lux-ai-priority-pilot) | `PRIORITY PILOT / OPERATOR-SIDE ONLY` | 2026-06-20 |
| [MakeInfographic.ai](#makeinfographicai--marketing-infographic-generator) | `PILOT / OPERATOR-SIDE ONLY` | 2026-06-20 |
| [Langfuse](#langfuse--llm-observability--prompt-management) | `ADOPT / PILOT IMMEDIATELY` | 2026-06-22 |
| [n8n hardening track](#n8n-hardening-track--workflow-spine-security-process) | `ADOPT PROCESS` | 2026-06-22 |
| [Chatwoot](#chatwoot--customer-support--live-chat-inbox) | `PILOT / PRODUCT A INBOX STANDARD` | 2026-06-22 |
| [Social scheduling discovery](#social-scheduling-discovery--postiz-mixpost) | `DISCOVERY / PILOT LIGHTLY` | 2026-06-22 |
| [Postiz](#postiz--social-scheduler-candidate) | `DISCOVERY` | 2026-06-22 |
| [Mixpost](#mixpost--self-hosted-social-scheduler) | `DISCOVERY CANDIDATE` | 2026-06-22 |
| [OpenJarvis](#openjarvis--local-personal-ai-architecture) | `WATCH / RESEARCH` | 2026-06-22 |
| [OpenClaw](#openclaw--self-hosted-agentic-operator-assistant) | `WATCH / SANDBOX ONLY` | 2026-06-22 |
| [AgentSight / AgentTrace](#agentsight--agenttrace--agent-observability-alternatives) | `WATCH AS AGENTSPAN ALTERNATIVES` | 2026-06-22 |
| [AgentSpan](#agentspan--durable-agent-execution-runtime) | `WATCH / REVISIT` | 2026-06-22 |
| [Agyn](#agyn--zero-trust-agent-runtime-reference) | `WATCH / ARCHITECTURE REFERENCE` | 2026-06-22 |
| [Twenty CRM](#twenty-crm--crm-bake-off-candidate) | `CRM BAKE-OFF CANDIDATE` | 2026-06-22 |
| [EspoCRM](#espocrm--crm-bake-off-candidate) | `CRM BAKE-OFF CANDIDATE` | 2026-06-22 |
| [Cal.diy](#caldiy--scheduling-infrastructure-reference) | `REVISIT / NO CLIENT PRODUCTION NOW` | 2026-06-22 |

---

## Guild.ai — agent control plane / governance pattern

**Status:** `PILOT / STUDY PATTERN`

**Verdict:** `GUILD.AI CAPTURED AS AGENT GOVERNANCE PATTERN — NO INSTALLATION AUTHORIZED`

**URL:** https://www.guild.ai/

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- Positions itself as a **control plane for AI agents**: policies, permissions, observability, audit/logs, integrations, build/deploy/govern/share, agent hub, and scoped credentials.
- Strong pattern match for CorpFlowAI's **future agent-governance** needs.
- Useful ideas for our own agent control plane: scoped tools, run logs, versioned agents, approval gates, agent hub/catalog.
- Candidate for future pilot once Phase 1 self-hosted ops stack and observability/backups are complete.

### Claimed capabilities (vendor — verify during evaluation)

| Capability | Notes |
| ---------- | ----- |
| Agent policies and permissions | Governance layer for agent actions |
| Observability, audit logs | Run history and accountability |
| Integrations and scoped credentials | Least-privilege tool access |
| Build / deploy / govern / share | Agent lifecycle management |
| Agent hub / catalog | Discoverable agent inventory |

*Treat vendor claims as **hypotheses** until verified in a bounded operator-side evaluation.*

### Potential CorpFlow use cases

| Use case | Executor |
| -------- | -------- |
| Study agent governance patterns for future CorpFlow control plane | Cursor / Codex (docs packets) |
| Compare scoped-tool and approval-gate models before building in-repo | Technical Lead / architecture |
| Reference for agent hub / catalog UX in factory or tenant surfaces | Product / design study |

**Out of scope for default use:** production runtime, production credentials, client data in third-party tools without security review.

### Evaluation plan (ordered — none authorized by this capture)

1. **Docs capture only** — this section (complete).
2. **Pattern study only** — read official docs; no install.
3. **No production / runtime install** on Vercel, Postgres, or tenant surfaces.
4. **No server / L3 install** on `corpflow-exec-01` or any box.
5. **No GitHub Actions install** — do not add to workflows or repo secrets.
6. **No secrets** — no CorpFlow env vars, tokens, or production credentials passed to Guild.ai.
7. **Future pilot gate** — Anton approves a separate authorization packet after Phase 1 self-hosted ops stack and observability/backups are complete.
8. **Decision gate** — verified official docs/source/license/security posture; operator-side sandbox only; no real client data; written approval before install or integration.

### Risks / questions

| Risk | Mitigation |
| ---- | ---------- |
| Production credential exposure | No credentials authorized by this capture |
| Vendor lock-in vs in-repo control plane | Study pattern only; CorpFlow moat stays above-the-line |
| Client data in third-party agent plane | Prohibited without separate security / privacy review |
| Premature install before ops foundation | Defer pilot until self-hosted ops stack complete |

### Guardrails (this capture)

- No installation.
- No MCP config.
- No npm/npx/package install.
- No workflow changes.
- No runtime code.
- No env vars or secrets.
- No changes to `.env.template`, production app, or production Postgres.
- No server / L3 commands.
- No n8n changes.

### Related canonical docs

- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — tooling is leverage, not the moat.
- `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` — ops foundation before new platform pilots.
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — L1 laptop vs L2 vs L3.

---

## Retool — internal app builder / AI-assisted operations console

**Status:** `PILOT / STUDY PATTERN`

**Verdict:** `RETOOL CAPTURED AS INTERNAL OPS APP PATTERN — NO INSTALLATION AUTHORIZED`

**URL:** https://retool.com/

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- Directly relevant to CorpFlowAI as an **internal app builder / operations console** pattern.
- Homepage positions Retool around AI-assisted internal app generation, importing apps from AI/vibe-coding tools, MCP-based build flows, production data integrations, governance, auth, access controls, and audit logging.
- Strong pattern match for internal operations apps, client admin consoles, approval dashboards, incident response dashboards, onboarding portals, and support consoles.
- Useful reference for packaging **"prompt to internal app"** safely with data access, permissions, audit logs, and governance.

### Claimed capabilities (vendor — verify during evaluation)

| Capability | Notes |
| ---------- | ----- |
| AI-assisted internal app generation | Prompt-to-app for ops dashboards |
| Import from AI / vibe-coding tools | Bridge from prototype to governed app |
| MCP-based build flows | Agent integration path |
| Production data integrations | DB/API connectors with governance |
| Auth, access controls, audit logging | Enterprise ops console posture |

*Treat vendor claims as **hypotheses** until verified in a bounded operator-side evaluation.*

### Potential CorpFlow use cases

| Use case | Executor |
| -------- | -------- |
| Study internal dashboard patterns for factory / operator tooling | Cursor / Codex (docs packets) |
| Reference for governed client admin consoles | Product / architecture study |
| Compare approval-dashboard UX before in-repo build | Technical Lead |

**Out of scope for default use:** replacement of `/change` or the existing CorpFlow production app; production Postgres connection without explicit future packet.

### Evaluation plan (ordered — none authorized by this capture)

1. **Docs capture only** — this section (complete).
2. **Pattern study only** — read official docs; no install.
3. **No production / runtime install** on Vercel, Postgres, or tenant surfaces.
4. **No server / L3 install** unless a future packet explicitly authorizes sandbox-only pilot.
5. **No GitHub Actions install** — do not add to workflows or repo secrets.
6. **No secrets** — no CorpFlow env vars, tokens, or production credentials passed to Retool.
7. **Future pilot gate** — verify current pricing and self-hosting terms; confirm pilot can run without production credentials.
8. **Decision gate** — verified official docs/source/license/security posture; operator-side sandbox only; no connection to production `POSTGRES_URL` unless explicitly approved; no MCP configuration unless explicitly approved; no replacement of `/change` or existing CorpFlow production app; written approval before install or integration.

### Risks / questions

| Risk | Mitigation |
| ---- | ---------- |
| Production Postgres exposure | No connection to `POSTGRES_URL` unless future packet approves |
| Duplicates existing CorpFlow app surface | Study pattern only; do not replace `/change` |
| Self-hosting / pricing uncertainty | Verify terms before any sandbox pilot |
| MCP config sprawl | No MCP unless separate authorization |

### Guardrails (this capture)

- No installation.
- No MCP config.
- No npm/npx/package install.
- No workflow changes.
- No runtime code.
- No env vars or secrets.
- No changes to `.env.template`, production app, or production Postgres.
- No server / L3 commands.
- No n8n changes.
- Preserve one production app and one Postgres via `POSTGRES_URL`.

### Related canonical docs

- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — managed outcomes, not generic wrappers.
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — L1 laptop vs L2 vs L3.
- `lib/cmp/README.md` — existing Change Console / CMP surface (not to be replaced by Retool pilot).

---

## There Is An AI For That Launch — AI product radar source

**Status:** `WATCH / RADAR SOURCE`

**Verdict:** `TAAFT LAUNCH CAPTURED AS RADAR SOURCE — NO INSTALLATION AUTHORIZED`

**URL:** https://theresanaiforthat.com/launch/

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- Appears to be a **discovery / listing / launch surface** for AI tools.
- Useful for Anton's **weekly peripheral radar feed** — not a production tool.
- Potential source for candidate discovery, competitor monitoring, and marketing/category positioning.
- Exact page was not fully verifiable in the initial pass (browsing tool could not open it); treat as a **radar-source candidate** rather than a trusted implementation dependency.

### Claimed capabilities (vendor — verify during evaluation)

| Capability | Notes |
| ---------- | ----- |
| AI product discovery / listing | Launch and category browsing |
| Competitor / category monitoring | Peripheral market awareness |
| Launch announcements | New-tool radar input |

*Treat vendor claims as **hypotheses** until verified by operator browsing.*

### Potential CorpFlow use cases

| Use case | Executor |
| -------- | -------- |
| Weekly peripheral radar feed for Anton | Operator (manual browse) |
| Candidate discovery input for CorpFlow Candidate & Reference Library | Anton / Cursor (docs capture) |
| Category / positioning research for marketing | Marketing packets (read-only) |

**Out of scope for default use:** production integration, API dependency, automated scraping, required CI dependency.

### Evaluation plan (ordered — none authorized by this capture)

1. **Docs capture only** — this section (complete).
2. **Manual radar use only** — Anton browses periodically; no install or API.
3. **No production / runtime dependency** on Vercel, Postgres, or tenant surfaces.
4. **No automated scraping** without separate legal / ToS review.
5. **Decision gate** — operator confirms page is reachable and useful before elevating to regular radar cadence.

### Risks / questions

| Risk | Mitigation |
| ---- | ---------- |
| Page availability / ToS unknown | Manual verify; not a trusted dependency |
| Treating listing site as implementation source | Radar only — separate evaluation for any tool found |
| Scraping / bulk automation | Not authorized without separate packet |

### Guardrails (this capture)

- No installation.
- No MCP config.
- No npm/npx/package install.
- No workflow changes.
- No runtime code.
- No env vars or secrets.
- No changes to `.env.template`, production app, or production Postgres.
- Not a production tool or trusted implementation dependency.

### Related canonical docs

- `docs/product/README.md` — CorpFlow Candidate & Reference Library index.
- `docs/strategy/GOOGLE_ACCELERATION_LANE.md` — third-party discovery bounds.

---

## ownAI — local self-evolving AI companion / memory pattern

**Status:** `WATCH / SANDBOX LATER`

**Verdict:** `OWNAI CAPTURED AS LOCAL MEMORY PATTERN — NO PRODUCTION INSTALLATION AUTHORIZED`

**URL:** https://ownai.com/en

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- Presents itself as **open-source, local, self-learning** AI with memory, self-programming, proactivity, BYO keys, and Ollama/local operation.
- Strategically relevant to CorpFlowAI's **operator productivity** and future **client-side assistants**.
- Study the local memory + self-programming pattern.
- Potential internal operator pilot later on a **non-production workstation or sandbox**.
- Useful as inspiration for client-facing **"private AI companion"** positioning in sensitive-data use cases.

### Claimed capabilities (vendor — verify during evaluation)

| Capability | Notes |
| ---------- | ----- |
| Local / Ollama operation | On-device or sandbox inference |
| Persistent memory | Self-learning over sessions |
| Self-programming / proactivity | Agent extends its own capabilities |
| BYO keys | Operator-controlled API keys |

*Treat vendor claims as **hypotheses** until verified in a bounded operator-side sandbox.*

### Potential CorpFlow use cases

| Use case | Executor |
| -------- | -------- |
| Study local memory pattern for operator productivity | Anton (sandbox workstation) |
| Reference for private-AI companion positioning (sensitive data) | Marketing / strategy study |
| Compare self-programming guardrails before in-repo design | Architecture packets |

**Out of scope for default use:** production runtime, production credentials, real client data, required CorpFlow dependency.

### Evaluation plan (ordered — none authorized by this capture)

1. **Docs capture only** — this section (complete).
2. **Pattern study only** — read official docs and license; no install yet.
3. **Future sandbox pilot** — non-production workstation or sandbox only, after written approval.
4. **No production / runtime install** on Vercel, Postgres, or tenant surfaces.
5. **No server / L3 install** on `corpflow-exec-01` unless a future packet explicitly authorizes.
6. **No secrets** — no CorpFlow env vars, tokens, or client data passed to ownAI.
7. **Decision gate** — verified official docs/source/license/security posture; operator-side sandbox only; no production credentials; no real client data; written approval before install or integration.

### Risks / questions

| Risk | Mitigation |
| ---- | ---------- |
| Self-programming safety | Sandbox only; no production touch |
| Open-source license / security posture unverified | Verify before any sandbox pilot |
| Client data on local companion | Prohibited without separate security review |
| Confusion with production chat/concierge | Pattern study only; not authorized for tenant surfaces |

### Guardrails (this capture)

- No installation.
- No MCP config.
- No npm/npx/package install.
- No workflow changes.
- No runtime code.
- No env vars or secrets.
- No changes to `.env.template`, production app, or production Postgres.
- No production installation authorized.
- Preserve one production app and one Postgres via `POSTGRES_URL`.

### Related canonical docs

- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — private companion as positioning, not commodity chatbot.
- `docs/strategy/GOOGLE_ACCELERATION_LANE.md` — local AI bounds.
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — sandbox on L1 only unless future packet says otherwise.

---

## claude-code-local — local / offline coding assistant pattern

**Status:** `WATCH / LOCAL OPERATOR AI PATTERN`

**Verdict:** `CLAUDE-CODE-LOCAL CAPTURED AS LOCAL OPERATOR PATTERN — NO INSTALLATION AUTHORIZED`

**URL:** https://github.com/nicedreamzapp/claude-code-local

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- **Local / offline coding assistant** pattern for Apple Silicon — useful for privacy-sensitive operator workflows and future weekend / offline research.
- Repo claims local Claude Code-style usage through an **MLX / Anthropic-compatible local server** and large local models.
- Meaningful **hardware requirements** and uses modified / abliterated model variants — must not be installed into CorpFlow production or trusted with client data until reviewed.

### Claimed capabilities (vendor — verify during evaluation)

| Capability | Notes |
| ---------- | ----- |
| Local MLX server | Anthropic-compatible API on Apple Silicon |
| Large local models | High RAM / disk requirements |
| Offline / privacy-sensitive coding | Operator workstation use case |
| Claude Code-style workflow | Local alternative to cloud coding agent |

*Treat vendor claims as **hypotheses** until verified in a bounded operator-side evaluation.*

### Potential CorpFlow use cases

| Use case | Executor |
| -------- | -------- |
| Study offline operator coding patterns | Anton (sandbox workstation) |
| Weekend / offline research without cloud dependency | Operator (L1 laptop) |
| Privacy-sensitive packet drafting (no client data) | Operator sandbox only |

**Out of scope for default use:** production server, production credentials, client data, CorpFlow runtime dependency.

### Evaluation plan (ordered — none authorized by this capture)

1. **Docs capture only** — this section (complete).
2. **Pattern study only** — read repo README, license, and model/security notes; no install yet.
3. **Future pilot** — operator workstation only, not production server.
4. **No production / runtime install** on Vercel, Postgres, or tenant surfaces.
5. **No server / L3 install** on `corpflow-exec-01`.
6. **No secrets** — no CorpFlow env vars, tokens, or client data.
7. **Decision gate** — license / model / security review complete; operator-side sandbox only; no real client data; written approval before install.

### Risks / questions

| Risk | Mitigation |
| ---- | ---------- |
| Modified / abliterated model variants | Security and license review before any pilot |
| High hardware requirements | Operator workstation only; not production server |
| Client data on local models | Prohibited without separate security review |
| Confusion with production coding agents | Pattern study only; Cursor remains repo executor |

### Guardrails (this capture)

- No installation.
- No MCP config.
- No npm/npx/package install.
- No workflow changes.
- No runtime code.
- No env vars or secrets.
- No changes to `.env.template`, production app, or production Postgres.
- No production server install authorized.

### Related canonical docs

- `docs/strategy/GOOGLE_ACCELERATION_LANE.md` — local AI bounds.
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — L1 laptop vs L2 vs L3.

---

## gpt4free — multi-provider API risk reference

**Status:** `REJECT FOR PRODUCTION / WATCH ONLY AS RISK REFERENCE`

**Verdict:** `GPT4FREE REJECTED FOR PRODUCTION — RISK REFERENCE ONLY — NO INSTALLATION AUTHORIZED`

**URL:** https://github.com/xtekky/gpt4free

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

**Explicit rejection:** **Not authorized** for CorpFlow client work, production, outreach, or sensitive data. Capture is a **compliance / risk reference only**.

### Why Anton added it

- Exposes an **OpenAI-compatible API**, provider adapters, Docker / Python install paths, browser / cookie / HAR flows, MCP, and media tools.
- Operating model creates serious **compliance, credential, ToS, privacy, and reliability** risk.
- Useful as a **negative reference** when evaluating similar multi-provider wrapper tools.

### Claimed capabilities (vendor — do not verify via install)

| Capability | Risk note |
| ---------- | --------- |
| OpenAI-compatible API | Provider ToS / credential exposure risk |
| Multi-provider adapters | Unreliable; compliance unknown |
| Browser / cookie / HAR flows | **Prohibited** — no cookies, no HAR files |
| Docker / Python install | Not authorized |
| MCP integration | **Not authorized** |

*Do **not** install or configure to "verify" capabilities. Treat as a risk catalog entry only.*

### Potential CorpFlow use cases

| Use case | Executor |
| -------- | -------- |
| Risk reference when evaluating API wrapper tools | Architecture / security review |
| Training material: what **not** to adopt | Operator / agent guidance |

**Out of scope permanently:** production runtime, client work, outreach automation, MCP config, provider cookies / HAR, production credentials, sensitive data.

### Evaluation plan (ordered — none authorized by this capture)

1. **Docs capture only** — this section (complete).
2. **No install** — ever, unless Anton explicitly reverses this rejection in a separate security-reviewed packet (not expected).
3. **No MCP config**, no provider cookies, no HAR flows, no provider scraping.
4. **No production credentials** passed to or through gpt4free.
5. **Decision gate** — this tool remains **rejected for production / client use**; reference only.

### Risks / questions

| Risk | Mitigation |
| ---- | ---------- |
| ToS / compliance violation | **Reject** — do not use for CorpFlow work |
| Credential / cookie / HAR exposure | **Prohibited** — no browser auth flows |
| Unreliable provider adapters | Not a production dependency candidate |
| MCP sprawl | No MCP config authorized |
| Agent temptation to "try it locally" | Explicit rejection in this capture |

### Guardrails (this capture)

- No installation.
- No MCP config.
- No npm/npx/package/Docker install.
- No provider cookies or HAR files.
- No provider scraping.
- No workflow changes.
- No runtime code.
- No env vars or secrets.
- No changes to `.env.template`, production app, or production Postgres.
- **Rejected for production, client work, and sensitive data.**

### Related canonical docs

- `docs/strategy/GOOGLE_ACCELERATION_LANE.md` — approved acceleration lanes only.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — third-party tool trust boundaries.
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — no commodity wrapper moat.

---

## AnyVids — unverified media tool

**Status:** `WATCH / UNVERIFIED`

**Verdict:** `ANYVIDS CAPTURED AS UNVERIFIED WATCH ITEM — NO INSTALLATION AUTHORIZED`

**URL:** https://anyvids.ai/

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- Submitted as a potential **media / video tool** candidate.
- Page could **not be reliably opened** during initial review — treat as **unverified** until operator or Codex browser review confirms what it does.
- Must verify pricing, rights, outputs, export limits, and data policy before any pilot.

### Claimed capabilities (vendor — unverified)

| Capability | Notes |
| ---------- | ----- |
| Media / video generation (assumed) | **Unverified** — page not reliably reachable in initial pass |
| Pricing / export / rights | Unknown until operator review |
| Data policy | Unknown until operator review |

*All claims are **unverified hypotheses** until an operator confirms the live site.*

### Potential CorpFlow use cases

| Use case | Executor |
| -------- | -------- |
| Future marketing / content radar (if verified useful) | Operator manual review first |
| Compare against Google Vids / approved content engine candidates | Codex research packet |

**Out of scope until verified:** install, client workflow, production integration, required dependency.

### Evaluation plan (ordered — none authorized by this capture)

1. **Docs capture only** — this section (complete).
2. **Operator / Codex browser review** — confirm site reachable, product scope, pricing, rights, exports, data policy.
3. **No install** until verification complete and written approval obtained.
4. **No production / runtime dependency** on Vercel, Postgres, or tenant surfaces.
5. **Decision gate** — verified product description; operator-side sandbox only; no real client data; written approval before install or integration.

### Risks / questions

| Risk | Mitigation |
| ---- | ---------- |
| Site unverified in initial pass | Manual browser review required |
| Unknown licensing / commercial rights | Do not use in client-facing materials until confirmed |
| Duplicate of existing content-engine candidates | Compare against `MARKETING_AUTOMATION_CONTENT_ENGINE_CANDIDATES.md` |

### Guardrails (this capture)

- No installation.
- No MCP config.
- No npm/npx/package install.
- No workflow changes.
- No runtime code.
- No env vars or secrets.
- No changes to `.env.template`, production app, or production Postgres.
- No client workflow until verified.

### Related canonical docs

- `docs/product/MARKETING_AUTOMATION_CONTENT_ENGINE_CANDIDATES.md` — existing video/content candidates.
- `docs/marketing/02_MULTIMODAL_CONTENT_PLAYBOOK.md` — attention / validation asset rules.

---

## Drafted — AI house plans / Lux AI priority pilot

**Status:** `PRIORITY PILOT / OPERATOR-SIDE ONLY`

**Verdict:** `DRAFTED CAPTURED AS LUX AI PRIORITY PILOT — NO PRODUCTION INTEGRATION AUTHORIZED`

**URL:** https://www.drafted.ai/

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

**Priority note:** **Highest-priority item in issue #435 batch.** Directly relevant to **Lux AI / Luxe Maurice** future property and architecture visualization workflows.

### Why Anton added it

- Appears to generate / free-download **AI house plans** with floorplans and exterior render imagery.
- Page title advertises **PDF and CAD downloads**.
- Directly relevant to Lux-style **property concept packs**, floorplan visuals, and architecture visualization for `lux.corpflowai.com` / Luxe Maurice.
- Pilot quickly, but **operator-side only** — no integration into production app yet.

### Claimed capabilities (vendor — verify during pilot)

| Capability | Notes |
| ---------- | ----- |
| AI house plan generation | Floorplans + exterior renders |
| PDF / CAD export | Verify formats and quality in pilot |
| Free download (claimed) | Confirm licensing and commercial-use terms |
| Exterior render imagery | Lux property concept pack candidate |

*Treat vendor claims as **hypotheses** until verified in a bounded operator-side pilot.*

### Potential CorpFlow use cases

| Use case | Executor |
| -------- | -------- |
| Lux / Luxe Maurice property concept packs | Operator pilot → review before any tenant publish |
| Architecture visualization for property marketing | Marketing / Lux AI packets |
| Floorplan + render assets for validation paths | Operator-side generation + manual review |

**Out of scope for default use:** production app integration, automated tenant publish, client data in third-party tool without review.

### Evaluation plan (ordered — operator pilot is next bounded step, not authorized by this capture alone)

1. **Docs capture only** — this section (complete).
2. **Operator-side pilot** — Anton or Codex produces sample outputs; Cursor does not own pilot execution.
3. **First pilot evaluates:** output quality, licensing / commercial-use terms, export formats, watermarking, suitability for client-facing Lux materials, Lux-style property concept pack fit.
4. **No production / runtime integration** on Vercel, Postgres, or tenant surfaces until separate packet.
5. **No secrets** — no CorpFlow env vars, tokens, or client PII passed to Drafted.
6. **Decision gate** — verified licensing and commercial rights; operator-side only; no real client data in first pilot; written approval before production integration.

### Risks / questions

| Risk | Mitigation |
| ---- | ---------- |
| Commercial-use / licensing unclear | Verify before any client-facing Lux publish |
| Watermarks on free tier | Confirm in pilot |
| CAD/PDF export quality | Operator review before tenant use |
| Production integration premature | Operator pilot first; no app wiring yet |

### Guardrails (this capture)

- No installation into CorpFlow production app.
- No MCP config.
- No npm/npx/package install in repo.
- No workflow changes.
- No runtime code.
- No env vars or secrets.
- No changes to `.env.template`, production app, or production Postgres.
- Operator-side pilot only until separate authorization.

### Related canonical docs

- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — no fake evidence; Lux brand-safe visuals.
- `docs/marketing/04_DELIVERY_QUALITY_GATE.md` — buyer-facing assets must pass quality gate.
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — Lux managed outcomes, not generic AI wrappers.
- Tenant host: `lux.corpflowai.com` / `luxe-maurice`.

---

## MakeInfographic.ai — marketing infographic generator

**Status:** `PILOT / OPERATOR-SIDE ONLY`

**Verdict:** `MAKEINFOGRAPHIC CAPTURED AS MARKETING PILOT — NO PRODUCTION INTEGRATION AUTHORIZED`

**URL:** https://www.makeinfographic.ai/

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- Useful for quick **explainer infographics**, timelines, comparison visuals, process charts, and social / landing visuals for CorpFlowAI marketing.
- Site advertises text / notes / data → infographics, PNG / PDF downloads, no sign-up free use, daily free credits, styles, aspect ratios, and resolution tiers.
- Pilot for **marketing assets only** — do not integrate into app / runtime.

### Claimed capabilities (vendor — verify during pilot)

| Capability | Notes |
| ---------- | ----- |
| Text / notes / data → infographics | Marketing explainer use case |
| PNG / PDF download | Verify resolution tiers |
| No sign-up free use (claimed) | Confirm in pilot |
| Styles / aspect ratios | Social and landing variants |

*Treat vendor claims as **hypotheses** until verified in a bounded operator-side pilot.*

### Potential CorpFlow use cases

| Use case | Executor |
| -------- | -------- |
| CorpFlowAI marketing infographics (process, comparison, timeline) | Operator pilot |
| Social / landing visual variants | Marketing packets (manual review) |
| Hook → validation path companion visuals | Per dual-asset pattern in marketing doctrine |

**Out of scope for default use:** production app integration, automated publish, client-facing use without commercial-rights confirmation.

### Evaluation plan (ordered — none authorized by this capture alone)

1. **Docs capture only** — this section (complete).
2. **Operator-side pilot** — generate sample infographics; confirm commercial rights and watermark.
3. **No production / runtime integration** on Vercel, Postgres, or tenant surfaces.
4. **No secrets** — no CorpFlow env vars or client data.
5. **Decision gate** — verified commercial rights and watermark policy; operator-side only; written approval before client-facing use or app integration.

### Risks / questions

| Risk | Mitigation |
| ---- | ---------- |
| Commercial rights / watermark on free tier | Confirm before client-facing publish |
| Overlap with GPT Image / Google tools | Compare against `MARKETING_AUTOMATION_CONTENT_ENGINE_CANDIDATES.md` |
| Production integration premature | Marketing pilot only |

### Guardrails (this capture)

- No installation into CorpFlow production app.
- No MCP config.
- No npm/npx/package install in repo.
- No workflow changes.
- No runtime code.
- No env vars or secrets.
- No changes to `.env.template`, production app, or production Postgres.
- Marketing assets only; confirm commercial rights before client-facing use.

### Related canonical docs

- `docs/product/MARKETING_AUTOMATION_CONTENT_ENGINE_CANDIDATES.md` — existing content engine candidates.
- `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md` — Hook / Proof / Depth.
- `docs/marketing/04_DELIVERY_QUALITY_GATE.md` — quality gate before publish.

---

## Langfuse — LLM observability / prompt management

**Status:** `ADOPT / PILOT IMMEDIATELY`

**Verdict:** `LANGFUSE CAPTURED AS LLM OBSERVABILITY PILOT — NO INSTALLATION AUTHORIZED`

**URL:** https://langfuse.com/ · https://github.com/langfuse/langfuse

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- **LLM observability**, prompt management, evals, datasets, and tracing — directly relevant to Lead Rescue, AI receptionist, chatbot, and operator-agent workflows.
- Highest-priority pilot in the 2026-06-22 weekly radar: closes the observability gap before scaling AI surfaces.

### Self-hosting notes

| Mode | Notes |
| ---- | ----- |
| Self-hosted OSS | Docker / Helm; separate Postgres recommended for Langfuse data |
| Langfuse Cloud | Faster pilot; still requires separate security review before production traces |
| CorpFlow constraint | **Not** authorized on `corpflow-exec-01` without ADR + authorization packet (standing holds list Langfuse explicitly) |

### Pilot gate (bounded next step)

1. **Sandbox Langfuse instance** — operator-side or disposable cloud project; **not** production `POSTGRES_URL`.
2. Instrument **one** non-production Lead Rescue or chatbot flow only.
3. Evaluate: trace quality, prompt versioning, eval datasets, PII redaction, retention, and cost.
4. **Decision gate** — written approval before production traces, tenant data, or L3 install.

### Adoption risks

| Risk | Mitigation |
| ---- | ---------- |
| Client PII in traces | Sandbox flow only; redaction policy before production |
| Second production database temptation | Langfuse may use its own DB — **not** CorpFlow production Postgres without explicit packet |
| Premature L3 install | Defer to authorization packet; Uptime Kuma is the only § 5.5 carve-out today |

### Guardrails (this capture)

- No installation. No MCP config. No env vars. No runtime code. No production credentials or client data.

### Related canonical docs

- `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` — Langfuse out of scope for Phase 1.
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — L3 install requires packet.

---

## n8n hardening track — workflow spine security process

**Status:** `ADOPT PROCESS`

**Verdict:** `N8N HARDENING PROCESS CAPTURED — NO WORKFLOW OR RUNTIME CHANGES AUTHORIZED BY THIS CAPTURE`

**Context:** n8n on `corpflow-exec-01` remains the **workflow spine**; hardening is **mandatory** due to recent RCE-class vulnerabilities and agentic workflow hijacking risks.

**NO IMPLEMENTATION AUTHORIZED** by this capture alone — process adoption and operator checklist only.

### Why Anton added it

- n8n is already production-adjacent (Kuma sub-probe 8, automation forward, Lead Rescue ops).
- Security posture must improve **before** expanding Chatwoot/GHL sync pilots or new secret-touching workflows.

### Mandatory gates (operator process — adopt immediately)

| Gate | Requirement |
| ---- | ----------- |
| Trusted users only | Remove or disable untrusted accounts; audit who can edit workflows |
| No public editor | Editor UI not exposed to the public internet |
| Version pinning + update policy | Pin image/version; documented review before upgrades |
| Credential inventory | List every n8n credential; rotate on schedule |
| Backup / restore test | Prove workflow + credential recovery |
| Review Code nodes | No arbitrary code without human review |
| Isolate secret-touching workflows | Separate credentials and access for workflows that touch secrets |

### Adoption risks

| Risk | Mitigation |
| ---- | ---------- |
| RCE via Code node or vulnerable version | Pin version; review Code nodes; patch cadence |
| Agentic workflow hijacking | Trusted users only; no public editor; isolate secrets |
| Expanding n8n before hardening | Chatwoot/GHL sync pilots wait on baseline hardening evidence |

### Guardrails (this capture)

- Docs/process capture only. No n8n config changes, no workflow edits, no credential rotation in this PR.

### Related canonical docs

- `docs/automation-framework.md`, `docs/n8n/automation-forward-recipe.md`
- `docs/operations/MONITORING_ARCHITECTURE.md` — n8n health sub-probe

---

## Chatwoot — customer support / live chat inbox

**Status:** `PILOT / PRODUCT A INBOX STANDARD`

**Verdict:** `CHATWOOT IS PRODUCT A CONVERSATION INBOX STANDARD — NO INSTALLATION AUTHORIZED`

**URL:** https://www.chatwoot.com/ · https://github.com/chatwoot/chatwoot

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- CorpFlowAI **standard** for website chat, live chat, and conversation inbox.
- **Not the CRM** — pairs with Twenty/EspoCRM bake-off winner for records.
- Potential **website lead capture** and **human handoff** for Product A medspa and Lead Rescue surfaces.

### Self-hosting notes

| Item | Notes |
| ---- | ----- |
| Stack | Rails + Postgres + Redis; heavier than Kuma |
| CorpFlow constraint | Explicitly on forbidden list until separate ADR + authorization packet |

### Pilot gate (bounded next step)

Demo **medspa inbox**: website widget, pre-chat form, lead classification, human handoff, **n8n sync** — **sandbox only**, no production client data. **Not** GHL sync.

### Adoption risks

| Risk | Mitigation |
| ---- | ---------- |
| Confused with CRM | Document boundary: Chatwoot = inbox only |
| Second app on exec-01 | Not authorized without packet; consider disposable VPS for pilot |
| n8n sync before hardening | Complete n8n hardening gates first |

### Guardrails (this capture)

- No installation. No widget on production tenant hosts. No client data.

### Related canonical docs

- `docs/product/PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md` § 19
- `docs/product/CHAT_DESTINATION_REFERENCE_SOCIAL_INTENTS.md` — destination shape vs install

---

## Social scheduling discovery — Postiz, Mixpost

**Status:** `DISCOVERY / PILOT LIGHTLY`

**Verdict:** `SOCIAL SCHEDULING DISCOVERY CAPTURED — NO DEFAULT VENDOR — NO INSTALLATION AUTHORIZED`

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- Self-hosted / productized **social media scheduling** for CorpFlowAI content production.
- **Do not default to Mixpost.** **GHL-native social scheduling is not an option.**

### Candidates

| Candidate | URL | Notes |
| --------- | --- | ----- |
| Postiz | https://postiz.com/ | Discovery |
| Mixpost | https://mixpost.app/ | One candidate — not default |
| Others | TBD | Add maintained product sets as discovered |

### Pilot gate

Internal CorpFlowAI accounts only first; no client accounts until API/platform policy reviewed.

### Guardrails

- No installation. No GHL social modules.

### Related canonical docs

- `docs/product/PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md` § 17

---

## Postiz — social scheduler candidate

**Status:** `DISCOVERY`

**Verdict:** `POSTIZ CAPTURED AS SOCIAL SCHEDULING CANDIDATE — NO INSTALLATION AUTHORIZED`

**URL:** https://postiz.com/

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

Part of social scheduling discovery track — see [Social scheduling discovery](#social-scheduling-discovery--postiz-mixpost).

---

## Mixpost — self-hosted social scheduler

**Status:** `DISCOVERY CANDIDATE` (not default)

**Verdict:** `MIXPOST CAPTURED AS SOCIAL SCHEDULING CANDIDATE — NO INSTALLATION AUTHORIZED`

**URL:** https://mixpost.app/

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- Self-hosted **social media scheduler** for CorpFlowAI content production (operator marketing cadence).

### Self-hosting notes

| Item | Notes |
| ---- | ----- |
| PHP/Laravel stack | Separate install; not on CorpFlow Vercel app |
| Platform APIs | Requires OAuth tokens per social network |

### Pilot gate (bounded next step)

**Internal CorpFlowAI accounts only** first. **No client accounts** until API/platform policy and permissions are reviewed.

### Adoption risks

| Risk | Mitigation |
| ---- | ---------- |
| Platform ToS / API policy violations | Internal accounts only; legal review before client use |
| OAuth token storage | Sandbox credentials only; no production CorpFlow secrets |

### Guardrails (this capture)

- No installation. No client social accounts. No production OAuth in repo.

### Related canonical docs

- `docs/product/MARKETING_AUTOMATION_CONTENT_ENGINE_CANDIDATES.md`
- `docs/marketing/02_MULTIMODAL_CONTENT_PLAYBOOK.md`

---

## OpenJarvis — local personal-AI architecture

**Status:** `WATCH / RESEARCH`

**Verdict:** `OPENJARVIS CAPTURED AS LOCAL AI ARCHITECTURE RESEARCH — NO INSTALLATION AUTHORIZED`

**URL:** https://github.com/OpenJarvis (verify repo maturity during research)

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- **Decomposed local personal-AI architecture** — promising for future operator productivity and lower API cost.

### Constraint

**Research-only** until repo maturity and deployment path are verified.

### Adoption risks

| Risk | Mitigation |
| ---- | ---------- |
| Immature OSS | No install until maturity review |
| Confusion with production agents | Pattern study only |

### Guardrails (this capture)

- No installation. No MCP config. On standing forbidden list for L3 until packet.

---

## OpenClaw — self-hosted agentic operator assistant

**Status:** `WATCH / SANDBOX ONLY`

**Verdict:** `OPENCLAW CAPTURED AS SANDBOX AGENT PATTERN — NO INSTALLATION AUTHORIZED`

**URL:** Verify official repo during sandbox research

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- **Self-hosted agentic operator assistant** pattern — study for future operator tooling.

### Constraint

**Disposable VPS only.** No production credentials, no client data, no production DB, no broad network permissions.

### Adoption risks

| Risk | Mitigation |
| ---- | ---------- |
| Agent with broad tool access | Disposable VPS; no CorpFlow secrets |
| Data exfiltration | No client data; network egress restricted in sandbox |

### Guardrails (this capture)

- No installation on `corpflow-exec-01`, Vercel, or production Postgres.

---

## AgentSight / AgentTrace — agent observability alternatives

**Status:** `WATCH AS AGENTSPAN ALTERNATIVES`

**Verdict:** `AGENTSIGHT / AGENTTRACE CAPTURED AS OBSERVABILITY RESEARCH — NO INSTALLATION AUTHORIZED`

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- **Agent observability / security research** alternatives to AgentSpan for future governance.

### Note

Compare during research passes; no install authorized. See [AgentSpan](#agentspan--durable-agent-execution-runtime).

### Guardrails (this capture)

- Research and docs only. No install. No production agent instrumentation.

---

## AgentSpan — durable agent execution runtime

**Status:** `WATCH / REVISIT`

**Verdict:** `AGENTSPAN VERIFIED — WATCH / REVISIT — NO INSTALLATION AUTHORIZED`

**URL:** https://agentspan.ai (verified 2026-06-22)

**Category:** Durable execution runtime for AI agents.

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- Potential **agent execution runtime** for future CorpFlow operator-agent workflows.
- **Not** a Product A immediate dependency.

### Constraint

- **WATCH / REVISIT** only.
- **Not** connected to production credentials or client data.
- Revisit after **Langfuse + Chatwoot + CRM bake-off**.

### Guardrails (this capture)

- No install. No MCP. No production credentials or client data.

### Related canonical docs

- `docs/product/PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md` § 18

---

## Agyn — zero-trust agent runtime reference

**Status:** `WATCH / ARCHITECTURE REFERENCE`

**Verdict:** `AGYN CAPTURED AS ARCHITECTURE REFERENCE — NO INSTALLATION AUTHORIZED`

**URL:** Verify during architecture study

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- **Zero-trust, least-privilege, Kubernetes-style agent runtime** ideas — useful reference for future CorpFlow agent governance.

### Constraint

**No install.** Likely too early and too heavy for current ops posture.

### Guardrails (this capture)

- Architecture reference only. No K8s cluster. No L3 install.

### Related canonical docs

- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md`
- Guild.ai entry in this doc — complementary governance pattern study

---

## Twenty CRM — CRM bake-off candidate

**Status:** `CRM BAKE-OFF CANDIDATE`

**Verdict:** `TWENTY CRM IN BAKE-OFF VS ESPOCRM — NO INSTALLATION AUTHORIZED`

**URL:** https://twenty.com/

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- **AI-oriented open CRM** — candidate in **Twenty vs EspoCRM** bake-off.
- GoHighLevel is **legacy/migration-away** — not system of record.

### Bake-off scenario

Prospect → company/contact → website audit → fit score → outreach status → booked call → proposal → onboarding → follow-up task. Prefer **maintained product set** over custom CRM development.

### Guardrails (this capture)

- No install until bake-off completes and ADR authorizes winner.
- No GHL as long-term CRM.

### Related canonical docs

- `docs/product/PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md` § 16

---

## EspoCRM — CRM bake-off candidate

**Status:** `CRM BAKE-OFF CANDIDATE`

**Verdict:** `ESPOCRM IN BAKE-OFF VS TWENTY — NO INSTALLATION AUTHORIZED`

**URL:** https://www.espocrm.com/

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- Mature **open-source CRM** — candidate in **Twenty vs EspoCRM** bake-off against same operator scenario as Twenty.

### Guardrails (this capture)

- Sandbox bake-off only until authorization packet.
- Prefer maintained product set over custom CorpFlow CRM code.

### Related canonical docs

- `docs/product/PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md` § 16

---

## Cal.diy — scheduling infrastructure reference

**Status:** `REVISIT / DO NOT USE FOR CLIENT PRODUCTION NOW`

**Verdict:** `CAL.DIY CAPTURED AS SCHEDULING REFERENCE — NO CLIENT PRODUCTION USE AUTHORIZED`

**URL:** https://github.com/calcom/cal.com (Cal.com ecosystem; verify Cal.diy fork/community posture)

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- **Scheduling infrastructure** is strategically relevant for medspa booking and Lead Rescue follow-up flows.
- Upstream/community docs warn that **community self-hosting is intended for personal, non-production use**.

### Constraint

**Do not use for client production scheduling now.** Revisit when hosting posture, SLA, and security review support client-facing booking.

### Adoption risks

| Risk | Mitigation |
| ---- | ---------- |
| Non-production community fork | Not for client production |
| Calendar PII | No client data in unreviewed scheduling pilots |

### Guardrails (this capture)

- No install. No client booking URLs. Reference architecture only.

---

## Executor model — Codex vs Cursor (issue #435)

**Operating decision:** Use **Codex more**, but **not as PR owner**.

| Role | Executor | Typical work |
| ---- | -------- | ------------ |
| **Research & prototype** | Codex Cloud | Product due diligence, evaluation matrices, scripts, extraction, data cleanup, prospect research, local experiments, draft docs, proof-of-concept output (e.g. Drafted Lux pilot notes, AnyVids browser review) |
| **Repo & delivery** | Cursor | Final code / docs changes, PR creation, `npm test` / `npm run build` verification, merge-ready work |

**For this intake (#435):** Codex may produce deep evaluation matrices and Drafted / Lux pilot notes. **Cursor owns** the repo capture, PR, and verification. Neither executor is authorized to install gpt4free, configure MCP for rejected tools, or wire any of these into production by this capture alone.

---

## Document history

| Version | Date (UTC) | Change |
| ------- | ---------- | ------ |
| v1 | 2026-06-20 | Issue #429 radar intake: Guild.ai, Retool, TAAFT Launch, ownAI. |
| v2 | 2026-06-20 | Issue #435 radar intake: claude-code-local, gpt4free, AnyVids, Drafted, MakeInfographic.ai; Codex vs Cursor executor note. |
| v3 | 2026-06-22 | Weekly product radar: Langfuse, n8n hardening, Chatwoot, Mixpost, OpenJarvis, OpenClaw, AgentSight/AgentTrace, AgentSpan, Agyn, Twenty CRM, Cal.diy — ranked shortlist + pilot gates. |
| v4 | 2026-06-22 | Product A direction sync: AgentSpan verified (agentspan.ai); Chatwoot inbox standard; Twenty/EspoCRM bake-off; Postiz + social discovery; GHL migration-away. |
