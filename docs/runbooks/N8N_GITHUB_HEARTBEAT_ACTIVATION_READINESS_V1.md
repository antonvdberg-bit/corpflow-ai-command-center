# n8n GitHub Heartbeat Checker — Stage 2 activation-readiness packet (v1)

**Status:** Docs/packet only. **No runtime, no secrets, no env change, no activation, no deploy, no DB.**
**Owner:** Anton (operator) for the credential/activation steps; Cursor for the Stage 2 PR (monitor-row doc edit) after Anton confirms readiness.
**Created:** 2026-06-30.
**Implements:** the Stage 2 gate of GitHub issue [#495](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/495) — *n8n scheduled GitHub heartbeat checker*.
**Operates under:** [#493](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/493) parallel execution board + the Operator Bridge rules.
**Anchor sentinel:** `<!-- HEARTBEAT_ACTIVATION_READINESS_V1 -->`

<!-- HEARTBEAT_ACTIVATION_READINESS_V1 -->

## 0. What this packet is (and is not)

The Stage 0/1 work for the heartbeat checker is **already merged on `main`**: the design
runbook and a secret-free, **inactive** n8n template. What is missing is the **safe, minimal
path to actually switch it on internally** — written so an operator can do it in n8n without
guessing, and so Cursor knows exactly which one-line doc edit ships in the activation PR.

This packet **only describes** that path. It activates nothing by itself. It contains **no
secret values, no tokens, no chat IDs, no env values** — only references. Reading or merging
this packet changes no system behaviour.

## 1. What exists now (confirmed on `main` @ commit of #501)

| Asset | Path | State |
|---|---|---|
| Design runbook (thresholds, alert format, dedupe, fallback) | `docs/runbooks/N8N_GITHUB_HEARTBEAT_CHECKER_V1.md` | Merged (#496). Stage 0/1. |
| Inactive, secret-free n8n template | `docs/n8n/templates/github-heartbeat-checker.template.json` | Merged (#496). `"active": false`. |
| Telegram alert path (reused, not new) | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID` | **Already in use** by monitors #1 and #4 (`TELEGRAM_ALERT_WIRING_PACKET_V1.md` §3.1). No new secret name is introduced by the heartbeat. |
| Monitor map | `docs/operations/MONITORING_ARCHITECTURE.md` §2 | Heartbeat is **not** registered yet — by design (runbook §8: the monitor row ships in the same PR that activates it). |

**Net:** every design artifact is on `main`. The only thing standing between "designed" and
"running" is the operator credential setup in n8n (§3) plus the in-n8n test (§4). No code
change and no env-var change in the repo is required to reach a first internal test run.

## 2. Pre-flight checklist (Anton confirms — none of this lives in the repo)

The checker stays template-only until **all** of these are true. These mirror runbook §7;
this packet adds the exact order and the validation that each is satisfied.

- [ ] **n8n instance reachable** by the operator (the existing internal n8n, not a new tool).
- [ ] **Read-only GitHub credential** available to n8n — a fine-grained token or GitHub App
      install with **least scope: Issues read + Pull requests read** on
      `antonvdberg-bit/corpflow-ai-command-center`. **No write scope.** Stored **in n8n's own
      credential store**, never in the repo, chat, or `.env.template`.
- [ ] **Telegram alert destination decided** — reuse the existing alert bot/chat
      (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID`) **or** a dedicated heartbeat bot.
      Anton's call. Whichever is chosen, the values live **only** in n8n's env/credential
      store. No value is ever pasted into the template, the repo, or a digest.
- [ ] **Internal-monitoring confirmation** — Anton confirms this workflow is read-only
      monitoring that notifies the operator only; it never sends customer messages.

If any box is unchecked, **stop** — the workflow stays inactive and this remains Stage 1.

## 3. Minimal n8n click-path (operator, internal only)

This is the smallest safe sequence. It keeps the workflow **inactive** through the first
manual test, then activates only after the test passes (§4).

1. **Import the template.** n8n → *Workflows* → *Import from File* → select
   `docs/n8n/templates/github-heartbeat-checker.template.json` (or paste its JSON). The
   workflow imports **inactive** (`"active": false`) — leave it inactive.
2. **Attach the read-only GitHub credential** to the three HTTP request nodes
   (`GitHub: #493 comments`, `GitHub: open PRs`, `GitHub: open Action-Plan issues`):
   open each node → *Authentication* → select the n8n GitHub credential created in §2. Do
   **not** type a token into the node body.
3. **Set the Telegram references in n8n's env/credential store** (not in the node):
   confirm `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALERT_CHAT_ID` resolve in this n8n instance
   (they already power existing alerts; the node uses `{{ $env.TELEGRAM_BOT_TOKEN }}` /
   `{{ $env.TELEGRAM_ALERT_CHAT_ID }}` references only).
4. **Manual test run while inactive** — see §4.1. Do not activate yet.
5. **Forced-alert test** — see §4.2 — to prove the Telegram path fires.
6. **Activate** only after §4.1 and §4.2 both pass: toggle the workflow **Active**. The
   schedule trigger (`Every 3 hours`) then runs it on cadence. Dedupe (runbook §5) keeps a
   tighter cadence safe.

If anything in step 4 or 5 fails, leave the workflow inactive and report the failing step in
a dispatcher digest — do not activate a checker that has not passed both tests.

## 4. Validation test (internal, two checks)

### 4.1 Silent-success test (proves it reads correctly and stays quiet when healthy)

- In n8n, with the workflow **inactive**, click **Execute Workflow** (manual run).
- **Expected:** all three GitHub nodes return `200`; the `Evaluate staleness` node produces
  `alert_count: 0` when a dispatcher digest exists on #493 within 12h and open PRs are within
  the WIP cap; the `Any error-level alert?` IF node routes to **Silent success (no alert)**;
  **no Telegram message is sent.** Silent on success is mandatory (runbook §3).
- **Pass criteria:** run completes green, `alert_count` is `0` (or matches genuine current
  staleness), and **zero** Telegram messages arrive.

### 4.2 Forced-alert test (proves the Telegram path fires when something is stale)

Pick **one** non-destructive way to force a single error-level alert, then revert:

- **Option A (no state change):** temporarily lower the digest-freshness threshold in the
  `Evaluate staleness` node from `12 * H` to e.g. `0` for one manual run, so the digest reads
  as "stale". Run once. Restore `12 * H` immediately after.
- **Option B (data-driven, also no repo change):** run at a moment when a real condition is
  legitimately tripped (e.g. open-PR count is genuinely over the WIP cap of 2).
- **Expected:** the IF node routes to **Telegram alert**; exactly **one** message arrives in
  the chosen chat, matching the runbook §4 format (`CorpFlowAI Heartbeat — error — …`,
  `Item`, `Why`, `Next`, `Anton required`).
- **Pass criteria:** exactly one alert arrives (not zero, not a flood), it is readable on a
  phone, and the dedupe gate (`kind × target × hour`) prevents repeats within the hour.
- **Revert:** restore any threshold you changed; confirm a follow-up manual run returns to
  silent success.

Record both results (pass/fail + run timestamps) in the activation PR (§5) and in the
dispatcher digest. **No screenshots that contain the token or chat id.**

## 5. What ships in the Stage 2 activation PR (Cursor, after §4 passes)

Per runbook §8, the monitor is registered **in the same PR that activates it** — not before.
That PR is **docs-only on the repo side** (the activation itself happens in n8n, operator-side):

- Add one monitor row to `docs/operations/MONITORING_ARCHITECTURE.md` §2 (next free Monitor #)
  per that doc's §9 add-a-monitor recipe: surface = n8n; schedule = every 3h; alert path =
  Telegram (error/fatal only); owner = operator; evidence = §4 test results.
- Flip the runbook §0 stage table row **Stage 2 = YES** and update the runbook §11 status
  block from "PARTIAL by design" to reflect activation + the test evidence.
- Cross-link this packet from the runbook §10.

This PR carries **no secret, no env edit, no code**. It documents an activation Anton has
already performed and validated in n8n.

## 6. Boundaries (carried from #495, #493, and the operator rules)

- Internal monitoring only — no customer/prospect/client-facing messages.
- **No env/secret/credential changes in the repo.** Token + chat id live only in n8n. No
  `.env.template` edit. No new secret name.
- No secrets, tokens, or chat IDs in this packet, the template, chat, digests, or screenshots.
- No WhatsApp/SMS runtime. No email-send runtime. No payment. No external outreach.
- No production DB writes. One app, one Postgres via `POSTGRES_URL` — unchanged.
- No second app, no second database, no new self-hosted tool (the existing internal n8n only).
- No production deploy required for Stage 2 (the activation is an n8n toggle, not a repo deploy).
- Does not reopen the parked automation-forward-secret rotation.
- Cursor does not self-merge; Anton owns the merge of the Stage 2 PR.

## 7. Fallback (works today, no n8n)

Until Stage 2 is active, the same checks run by hand in ~2 minutes (runbook §6): confirm a
dispatcher digest on #249/#493 within 12h, count open PRs (≤ 2) and find the oldest, and
confirm each open Action-Plan issue has a named owner + next action. Cursor performs this
fallback as part of every dispatcher digest, so the heartbeat staying inactive does **not**
mean blind waiting.

## 8. Status block

- **Delivery state:** Local → intended **Merged** after operator review. Docs/packet only.
- **Implementation:** none active. No runtime, no env, no secrets, no DB, no deploy, no live
  n8n workflow. Activation remains an operator action gated on §2.
- **Verdict:** PARTIAL by design — the activation path + validation test are now explicit;
  Stage 2 proceeds only after Anton completes §2 and the §4 tests pass.

## 9. Cross-references

- `docs/runbooks/N8N_GITHUB_HEARTBEAT_CHECKER_V1.md` — design runbook (thresholds, alert format, dedupe, fallback, stages).
- `docs/n8n/templates/github-heartbeat-checker.template.json` — the inactive Stage 1 template this packet activates.
- `docs/operations/TELEGRAM_ALERT_WIRING_PACKET_V1.md` — the existing Telegram alert path reused here (no new secret).
- `docs/operations/MONITORING_ARCHITECTURE.md` — where Stage 2 registers the active monitor (§2 + §9 recipe).
- `docs/operations/OPERATOR_PROGRESS_DIGEST_V1.md` — digest cadence the heartbeat watches for.
- `docs/operations/PARALLEL_EXECUTION_BOARD_V1.md` — lanes, WIP cap, digest cadence.
