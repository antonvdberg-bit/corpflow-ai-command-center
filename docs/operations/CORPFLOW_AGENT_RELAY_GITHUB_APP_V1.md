# CorpFlowAI Agent Relay — GitHub App identity v1

**Status:** Phase 1 identity proof completed. Evidence: `antonvdberg-bit/corpflow-ai-command-center#1088` comment `5419623870`, authored by `corpflowai-agent-relay[bot]`, with `performed_via_github_app.slug` `corpflowai-agent-relay` and App name **CorpFlowAI Agent Relay**. The temporary #1089 runner was retired by [#1091](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1091).
**Environment:** `corpflow_test` when later enabled on the CorpFlowAI-hosted test spine. This is not client production.
**Scope:** a server-side GitHub App identity for bounded evidence reads and durable Jan-decision comments only. It is not an agent queue or orchestration engine.

## Architecture and safety boundary

`lib/server/github-app-relay.js` creates a GitHub App JWT locally from the App ID and PEM private key, exchanges it with GitHub for an installation access token, and retains that token only in server memory until close to expiry. The token is never written to a response, database, log, browser bundle, or durable artifact.

The hard repository boundary is exactly:

1. `antonvdberg-bit/corpflow-ai-command-center`
2. `antonvdberg-bit/rare-and-exclusive-collection`

The runtime configuration must name both repositories exactly. A missing, shortened, expanded, or different allowlist fails closed. The relay does not accept an arbitrary GitHub URL, repository, mutation, or comment body.

## Exact configuration names

Set protected values only in the approved server-side secret store after the operator setup below:

| Name | Type | Notes |
|---|---|---|
| `CORPFLOW_AGENT_RELAY_GITHUB_APP_ID` | identity | Numeric GitHub App ID. |
| `CORPFLOW_AGENT_RELAY_GITHUB_APP_INSTALLATION_ID` | identity | Numeric installation ID for the selected-repositories installation. |
| `CORPFLOW_AGENT_RELAY_GITHUB_APP_PRIVATE_KEY` | secret | The App PEM private key. Real newlines or literal `\n` are accepted. |
| `CORPFLOW_AGENT_RELAY_GITHUB_EXPECTED_BOT_LOGIN` | identity | Exact GitHub bot login, normally `<app-slug>[bot]`. |
| `CORPFLOW_AGENT_RELAY_GITHUB_APP_SLUG` | identity | Exact GitHub App slug used in `performed_via_github_app`. |
| `CORPFLOW_AGENT_RELAY_GITHUB_REPOSITORY_ALLOWLIST` | non-secret policy | Exactly `antonvdberg-bit/corpflow-ai-command-center,antonvdberg-bit/rare-and-exclusive-collection`. |
| `JAN_APPROVAL_BRIDGE_GITHUB_LOGIN` | legacy compatibility / defence-in-depth identity | Retained in protected configuration; current Jan trust resolution uses the proven `CORPFLOW_AGENT_RELAY_GITHUB_EXPECTED_BOT_LOGIN`. Do not remove or change it in code or Vercel without a separate protected configuration decision. |

Never use `CMP_GITHUB_TOKEN`, `GH_WORKFLOW_TOKEN`, `GITHUB_TOKEN`, or a personal access token for Agent Relay operations.

## GitHub App setup — Anton click-by-click

1. In GitHub, open **Settings → Developer settings → GitHub Apps → New GitHub App**.
2. Name it `CorpFlowAI Agent Relay` (or record the selected resulting slug exactly).
3. Set a CorpFlowAI-controlled homepage URL. Disable webhooks for Phase 1.
4. Under **Repository permissions**, grant only:
   - Metadata: **Read-only**
   - Contents: **Read-only**
   - Issues: **Read and write**
   - Pull requests: **Read and write** (only for comment/review evidence)
   - Checks: **Read-only**
   - Actions: **Read-only**
   - Commit statuses: **Read-only**
5. Do not grant Administration, Secrets, Environments, Deployments write, Contents write, Workflows write, repository settings, Members, Packages, or Pages.
6. Create the App, generate one private key, and store its PEM directly in the approved secret manager. Do not put it in chat, a ticket, a PR, a browser, local `.env` committed file, or any model prompt.
7. Choose **Install App** and install it only on **Selected repositories**: exactly the two repositories in the hard allowlist. Record the numeric installation ID.
8. Add the six `CORPFLOW_AGENT_RELAY_*` values in the protected server-side environment. Do not enable `JAN_APPROVAL_MODE=live` yet.
9. Phase 1 proof is complete: issue `#1088` comment `5419623870` proves the exact bot login, App slug, and non-empty App name through GitHub provenance. The temporary execution route is retired; no remaining route may trigger another probe.
10. Keep `JAN_APPROVAL_MODE` synthetic/disabled. A future Jan-live authorization must separately verify that a new live decision re-reads its comment and fails closed unless its App provenance and authenticated envelope both validate.

## Jan bridge migration

The Jan bridge still accepts only four decisions: `APPROVE`, `CHANGES`, `HOLD`, and `REVIEW_FURTHER`. It remains exact-repository, PR/issue, head-SHA, evidence-hash, reviewer/scope, HMAC-envelope, durable-writeback, and replay-bound.

When no dedicated App configuration exists, live bridge operations fail closed. Once configured, GitHub App installation tokens replace the previous generic-token path. Trust requires both the expected bot login and GitHub’s `performed_via_github_app` provenance; `github-actions[bot]`, `antonvdberg-bit`, another App, unsigned comments, and copied cross-repository records are rejected. Issue #35 remains independent. No decision grants merge, deploy, release, or production authority.

## Rotation, removal, and recovery

