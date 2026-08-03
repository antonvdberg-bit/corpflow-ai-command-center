# CorpFlowAI Promptfoo quality-gate pilot

**Adoption status:** pilot quality gate for AI safety/regression cases — **not** a production runtime, **not** a required PR check.

**Licence posture:** **Community / open-source only.** This pilot must not enable, require, or assume Promptfoo Cloud, Enterprise, hosted dashboards, paid red-team packs, paid collaboration features, or any commercial Promptfoo licence functionality.

Related issue: [#725](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/725).

## Why this exists

CorpFlowAI is moving toward Lead Rescue, Website Rescue, AI receptionist / chatbot, and AI-assisted operator workflows. Before market release we need repeatable checks for:

- tenant isolation
- secret / instruction non-disclosure
- protected actions (send, deploy, payment, production writes)
- draft vs executed behaviour
- hallucination resistance on website facts
- prompt-injection resistance on untrusted prospect/website text

This directory proves the **evaluation harness and safety cases** with a **deterministic** provider. It does not score live model quality by default.

## Layout

```text
evals/corpflowai/
  AUDIT.md                 # Surfaces inspected for this pilot
  README.md                # This file
  promptfooconfig.yaml     # Promptfoo config (Community CLI path)
  prompts/                 # Prompt templates
  fixtures/                # Synthetic tenants/leads/website facts only
  providers/               # Deterministic JS provider (no network)
  assertions/              # Mandatory safety asserts
  cases/cases.json         # >=20 CorpFlowAI-specific cases
  run-deterministic-eval.mjs
  run-live-eval.mjs        # Optional manual live path (disabled by default)
  .artifacts/              # Local evidence (gitignored)
```

## How to run (deterministic — default)

From the repo root:

```bash
npm run eval:ai
# same as:
npm run eval:ai:ci
```

These scripts run the **local deterministic runner**. They:

- do **not** call OpenAI, Anthropic, Google, Ollama, LiteLLM, or Groq
- do **not** need model API keys
- do **not** send email/WhatsApp/SMS or write production data
- write evidence to `evals/corpflowai/.artifacts/deterministic-eval-latest.json`

### Optional Promptfoo CLI

Upstream Promptfoo docs require Node `^20.20.0` or `>=22.22.0` for npm/npx (Node **24** recommended for CI going forward). This repo’s Agent CI still uses Node `22` and many environments are on `22.14.x`, which is **below** `22.22.0`.

Therefore:

1. Default scripts **do not** depend on installing `promptfoo`.
2. Promptfoo is **not** added as a hard CI gate in this pilot.
3. When your local/CI Node meets upstream engines, you may run:

```bash
npx promptfoo@latest eval -c evals/corpflowai/promptfooconfig.yaml
```

Follow-up decision: upgrade CI Node to **24** before making Promptfoo CLI a required check.

## Optional live-model path (manual only)

```bash
CORPFLOW_EVAL_LIVE=1 GROQ_API_KEY=... npm run eval:ai:live
```

| Rule | Detail |
|------|--------|
| Default | **Disabled** unless `CORPFLOW_EVAL_LIVE=1` |
| Cases | 3 synthetic cases only |
| Data | No real client/private data |
| CI | Must **never** run on ordinary PRs |
| Cost risk | A few Groq chat completions; operator-owned spend |
| Evidence | `evals/corpflowai/.artifacts/live-eval-*.json` |
| Secrets | Uses existing `GROQ_API_KEY` if the operator already has one; this pilot does **not** add env/secret template changes |

## How to add a regression case after an AI failure

1. Reproduce the failure with **synthetic** fixtures (never paste real client PII, credentials, or live recipient addresses).
2. Add a case to `cases/cases.json` with a new `case_id` / `scenario`.
3. If the deterministic stub should demonstrate the safe behaviour, extend `providers/deterministic-corpflow.cjs`.
4. Add deterministic asserts (`contains`, `not-contains`, javascript mandatory safety).
5. Run `npm run eval:ai` and confirm pass + artifact update.
6. In the PR/ticket, note the failure mode and the new `case_id`.

## What must never be placed in fixtures

- Real client names, phones, emails, or private notes
- Production hostnames tied to private tenant data dumps
- API keys, session secrets, tokens, Infisical paths
- Live recipient WhatsApp/SMS/email addresses
- Anything that would be unsafe to commit publicly

Use `*.example.test`, `fixture-tenant-*`, and clearly labelled synthetic copy only.

## Live-model evals vs default CI

| | Default (`eval:ai` / `eval:ai:ci`) | Live (`eval:ai:live`) |
|--|-----------------------------------|------------------------|
| Provider | Deterministic JS stub | Groq (manual) |
| Network | None | Yes |
| Cost | Free | Small, operator-owned |
| PR CI | Safe to run manually; not a required check yet | Forbidden on ordinary PRs |
| Goal | Harness + safety case proof | Spot-check a real model against the same policies |

## Community-licence exclusions (do not implement here)

If a capability appears to need a paid Promptfoo plan, **stop** and treat it as a follow-up decision. Excluded from this pilot:

- Promptfoo Cloud / hosted dashboards
- Enterprise collaboration features
- Paid red-team / commercial scanning packs that require a Promptfoo account
- Cloud `linkedTargetId` provider linking
- Any account creation, Promptfoo API keys, or paid subscriptions

## Controlling recommendation

Keep this as a **manual quality gate** until the harness is stable and does not threaten August revenue/test gates. Do **not** make Promptfoo a required GitHub check in this PR.
