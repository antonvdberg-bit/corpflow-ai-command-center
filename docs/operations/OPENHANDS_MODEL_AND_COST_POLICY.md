# OpenHands model and cost policy (Phase 1)

**Status:** DRAFT policy for a **not-yet-installed** package. Based on official OpenHands documentation research
dated 2026-08-04 (`https://docs.openhands.dev/openhands/usage/run-openhands/local-setup`). No model provider is
connected; no spend has occurred. **Controlling issue:** [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743)

**Companion docs:**

- `docs/operations/OPENHANDS_OPERATING_CHARTER.md` § "Model policy" — the permanent cost ceiling this doc details.
- `docs/operations/OPENHANDS_OPERATING_RUNBOOK.md` § 5 — where cost-related alerting would live.
- `ops/openhands/.env.example` — the fields this policy governs (`OPENHANDS_MONTHLY_COST_CEILING_USD`, `OPENHANDS_COST_SOFT_STOP_PCT`, `OPENHANDS_COST_FAIL_CLOSED_PCT`).
- `docs/execution/CODEX_UTILIZATION_PLAN_V1.md` — the closest existing CorpFlow precedent for "which ChatGPT/Codex entitlement tier is actually usable programmatically," reused as a research pattern here.

---

## 1. Providers (per official docs, checked 2026-08-04)

Two distinct connection paths exist for OpenHands:

1. **API key via a LiteLLM-supported provider.** OpenHands' control plane calls out to any provider LiteLLM
   supports (OpenAI, Anthropic, Groq, OpenRouter, a self-hosted OpenAI-compatible endpoint, etc.) using a
   provider API key set as `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` in `ops/openhands/.env.example`. This is
   a standard pay-per-token API relationship — cost is metered by the provider, independent of any ChatGPT
   subscription.
2. **ChatGPT Plus/Pro `subscription_login` for Codex (via the OpenAI Agents/Codex SDK path).** Official docs
   document this as a supported login flow **for Plus/Pro personal subscriptions**, distinct from an API key.

## 2. Business/Team verdict: UNCLEAR

**As of the 2026-08-04 documentation pass, ChatGPT Business/Team entitlements are not documented as a supported
`subscription_login` path for OpenHands/Codex.** Only Plus/Pro are named. This does **not** mean Business/Team
definitely fails — it means the official docs are silent on it, which for a protected-action decision (any
paid-tool activation requires Anton approval per the Charter) must be treated as **unclear, not assumed-working**.

This mirrors the exact caution already standing in `docs/execution/CODEX_UTILIZATION_PLAN_V1.md` and in
`docs/operations/OPENHANDS_IMPLEMENTATION_AND_OPERATIONS_RUNBOOK.md` § "Model configuration": *"Investigate
whether Anton's current ChatGPT Team entitlement supports valid Codex authorisation… Do not assume Team, Plus,
and Pro entitlements are equivalent."* This packet's research confirms that caution was warranted — the
uncertainty remains open, not resolved, as of 2026-08-04.

## 3. Recommendation: API-key route as the fail-safe default

**Recommended Phase 1 path: option 1 (API key via a LiteLLM-supported provider), not the ChatGPT subscription-login
path.** Reasons:

- It is unambiguously documented and supported — no entitlement-tier uncertainty.
- Cost is directly metered per token by the provider, which maps cleanly onto the ceiling/gate model in § 4
  below.
- It does not require deciding, before any evidence exists, whether Anton's actual ChatGPT plan (Business/Team)
  would even work — avoiding wasted setup time on an unclear path.
- It keeps the credential surface simple: one provider API key, rotated per
  `docs/operations/OPENHANDS_SECURITY_MODEL.md` § 8, rather than an interactive browser-based subscription login
  flow running unattended on a headless server (itself an open question upstream docs do not fully resolve for
  server-side/headless use).

**Optional, controlled validation later (not Phase 1):** if Anton wants to test whether his actual ChatGPT
entitlement works with the `subscription_login` path, that is a small, bounded, explicitly-approved side
experiment — never the default install path, and never something OpenHands or Cursor decides to try
unilaterally. Record the entitlement tier tested and the observed result (works / fails / ambiguous) as a
JOURNAL row either way, so the next agent does not have to re-research it from zero.

## 4. Cost ceiling and gates

Per the Charter ("Initial OpenHands model-spend ceiling: USD 25 per month, with no automatic top-up") and
`ops/openhands/.env.example`:

| Field | Value (v1) | Behavior |
|---|---|---|
| `OPENHANDS_MONTHLY_COST_CEILING_USD` | `25` | The hard monthly ceiling. |
| `OPENHANDS_COST_SOFT_STOP_PCT` | `80` | At 80% of the ceiling (USD 20), the system should stop opening **new, low-priority** packets and flag the approaching limit — a soft warning, not an outage. |
| `OPENHANDS_COST_FAIL_CLOSED_PCT` | `100` | At 100% of the ceiling (USD 25), OpenHands must **fail closed** — refuse to start any new task until the next billing cycle or an explicit Anton-approved ceiling increase. It must not silently keep spending past the ceiling. |
| Auto top-up | **Never.** | No automatic increase of the ceiling under any condition. Raising it requires an explicit Anton decision, recorded the same way any cost-ceiling change is recorded (JOURNAL row). |

**"Fail closed" here means:** the control plane must refuse to dispatch a new task once the ceiling is reached,
even if that means a queued packet waits until next month or until Anton manually raises the ceiling. It must
never mean "keep working and let the bill run over" — that would invert the entire point of a hard ceiling.

## 5. Usage recording fields

Every dispatched packet (per the Charter's work-packet contract and
`docs/execution/OPENHANDS_WORK_PACKET_TEMPLATE.md`) should record, at completion or failure:

| Field | Purpose |
|---|---|
| `model_used` | Which provider/model actually served the task (e.g. `groq/llama-...`, `openai/gpt-...` — never the API key). |
| `attempts` | How many tries this packet took. |
| `result` | `success` / `failed` / `escalated`. |
| `approximate_cost_usd` | Best-available cost estimate for this task, if the provider surfaces per-call token usage/cost. |
| `cumulative_month_to_date_usd` | Running total against the `OPENHANDS_MONTHLY_COST_CEILING_USD` ceiling. |
| `escalation_outcome` | If escalated to Cursor, what happened next. |

These fields feed the Charter's "Every task should record model used, attempts, result, approximate cost where
available, and escalation outcome" requirement, and the evidence capture step in
`docs/operations/OPENHANDS_INSTALL_RUNBOOK.md` § 15 for the synthetic validation packets.

## 6. What this policy does not do

- It does not activate any paid provider account. Provider account creation/activation and the entering of a
  real key remain a protected action per the Charter — Anton's approval, entered directly in the approved
  secret store, never in this repo.
- It does not authorize a ChatGPT subscription-login experiment beyond the "optional, controlled validation
  later" note in § 3 — that remains a separate, explicitly-approved side step, not part of the default install
  path.
- It does not raise the USD 25/month ceiling. Any change to that number is a fresh Anton decision.

## 7. Change log

- **2026-08-04** — Initial cost/model policy authored alongside the Phase 1 documentation set for #743, based on
  official OpenHands docs research dated the same day. No provider connected; no spend has occurred.
