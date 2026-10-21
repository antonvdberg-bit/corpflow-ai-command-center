# Quiet-window and estate closeout — #1423

Prepared 8 October 2026. Owner: controller; repeated checks: Forge/deterministic collector; consequential acceptance: Anton. No blanket update or reboot authorization is inferred from a recurring workload.

Verified current APT state: periodic list refresh and unattended upgrades enabled daily; allowed origins Ubuntu release/security and configured Ubuntu ESM security. No apt job active during inspection. Package refresh timer 06:00/18:00 UTC + up to 12h jitter, upgrade timer 06:00 UTC + up to 1h jitter; Persistent=yes. Both services have unlimited startup timeout. No configured Automatic-Reboot value was found in apt-config output; that absence is not a verified effective policy.

Quiet-hour retiming is prepared, not applied. Proposed metadata slot 22:15 Mauritius (18:15 UTC) with no jitter/catch-up. Before retiming upgrades to 23:00 Mauritius, verify effective unattended-upgrades/needrestart policies, affected-service recovery, live activity and maximum operation duration. Sunday 23:00–23:45 is the reserved weekly window: APT and manual disruptive maintenance must share an explicit exclusion/preflight rule. Never kill dpkg at a timer cutoff or silently disable security coverage. Keep installed timer drop-ins and prior effective state for rollback. Inspect next scheduled activation after daemon-reload; don't start an upgrade as a side effect of timer changes.

First weekly preflight due Sunday 11 October 23:00 Mauritius. It must either record a bounded accepted action and independent recovery access, or explicit DEFERRED with reason. No dynamic model-generated commands. Monthly first-Sunday DR replaces that window, first 1 November. First unattended daily collector due today at 22:00 Mauritius; hosted oversight remains separate. Verify both receipts after execution.

Remaining gates:

| Work | Concrete acceptance | Owner / blocker |
|---|---|---|
| Forge model review | Deterministically verified model response under existing cage and ≥2 GiB production reserve | Controller: current 6 GiB guard defers; do not force inference or buy hardware |
| Collector completeness | Remaining acceptance fixtures, bounded history/global collection deadline and full catalogue mappings | Controller/code review; limited six-check receipt is not entire catalogue PASS |
| Ops recovery | Exact protected artifacts remotely verified and isolated DB/config readback; replacement-host recreation later | Controller; laptop copies remain ERP-only |
| Boot readiness | Ollama current restart=no, VPN/private fallback and whole-estate startup ordering reconciled | Named policy change and console proof; no blind reboot |
| OS health | Diagnose cloud-init-hotplugd detect_hotplugged_device RuntimeError; retain current failure evidence | No reset-failed/disable as cosmetic closure |
| OS security/time | Effective restart policy, exact candidate batch, no daytime jitter/catch-up and collision-safe quiet-hour execution | Prepared metadata; no upgrade performed |
| Core/Neon/n8n | Exact current management access, backup scope/keys/retention and an actual isolated restore receipt | Current coverage unverified; no external system assumed protected |
| Monthly ERP DR | Parameterized unique isolated verifier, egress/worker/port isolation, failure cleanup and actual due receipt | October manual restore proves that package only |
| Cold DR keys | Independent offline key access tested while laptop/server/Infisical are unavailable | Operator-held escrow is not currently proven |
| ERP operational cutover | Authenticated consumer/integration target inventory, workers/egress decision, cloud delta reconciliation and explicit retire/cancel decision | Recovered scheduler remains disabled/workers absent; hosted and original server retained |
| Documentation integration | Review and merge PRs #1420/#1424 after exact conflict/test reconciliation | Draft/unmerged; main not assumed updated |

This package creates no new paid service. Preserve the independent failure notifier, current backups, client delivery and resource cage. Standing issue stays open while these gates remain unresolved.
