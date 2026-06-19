# Workflow Engine Adoption Review

**Date:** 2026-06-19  
**Type:** Research / architecture decision record (ADR-lite) — **no implementation**  
**Tenant context:** Living Word Mauritius sandbox (`living-word-mauritius`)  
**Baseline:** Tenant Workflow Foundation v1 (live, verified)

---

## 1. Executive summary

CorpFlow already has the right **split** for v1:

| Layer | What it is today | Role |
|-------|------------------|------|
| **Event spine** | `automation_events` + optional n8n forward | “Something happened” — append-only, idempotent |
| **Operator workflow registry** | `workflow_definitions` / `workflow_runs` / `workflow_steps` | Tenant-scoped human follow-up queue with links to source event + thread |
| **Integration hands** | n8n (already on L2, Hetzner) | Future outbound routing (email draft, WhatsApp queue, webhooks) — not yet wired for LWM leads |

**Recommendation: KEEP the custom foundation for tenant operator workflows; do NOT adopt a third-party workflow engine yet.**

Use **n8n only as the existing integration/routing layer** when Anton approves outbound actions — not as the system of record for tenant workflow state.

**Revisit adoption** when CorpFlow needs **durable multi-day execution** (timers, compensation, complex retry DAGs) across **multiple tenants at scale**, or when custom orchestration code clearly exceeds a bounded maintenance budget (~2–3 engineers worth of workflow-runtime concerns).

For Living Word’s near-term workflows (member onboarding, WordGroup assignment, event attendance, volunteer onboarding, Business Network intros, prayer routing), the **custom foundation + automation spine + optional n8n branches** is sufficient and lower risk than installing Temporal, Camunda, or another control plane.

---

## 2. Candidate comparison table

Legend: **✅ strong** · **⚠ partial / constraints** · **❌ weak / mismatch** · **— not primary fit**

