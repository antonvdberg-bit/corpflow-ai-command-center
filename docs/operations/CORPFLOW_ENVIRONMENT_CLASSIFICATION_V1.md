# CorpFlowAI environment classification v1

**Status:** Canonical (v1, 2026-07-29). Authorised by GitHub issue [#679](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/679).
**Audience:** Anton, Cursor, Codex, ChatGPT/operator, heartbeat / Decision Inbox consumers.
**Anchor sentinel:** `<!-- CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1 -->`
**ADR:** `docs/decisions/20260729-corpflow-test-vs-client-production.md`

<!-- CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1 -->

## 1. Operator decision

All tenant/client surfaces currently hosted under **CorpFlowAI-controlled domains** are **test environments**.

They are used for build validation, demonstration, operator/client review, and sign-off. They are **not** the client's own live production operation.

A publicly reachable URL is **not** automatically a production environment. Classification depends on **business purpose and ownership**, not merely internet accessibility.

## 2. Environment semantics

| Business id | Meaning | Examples | Protected gate? |
|-------------|---------|----------|-----------------|
| `local` | Developer / agent workspace only | laptop, CI unit tests | No |
| `preview` | Branch Preview host (`*.vercel.app`) | PR Preview deployment | No |
| `corpflow_test` | CorpFlowAI-hosted tenant/test surface (agreed live test runtime) | `core.corpflowai.com`, `lux.corpflowai.com`, `cipc.corpflowai.com`, `cipc-desk.corpflowai.com`, Living Word / future `*.corpflowai.com` tenant hosts published for review | **No** — not `approval:production` / `client_production` |
| `client_production` | Separately governed **client-owned or client-approved** live production | Client apex (e.g. future `luxemaurice.com` cutover), any non-CorpFlowAI production target | **Yes** — explicit Anton + client production approval |

### Compatibility aliases (code / comments may still emit these)

| Alias | Treat as |
|-------|----------|
| `test` | `corpflow_test` |
| `production` (legacy classifier / WIP wording) | `client_production` for **gates and WIP**, never as a synonym for CorpFlowAI-hosted test publish |

Vercel’s technical channel name **“Production”** (the non-Preview deployment that serves custom domains) is an **infrastructure** label. When that channel serves a CorpFlowAI-hosted tenant host, the **business** environment remains `corpflow_test`.

## 3. Current CorpFlowAI-hosted test surfaces (non-exhaustive)

| Host / surface | Business environment | Notes |
|----------------|----------------------|-------|
| `core.corpflowai.com` | `corpflow_test` | Factory / operator spine on CorpFlowAI infra — not client production |
| `lux.corpflowai.com` / optional `luxe.corpflowai.com` | `corpflow_test` | Lux / Rare & Exclusive review and sign-off surface |
| `cipc.corpflowai.com` / `cipc-desk.corpflowai.com` | `corpflow_test` | CIPC Desk standing internal test tenant |
| Other `<tenant>.corpflowai.com` hosts under CorpFlowAI control | `corpflow_test` | Until an explicit client-production transition is approved |

Cross-ref: `docs/operations/TENANT_CLIENT_LOGIN.md`, `docs/decisions/20260526-plausible-internal-vs-client-facing-boundary.md`.

## 4. Delivery chain for current tenant work (`corpflow_test`)

For normal tenant UI/content/runtime work where the CorpFlowAI-hosted surface is the agreed test environment:

```text
issue → Cursor → branch → PR → CI → merge approval (where required)
  → publish to CorpFlowAI test environment (Vercel Production channel serving *.corpflowai.com)
  → live test URL / runtime validation
  → client/operator review
```

**Do not** force an artificial multi-stage chain of local → preview → test → staging for that class of work. Preview may still be used when useful; it is not a mandatory gate before publishing to `corpflow_test`.

Merge approval (human merge of the PR) is **not** the same as `client_production` approval.

## 5. What still requires Anton / protected gates

Publishing to `corpflow_test` does **not** remove:

- no secrets exposure;
- no unauthorised env changes;
- no DB/schema changes without approval;
- no live email / WhatsApp / SMS send runtime without approval;
- no payments;
- no external outreach;
- no paid tools;
- no public client launch **represented as** client production;
- no auto-merge where human merge approval remains required;
- no real client-private data in fixtures, prompts, screenshots, or issues.

### `client_production` (future)

If CorpFlowAI later manages or deploys into a client's actual production environment, that is a **separate** delivery process. Minimum definition before any such deploy:

- client-owned or approved production target;
- deployment architecture;
- production branch/release strategy;
- environment and secrets management;
- backup and rollback;
- database migration controls;
- access control and least privilege;
- monitoring and incident response;
- change window and approval authority;
- release evidence;
- post-deployment validation;
- support and maintenance ownership;
- data-protection and client-security requirements;
- **explicit Anton + client production approval**.

No current `corpflow_test` publish approval may be interpreted as approval for `client_production`.

Classifier / handoff rule: `protectedGate: production` and Anton Decision Inbox / heartbeat **production** alerts apply to **`client_production` only**, not to ordinary publish of CorpFlowAI-hosted test surfaces.

## 6. Live validation still required

Work is not complete without validating the **live test URL** (or equivalent runtime evidence) on the relevant CorpFlowAI-hosted host. See `.cursor/rules/delivery-reality.mdc` — for `corpflow_test`, “live verified” means the CorpFlowAI test surface behaves as expected; it does **not** claim client production cutover.

## 7. Heartbeat and Anton Decision Inbox

- Do **not** alert Anton merely because a change was published to a CorpFlowAI-hosted `corpflow_test` surface after approved merge + CI.
- Do alert / require Anton for genuine protected gates (`client_production`, secrets, DB/schema, payments, messaging runtime, outreach, paid tools, public launch as production, high-risk tenancy).
- Prefer `ANTON ACTION: NONE` when the only remaining step is operator/client review of a live test URL.

## 8. Explicit non-actions (this doctrine)

- No second app or second database.
- No deployment into any client-owned or actual client production environment is authorised by #679 alone.
- No env/secrets or DB/schema changes are authorised by this doctrine alone.

## 9. Related

- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3.1 (client_production vs merge-to-test)
- `docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md`
- `docs/operations/CUSTOMER_THROUGHPUT_OPERATING_MANDATE_V1.md`
- `lib/server/environment-classification.js`
- `lib/server/cursor-issue-dispatch-lifecycle.js`
- `lib/server/operator-review-handoff.js`
