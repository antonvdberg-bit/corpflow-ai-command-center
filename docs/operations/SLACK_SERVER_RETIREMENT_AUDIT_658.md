# Slack server/runtime retirement audit — issue #658

**Status:** `SERVER SLACK CLEANUP NOT COMPLETE` — L3 box inventory still required.  
**Issue:** [#658](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/658)  
**Run:** Cursor Cloud `bc-065bcd2a-3c95-4a1e-b5be-687234317320` (2026-08-16)  
**Anchor:** `<!-- SLACK_SERVER_RETIREMENT_AUDIT_658 -->`

<!-- SLACK_SERVER_RETIREMENT_AUDIT_658 -->

This file is the durable copy of the server/runtime evidence packet posted to #658. It does **not** authorize merge, deploy, secret changes, L3 execution, or workspace deletion.

---

## SERVER SLACK RETIREMENT AUDIT — #658

### Status

**NOT COMPLETE** for the CorpFlowAI L3 box (`corpflow-exec-01-u69678`).

This Cursor session ran on hostname **`cursor`** (Cursor Cloud agent VM). Canonical execution boundary (`docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`) forbids agent-driven SSH/command execution on L3. No `~/.ssh` keys were present. Inventory below is therefore:

- **live** for this Cursor Cloud VM (not production);
- **live** for n8n via native `n8n-mcp` (Elestio host `automation-u69678`, L2);
- **repo-side** for Command Center runtime paths;
- **not live** for `corpflow-exec-01-u69678`.

`HOST_MISMATCH` applies to any byte change or live process inventory on L3.

### Server/environment inspected

| Surface | Identity | Inspected? |
|---------|----------|------------|
| Cursor Cloud agent VM | hostname `cursor`, user `ubuntu`, Ubuntu 24.04 | YES (live) |
| n8n (L2) | native `n8n-mcp`; 9 accessible workflows | YES (live, read-only) |
| Repo runtime | `lib/`, `api/`, `.github/workflows/`, `scripts/`, `package.json` | YES |
| GitHub repo webhooks | `gh api …/hooks` | NO — `403 Resource not accessible by integration` |
| `corpflow-exec-01-u69678` (L3) | Hetzner/Elestio box | **NO — HOST_MISMATCH** |
| Vercel Production env var store | operator admin | **NO** (would be protected; key names in `.env.template` only) |

Environment classification of this run: `n/a` (docs/evidence). CorpFlowAI-hosted tenant/factory hosts remain `corpflow_test`.

### Slack component inventory

Format: component | location | state before | dependency | classification | action | state after

#### Processes

| component | location | state before | dependency | classification | action | state after |
|-----------|----------|--------------|------------|----------------|--------|-------------|
| Slack product process | `cursor` VM `ps aux` | none (grep also matched the inventory command text; false positive) | none | FALSE POSITIVE / UNRELATED | none | none running |

#### systemd services/timers

| component | location | state before | dependency | classification | action | state after |
|-----------|----------|--------------|------------|----------------|--------|-------------|
| `*slack*` unit files / timers | `cursor` VM | none | none | ALREADY RETIRED / absent | none | none |

#### cron/scheduled jobs

| component | location | state before | dependency | classification | action | state after |
|-----------|----------|--------------|------------|----------------|--------|-------------|
| user crontab Slack lines | `cursor` VM | none | none | ALREADY RETIRED / absent | none | none |
| `/etc/cron*` Slack lines | `cursor` VM | none | none | ALREADY RETIRED / absent | none | none |

#### containers

| component | location | state before | dependency | classification | action | state after |
|-----------|----------|--------------|------------|----------------|--------|-------------|
| Docker Slack containers | `cursor` VM | Docker not available / no Slack containers | none | FALSE POSITIVE / UNRELATED | none | none |

#### OS/npm/MCP packages

| component | location | state before | dependency | classification | action | state after |
|-----------|----------|--------------|------------|----------------|--------|-------------|
| `dpkg` Slack packages | `cursor` VM | none | none | ALREADY RETIRED / absent | none | none |
| global npm Slack packages | `cursor` VM | none | none | ALREADY RETIRED / absent | none | none |
| Slack CLI (`slack` / `slack-cli`) | `cursor` VM PATH | not installed | none | ALREADY RETIRED / absent | none | none |
| pip Slack packages | `cursor` VM | none | none | ALREADY RETIRED / absent | none | none |
| files named `*slack*` under `/home` `/opt` `/usr/local` `/etc` | `cursor` VM | none | none | ALREADY RETIRED / absent | none | none |
| Go/MCP SDK paths containing `mcp` | `/home/ubuntu/go/pkg/mod` | present | Go toolchain / MCP protocol, not Slack | FALSE POSITIVE / UNRELATED | none | retained |

#### config/runtime references

| component | location | state before | dependency | classification | action | state after |
|-----------|----------|--------------|------------|----------------|--------|-------------|
| Slack MCP catalog entry (`enabled: false`) | `mcp_servers.json` server name `slack` | retired placeholder | none at runtime | ALREADY RETIRED | none (kept for template compatibility) | unchanged |
| `SLACK_BOT_TOKEN` / `SLACK_TEAM_ID` | `.env.template` | retired placeholders; comment says do not set | none in `lib/` / `api/` | ALREADY RETIRED | none (do not delete keys without env-admin approval) | unchanged |
| comment only | `lib/server/ops-notification-policy.js` | documents Slack retired | Telegram/GitHub policy only | FALSE POSITIVE / UNRELATED | none | retained |
| n8n Slack workflow `6RkDerWf2Xj5EfCY` | n8n | archived (MCP: “archived and cannot be accessed”) | none | ALREADY RETIRED | none | archived |
| n8n Slack credential (`slackOAuth2Api` / name `Slack account`) | n8n credentials | not present in `list_credentials` (7 credentials; none Slack-typed) | none | ALREADY RETIRED | none | absent |
| GitHub→Slack mirror | Slack / GitHub app | operator reported disabled 2026-08-16; channel check showed no post-2026-08-14 mirror traffic | duplicate of GitHub | ALREADY RETIRED | none in this run | operator-reported cutover |
| env keys named `*SLACK*` | `cursor` VM `env` (names only) | none | none | ALREADY RETIRED / absent | none | none |

### Components removed

**None.** No Slack-specific OS package, CLI, cron, systemd unit, container, or process existed on the inspected Cursor Cloud VM. Doctrine forbids this agent from removing anything on `corpflow-exec-01-u69678`. n8n Slack workflow/credential were already archived/deleted before this run.

### Components retained and why

- **Telegram n8n nodes** on Production Pulse, GitHub Heartbeat Checker, automation-forward v2, and (disabled) Business Ops Dispatcher Telegram node — approved exception-only route; not Slack.
- **GitHub comment node** on Business Ops Dispatcher — durable source of truth; not Slack.
- **Gmail password-reset workflow** — client login recovery; not Slack.
- **Retired Slack MCP/`SLACK_*` placeholders** in repo templates — documentation of retirement; not a live sender. Removing them is optional docs cleanup, not a server remnant, and was left untouched to avoid scope expansion.

### Production dependencies found: NO

On inspected surfaces (repo runtime senders, n8n accessible workflows/credentials, this VM). **Unknown** on `corpflow-exec-01-u69678` until operator inventory.

### Client/revenue/tenant dependency found: NO

On inspected surfaces. **Unknown** on L3 until operator inventory.

### Protected actions still required: YES

#### PROTECTED ACTION REQUIRED — L3 live inventory (read-only)

- **Exact component:** `corpflow-exec-01-u69678` Slack process/package/cron/systemd/container/config remnants.
- **Exact proposed action:** Anton SSHs from his own terminal and pastes the read-only inventory block in § Operator L3 inventory paste (below). Return stdout (no env values) as a comment on #658.
- **Why necessary:** this Cursor run cannot execute on L3 (`HOST_MISMATCH`; no SSH keys; L3 is operator-driven).
- **Expected effect:** prove whether any Slack-specific remnant exists on the box.
- **Production risk:** none if commands stay read-only as written.
- **Rollback:** n/a (read-only).

Do **not** run `apt remove`, `systemctl stop/restart`, Docker restarts, env edits, or firewall changes unless a later #658 comment explicitly approves a named remnant.

#### PROTECTED ACTION REQUIRED — Vercel/GitHub secret store (optional confirmation)

- **Exact component:** Vercel Production / GitHub Actions secret names `SLACK_*` if any still exist.
- **Exact proposed action:** Anton opens Vercel Project → Settings → Environment Variables and GitHub repo secrets; report **names only**.
- **Why necessary:** this run must not inspect or delete production env/secrets.
- **Expected effect:** confirm retired placeholders are unset in live stores.
- **Production risk:** viewing names only is low; deleting env vars is a separate approval.
- **Rollback:** n/a for name-only inspection.

#### PROTECTED ACTION REQUIRED — GitHub webhook list (admin)

- **Exact component:** repository/organization webhooks.
- **Exact proposed action:** Anton (or an integration with `admin:repo_hook`) lists hooks and confirms none target Slack.
- **Why necessary:** current GitHub integration returned `403` on webhook list (same gap as 2026-08-14).
- **Expected effect:** close the remaining GitHub-side unknown.
- **Production risk:** read-only list is low.
- **Rollback:** n/a.

### Rollback

No server component was removed in this run. n8n Slack workflow rollback (if ever needed) remains: restore archived workflow `6RkDerWf2Xj5EfCY` and re-create Slack credential — **not recommended**; GitHub remains source of truth.

### Verification evidence

- Hostname `cursor` ≠ `corpflow-exec-01-u69678`.
- `n8n-mcp` `search_workflows` query `slack` / `Slack`: **0** accessible workflows.
- `get_workflow_details` `6RkDerWf2Xj5EfCY`: **archived, cannot be accessed**.
- `list_credentials`: 7 rows (`httpHeaderAuth` ×3, `telegramApi`, `httpBearerAuth`, `githubApi`, `gmailOAuth2`); **zero** `slackApi` / `slackOAuth2Api`.
- Accessible active workflows use **Telegram** and/or **GitHub** and/or **Gmail**, not Slack.
- Repo: no Slack matches in `api/`, `.github/workflows/`, `scripts/`, `package.json`; `lib/` match is retirement comment only.
- No synthetic Slack/Telegram/email test send was performed.

### Anton needed: YES

Paste the L3 inventory on `corpflow-exec-01-u69678` and return the output to #658. Optional: confirm Vercel/GitHub `SLACK_*` names absent; confirm GitHub webhooks are non-Slack.

---

## Operator L3 inventory paste (read-only)

Run on `corpflow-exec-01-u69678` after `hostname` shows that host. Do not print `.env` contents or secret values.

```bash
printf 'HOST=%s USER=%s UTC=%s\n' "$(hostname)" "$(whoami)" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"

printf '\n== processes ==\n'
ps aux | grep -i '[s]lack' || true

printf '\n== systemd services ==\n'
systemctl list-unit-files --type=service 2>/dev/null | grep -i slack || true

printf '\n== systemd timers ==\n'
systemctl list-timers --all 2>/dev/null | grep -i slack || true

printf '\n== docker ==\n'
docker ps -a --format '{{.Names}}\t{{.Image}}\t{{.Status}}' 2>/dev/null | grep -i slack || true

printf '\n== OS packages ==\n'
dpkg -l 2>/dev/null | grep -i slack || true

printf '\n== global npm ==\n'
npm -g ls --depth=0 2>/dev/null | grep -i slack || true

printf '\n== user cron ==\n'
crontab -l 2>/dev/null | grep -i slack || true

printf '\n== /etc/cron ==\n'
grep -RIin slack /etc/cron* /etc/crontab 2>/dev/null || true

printf '\n== slack binaries ==\n'
command -v slack; command -v slack-cli; true

printf '\n== env KEY NAMES only ==\n'
env | awk -F= 'BEGIN{IGNORECASE=1} $1 ~ /slack/ {print $1}'

printf '\n== slack-named files (paths only) ==\n'
find /home /opt /usr/local /etc -iname '*slack*' 2>/dev/null | head -80
```

If that output is empty of Slack product remnants, a follow-up run may close #658 server cleanup with:

`SERVER SLACK CLEANUP COMPLETE — NO ACTIVE SERVER DEPENDENCY FOUND`

Until then:

`SERVER SLACK CLEANUP NOT COMPLETE — HOST_MISMATCH: live inventory of corpflow-exec-01-u69678 not executed`

NO IMPLEMENTATION AUTHORIZED beyond this evidence capture.