| Criterion | **CorpFlow foundation (v1)** | **Temporal** | **n8n** | **Camunda / Zeebe** | **Windmill** | **Trigger.dev** | **Inngest** | **Hatchet** |
|-----------|------------------------------|--------------|---------|---------------------|--------------|-----------------|-------------|-------------|
| **License / free self-host** | ✅ Own code, no license risk | ✅ MIT (server + TS SDK) | ⚠ Fair-code **Sustainable Use License** — free for **internal** CorpFlow ops; not for embedding n8n as the product | ⚠ Source Camunda License v1; **production self-managed binaries need commercial license** | ⚠ **AGPLv3** (copyleft; review if SaaS-adjacent) | ✅ OSS self-host (Apache-style project); cloud is separate | ⚠ Server **SSPL** + delayed OSS; managed cloud is default path | ✅ **MIT** |
| **Self-hostable** | ✅ Postgres tables in Neon | ✅ Docker/K8s; separate cluster | ✅ Already in CorpFlow L2 stack | ✅ Docker/K8s; heavy stack | ✅ Docker/K8s | ✅ Docker Compose / K8s (webapp + workers) | ✅ `inngest start` single binary; Postgres optional | ✅ Docker / Hatchet Lite; Postgres |
| **TypeScript / Node** | ✅ Native (Next.js app) | ✅ Official TS SDK | ✅ Native (n8n is TS) | ⚠ Official `@camunda8/sdk` (Node workers); BPMN-centric | ✅ TS scripts/flows | ✅ First-class TS | ✅ TS SDK | ✅ TS SDK |
| **Postgres compatibility** | ✅ Same Neon DB as app | ⚠ Supported; often **separate DB** (+ optional Elasticsearch for visibility) | ⚠ Optional Postgres for n8n; often SQLite in small installs | ⚠ Zeebe uses own persistence (not app Postgres) | ✅ Postgres queue + state | ⚠ Own Postgres + Redis in compose stack | ⚠ Postgres + Redis for production self-host | ✅ **Postgres as durability layer** |
| **Vercel compatibility** | ✅ Inline create-run on serverless route; no worker | ❌ **Workers must run elsewhere**; Vercel functions only trigger | ❌ n8n is separate host (already) | ❌ Workers + broker off-Vercel | ❌ Workers off-Vercel | ⚠ App on Vercel; **tasks run on Trigger workers** | ⚠ Functions on Vercel; **orchestrator separate** (cloud or self-host) | ❌ Workers off-Vercel |
| **Long-running workers required** | ❌ Not for v1 (sync create only) | ✅ Yes | ✅ Yes (always) | ✅ Yes | ✅ Yes | ✅ Yes | ⚠ Hybrid | ✅ Yes |
| **Tenant isolation model** | ✅ **First-class** `tenant_id` on all rows | ⚠ Namespace/task-queue per tenant (manual design) | ⚠ Single instance = **weak** tenant isolation unless duplicated or strict workflow design | ⚠ Multi-tenancy via separate clusters or careful process design | ⚠ Workspace/ folder patterns; not multi-tenant SaaS-native | ⚠ Project/environment based | ⚠ App/env based | ⚠ Manual queue/tenant mapping |
| **Workflow versioning** | ✅ `workflow_key` + `version` on definitions | ✅ Native workflow versioning | ⚠ Workflow JSON versions manually | ✅ BPMN version tags | ✅ Git-style flow versions | ✅ Task/deploy versioning | ✅ Function versioning | ✅ Workflow version pinning |
| **Idempotency** | ✅ `workflow_runs` unique `(tenant_id, idempotency_key)` | ✅ Workflow ID reuse policies | ⚠ Node-level dedupe patterns | ✅ Process instance keys | ⚠ App-defined | ✅ Built-in idempotency keys | ✅ Step idempotency | ✅ Durable task keys |
| **Retries / durable execution** | ❌ v1: no step retry engine | ✅ Best-in-class | ✅ Per-node retries | ✅ Strong | ✅ Job retries | ✅ Strong | ✅ Strong | ✅ Strong |
| **Long-running workflows** | ❌ v1: state rows only | ✅ Days/weeks | ⚠ Wait nodes; not saga-grade | ✅ BPMN timers | ✅ Schedules/waits | ✅ No timeout tasks | ✅ Step sleep/wait | ✅ DAG + sleep |
| **Human / manual tasks** | ✅ `operator_follow_up` steps in Postgres | ⚠ Signals/queries; build UI yourself | ✅ Wait + manual branches; no native church inbox | ✅ **Tasklist** (strong) | ⚠ Human input via forms/apps | ❌ Not human-inbox focused | ❌ Developer-step focused | ❌ Background-job focused |
| **Visual workflow builder** | ❌ By design (v1) | ❌ Code-first (+ UI visibility) | ✅ **Strong** | ✅ **BPMN modeler** | ✅ Flow editor | ✅ Cloud dashboard timelines | ✅ Cloud UI | ⚠ Dashboard, not full BPMN |
| **Event / webhook ingestion** | ✅ From `automation_events` | ⚠ Start workflow via API/worker | ✅ **Webhooks native** | ✅ Zeebe messages | ✅ Many triggers | ✅ Events | ✅ Events | ✅ Events |
| **Operator visibility / UI** | ⚠ Factory read API only (v1) | ⚠ Temporal Web UI (technical) | ✅ n8n execution log | ✅ Operate + Tasklist | ✅ Windmill UI | ✅ Trigger dashboard | ✅ Inngest dashboard | ✅ Hatchet dashboard |
| **Auth / security** | ✅ Factory master + tenant scope in app | ⚠ mTLS/OAuth setup | ⚠ Instance auth; secrets in n8n | ✅ Enterprise IAM patterns | ✅ SSO in enterprise | ⚠ Self-host auth setup | ⚠ Keys + signing | ⚠ Token + mTLS options |
| **Operational complexity** | ✅ **Low** — 3 tables, no new service | ❌ **High** — cluster + workers + visibility store | ⚠ **Medium** — already operating one instance | ❌ **Very high** | ❌ **High** — server + workers + sandbox | ❌ **High** — webapp + workers + registry | ⚠ Medium–high | ⚠ Medium (Postgres-only start) |
| **Backup / restore** | ✅ Same Neon backup as app | ❌ Separate persistence backup | ⚠ Separate n8n DB/volume | ❌ Separate Zeebe backup | ❌ Separate Windmill Postgres | ❌ Separate stack | ❌ Separate stack | ⚠ Postgres + optional RabbitMQ |
| **Migration from `workflow_*`** | ✅ Baseline | ⚠ Dual-write or export runs as Temporal histories | ⚠ Map steps → n8n wait states; **lose unified tenant inbox** | ⚠ BPMN re-model every workflow | ⚠ Rebuild flows in Windmill | ⚠ Re-write as Trigger tasks | ⚠ Re-write as Inngest functions | ⚠ Re-write as Hatchet workflows |
| **Living Word suitability (near term)** | ✅ **Best fit** — church ops are human-first | ⚠ Overkill | ⚠ Good for **integrations**, poor as **tenant inbox** | ❌ Too heavy for one church tenant | ⚠ Internal ops platform, not client tenant model | ⚠ Dev-task oriented | ⚠ Dev-task oriented | ⚠ Background orchestration |
| **Future multi-tenant CorpFlow** | ✅ Extend definitions per tenant | ⚠ Possible with discipline | ⚠ Risky on one instance | ⚠ Enterprise-only economics | ⚠ AGPL + ops burden | ⚠ Another control plane | ⚠ Another control plane | ⚠ Possible; still new service |

