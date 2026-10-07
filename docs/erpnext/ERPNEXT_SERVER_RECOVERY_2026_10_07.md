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
| Permanent server HTTPS address | `https://erp.corpflowai.com`; DNS, TLS, API and PDF checks passed | Published with operator approval; consumer retargeting pending |

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
- Initial quotation and sales-invoice PDF generation returned HTTP 500 with a renderer connection refusal. After the operator configured the recovery site's internal frontend address, both returned HTTP 200, application/pdf, and valid PDF signatures (quotation 29,739 bytes; invoice 30,262 bytes). Visual review found a missing logo on both recovery PDFs and a footer-only second quotation page; layout acceptance remains pending.
- Integration identity cannot read Custom Field and Property Setter: HTTP 403. Do not elevate it merely to complete an audit.

No client details, backup configuration, credentials or secret values belong in this document.

## Access transition — verified 2026-10-07

Initial recovery access used an operator SSH tunnel. The public HTTPS route now reaches the recovered site directly and does not require that tunnel. Anton approved the maintenance-only DNS/HTTPS step and subsequently approved publication of the recovered login page.
Initial loopback port publishing was inactive on the isolated internal network. A second ingress network for the web frontend enabled the verified localhost port mapping used by Caddy. Backend/database remain on the internal recovery network; workers and scheduler remain paused/absent.
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
| Local development / Cursor Desktop | Infisical dev/root target updated to server HTTPS; fresh existing repository REST-client GET checks passed. Running Cursor sessions/cloud scopes still require their own verification |
| Cursor Cloud automation and cloud-agent secrets | Anton reports Cloud Agents ERPNEXT_BASE_URL saved as server HTTPS. Fresh cloud-run and separate automation-scope checks remain pending; API keys unchanged |
| GitHub workflows | Inspect actual workflow consumers and secret injection; verify from the executing runner |
| n8n | Inspect live workflows and credential references; verify from n8n's runtime; preserve existing retry/idempotency controls |
| Deployed application | Inspect actual deployment environment and API consumers; verify live target after authorized change |
| Infisical dev/staging/prod | Correct exact named configuration per environment; confirm actual consumers reload it |
| Agent bootstrap / documentation | Link this state; verify target before any ERP mutation; do not reuse a stale hosted success claim |

Development runtime configuration was changed separately under Anton's active migration instruction: Infisical dev/root ERPNEXT_BASE_URL now points to the verified server HTTPS address; API credentials were unchanged. The existing repository client passed authenticated GET and restored-reference checks in a fresh process. No local ERP URL override was found in the inspected development env files; no Cursor environment.json was present. Cursor Cloud Agents URL change is operator-confirmed but not fresh-run verified. Separate automation, staging/prod and deployed-runtime consumers remain unverified.

## Remaining acceptance and ownership

Controller: reconcile rendering differences, current-state docs and exact consumer configuration. Public HTTPS GET/API/PDF checks passed on 2026-10-07; integration configuration changes are still pending.
Server executor/operator: permanent access and service lifecycle under the authorized server execution route.
Implementation executor: only where a concrete code/configuration implementation is needed; record allowed files, verifier and stop condition before dispatch.
No competing executor claim is created by this documentation PR.

Remaining:
- PDF generation repaired and verified. Visual comparison found the hosted quotation is one page with its logo; the isolated recovery quotation is two pages with a footer-only second page, and both recovered documents omit the logo. The template loads the logo from an external website blocked by recovery isolation. Preserve isolation and resolve/retest document rendering under the intended production network posture before acceptance.
- Inspect restoration of relevant encrypted integration settings without revealing them.
- Stable HTTPS/API access is verified. Active Compose configuration is persisted and UI/2FA verified on HTTPS. Automatic service startup, backup retention and monitoring still require verification.
- Reconcile writes made to the hosted source after the backup before final cutover.
- Verify the dev/Cursor/GitHub/n8n/deployed consumer matrix.
- Promote recovery to the chosen single server system of record.
- Retire hosted billing only after acceptance and retained recovery evidence.

## Public-route verification

- DNS A record reaches the intended existing server; TLS validation succeeded.
- Public ping returned pong; authenticated GET checks returned the expected restored integration identity and Frappe/ERPNext 16.50.0.
- Existing quotation reference was readable and remained draft.
- Quotation and sales-invoice PDF downloads returned HTTP 200 with valid PDF signatures through the public endpoint.
- Anton confirmed successful UI login and 2FA on the public HTTPS hostname and completed persistence of the active Compose configuration.
- Hosted service remains available. Development URL has been retargeted and fresh-process verified; other consumers require individual retargeting and fresh-run verification.

## Closeout and learning

What changed: hosted ERP recovered into a separate server copy; documentation records current evidence and pending cutover.
Verified: restore, forward migration, UI/2FA, authenticated API, record counts and template presence.
Failure/correction: missing active port publishing was bypassed with a temporary tunnel; PDF export was repaired; visual acceptance remains pending.
Material learning: credentials prove authentication, not instance identity. Every ERP task must establish target identity before mutation.
Supersession: older hosted success probes and server-install absence claims are not current estate evidence.
Persistence gap: no transactional Context/Agent Learning write receipt is claimed; capture the verified lesson through the existing authorized service when available.
Overall verdict: PARTIAL. No production cutover, hosted cancellation or integration migration is claimed.
