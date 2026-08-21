# Slack retirement — Anton action packets (issue #658)

**Status:** Historical Anton-only live-cutover packets. Repo/runtime reintroduction is now CI-guarded.  
**Issue:** [#658](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/658)  
**Companion audit:** `docs/operations/SLACK_TELEGRAM_DEPENDENCY_AUDIT_658.md`  
**Approved exception route after Slack:** Telegram (exception-only) + GitHub as durable source of truth.  
**Anchor:** `<!-- SLACK_RETIREMENT_ANTON_PACKETS_658 -->`

<!-- SLACK_RETIREMENT_ANTON_PACKETS_658 -->

## 2026-08-20 restart — what remains for Anton

The 2026-08-20 implementation PR removes remaining **repo** Slack reintroduction paths and adds `npm run check:slack-retirement`. That work does **not** mutate live env/secrets, n8n, or the Slack workspace.

Prior operator close-out (2026-08-17) already recorded: n8n Slack workflow archived/retired, Slack credential removed, no active n8n Slack nodes, no server Slack process.

**Anton action for the implementation PR: MERGE only.**

Optional later desk work (protected; not required to merge):

- unused vault/Vercel Slack-named env revocation if any still exist (Packet D);
- Slack workspace archive/delete (Packet E).

Do not treat those optional desk steps as a factory execution blocker.

## When to run

Run **Packet A → B → C → D** in order. Run **Packet E** only after 48h with no Slack ops traffic and exception Telegram still working. **Do not delete the Slack workspace** until Packet E verification passes.

**Do not paste tokens, webhook URLs, or secret values into GitHub issues, PRs, or chat.**

---

## Packet A — Stop n8n → Slack posting

**Goal:** `#corpflow-dispatch` and `#corpflow-alerts` stop receiving GitHub/n8n operational traffic.

1. Open the CorpFlow n8n instance (the hosted automation host you already use for CorpFlow forwards).
2. Go to **Workflows**.
3. In the search box, type `slack` (case-insensitive). Also search `corpflow-dispatch`, `corpflow-alerts`, and `GitHub`.
4. For **each** workflow that posts to Slack (or has a Slack node / Incoming Webhook URL aimed at Slack):
   1. Open the workflow.
   2. Toggle **Active** → **Inactive** (top-right).
   3. Record the workflow **name** and that it is now Inactive (private notes only).
5. If a workflow mixes Slack with a required Telegram/email branch:
   1. Prefer deactivating the whole workflow only if Slack is the sole side-effect.
   2. Otherwise: open each Slack node → **Disable node** (or delete the Slack branch) → keep Telegram/email branch → **Save** → leave Active only if Telegram/email is still required.
6. **Verify (15 min):**
   - Trigger a known GitHub event that previously mirrored to `#corpflow-dispatch` (e.g. open a draft PR on a throwaway branch, or wait for the next scheduled mirror).
   - Confirm **no new message** in `#corpflow-dispatch` / `#corpflow-alerts`.
7. **Done when:** No new Slack ops messages for one full scheduled cycle of each former Slack workflow.

**Rollback:** Re-activate the same workflow(s) in n8n (Active = on). Do not recreate credentials until Packet B is also rolled back.

---

## Packet B — Remove Slack credentials from n8n

**Goal:** n8n can no longer authenticate to Slack even if a workflow is re-enabled by mistake.

1. In n8n, go to **Credentials** (left nav / settings, depending on n8n version).
2. Filter or search for `Slack`, `Incoming Webhook`, or names you used for `#corpflow-*`.
3. For each Slack-related credential:
   1. Open it.
   2. Note the **display name** only (not the secret).
   3. **Delete** the credential (or rotate then delete if your n8n version requires unlink first).
4. Re-open any workflow that previously used that credential and confirm nodes show **missing credential** (expected).
5. **Verify:** Attempting to activate a Slack-posting workflow fails credential resolution or posts nothing.

**Rollback:** Re-create the Slack credential from Slack app admin (Packet C/D) and re-attach — only if retirement is aborted.

---

## Packet C — Disable GitHub → Slack app / subscriptions

**Goal:** GitHub activity stops mirroring into Slack independently of n8n.

### C1 — Slack GitHub app (if installed in the workspace)

1. Open Slack → workspace menu → **Tools & settings** → **Manage apps** (or `https://<workspace>.slack.com/apps/manage`).
2. Find **GitHub** (or “GitHub for Slack”).
3. Open the app → **Configuration** / channel subscriptions.
4. Unsubscribe **every** channel that receives CorpFlow repo events (especially `#corpflow-dispatch`).
5. Prefer **Remove app** / **Disable** for the CorpFlow workspace after unsubscribing (keeps workspace intact).

### C2 — GitHub repo webhooks aimed at Slack (if any)

1. Open `https://github.com/antonvdberg-bit/corpflow-ai-command-center/settings/hooks` (admin required).
2. Inspect each webhook **Payload URL** host (do not paste full URLs into issues).
3. If the host is Slack (`hooks.slack.com` or similar): **Edit** → uncheck **Active**, or **Delete**.
4. Leave non-Slack webhooks untouched.

### C3 — Verify

- Push a no-op commit or use GitHub’s webhook **Recent Deliveries** (for repo hooks) / watch Slack channels for 15 minutes.
- **Done when:** No GitHub→Slack traffic for CorpFlow channels.

**Rollback:** Re-enable the GitHub Slack app subscriptions / re-activate the webhook.

---

## Packet D — Revoke Slack tokens + stop Slack email noise

### D1 — Revoke Slack app tokens / Incoming Webhooks

1. Slack → **Manage apps** → open the CorpFlow Slack app(s) used for bots/webhooks.
2. **OAuth & Permissions** / **Incoming Webhooks**:
   - Revoke bot tokens / remove webhook URLs for `#corpflow-dispatch` and `#corpflow-alerts`.
3. If tokens were also stored in Infisical / Vercel / GitHub Secrets under names like `SLACK_*`:
   - Remove or blank those entries in the secrets manager UI (presence-only; never paste values into GitHub).
   - Repo `.env.template` already marks `SLACK_BOT_TOKEN` / `SLACK_TEAM_ID` as **RETIRED** — do not re-introduce them for ops.

### D2 — Stop Slack-generated email notifications (operator inbox noise)

1. Open Slack (desktop or web) signed in as the mailbox that receives Slack emails.
2. Click your profile → **Preferences** → **Notifications**.
3. Set **Notify me about** to avoid email for channels you no longer need (or mute `#corpflow-dispatch` / `#corpflow-alerts`).
4. Under **When I’m not active…** / email notification options: disable email for desktop/mobile misses if that is how noise arrives.
5. Channel-level: open `#corpflow-dispatch` → channel menu → **Mute channel** (and same for `#corpflow-alerts`).
6. **Verify (24h):** No new Slack-originated operational emails for those channels.

**Rollback:** Re-create webhooks/tokens only if aborting retirement; unmute channels / restore notification prefs.

---

## Packet E — Workspace archive / delete (LAST; after verification)

**Do not run until Packets A–D are verified.**

1. Confirm for **≥ 48 hours**:
   - No Slack messages in `#corpflow-dispatch` / `#corpflow-alerts` from GitHub or n8n.
   - Exception Telegram still delivers for at least one controlled failure path (recommended: `factory-control-loop` `workflow_dispatch` failure test, or a known checkpoint forward — see audit §6 tests).
   - GitHub issues/PRs remain the durable audit trail.
2. Slack workspace admin → **Settings & administration** → **Workspace settings**.
3. Prefer **archive / freeze** if available; use **Delete workspace** only when you are certain no other CorpFlow dependency remains.
4. Record date + operator initials in a private ops note (not in public issue text with secrets).

**Rollback after delete:** Not practical — rebuild workspace + apps. Prefer archive until confidence is high.

---

## Exception-route validation (after Packet A)

| Check | How | Expected |
|-------|-----|----------|
| CI failure Telegram | Factory control loop fails with Telegram secrets present | One Telegram alert; no Slack |
| Checkpoint / ops_alert | Existing n8n Telegram branch for `corpflow.ops_alert.v1` | One page on new blocker; silent on unchanged |
| Routine PR noise | Open PR with no WIP-cap breach / no digest stale | No Telegram; no Slack |
| GitHub SoT | Issue/PR comments | Unchanged |

Canonical policy: `lib/server/ops-notification-policy.js` + `docs/operations/SLACK_TELEGRAM_DEPENDENCY_AUDIT_658.md`.

---

## Rollback summary (repo vs live)

| Layer | Rollback |
|-------|----------|
| Repo (this PR / #659) | `git revert` the merge commit(s) on `main` |
| Live n8n Slack | Packet A/B rollback — re-activate workflows + re-attach credentials |
| GitHub→Slack | Packet C rollback — re-enable app/webhooks |
| Tokens / email prefs | Packet D rollback |
| Workspace delete | Avoid until necessary; archive first |