---

## 3. Shortlist recommendation

### Tier A — Continue with (no new engine)

1. **CorpFlow Tenant Workflow Foundation** — system of record for tenant operator tasks, versioning, idempotency, audit links.
2. **CorpFlow `automation_events` spine** — trigger contract (already live).
3. **Existing n8n** — optional **hands** for approved outbound/integration only (aligns with `docs/automation-framework.md` Plan B).

### Tier B — Revisit if triggers fire (see §8)

1. **Hatchet** — smallest credible upgrade path: MIT, Postgres-native, TS SDK, self-host on existing Hetzner footprint **with a new authorization packet** (not authorized today beyond Kuma carve-out pattern).
2. **Temporal** — if CorpFlow needs durable sagas across many services and can fund a dedicated ops owner.

### Tier C — Not recommended for CorpFlow tenant workflows

- **Camunda/Zeebe** — license + BPMN ops overhead; wrong scale for church/tenant human workflows.
- **Windmill** — excellent internal dev platform, but AGPL + second Postgres app stack; overlaps n8n without tenant model.
- **Trigger.dev / Inngest** — optimized for **developer background jobs** on Vercel, not **tenant-scoped operator inboxes**; adds SSPL/cloud split complexity.

### Tier D — n8n alone is not a substitute

n8n is already valuable but should **not replace** `workflow_*`:

- Weak native **multi-tenant isolation** on a shared instance.
- Execution history ≠ structured **operator queue** with stable step schema per workflow.
- Sustainable Use License is fine for **internal** CorpFlow automation, but embedding n8n as the customer-facing workflow runtime would trigger license review.

---

## 4. Build / adopt / keep decision

| Decision | Verdict |
|----------|---------|
| **Adopt third-party workflow engine now?** | **NO** |
| **Keep Tenant Workflow Foundation v1?** | **YES** — extend to v2 in-app |
| **Adopt n8n for more than integration hands?** | **NO** — keep n8n as forward/webhook executor only |
| **Build a visual workflow designer now?** | **NO** |
| **Build durable execution runtime ourselves?** | **NO** — defer until triggers in §8 |

**One-line decision:** **KEEP custom tenant workflow tables; extend incrementally; use n8n only as integration hands; defer engine adoption.**

