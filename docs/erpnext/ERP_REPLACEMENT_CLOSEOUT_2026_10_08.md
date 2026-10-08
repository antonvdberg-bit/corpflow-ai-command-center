# ERP replacement closeout — 8 October 2026

Anton directed one-at-a-time closure: complete ERP replacement before wider server/Forge maintenance. This packet narrows migration acceptance; future payment/vendor/n8n capabilities and whole-estate disaster recovery are separate work, not an indefinite ERP migration dependency.

Current verified endpoint: https://erp.corpflowai.com; recovered company-server site corpflowai-hosted-restore.localhost, ERPNext/Frappe16.50.0. User/UI2FA, authenticated API, daily encrypted remote backups, four ERP laptop slots and actual isolated laptop-package restore were already proven. That does not alone establish final cutover.

Fresh read-only source/server list comparison on 8 October: identical names/modification timestamps/counts for Quotation9, SalesInvoice3, Supplier6, Lead10, Opportunity4, Item9, ItemPrice7, Project2, Task36, BankTransaction0, PaymentEntry0, GLEntry0. This is bounded list evidence, not all-table content equality. Evidence stays private on laptop: Evidence/erp-final-delta-20261008.json.

Live configuration: scheduler disabled, no background workers, mute_emails=true; current queue has three Sent messages and no NotSent/Sending/Error/Expired messages. Three restored enabled User webhooks point to frappecloud.com for create/update/delete. These hosted management hooks do not belong in the server's final independent configuration. Their exact names and private rollback content must be preserved before disabling; no other webhook may be altered. Keep email mute, worker/scheduler and outbound isolation in place until approved runtime behavior is tested. No send, payment or business-document submission is authorized by this packet.

First closure item: repair the three named CorpFlowAI professional Print Formats so their CorpFlowAI logo does not depend on external egress. Use the existing public company PNG as an embedded data URI; preserve the BusinessAdminDesk branch. For the quotation only, apply scoped spacing/label CSS to remove the footer-only second page without shrinking body text or changing commercial content. Preview actual existing draft quotation SAL-QTN-2026-00006 and synthetic invoice ACC-SINV-2026-00001. Require embedded image presence, readable unchanged content, correct totals/status and visual inspection before applying. Save exact before-HTML/hash in root-only rollback files. No new File record, new invoice/quotation, mail or ledger mutation.

Remaining ERP-only closure: current consumer matrix (dev/Cursor already proven; production authenticated Core flow and any actual n8n ERP consumer must be checked), source delta/full relevant settings reconciliation, approved background-job/egress baseline, one authoritative writer and final hosted/original-site retirement decision. Prepare any final protected retirement/merge action as a concrete reviewable change; do not cancel/delete merely to label this project closed.

Wider OS/Forge maintenance, Core/Neon/n8n disaster recovery, offline whole-estate key escrow and replacement-host boot drills belong to #1423, not this migration acceptance packet. ERP backups/restore remain mandatory and continue independently.

## Closed items — verified live on 8 October

1. **Print repair CLOSED.** All three named formats now embed the pinned CorpFlowAI PNG (SHA25687c841ed0977c5c843e009e96ef50851f69a8f1d18298cb609492d94fc89b834), with BusinessAdminDesk branch preserved. Quotation scoped CSS adjusts spacing/labels, not body font size or commercial content. Actual server generation and authenticated HTTPS download both produced identical quotation/invoice PDF hashes, one page and one embedded image each. Latest rendered quotation and invoice pages were visually inspected: logo present, no footer-only/blank extra page, content/totals readable and no overlap/clipping. SalesOrder template source correction is verified; no SalesOrder exists to generate a real record PDF. No new business record, File row, send, invoice submission or ledger entry.

