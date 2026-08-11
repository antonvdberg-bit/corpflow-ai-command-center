# ERPNext access probe — #879

**Status:** FAIL (this Cursor cloud run) · **Date:** 2026-08-11  
**Owner:** Anton (access path); Cursor (probe + evidence)  
**Issue:** [#879](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/879)  
**Cursor run:** `run-3e048c79-4b3c-46ca-a2f0-97695fa1f57e`  
**Agent:** `bc-7a6f3600-f920-475d-9379-5b4a6c6ca94f`  
**Environment:** ERPNext sandbox/test (`corpflow_test` / loopback sandbox — not `client_production`)  
**Anchor:** `<!-- ERPNEXT_ACCESS_PROBE_879_V1 -->`

<!-- ERPNEXT_ACCESS_PROBE_879_V1 -->

## 1. Required return block

```text
ERPNext access: FAIL
Cursor run ID: run-3e048c79-4b3c-46ca-a2f0-97695fa1f57e
Access path: attempted Cursor cloud → SSH/tunnel → corpflow-exec-01 loopback ERPNext (127.0.0.1:8080); no authorized session material present in this run
Version/site: NOT REACHED this run (last known from Phase B/C docs: ERPNext v15.109.x on site corpflowai-sandbox.localhost)
Readable/writable standard objects: NONE verified this run (live list unreachable)
Configuration capability: NONE verified this run
Exact blocker: Cursor cloud run has no live path to loopback ERPNext sandbox (no SSH private key, no tunnel, no API session; public :8080 refused)
Next execution: Anton wires existing authorized SSH/tunnel/session into Cursor cloud env; then re-run #879 object probe before #880/#881 writes
Anton required now: YES
```

## 2. Authorization recognized (not the blocker)

Anton posted explicit ERPNext access unlock on #879 (comment authorizing full use of already-granted ERPNext access for #879–#882, and lifting the dispatcher `protected gate: database` claim block).

That authorization is **policy unlock**, not network/session presence. This probe treats the unlock as valid and still fails because the **transport/session is absent in this cloud agent**.

No credentials were requested in chat. No secrets were printed. No new credentials were created in the repo.

## 3. Live probes executed (safe, non-secret)

| Probe | Result |
| ----- | ------ |
| `http://127.0.0.1:8080/` from Cursor cloud host | Connection refused (no local tunnel) |
| `http://127.0.0.1:8080/` with `Host: corpflowai-sandbox.localhost` | Connection refused |
| Direct `http://5.78.213.185:8080/` | Connection reset (expected: sandbox is loopback-only) |
| `ssh` BatchMode to `anton@5.78.213.185` / `root@…` | `Permission denied (publickey)` |
| `~/.ssh` in agent | `known_hosts` only — **no private key** |
| Host-local `~/.erpnext-sandbox-credentials` | Not present in this cloud VM (lives on `corpflow-exec-01`) |
| Env var names matching ERPNext/SSH/Frappe | None present |
| n8n credentials / workflows matching `erp` / `erpnext` | None |
| In-repo runtime ERPNext API client | None (docs + operator cockpit only) |

Canonical access model remains: sandbox UI on `corpflow-exec-01-u69678` loopback `:8080`, operator SSH tunnel per `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` §10 and `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` (L3 operator-driven).

## 4. Objects that must be re-probed once access is live

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

## 5. Planned standard-object surface for #880 / #881 / #882 (docs-historical, not re-verified)

From Phase C findings and current-state audit (historical; **not** a live PASS for this run):

| Downstream issue | Standard ERPNext objects | Prior sandbox evidence (historical) |
| ---------------- | ------------------------ | ----------------------------------- |
| #880 Client Master | Customer, Contact, Address, Lead, Opportunity, Customer Group, Territory, default currency/price list | Synthetic customers `Sandbox Client A/B - USD` created in Phase C |
| #881 Product & Service Catalogue | Item, Item Group, Item Price, Price List, UOM, non-stock/service flags | Item `SBX-LR-SETUP-USD-150` existed in Phase C |
| #882 Commercial Documents & Multi-Currency | Quotation, Sales Invoice, Payment Entry, Currency Exchange, Print Format / Letter Head | USD SI + PE + FX JE proven in Phase C; Print Format / MUR sprint path still gaps |

**Rule:** #880/#881 synthetic master writes start only after a **PASS** re-probe on a run that can actually reach ERPNext.

## 6. Exact Anton action (one blocker)

Establish a **live access path** for Cursor cloud agents to the existing sandbox without putting secrets in GitHub/chat. Preferred options (pick one):

1. **Cursor Environment Secrets** — inject existing host SSH material (e.g. `CORPFLOW_EXEC01_SSH_PRIVATE_KEY` + user) into the cloud environment; agent opens `ssh -L 8080:127.0.0.1:8080` and uses host-local sandbox credentials already on the box (values never printed).
2. **Pre-attached tunnel / session** — attach an already-authorized tunnel/session into the agent environment so `127.0.0.1:8080` answers with the sandbox site.
3. **L1 operator session** — Anton opens the SSH tunnel on a Cursor desktop session that already has SSH keys, then re-dispatch #879 there.

Still not authorized by this probe: real payment execution, external client sends, new production credentials in repo, public ERPNext exposure, unrelated schema/env changes, client_production launch.

## 7. Non-actions honoured

- No merge, no deploy
- No env/secrets committed
- No DB/schema changes in CorpFlowAI Postgres
- No ERPNext mutation attempted (unreachable)
- No client data used
- No n8n credential creation

## 8. Promptfoo / AI eval

```text
Promptfoo / AI eval evidence:
- npm run eval:ai: NOT APPLICABLE
- reason if NOT APPLICABLE: docs-only access-probe evidence for ERPNext sandbox reachability; no AI prompt/behaviour, drafting, chatbot, Lead Rescue AI, model routing, or protected-action AI logic changed
- cases affected: none
- new cases added: none
- artifact path, if generated: n/a
- live-model eval used: NO
```