---

## 5. What to do with current `workflow_*` tables

**Keep and treat as canonical** for tenant operator workflow state.

| Table | Future role |
|-------|-------------|
| `workflow_definitions` | Register each tenant workflow (`member_onboarding`, `prayer_request`, …) with versioned JSON |
| `workflow_runs` | One run per triggering event; links to `automation_events.id` and optional `chat_widget_threads.id` |
| `workflow_steps` | Human tasks + future automated steps; status transitions (`open` → `completed` / `skipped`) |

**Do not delete or migrate away** while evaluating engines. If Hatchet/Temporal is adopted later, these tables become either:

- **Read-model / operator inbox** (engine executes; CorpFlow mirrors summary), or
- **Deprecated after cutover** with runs marked `cancelled` and audit preserved.

---

## 6. What not to build ourselves

Do **not** build in-house equivalents of:

| Capability | Why not |
|------------|---------|
| Durable execution engine (retries, timers, saga compensation) | Hard; mature OSS exists (Hatchet, Temporal) |
| Visual BPMN/designer | Low ROI for church/tenant ops; high maintenance |
| Distributed task queue cluster | n8n / Hatchet / Vercel-adjacent tools already cover “hands” |
| Full enterprise BPM (Camunda-class) | Wrong product category for CorpFlow |
| Email/WhatsApp/SMS delivery infrastructure | Use typed comms path + n8n when approved (`docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`) |

**Do build ourselves:**

- Tenant-scoped definitions, runs, steps
- Operator read APIs (and later a minimal inbox UI in CorpFlow)
- Mapping from `automation_events` → workflow runs
- Preferred-channel routing **metadata** (not auto-send)

---

## 7. Proposed architecture (recommended — no new engine)

```text
┌─────────────────────────────────────────────────────────────────┐
│ Client surfaces (LWM sandbox site-preview, chatbot, future forms)│
└────────────────────────────┬────────────────────────────────────┘
                             │ submit
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ CorpFlow app (Vercel) — UNCHANGED recording path                 │
│  chat_widget_threads / messages → automation_events              │
└────────────────────────────┬────────────────────────────────────┘
                             │ inline processor (v1)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Tenant Workflow Foundation (Postgres / Neon)                     │
│  workflow_definitions → workflow_runs → workflow_steps           │
│  Operator inbox: open human tasks, tenant_id scoped              │
└────────────────────────────┬────────────────────────────────────┘
                             │ optional future: step.completed event
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ automation_events spine (append-only)                            │
└────────────────────────────┬────────────────────────────────────┘
                             │ CORPFLOW_AUTOMATION_FORWARD_URL (optional)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ n8n (existing L2) — integration hands ONLY when approved         │
│  e.g. draft email, Telegram to operator, CRM stub — NOT inbox SoT│
└─────────────────────────────────────────────────────────────────┘
```

**Living Word next workflows (v2 packet):** add new `workflow_definitions` rows + processors — same pattern as `living_word_chatbot_lead_followup` v1. No new infrastructure.

---

## 8. Trigger conditions to revisit engine adoption

Re-open this review when **any two** of the following are true:

1. **Scale:** >50 open workflow runs across tenants **and** growing >20% month-over-month.
2. **Durability:** Need **scheduled waits** (e.g. “remind operator after 48h”, “escalate after 7 days”) with guaranteed delivery without custom cron hacks.
3. **Complexity:** Any single workflow requires **>5 automated steps with compensation** (rollback paths across external systems).
4. **Code cost:** Workflow-runtime code (excluding business mapping) exceeds **~1,500 LOC** or requires a dedicated on-call rotation.
5. **Multi-tenant isolation on n8n** becomes insufficient (per-tenant outbound credentials with strict audit).
6. **Regulatory** requirement for isolated execution plane per tenant (unlikely for LWM sandbox; possible for finance/legal tenants later).

