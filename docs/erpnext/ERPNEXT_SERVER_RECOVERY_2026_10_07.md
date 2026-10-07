# ERPNext server recovery and target correction — 2026-10-07

Status: PARTIAL — isolated recovery verified; production cutover pending.
Operator: Anton van den Berg. Controller: ChatGPT/Codex.
Related: #1054 (standing ERP workstream), #1415 (current-truth audit), #918.
Authority: Anton's explicit 2026-10-07 instruction to recover the hosted backup onto the existing server and correct development, Cursor and integration targets.

## Target decision and current state

The existing company server is the intended authoritative ERP destination.
The hosted site is the migration source and remains available until cutover and acceptance.
Do not select an ERP instance merely because its credentials or browser session are available.

| Surface | Verified role | Cutover state |
| --- | --- | --- |
| Existing server installation | Separate v15 installation; preserved before recovery | Not replaced |
| Isolated server recovery | Hosted database/files restored; Frappe and ERPNext 16.50.0 | Validation only |
| Hosted commercial site | Source of the recovered backup | Not retired |
| Permanent server HTTPS address | Required for ordinary operation and cloud consumers | Not established |

A successful restore does not establish automatic backups, full DR, production access, or integration cutover.
The ERPNext 16.26.2 source application was migrated forward to ERPNext 16.50.0; source Frappe 16.50.0 was matched.

## Verified evidence

- Original server database, public/private files and site configuration backed up before recovery.
- Hosted database, public/private archives and site configuration backed up and checksummed after transfer.
- Isolated Docker project, database, volumes and internal network prepared separately.
- Restore and migration completed; scheduler disabled; queue workers and scheduler services absent.
- Operator authenticated to the restored UI using 2FA.
- Authenticated GET API calls succeeded using the restored least-privilege integration identity.
- Restored counts match prior source inventory: 9 quotations, 3 sales invoices, 6 suppliers, 9 items, 7 item prices, 2 projects and 36 tasks.
- Lead/opportunity/quotation/user reference checks passed.
- Three CorpFlowAI professional quotation, invoice and sales-order templates exist and are enabled.
- Initial quotation and sales-invoice PDF generation returned HTTP 500 with a renderer connection refusal. After the operator configured the recovery site's internal frontend address, both returned HTTP 200, application/pdf, and valid PDF signatures (quotation 29,739 bytes; invoice 30,262 bytes). Visual layout acceptance remains pending.
- Integration identity cannot read Custom Field and Property Setter: HTTP 403. Do not elevate it merely to complete an audit.

No client details, backup configuration, credentials or secret values belong in this document.

## Temporary access limitation

Recovery access currently uses an operator SSH tunnel. The server-hosted application continues to run independently of that tunnel, but the laptop access path closes when the tunnel closes.
Docker configured loopback port publishing but did not activate the mapping on the isolated internal network; a direct tunnel to the frontend container allowed UI/API validation.
A container IP and laptop loopback address are temporary validation routes, not stable production endpoints or Cursor Cloud/GitHub runner addresses.
Do not remove isolation to make PDF export work before identifying the actual failure.

## Development and integration correction

The shared REST client `lib/erpnext/frappe-rest-client.js` reads:
- `ERPNEXT_BASE_URL`
- `ERPNEXT_API_KEY`
- `ERPNEXT_API_SECRET`

The independently created `ERPNEXT_SERVER_*` names do not retarget this client.
Earlier hosted probe evidence remains historical evidence only; it does not prove the server destination is in use.
Secrets remain centrally managed in Infisical and injected into named consumers; never copy values into Git, prompts or logs.

Before switching any consumer:
1. Establish and verify the permanent server access route.
2. Record the exact site/host identity, expected app versions and integration identity.
3. Inspect the consumer's actual effective ERP URL without exposing credentials.
4. Update the existing consumer in place; verify a fresh process/run reads the intended target.
5. Perform authenticated GET checks against the expected server and reconcile record references.
6. Enable business writes or automated jobs only under the approved cutover scope; never silently fall back to hosted ERP.

| Consumer | Required evidence before complete |
| --- | --- |
| Local development / Cursor Desktop | Effective target and fresh read-only API check; temporary tunnel dependency explicitly identified |
| Cursor Cloud automation and cloud-agent secrets | Cloud-reachable server endpoint; fresh agent check; only required ERP credentials |
| GitHub workflows | Inspect actual workflow consumers and secret injection; verify from the executing runner |
| n8n | Inspect live workflows and credential references; verify from n8n's runtime; preserve existing retry/idempotency controls |
| Deployed application | Inspect actual deployment environment and API consumers; verify live target after authorized change |
| Infisical dev/staging/prod | Correct exact named configuration per environment; confirm actual consumers reload it |
| Agent bootstrap / documentation | Link this state; verify target before any ERP mutation; do not reuse a stale hosted success claim |

These runtime/configuration changes have NOT been performed by this documentation update.

## Remaining acceptance and ownership

Controller: investigate PDF failure, reconcile current-state docs and identify exact consumer configuration.
Server executor/operator: permanent access and service lifecycle under the authorized server execution route.
Implementation executor: only where a concrete code/configuration implementation is needed; record allowed files, verifier and stop condition before dispatch.
No competing executor claim is created by this documentation PR.

Remaining:
- PDF generation repaired and verified; visually verify quotation and invoice output.
- Inspect restoration of relevant encrypted integration settings without revealing them.
- Establish stable HTTPS/access, automatic service startup, backup retention and monitoring.
- Reconcile writes made to the hosted source after the backup before final cutover.
- Verify the dev/Cursor/GitHub/n8n/deployed consumer matrix.
- Promote recovery to the chosen single server system of record.
- Retire hosted billing only after acceptance and retained recovery evidence.

## Closeout and learning

What changed: hosted ERP recovered into a separate server copy; documentation records current evidence and pending cutover.
Verified: restore, forward migration, UI/2FA, authenticated API, record counts and template presence.
Failure/correction: missing active port publishing was bypassed with a temporary tunnel; PDF export was repaired; visual acceptance remains pending.
Material learning: credentials prove authentication, not instance identity. Every ERP task must establish target identity before mutation.
Supersession: older hosted success probes and server-install absence claims are not current estate evidence.
Persistence gap: no transactional Context/Agent Learning write receipt is claimed; capture the verified lesson through the existing authorized service when available.
Overall verdict: PARTIAL. No production cutover, hosted cancellation or integration migration is claimed.
