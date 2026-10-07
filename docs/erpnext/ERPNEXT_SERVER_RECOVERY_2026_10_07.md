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
| Cursor Cloud automation and cloud-agent secrets | URL saved and fresh Cloud Agent read-only probe passed, per operator-relayed output at 16:33 Mauritius: exact server URL, integration identity, both app versions and quotation reference. Factory automation execution scope remains unverified; API keys unchanged |
| GitHub workflows | Inspect actual workflow consumers and secret injection; verify from the executing runner |
| n8n | Inspect live workflows and credential references; verify from n8n's runtime; preserve existing retry/idempotency controls |
| Deployed application | Vercel production URL corrected and read-back verified. Same-live-commit redeploy READY and serving Core; public page/health checks passed. Authenticated Core-to-ERP quotation-flow proof pending |
| Infisical dev/staging/prod | All three named URL settings now point to server HTTPS and were read-back verified. Dev fresh-process verified; staging/prod consumers still require reload/runtime proof |
| Agent bootstrap / documentation | Link this state; verify target before any ERP mutation; do not reuse a stale hosted success claim |

Development runtime configuration was changed separately under Anton's active migration instruction: Infisical dev/root ERPNEXT_BASE_URL now points to the verified server HTTPS address; API credentials were unchanged. The existing repository client passed authenticated GET and restored-reference checks in a fresh process. No local ERP URL override was found in the inspected development env files; no Cursor environment.json was present. Cursor Cloud Agents URL change is operator-confirmed and a fresh Cloud Agent returned PASS for the exact expected HTTPS URL, integration identity, ERPNext/Frappe 16.50.0 and quotation-reference read. Evidence is operator-relayed run output; no run ID or independently fetched transcript is available yet. Separate Factory automation execution and staging consumers remain unverified. Production configuration/redeployment evidence is recorded below; authenticated application-to-ERP flow proof remains pending.

Fresh Cursor Cloud probe evidence (operator-relayed, 2026-10-07 16:33 Mauritius): all five checks PASS; only authenticated HTTPS GET requests to the expected server were reported. This verifies the tested Cloud Agent environment, not all Factory, GitHub, n8n or deployed consumers.

## Configuration correction and source-delta check — 2026-10-07

- Vercel production ERPNEXT_BASE_URL was independently read and still pointed to the hosted source. It now points to server HTTPS and read-back verification passed; API credentials were not changed.
- Infisical staging and prod had the hosted URL. Both existing named settings were corrected in place and read-back verified. Secret values were not exported or logged.
- Production redeploy selected the exact currently live commit `11bbfa7432550a2aa30d5b803a951e60f2825745`, not newer main. Deployment `dpl_HccjMdVLqJPxd1vjsMuAbCkFFGZd` reached READY and is confirmed serving the Core production alias. Its deployment-specific build command omits the usual ensure-schema DDL step; build logs confirmed the selected command. No repository build scripts were edited; the override was supplied in this deployment request.
- Authenticated GET comparison of source/recovery record lists found identical counts, identifiers and modification timestamps for Quotation (9), Sales Invoice (3), Supplier (6), Item (9), Item Price (7), Project (2), Task (36), Lead (10) and Opportunity (4). No missing or differing-timestamp records were found in those lists. This is a bounded delta check, not a full content/settings/file reconciliation.
- No n8n management connector is exposed in this session. Repository discovery has not established an authenticated n8n administrative API route. No n8n workflow has been changed or triggered.

Production redeploy verification: Core production alias maps to deployment `dpl_HccjMdVLqJPxd1vjsMuAbCkFFGZd`, commit `11bbfa7432550a2aa30d5b803a951e60f2825745`, state READY. GET checks returned HTTP 200 for Core health (ok:true), Core login, company apex and server ERP ping. Production Infisical integration credentials passed direct server identity and quotation-reference GET checks. These checks do not establish an authenticated Core quotation drilldown from the deployed application; an existing authorized Core session is still needed for that end-to-end proof.

## Remaining acceptance and ownership

Controller: reconcile rendering differences, current-state docs and exact consumer configuration. Public HTTPS GET/API/PDF checks passed on 2026-10-07; dev, Cursor Cloud, Infisical staging/prod and Vercel production URL settings have been corrected. n8n and remaining runtime acceptance are pending.
Server executor/operator: permanent access and service lifecycle under the authorized server execution route.
Implementation executor: only where a concrete code/configuration implementation is needed; record allowed files, verifier and stop condition before dispatch.
No competing executor claim is created by this documentation PR.

Remaining:
- PDF generation repaired and verified. Visual comparison found the hosted quotation is one page with its logo; the isolated recovery quotation is two pages with a footer-only second page, and both recovered documents omit the logo. The template loads the logo from an external website blocked by recovery isolation. Preserve isolation and resolve/retest document rendering under the intended production network posture before acceptance.
- Inspect restoration of relevant encrypted integration settings without revealing them.
- Stable HTTPS/API access is verified. Active Compose configuration is persisted and UI/2FA verified on HTTPS. Recovery container restart policies and Docker/Caddy boot enablement were verified on 2026-10-08; actual host-reboot recovery, backup retention and monitoring remain pending.
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
- Hosted service remains available. Development URL has been retargeted and fresh-process verified; Cursor Cloud was fresh-run verified, staging/prod configuration corrected, and Vercel production redeployed with the corrected URL. n8n and authenticated Core quotation-flow verification remain pending.

## Closeout and learning