Quotation PDF SHA256157fe649ae54ac403cee3629a14cf7df55dfb018b7dcfbd958ecceb5e7136a32; synthetic invoice PDF SHA256b36ac4dcec426b8331b40d6d3e37274702cee46808d52bfd5a746f3e73a3d9b5. Before/after format hashes and private PDFs are retained under /root/erp-cutover-closeout-20261008/print-format-rollback; applied guarded program is versioned at scripts/ops/erpnext-print-cutover-fix.py. To roll back, require current HTML hashes to match this applied receipt, then restore only the three backed-up HTML fields; preserve business records and unchanged settings.

2. **Hosted user-sync hook retirement CLOSED.** Exactly the three named User create/update/delete hooks to frappecloud.com were disabled transactionally after expected-name/type/host/enabled guards. No other webhook was changed. Remaining enabled webhooks0, unsent mail0; mute_emails=true and scheduler_disabled=true preserved. Before-doc rollback stored root-only in /root/erp-cutover-closeout-20261008/hosted-webhooks-before.json. Rollback restores only enabled=1 for those exact matching hooks if explicitly needed; do not automatically reactivate hosted coupling.

Preview failures/corrections: direct bench inspection initially used the wrong sites/cwd path; fixed before any mutation. Non-important spacing rules were overridden by later template CSS; explicit scoped important spacing produced the accepted one-page output. A PowerShell quoting error affected local PDF rendering only after HTTPS downloads; here-string Python rendering completed and verified the same files. No claimed earlier failed check is treated as PASS.

Next priority: authenticated deployed Core→ERP quotation flow. The existing Core operator signed in securely. The subsequent live consumer check is blocked by a missing deployed commercial configuration file; see the concrete blocker below. No password-presence probe, secret logging, credential reset or test-user creation is used. Fresh source/server record-list comparison remains current; print-format/webhook differences introduced by this approved closeout are intentional.

Overall ERP replacement remains PARTIAL until current consumers, approved operating-job baseline and final single-writer/retirement acceptance are complete. Wider server maintenance remains outside this active lane.

### Post-change recovery point

The existing guarded combined ERP→encrypted Borg backup was run after both repairs and passed with exit0, verifying ERP and protected ops artifacts in the remote archive. Temporary site previews were removed only after verifying private root rollback copies; those copies remain outside the live site. This protects the newly applied formats and disabled cloud hooks. Laptop latest-copy scheduling remains unchanged; no fresh laptop copy receipt is claimed by this run.

The next active item is the deployed Core consumer proof, using its existing Factory Admin login. Secure browser authentication is the intended route; no credentials in chat, no password reset/test-user provisioning and no password-presence probe. Whole ERP replacement is not closed while that consumer/operating-baseline/retirement acceptance remains pending.

### Core consumer check — concrete blocker and routed repair

Secure browser sign-in succeeded as the existing Core operator. Actual authenticated /app/core and /app/commercial both failed with FACTORY_ROUTER_FATAL. Runtime logs identify ENOENT for /var/task/config/commercial-approval-rail.v1.json, not an ERP API authentication error. The file exists in Git; the live raw factory_router function's includeFiles currently includes Prisma assets only.

Current live deployment dpl_esTMRpUuh4rCb254dbqEEA1QmkVy (commit cf1680f4e0b096ecc8bd3f7dd576908daff58b91) supersedes the earlier retargeting deployment. Commercial request mqgt7-1791438280780-58276b3691ed at 2026-10-08T05:44:40.867Z proves the missing-file failure. No write/send/payment occurred. This is a packaging blocker before consumer acceptance; do not infer the Core ERP connection passed.

A single apply-ready runtime repair is routed through the existing Cursor Factory lane as #1429 (dispatch:cursor-ready, priority:P1). Controller justification: new Vercel integration packaging work is outside the approved deterministic server contracts; AGENTS.md routes runtime implementation to Cursor. The packet preserves Prisma inclusion, adds only the exact public policy file, requires actual artifact/glob evidence and approval logic tests, and stops at verified PR/release gates. Queued is not RUNNING; run/claim evidence must be checked before reporting activation. Do not create a duplicate run or expand to whole-estate maintenance.

