# Product radar candidates — CorpFlow Candidate & Reference Library

**Library:** CorpFlow Candidate & Reference Library (`docs/product/README.md`)

**Purpose:** Capture **product radar intake** — platform patterns, governance tools, internal-app builders, discovery surfaces, and local-AI companions — for technical-direction evaluation without authorizing install or production dependency.

**Default verdict on every entry:** `NO IMPLEMENTATION AUTHORIZED` unless Anton separately approves evaluation or install.

**Captured:**

- 2026-06-20 — issue [#429](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/429) — Guild.ai, Retool, TAAFT Launch, ownAI.
- 2026-06-20 — issue [#435](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/435) — claude-code-local, gpt4free, AnyVids, Drafted, MakeInfographic.ai.

**Overall repo verdict (issue #429):** `RADAR INTAKE CAPTURED: GUILD.AI, RETOOL, TAAFT LAUNCH, OWNAI — NO INSTALLATION AUTHORIZED`

**Overall repo verdict (issue #435):** `RADAR INTAKE CAPTURED: CLAUDE-CODE-LOCAL, GPT4FREE, ANYVIDS, DRAFTED, MAKEINFOGRAPHIC — NO INSTALLATION AUTHORIZED`

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
