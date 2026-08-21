# Temporal self-hosted POC on exec-01 — STOP (capacity not proven)

**Date:** 2026-08-21  
**Status:** accepted for this inspection packet (install remains unauthorized)  
**Source:** [#1025](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1025)

## Context

Anton asked whether CorpFlowAI can safely self-host a lean Temporal stack on `corpflow-exec-01-u69678`, then authorized a bounded POC **only after a measured live preflight**. Cursor Factory Automation woke on that issue without SSH to the box.

## Decision

1. Record `HOST_MISMATCH`. Do **not** install Temporal on exec-01 from this worker.
2. Do **not** treat 2026-05-31 RAM figures or the informal ~25 GiB observation as a live preflight.
3. Recommend a dedicated Hetzner **CX32** (4 vCPU / 8 GB / 80 GB, ~€7.50/month) as the cheapest sensible POC host while exec-01 headroom is unproven.
4. Keep Temporal Cloud as a benchmark only — too expensive and the wrong question for a 10–20 workflow synthetic proof.
5. Do **not** add a § 5.5 carve-out. Uptime Kuma remains the only authorized extra container on exec-01.

## Consequences

- Positive: no OOM risk from an unmeasured install; evidence is honest; operator has a read-only paste path.
- Negative / follow-up: Anton must either run the L3 preflight or decide whether to pay for a sibling VM. A later packet would run the POC only after that gate.

## Links

- `docs/operations/TEMPORAL_HOST_FEASIBILITY_EVIDENCE_1025.md`
- `docs/runbooks/TEMPORAL_SELF_HOSTED_POC_PREFLIGHT.md`
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 / § 7
