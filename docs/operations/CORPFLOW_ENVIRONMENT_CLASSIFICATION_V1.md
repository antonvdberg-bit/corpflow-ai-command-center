# CorpFlow environment classification v1

**Status:** Canonical (v1, 2026-07-29). Implements GitHub issue [#679](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/679).
**Owner:** Anton (policy); Cursor (classifier + docs); ChatGPT/operator (dispatch / heartbeat / decision-inbox consistency).
**Anchor sentinel:** `<!-- CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1 -->`

<!-- CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1 -->

## 1. Purpose

Separate **business environment meaning** from **platform hosting**.

A publicly reachable URL is **not** automatically a client production environment. Classification depends on **business purpose and ownership**, not merely internet accessibility.

## 2. Environment semantics

| Business meaning | Dispatcher enum (compat) | Meaning |
|------------------|--------------------------|---------|
| **`corpflow_test`** | `test` | CorpFlowAI-hosted tenant / factory surfaces used for build, review, demonstration, validation, and client sign-off. |
| **`preview`** | `preview` | Ephemeral Vercel Preview (`*.vercel.app`) or equivalent sandbox review — optional, not required before corpflow_test publish. |
| **`local`** | `local` | Docs-only / local-only work that does not publish to a live CorpFlowAI host. |
| **`client_production`** | `production` | A separately governed **client-owned or client-approved** production target. **Not** any current CorpFlowAI-hosted tenant surface. |

Enum values stay stable for compatibility. Comments, WORK CLASSIFICATION comments, and operator docs must prefer the **business meaning** names above.

### 2.1 CorpFlowAI-hosted surfaces = `corpflow_test`

Examples (non-exhaustive):

- `core.corpflowai.com` (factory / operator spine)
- `lux.corpflowai.com` / optional `luxe.corpflowai.com` (Lux / Rare & Exclusive working surface)
- `cipc.corpflowai.com` / `cipc-desk.corpflowai.com` (CIPC Desk standing internal test tenant)
- Living Word and other tenant/test routes hosted under CorpFlowAI infrastructure for review and sign-off
- Future tenant surfaces published under CorpFlowAI-controlled domains for testing, demonstration, validation, and client sign-off

These surfaces are:

- controlled by CorpFlowAI;
- used for testing, review, demonstration, and sign-off;
- **non-canonical** for the client's own live production operation;
- treated as **test** until a separate **client_production** transition is explicitly approved.

### 2.2 Platform “Vercel Production” ≠ `client_production`

CorpFlowAI uses **one** Vercel project spine: Git `main` → Vercel **Production** environment → custom domains (`lux.*`, `cipc.*`, `core.*`, apex, etc.).

That platform label means “the stable deployment that serves CorpFlowAI custom domains.” It does **not** mean the business environment is `client_production`. Tenant hosts on that spine remain **`corpflow_test`**.

## 3. Delivery chain for current tenant work

For CorpFlowAI-hosted tenant / test surfaces:

```text
issue → Cursor → branch → PR → CI → merge approval where required
  → publish to CorpFlowAI test environment (Vercel Production spine)
  → live test URL validation
  → client/operator review
```

Do **not** force an artificial multi-stage chain of local → preview → staging → test when the CorpFlowAI-hosted surface itself is the agreed test environment.

Preview deploys remain **optional** for internal verification. They are not a required gate before publishing to `corpflow_test`.

Work is still incomplete until the **live corpflow_test URL** is validated (Delivery Reality). Live verification is required; calling the URL “production” is not.

## 4. Protected gates vs environment

| Gate | When it applies |
|------|-----------------|
| `protectedGate: production` (business: **client_production**) | Explicit deploy into a **client-owned / client-approved production** target, or an issue that clearly activates a client-production release. |
| Merge approval (human) | Still required where policy says so — this is **not** the same as client-production approval. |
| secrets / database / messaging / payment / outreach / paid_tool | Unchanged — still apply on corpflow_test. |

Publishing a normal tenant UI/content change to a CorpFlowAI test host after approved merge + CI **must not** set `protectedGate: production` and **must not** be treated as `approval:production`.

No current test-deployment or merge approval may be interpreted as approval for future **client_production**.

## 5. Future `client_production` transition (minimum controls)

If CorpFlowAI later manages or deploys into a client's actual production environment, that process must define at least:

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
- explicit Anton/client production approval.

## 6. Controls that still apply on `corpflow_test`

Direct publish to CorpFlowAI test does **not** remove:

- no secrets exposure;
- no unauthorised env changes;
- no DB/schema changes without approval;
- no live email/WhatsApp/SMS send runtime without approval;
- no payments;
- no external outreach;
- no paid tools;
- no public client launch represented as production;
- no auto-merge where human merge approval remains required;
- no real client-private data in fixtures, prompts, screenshots, or issues.

## 7. Heartbeat and Decision Inbox

- Heartbeat / Telegram remain **exception-only** (see `lib/server/ops-notification-policy.js` and GitHub heartbeat runbooks).
- Publishing or validating a change on a **corpflow_test** URL is **not** by itself an Anton Decision Inbox / heartbeat exception.
- `production_approval_needed` checkpoint kind (enum compat) means **operator merge / promote onto the CorpFlowAI test spine** after client preview approve — **not** client_production authorization. Wording in alerts and docs must say so.
- True **client_production** remains blocked behind explicit separate approval.

## 8. Related

- Dispatcher classifier: `lib/server/cursor-issue-dispatch-lifecycle.js`
- Lifecycle doc: `docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md`
- Autonomous actions: `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
- Autodeploy / domains: `docs/operations/PRODUCTION_AUTODEPLOY_AND_DOMAINS.md`
- Vercel loop: `docs/VERCEL_DEPLOYMENT.md`
- Delivery reality: `.cursor/rules/delivery-reality.mdc`
- Decision: `JE-2026-07-29-1`
