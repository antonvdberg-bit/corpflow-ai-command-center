# Evidence format (canonical v0)

**Status:** v0 stub. Owner packet: referenced from `docs/execution/WEEKEND_EXECUTION_QUEUE.md:209`. This file exists to satisfy the canonical-reference graph; the full evidence-format spec lands when that packet ships.

**Anchor sentinel:** `<!-- EVIDENCE_FORMAT_V0_STUB -->`

<!-- EVIDENCE_FORMAT_V0_STUB -->

## Why this stub

CorpFlow execution depends on durable evidence per packet (deployment IDs, commit SHAs, probe outputs, screenshots). `docs/execution/WEEKEND_EXECUTION_QUEUE.md:209` references a future canonical doc that codifies the evidence shape. Packet 6.11 added this v0 stub so cross-references resolve.

## Current evidence sources of record (until this doc lands)

- **Delivery verdict shape:** `.cursor/rules/delivery-reality.mdc` § *Delivery Reality Audit*.
- **Pre/post-deploy checks:** `.cursor/rules/predeploy-decision-checks.mdc`.
- **Packet structure:** `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`.
- **Autonomous-actions gating:** `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`.
- **Per-ticket evidence channel:** `docs/operations/DELIVERY_VERDICT_AND_ALERTS.md`.

## Scope when this packet ships

The full version will codify:

- Minimum evidence fields per packet type (docs-only, runtime, infra, security, marketing).
- Link-shape convention (SHA, deployment ID, live URL, screenshot path, audit-log entry).
- Where evidence lives (PR body, `artifacts/`, GitHub deployments, CMP ticket, `telemetry_events`).
- How `technical_lead_audits` consumes packet evidence.
- The minimum live-verification checks per surface type.

## Until this packet ships

Use the **Delivery Reality Audit** format in `.cursor/rules/delivery-reality.mdc` as the evidence shape for any closure. Do **not** invent ad-hoc evidence shapes per packet.