Priority remains: finish #1429 repair and authenticated live Core→ERP proof, then reconcile actual existing consumers/operating baseline and present final single-writer/retirement acceptance. Print repair, cloud-hook retirement and the post-change encrypted remote backup remain CLOSED.

Activation verified: #1429 packet validation PASS; Handoff run37734214878 succeeded, Cursor agent bc-c217c216-27f8-41e7-9b07-dad80114e854 / run-a2972e78-3dbb-41de-b417-547a6000db3d reported IN_PROGRESS at 2026-10-08T05:48:44.966Z. No branch/PR/CI/completion receipt yet. Do not relaunch.


### Reviewed repair — 8 October, 12:38 Mauritius

Cursor pushed exactly one changed line at commit35854daf7e9a9b6f51d9dd308ddbbb4e54e94e68, branch cursor/factory-handoff-issue-1429-4064. Its initial IN_PROGRESS receipt was stale, not a current execution statement. Controller inspected the existing branch and prepared PR #1431 without changing code or starting another executor.

34 focused commercial approval/summary tests passed. Installed picomatch confirms exact policy and preserved Prisma inclusion and excludes unrelated configs. Local ordinary build failed because shared laptop dependencies are stale/missing Paddle; the first PowerShell invocation stopped on a deprecation warning, corrected shell invocation exposed the actual missing dependency. No local build PASS is claimed.

Required clean GitHub CI run37750791932 passed, including automated tests and the Next production build; environment and doctrine checks passed. Vercel preview was ignored by current policy, so its status is not actual function-artifact or live-consumer proof. PR1431 is reviewed/ready for the exact merge/release gate under AGENTS.md and current delivery doctrine. No merge/deploy/cancellation occurred.

Fresh runtime check: ERP verified-TLS HTTPS ping pong, six running recovery containers with healthy DB, backup outcome success plus remote_verified=true and ops_remote_verified=true. Selected timestamp keys were absent, so this check does not claim a new backup time. Forge availableRAM5.28GiB, zero loaded models; below existing6GiB guard.

Still required for final ERP closure: approved release of1431 and actual authenticated Core→ERP proof, actual existing n8n consumer/settings reconciliation (management access still unavailable), accepted manual/automated job baseline, final source delta/single-writer acceptance and hosted/original-site retirement decision. Future new business automation and whole-estate DR remain separate. Direct ERP manual use remains operational.


### Merge accepted; release blocked — 8 October, 12:42 Mauritius

Anton confirmed "1431 merged". GitHub verifies PR1431 merged at08:40:04UTC, exact merge commit11a41fefad4611fc9713946ac3e63a3690bb5699. Vercel lists no deployment for this commit; the Core alias still serves prior dpl_esTMRpUuh4rCb254dbqEEA1QmkVy / cf1680f4e0b096ecc8bd3f7dd576908daff58b91. Existing operator browser authentication remains valid and Commercial still shows FACTORY_ROUTER_FATAL on that prior build.

The controller attempted the exact Git-source production deployment of the reviewed merge commit to existing project prj_GRqjVf6pMvXgjiu5W3KBFaIYDORP/team_2hXJSHImOxpmQxlFj7Yn9l5W. Automatic approval review rejected it: production deployment can change live Core; confirmation of merge did not clearly authorize the separate production release. No deployment was created, no retry or alternate execution was used. Explicit approval for this exact production release is required before retry.

Reviewable release: only include the exact commercial policy JSON while preserving Prisma inclusion, commit11a41fefad4611fc9713946ac3e63a3690bb5699, same existing project/team/production alias. Required clean CI and focused tests already passed. After authorized release, verify READY/commit/alias and actual authenticated Core→server ERP quotation proof; do not equate merge with completed ERP acceptance. Rollback is prior accepted deployment or reverting the one-line correction under approval.