- **Rotate:** generate a replacement private key in GitHub, replace only the protected secret, run the harmless identity probe, then revoke the old GitHub key after the new probe passes.
- **Suspected compromise:** revoke the exposed GitHub App key immediately, remove the App installation if needed, and leave all relay configuration unset until recovery. The relay fails closed without valid credentials.
- **Remove / rollback:** uninstall the App from both repositories and remove the protected relay values (and `JAN_APPROVAL_BRIDGE_GITHUB_LOGIN` if it names this App). Keep `JAN_APPROVAL_MODE` synthetic/unset. This disables live writeback without granting any fallback PAT authority.

## Explicitly not authorized

This Phase 1 code does not create/install the App, change repository permissions, alter secrets or Vercel configuration, deploy, merge, change repository settings, create a queue, add a database/cache, send external communications, or allow arbitrary GitHub mutation. The temporary identity-probe execution route was removed after the one verified proof.

## Phase 2 Slice 1 — bounded work reads (#1093)

Slice 1 adds `POST /api/factory/agent-relay/work`, a server-side-only typed work
contract for evidence reads. It remains a control-plane relay, not a GitHub proxy,
queue, orchestration engine, mutation service, or browser GitHub client.

### Caller authentication

The route accepts either an existing authenticated **admin session** or the existing
trusted `CORPFLOW_CRON_SECRET` / `CRON_SECRET` Bearer for a scheduler. It intentionally
does **not** use `MASTER_ADMIN_KEY` as a Relay credential, accept a caller-provided App
identity, or add a new secret. Authentication material is never included in result
envelopes or logs.

### Exact contract and policy

The strict `corpflow.agent_relay.work.v1` envelope contains the schema, request and
replay identities, origin system/actor, repository, named operation, typed target,
expected SHA when required, empty bounded payload, issued/expiry timestamps,
correlation/work-order ID, and requested evidence. Unknown fields, versions,
operations, target shapes, payload fields, expired requests, and oversized bodies
(24 KiB) fail closed.

The runtime configuration continues to be validated against the exact two-repository
allowlist in this document. Neither the caller nor the payload can alter it.

The complete Slice 1 operation allowlist is:

1. `repository.get_metadata`
2. `issue.get_metadata`
3. `issue.list_comments`
4. `pull_request.get_metadata`
5. `pull_request.list_files`
6. `pull_request.get_diff` (expected current head SHA required)
7. `pull_request.list_reviews`
8. `pull_request.list_review_comments`
9. `pull_request.get_head` (expected current head SHA required)
10. `pull_request.list_check_runs` (expected current head SHA required)
11. `pull_request.list_workflow_runs` (expected current head SHA required)

Each operation resolves to a fixed server handler and a fixed GitHub API path. There is
no caller-selected REST URL, HTTP method, GraphQL query, endpoint, mutation body,
repository, App login/slug, or authorization header. Read results are projected and
size-bounded; result envelopes report request/correlation identity, operation,
repository, target, policy status, bounded evidence, and
`protectedActionTriggered: false`.

### Slice 2 durable idempotency recommendation

Slice 1 performs no mutation and does not claim cross-process idempotency. For the
single bounded comment write considered in Slice 2, the recommended mechanism is a
GitHub durable marker embedded in the fixed comment body, followed by a bounded
read-before-write of the exact target's comments for the replay identity. On an
ambiguous write response, read the same durable marker before any retry. This is the
first option because it is durable across serverless instances and needs no schema
change. If its GitHub search/read semantics cannot provide the required atomic
duplicate guarantee, inspect already-approved durable CorpFlowAI persistence next;
only then propose a new schema at the protected DB gate. No in-memory Set or Map is
acceptable for Slice 2.

## Phase 2 Slice 2 — one bounded durable comment write (#1093)

Slice 2 adds exactly one named mutation: `issue.add_comment`. It accepts only the
same `corpflow.agent_relay.work.v1` envelope, with target type `issue` (GitHub uses
the issue conversation endpoint for both issues and pull requests), a single
`payload.comment_body` field, and `requested_evidence: ["issue_comment"]`.

The body is plain text/Markdown only, rejects control characters and caller-supplied
Relay markers, and is limited to **8 KiB UTF-8**. The server appends the fixed,
deterministic marker:

```text
<!-- corpflow-agent-relay:issue.add_comment:v1:<sha256> -->
```

The hash binds the repository, target number, and replay identity. The caller cannot
choose the marker, GitHub endpoint, method, App identity, or final JSON mutation
body.

### Durable duplicate protection

GitHub comments alone cannot atomically serialize `read marker → write comment`;
two serverless invocations could both see no marker. Slice 2 therefore reuses the
existing approved `automation_events` persistence (no schema change) as an atomic
claim store. Its production unique constraint on `(tenant_scope, idempotency_key)`
receives a deterministic SHA-256 key bound to repository, target number, and replay
identity.

Only the invocation that successfully inserts the claim may attempt the external
GitHub write. Every later invocation reads durable GitHub state for the marker and:

- returns `replay` after finding and validating the existing comment; or
- returns `RELAY_IDEMPOTENCY_PENDING_MANUAL_RECOVERY` without writing when the
  original claim is still unresolved.

This deliberate at-most-once design is cross-process safe: a second instance cannot
become a second writer merely because the first is slow, crashed, or received an
ambiguous response. An ambiguous write response triggers a GitHub marker read; if
the comment is absent, the relay does **not** retry automatically. That trade-off can
require bounded operator recovery after a crashed pre-write claimant, but never
creates a blind duplicate mutation.

After a successful post or durable-marker recovery, the relay reads the comment,
requires the exact expected bot login and `performed_via_github_app.slug`, then
returns only comment ID/URL, bot login, App slug, provenance `PASS`, and
`idempotencyState` (`new_execution` or `replay`). Tokens, keys, headers, and comment
payloads are not returned.