**If triggered, evaluate in order:** Hatchet (Postgres, MIT) → Temporal (if sagas dominate) → stay on custom + n8n.

---

## 9. Risks of continuing custom

| Risk | Mitigation |
|------|------------|
| Reinventing retries/timers badly | Explicitly out of scope until §8 triggers; use n8n for simple delayed branches if urgent |
| Operator inbox stays API-only too long | Planned v2: minimal `/factory/tenant-workflows` UI or CMP-adjacent panel |
| Schema drift across workflows | Keep `definition_json.schema = corpflow.workflow.definition.v1`; version bump on breaking changes |
| Duplicate logic vs n8n | **Rule:** Postgres = operator state; n8n = external IO only |
| Team bandwidth | Small, incremental workflows; one tenant (LWM) first |

---

## 10. Risks of adopting third-party

| Risk | Impact |
|------|--------|
| **Second system of record** | Operator confusion if n8n/Temporal and `workflow_*` both claim “truth” |
| **Vercel split-brain** | App on serverless, engine elsewhere — more secrets, monitoring, failure modes |
| **Tenant isolation gaps** | Shared n8n/Temporal instance leaking cross-tenant data if misconfigured |
| **License surprises** | Camunda production fees; n8n Embed if productized; AGPL Windmill; Inngest SSPL |
| **Ops on `corpflow-exec-01`** | Server boundary doc forbids new self-hosted tools without authorization packet |
| **Migration cost** | 8 LWM runs + definitions to remap; downtime risk for demo |
| **Over-engineering** | Building BPM for church follow-up that needs a phone call, not a saga |

---

## 11. Next-step recommendation

**For Anton (decision):**

1. **Approve KEEP path** — extend Tenant Workflow Foundation to v2 for next LWM workflows (no engine install).
2. **Define workflow v2 packet list** (priority order suggested):
   - Prayer request follow-up
   - Volunteer onboarding follow-up
   - Member onboarding follow-up
   - Event attendance follow-up
   - Business Network introduction follow-up
   - WordGroup assignment follow-up
3. **Optional parallel:** minimal **operator inbox UI** (read + mark complete) on factory host — still no designer.
4. **When outbound approved:** n8n branch on `chat_widget.lead.submitted` or `workflow.step.open` mirror event — **not** replacement of `workflow_steps`.
5. **Calendar review:** re-run this adoption review in **Q4 2026** or when §8 triggers hit.

**Explicit non-actions (this packet):**

- No Temporal / Hatchet / Camunda install
- No n8n workflow designer as tenant runtime
- No schema changes
- No widget or external site changes

---

## Appendix A — CorpFlow v1 baseline (reference)

| Item | Value |
|------|--------|
| Tables | `workflow_definitions`, `workflow_runs`, `workflow_steps` |
| First workflow | `living_word_chatbot_lead_followup` v1 |
| Trigger | `chat_widget.lead.submitted` |
| LWM backfill | 8 runs / 8 open operator steps (verified 2026-06-19) |
| Idempotency | `chat-widget-lead-followup:{source_event_id}` |
| Operator API | `GET /api/factory/tenant-workflows/runs` · `/steps` |
| Docs | `lib/server/tenant-workflow/README.md` |
| Verification | `tenant-workflow-foundation-v1-live-verification.md` |

---

## Appendix B — n8n vs foundation (clarification)

CorpFlow **already uses n8n** at L2 (`docs/n8n/automation-forward-recipe.md`). The adoption question is not “n8n or custom?” but:

| Question | Answer |
|----------|--------|
| Should n8n store tenant workflow state? | **No** |
| Should n8n execute approved outbound actions? | **Yes, when gated** |
| Should `workflow_*` remain? | **Yes** |

This preserves tenant isolation in Postgres and avoids fair-code/embed ambiguity for a multi-tenant product.

---

*Decision packet only. No code, schema, migrations, or external integrations were changed.*
