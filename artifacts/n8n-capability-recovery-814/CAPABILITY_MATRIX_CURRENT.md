# #814 — current n8n MCP capability matrix

**As of:** 2026-08-10 (UTC)  
**Canonical PR evidence surface:** [#823](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/823)  
**Also:** [#824](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/824) (`cursor/n8n-mcp-capability-probe-a01c`)

## Final verdict

**FULL CLOUD N8N DEVELOPMENT CONTROL PROVEN**

Independent corroborating cloud runs:

| Run | Synthetic workflow id | Artifact |
|-----|----------------------|----------|
| `bc-a21411bc-b621-42ba-ae1e-3d27c0239287` | `KQO0LsXz4aKr6t9y` (archived) | `CLOUD_N8N_MCP_CAPABILITY_PROOF_2026-08-10.md` |
| `bc-4c4fb252-2ea9-41d4-b053-38525e35ae53` | `6465onwhjqdrGILO` (archived by that run) | `CLOUD_N8N_MACHINE_ACCESS_PROOF_2026-08-10.md` |

## Matrix

| Capability | Result |
|------------|--------|
| Cursor Cloud independent of laptop | **PASS** |
| native MCP connected (`n8n-mcp`) | **PASS** |
| LIST | **PASS** |
| READ | **PASS** |
| CREATE | **PASS** |
| UPDATE | **PASS** |
| VALIDATE | **PASS** |
| TEST / EXECUTE | **PASS** |
| EXECUTION DEBUG | **PASS** |
| CORRECT + RERUN | **PASS** |
| ACTIVATE (`publish_workflow`) | **PASS** |
| DEACTIVATE (`unpublish_workflow`) | **PASS** |
| ARCHIVE (`archive_workflow`) | **PASS** |
| Hard DELETE via MCP | **GAP (non-blocking)** — archive used; no new credential requested |
| Public API key required for proven path | **NO** |
| Business workflows modified | **NO** |

## Operator note

PR description text may still show the older blocked-auth body if GitHub PR-body edit is write-blocked for the automation token. **Trust the artifact files and this matrix** over a stale PR description.

No merge/deploy/env/secret/DB/send/payment/business-workflow changes were performed by these proofs.
