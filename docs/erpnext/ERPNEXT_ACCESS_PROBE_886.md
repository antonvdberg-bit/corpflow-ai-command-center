# ERPNext application access probe — #886

**Status:** FAIL (this Cursor cloud run) · **Date:** 2026-08-11  
**Owner:** Anton (access path); Cursor (probe + evidence)  
**Issue:** [#886](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/886)  
**Related:** [#879](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/879) (programme probe; dispatch mechanics superseded by #886); controllers [#880](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/880), [#881](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/881), [#882](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/882)  
**Cursor run:** `run-cbd8248b-7465-457c-8f80-d67957036e1a`  
**Agent:** `bc-49188e9b-c820-4ba0-a68b-25d5563c20f6`  
**Environment:** ERPNext sandbox/test (`corpflow_test` / loopback sandbox — not `client_production`)  
**Anchor:** `<!-- ERPNEXT_ACCESS_PROBE_886_V1 -->`

<!-- ERPNEXT_ACCESS_PROBE_886_V1 -->

## 1. Required return block

```text
ERPNext application access: FAIL
Cursor run ID: run-cbd8248b-7465-457c-8f80-d67957036e1a
Access path: attempted Cursor cloud → SSH/tunnel → corpflow-exec-01 loopback ERPNext (127.0.0.1:8080); no authorized session material present in this run
Usable ERPNext objects: NONE verified this run (application unreachable)
Exact blocker: Cursor cloud run has no live path to loopback ERPNext sandbox (no SSH private key, no tunnel, no API session; public :8080 refused)
Next: Anton wires existing authorized SSH/tunnel/session into Cursor cloud env; then re-run #886 object probe before #880/#881
Anton required now: YES
```

## 2. Authorization recognized (not the blocker)

Anton authorized Cursor to use the full ERPNext application access already granted to its existing authorized session/integration:

- Source authorization on #879 / #886 (2026-08-11)
- Machine-readable operator gate approval on #886 (`gate: database`, `decision: approve`)

That authorization is **policy unlock**, not network/session presence. This clean re-dispatch treats the unlock as valid and still fails because the **transport/session is absent in this cloud agent**.

No credentials were requested in chat. No secrets were printed. No new credentials were created in the repo. CorpFlowAI Postgres, repository schema, and unrelated infrastructure were not touched.

## 3. Live probes executed (safe, non-secret)

| Probe | Result |
| ----- | ------ |
| `http://127.0.0.1:8080/` from Cursor cloud host | Connection refused (no local tunnel) |
| `http://127.0.0.1:8080/` with `Host: corpflowai-sandbox.localhost` | Connection refused |
| `http://127.0.0.1:8081/` (production-shell port) | Connection refused |
| Direct `http://5.78.213.185:8080/` | Connection reset (expected: sandbox is loopback-only) |
| `ssh` BatchMode to `anton@5.78.213.185` | `Permission denied (publickey)` |
| `~/.ssh` in agent | absent — **no private key** |
| Host-local `~/.erpnext-sandbox-credentials` | Not present in this cloud VM (lives on `corpflow-exec-01`) |
| Env var names matching ERPNext/SSH/Frappe/tunnel | None present |
| Cursor cloud linked environment | None (`environment: null`) |
| n8n credentials / workflows matching ERPNext | None (no `erpNext` credential type; no ERPNext workflow) |
| In-repo runtime ERPNext API client | None (docs + operator guides only) |

Canonical access model remains: sandbox UI on `corpflow-exec-01-u69678` loopback `:8080`, operator SSH tunnel per `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` §10 and `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` (L3 operator-driven).

Prior #879 probe on PR [#889](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/889) reported the same blocker; this #886 run independently reconfirms it after clean dispatcher activation.

## 4. Version / site metadata

**NOT REACHED** this run.

Last known from Phase B/C docs (historical only): ERPNext v15.109.x on site `corpflowai-sandbox.localhost`.

## 5. Objects that must be re-probed once access is live

Do not invent live read/write results. When the path is wired, inspect and report capability for:

- Company
- Customer, Contact, Address
- Lead, Opportunity
- Item, Item Group, Item Price, Price List
- Quotation, Sales Invoice
- Payment Entry / payment-evidence path
- Currency
- Print Format

Report actual role capability (including write/config if granted). Do not artificially force read-only.

## 6. Planned standard-object surface for #880 / #881 / #882 (docs-historical, not re-verified)

| Downstream issue | Standard ERPNext objects | Prior sandbox evidence (historical) |
| ---------------- | ------------------------ | ----------------------------------- |
| #880 Client Master | Customer, Contact, Address, Lead, Opportunity, Customer Group, Territory, default currency/price list | Synthetic customers `Sandbox Client A/B - USD` created in Phase C |
| #881 Product & Service Catalogue | Item, Item Group, Item Price, Price List, UOM, non-stock/service flags | Item `SBX-LR-SETUP-USD-150` existed in Phase C |
| #882 Commercial Documents & Multi-Currency | Quotation, Sales Invoice, Payment Entry, Currency Exchange, Print Format / Letter Head | USD SI + PE + FX JE proven in Phase C; Print Format / MUR sprint path still gaps |

**Rule:** #880/#881 synthetic master writes start only after a **PASS** re-probe on a run that can actually reach ERPNext.

## 7. Exact Anton action (one blocker)

Establish a **live access path** for Cursor cloud agents to the existing sandbox without putting secrets in GitHub/chat. Preferred options (pick one):

1. **Cursor Environment Secrets** — inject existing host SSH material into the cloud environment; agent opens `ssh -L 8080:127.0.0.1:8080` and uses host-local sandbox credentials already on the box (values never printed).
2. **Pre-attached tunnel / session** — attach an already-authorized tunnel/session into the agent environment so `127.0.0.1:8080` answers with the sandbox site.
3. **L1 operator session** — Anton opens the SSH tunnel on a Cursor desktop session that already has SSH keys, then re-dispatch #886 there.

Still not authorized by this probe: real payment execution, external client sends, new production credentials in repo, public ERPNext exposure, unrelated schema/env changes, client_production launch.

## 8. Non-actions honoured

- No merge, no deploy
- No env/secrets committed or printed
- No DB/schema changes in CorpFlowAI Postgres
- No ERPNext mutation attempted (unreachable)
- No client data used
- No n8n credential creation
- #880 / #881 not started (blocked on PASS)

## 9. Promptfoo / AI eval

```text
Promptfoo / AI eval evidence:
- npm run eval:ai: NOT APPLICABLE
- reason if NOT APPLICABLE: docs-only access-probe evidence for ERPNext sandbox reachability; no AI prompt/behaviour, drafting, chatbot, Lead Rescue AI, model routing, or protected-action AI logic changed
- cases affected: none
- new cases added: none
- artifact path, if generated: n/a
- live-model eval used: NO
```
