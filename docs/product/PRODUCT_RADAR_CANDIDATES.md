# Product radar candidates — CorpFlow Candidate & Reference Library

**Library:** CorpFlow Candidate & Reference Library (`docs/product/README.md`)

**Purpose:** Capture **product radar intake** — platform patterns, governance tools, internal-app builders, discovery surfaces, and local-AI companions — for technical-direction evaluation without authorizing install or production dependency.

**Default verdict on every entry:** `NO IMPLEMENTATION AUTHORIZED` unless Anton separately approves evaluation or install.

**Captured:** 2026-06-20 (issue [#429](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/429) — Guild.ai, Retool, TAAFT Launch, ownAI).

**Overall repo verdict:** `RADAR INTAKE CAPTURED: GUILD.AI, RETOOL, TAAFT LAUNCH, OWNAI — NO INSTALLATION AUTHORIZED`

---

## Index

| Entry | Status | Captured |
| ----- | ------ | -------- |
| [Guild.ai](#guildai--agent-control-plane--governance-pattern) | `PILOT / STUDY PATTERN` | 2026-06-20 |
| [Retool](#retool--internal-app-builder--ai-assisted-operations-console) | `PILOT / STUDY PATTERN` | 2026-06-20 |
| [There Is An AI For That Launch](#there-is-an-ai-for-that-launch--ai-product-radar-source) | `WATCH / RADAR SOURCE` | 2026-06-20 |
| [ownAI](#ownai--local-self-evolving-ai-companion--memory-pattern) | `WATCH / SANDBOX LATER` | 2026-06-20 |

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

## Document history

| Version | Date (UTC) | Change |
| ------- | ---------- | ------ |
| v1 | 2026-06-20 | Issue #429 radar intake: Guild.ai, Retool, TAAFT Launch, ownAI. |