What changed: hosted ERP recovered into a separate server copy; documentation records current evidence and pending cutover.
Verified: restore, forward migration, UI/2FA, authenticated API, record counts and template presence.
Failure/correction: missing active port publishing was bypassed with a temporary tunnel; PDF export was repaired; visual acceptance remains pending.
Material learning: credentials prove authentication, not instance identity. Every ERP task must establish target identity before mutation.
Supersession: older hosted success probes and server-install absence claims are not current estate evidence.
Persistence gap: no transactional Context/Agent Learning write receipt is claimed; capture the verified lesson through the existing authorized service when available.
Overall verdict: PARTIAL. No production cutover, hosted cancellation or integration migration is claimed.

## Continuation — 2026-10-08

- Fresh ERP ping and Core health checks returned HTTP 200; the verified Core deployment remains READY.
- [Operational readiness operator recipe](ERPNEXT_SERVER_OPERATIONAL_READINESS_2026_10_08.md) now prepares a guarded restart-policy-only update. Python syntax and representative Compose transformation checks passed. The restart-policy update has since been executed and verified; fresh manual backup and off-server transfer are recorded below. Reboot recovery, scheduled backups and a fresh-backup restore remain pending.
- The old dedicated Cursor test-user packet #696 was superseded on 2026-10-06. Historical scripts/variable names are not proof of current authenticated Core access. Automatic approval review rejected an unnecessary password-presence read; the command was not retried. No Core login or quotation-flow success is claimed.
- n8n management connector/API access remains unavailable. No workflow was changed or triggered.

## Restart-policy completion — operator evidence 2026-10-08 02:41 Mauritius

Anton applied the guarded restart-policy-only update and persisted the active Compose configuration. A subsequent inspection reported all six recovered-site containers running with restart=unless-stopped. Docker and Caddy both reported enabled at boot. No container recreation, worker/scheduler activation or network change was performed. Actual reboot recovery has not been tested. Configuration rollback copy: compose.before-restart-20261008-0230.yaml in the existing protected recovery folder.

The initial semantic guard stopped before mutation because Compose retained the shared x-app extension. The corrected comparison checks and normalizes both shared and service restart values; no unrelated differences were accepted.

## Fresh recovered-site backup — 2026-10-08

Operator ran a full recovered-site backup with public/private files, compression and backup includes/excludes ignored. Bench reported success with encryption enabled for prefix 20261008_024322. All four artifacts were copied from the container to a protected server backup folder and then downloaded to the operator laptop. Each laptop SHA-256 matched the corresponding server copy.

| Artifact | SHA-256 |
| --- | --- |
| Database | 92af0b19869ed0bdde816783946fb41b2d43bf0e12cc767b3949933e0842fe5a |
| Public files | 76ee397986ba11ddee81d220f349dc637793586cc16e02fb884fb25ab09482d0 |
| Private files | 904c74196f94155fc37c88aa1ec7a0b447b656a1e06f0013c4c491ba5ba693f1 |
| Site configuration | 9bd2861514aabb6d1926d1a401005fbbb18d2433575305c37bb91f4629e76b19 |

This is a verified manual off-server copy. It does not establish scheduled backup delivery, retention, independent backup monitoring or a successful restore of this fresh backup. Never publish backup contents or key values.

## Fresh-backup integrity verification — 2026-10-08

The laptop copy was verified using the exact named backup encryption key from Infisical, held in memory. The backed-up configuration retained a nonempty site encryption key and its backup key matched the named secret. Database decryption, gzip integrity and expected ERP table structure passed. Public and private archives decrypted and all regular-file contents passed archive reads: public 0 regular files; private 4 regular files. No plaintext backup files were saved. Temporary GPG state was removed. These checks establish decryptability and archive integrity, not a successful database restore or complete functional recovery.

## Read-only server access and backup discovery — 2026-10-08

Anton explicitly authorized bounded read-only inspections through the laptop's existing SSH access, with server changes separately controlled. Direct noninteractive SSH with strict host-key checking returned the expected hostname corpflow-exec-01-u69678. The authorization is recorded in SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md on this documentation branch; no merge is claimed. No server files or services were changed by these inspections.

Operator cron evidence shows /opt/borg/backup.sh daily at 01:00 UTC (05:00 Mauritius), plus two maintenance jobs. Inspection found a /root path reference, prune and compact operations, and pre/post-backup hooks. Each hook is 28 bytes and no ERP bench backup or database dump command was identified in the three inspected scripts. Existing Borg archive coverage, remote destination, last successful run and recovery usability remain unverified; path references do not establish coverage. Reuse and assess this existing backup pipeline before proposing another schedule or paid backup service.

## Backup pipeline and alert inspection — 2026-10-08

Direct read-only inspections verified the existing daily root Borg job includes /root, uses a remote repokey-blake2 encrypted repository and retains archives within 7d. Seven archives were listed; the latest 2026-10-07 01:09:54 UTC archive predates and omits the recovery/manual-backup folders. No fresh ERP backup step exists in the inspected Borg scripts/hooks. The main script lacks fail-fast handling, so intermediate failure propagation must be addressed in the proposed wrapper.

Anton user-systemd heartbeat and Monitor #14 backup-health timers are enabled/active and their last runs succeeded on 7 October. The checker currently validates restic heartbeat protection, not ERP backup freshness or remote ERP membership. Its recent logs contain 105 snapshots with 185855 total bytes; these are not evidence of ERP protection. The documented restic retention service/timer names are not found. A bounded last-300 health-journal scan found no Telegram delivery events; no live notification test was sent. Monitoring-architecture wording saying Monitor #14 is install-pending is superseded by these live timer observations.

A bounded daily ERP+Borg wrapper and existing Monitor #14 extension are prepared in ERPNEXT_SERVER_OPERATIONAL_READINESS_2026_10_08.md. No backup schedule, script, notifier, credential, or service was changed on the server during inspection. Installation remains separately controlled; the existing manual fresh backup remains the verified ERP recovery point.
