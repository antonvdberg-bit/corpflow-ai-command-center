# CorpFlowAI Agent Relay — GitHub App identity v1

**Status:** Phase 1 identity is configured by Anton; [#1089](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1089) adds the one-time runner for the fixed test target. The runner must not be used before its authorized test-runtime availability is verified.
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
| `JAN_APPROVAL_BRIDGE_GITHUB_LOGIN` | legacy migration identity | Set to the same exact bot login only when enabling the Jan bridge migration. |

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
9. Use `POST /api/factory/agent-relay/identity-probe` only after explicit authorization. It requires existing factory-master authentication and is hard-bound to `antonvdberg-bit/corpflow-ai-command-center#1088`; it accepts no repository, issue, body, URL, or mutation input. It first checks for an existing probe marker and refuses to add a second comment.
10. The runner writes one harmless marker comment, reads it back, and requires the exact bot login plus `performed_via_github_app.slug` and non-empty name. Its response is sanitized to that evidence only. Any mismatch is a failed setup, not a partial success.
11. Only after the probe passes, set `JAN_APPROVAL_BRIDGE_GITHUB_LOGIN` to the same bot login and separately authorize `JAN_APPROVAL_MODE=live`. Verify a new live decision re-reads its comment and fails closed unless its App provenance and authenticated envelope both validate.

## Jan bridge migration

The Jan bridge still accepts only four decisions: `APPROVE`, `CHANGES`, `HOLD`, and `REVIEW_FURTHER`. It remains exact-repository, PR/issue, head-SHA, evidence-hash, reviewer/scope, HMAC-envelope, durable-writeback, and replay-bound.

When no dedicated App configuration exists, live bridge operations fail closed. Once configured, GitHub App installation tokens replace the previous generic-token path. Trust requires both the expected bot login and GitHub’s `performed_via_github_app` provenance; `github-actions[bot]`, `antonvdberg-bit`, another App, unsigned comments, and copied cross-repository records are rejected. Issue #35 remains independent. No decision grants merge, deploy, release, or production authority.

## Rotation, removal, and recovery

- **Rotate:** generate a replacement private key in GitHub, replace only the protected secret, run the harmless identity probe, then revoke the old GitHub key after the new probe passes.
- **Suspected compromise:** revoke the exposed GitHub App key immediately, remove the App installation if needed, and leave all relay configuration unset until recovery. The relay fails closed without valid credentials.
- **Remove / rollback:** uninstall the App from both repositories and remove the protected relay values (and `JAN_APPROVAL_BRIDGE_GITHUB_LOGIN` if it names this App). Keep `JAN_APPROVAL_MODE` synthetic/unset. This disables live writeback without granting any fallback PAT authority.

## Explicitly not authorized

This Phase 1 code does not create/install the App, change repository permissions, alter secrets or Vercel configuration, deploy, merge, change repository settings, create a queue, add a database/cache, send external communications, or allow arbitrary GitHub mutation. Identity-probe execution is itself deferred until Anton explicitly authorizes the designated test target.
