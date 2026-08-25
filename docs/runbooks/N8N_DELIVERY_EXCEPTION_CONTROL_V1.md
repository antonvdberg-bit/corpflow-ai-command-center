# n8n delivery exception control v1

**Status:** PARTIAL — independent controller-failure notification is live; delivery-state
watchdog implementation is blocked pending a safe read-only GitHub event/query path.

## Live workflows

| Workflow | ID | Role |
|---|---|---|
| `CorpFlowAI GitHub Heartbeat Checker v1` | `94gs6QOVed6dWdPZ` | Existing exception-only controller |
| `CorpFlowAI Delivery Controller Error Handler` | `mf3JnbekFXbZf1aW` | Independent Error Trigger handler for failures in the controller |

The controller routes production execution failures to the independent handler. The handler
reuses the existing authorised Telegram credential and sends a compact P0 exception. It contains
an intentional manual-only smoke trigger; it is not a second scheduled notifier.

## Verified evidence

- Baseline controller execution `7214` completed with `alert_count: 0`; a routine queue/open-PR
  observation did not send Telegram.
- Manual harmless delivery smoke `7215` completed successfully and the Telegram node returned
  `ok: true`.
- The active controller retains failed-execution data and execution progress for diagnosis.

## Required control contract

When the GitHub read model supplies durable lifecycle evidence, the controller must evaluate and
deduplicate these fingerprints:

1. ready-to-Cursor pickup: warning at 15 minutes and P0/P1 exception at 30 minutes;
2. claimed work without meaningful evidence: warning at 30 minutes and exception at 60 minutes;
3. failed dispatch/absent Cursor receipt after one safe retry;
4. new CI failure keyed by issue/PR, head SHA, and failure fingerprint;
5. genuine protected-decision packets.

`meaningful evidence` is a Cursor run, branch, commit, PR, new head SHA, CI activity, or a
durable `BLOCKED` result with one real blocker. Routine open PRs, running CI, labels, comments,
and unchanged prior CI are silent.

Messages use:

```text
CORPFLOWAI DELIVERY EXCEPTION
Severity: P0 / P1 / WARNING
Work: #<issue> — <short title>
Problem: <plain-English exception>
Waiting: <duration>
Cursor capacity: <used>/<available>
Recovery attempted: YES/NO — <result>
Next: <what should happen>
Anton action: NONE | <one exact action>
```

No secret, token, chat identifier, stack trace, or raw log belongs in the message.

## Exact blocker

The active n8n GitHub node exposes repository issue and pull-request listing only. It cannot
read issue timeline/comments, workflow-run/check data, or dispatch receipts; those are the
durable sources for the required timestamps, meaningful-movement test, CI fingerprint, and
safe single recovery decision. A public unauthenticated GitHub API poll is not a reliable
substitute because its rate limit would make the watchdog itself silently fail.

Before activating the delivery-state watchdog, provide **one existing encrypted n8n credential
or read-only internal endpoint** that can retrieve GitHub issue comments/timeline and Actions
workflow/check data. This is a credential/access integration change, so it is protected: do not
create, rotate, expose, or place its secret in this repository. Once that read path exists, the
controller can be extended in place; no additional scheduled Telegram notifier is needed.

## Rollback

Restore the prior active version of `CorpFlowAI GitHub Heartbeat Checker v1` from n8n version
history (`06f1011a-8662-4fa8-acfa-cb4cf22b0592`) and clear its configured error workflow. Archive
`mf3JnbekFXbZf1aW` only after that setting is cleared.
