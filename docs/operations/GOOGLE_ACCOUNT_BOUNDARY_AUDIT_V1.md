# Google account boundary audit v1

**Status:** Verification/closeout recorded 28 October 2026. Documentation workstream closed with remaining third-party credential gates classified. No OAuth revoke, secret, production, n8n credential, ChatGPT Settings, Chrome profile, or workflow change was performed in this audit.  
**Dates:** Original audit 28 October 2026; closeout verification 28 October 2026.  
**Owner:** Anton van den Berg.  
**Authorised business identity:** `antonvdberg@corpflowai.com` (Workspace domain `corpflowai.com`).  
**Personal identity to exclude from business auth:** `antonlvandenberg@gmail.com`.  
**Unverified alias:** `antonlvandenberg@google.com` — not found in this repository; treat as unconfirmed, not a second live account.

This document records **account-selection and authentication boundaries**. It does not contain tokens, env values, private mail, Drive file contents or personal financial records. Private tax reconstruction stays outside this repository.

## 1. Connections examined

| Integration | Connected identity | Purpose | Status | Classification | Business dependency | Recommended action | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Chrome **Profile 1** (shortcut corpflowai.com) | Primary: `antonvdberg@corpflowai.com` (`hosted_domain` corpflowai.com) | Professional browser | Active | **Compliant** (primary) | Operator Gmail/Drive/Calendar in the company profile | Retain | Chrome `Local State` profile info_cache for Profile 1 |
| Chrome **Profile 1** secondary signed-in Google account | Personal Gmail present on the same profile | Account switcher / possible silent use of personal Drive/Gmail inside the business profile | Active **at original audit** | **Personal exposure** (original) | Playwright MCP and operator Chrome use this profile | **Isolate:** remove the personal Google account from Profile 1 only (operator Chrome Settings). Do not delete the personal profile or mailbox | Chrome Profile 1 `Preferences` `account_info` lists both company and personal addresses |
| Chrome **Default** | Personal Gmail | Personal browsing | Active | Personal (out of CorpFlowAI auth) | None for company OAuth | Retain as personal-only; do not use for n8n, ChatGPT business connectors or Playwright | Chrome Default `user_name` |
| Cursor user MCP Playwright | `--profile-dir-name Profile 1` | Browser evidence for professional work | Active | **Compliant** target profile | Breaks if Profile 1 is deleted | Retain Profile 1; remove only the secondary personal login | `%USERPROFILE%\.cursor\mcp.json` (no secrets quoted) |
| Cursor repo MCP | Langfuse HTTP MCP only | Observability docs/API | Active | **Compliant** | Unrelated to Google identity | Retain | `.cursor/mcp.json` |
| Repo hardcoded operator mail | `antonvdberg@corpflowai.com` | Lux editor allowlist; ops-alert docs | Active | **Compliant** | Lux `/properties/admin` allowlist | Retain | `lib/server/lux-property-editor-access.js`; `docs/operations/DELIVERY_VERDICT_AND_ALERTS.md` |
| n8n Gmail OAuth (documented) | Documented as CorpFlowAI Google account + aliases `support@` `info@` `sales@` `help@corpflowai.com` | Password-reset and transactional send | Documented live for `password_reset`; **mailbox OAuth subject unverified in this pass** | **Ambiguous** until operator opens n8n credential | Client password-reset mail | Investigate in n8n UI; do not revoke | `docs/n8n/password-reset-email-recipe.md`; `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` |
| GitHub Actions | No Gmail/Google OAuth identity in workflows. `factory-cmp-drive.yml` is CMP ticket **drive**, not Google Drive | CI / factory | Active | **Compliant** | Factory automation | Retain | `.github/workflows/` |
| Vercel / `.env.template` | `GOOGLE_API_KEY` and `GOOGLE_SCRIPT_URL` names only (empty template) | Optional Google APIs / Apps Script | Config names only | **Ambiguous** (values not inspected; secrets out of scope) | Unknown if those env vars are set in Vercel | Operator confirm in Vercel/Infisical that any Google key is a **company** project, not a personal GCP user | `.env.template` |
| ChatGPT Gmail / Drive / Calendar / Contacts connectors | Unknown **at original audit** | Operator ChatGPT | **Unverified** originally | **Ambiguous** originally | If connected as personal Gmail, ChatGPT can mix personal Drive/Gmail into business chats | Operator Settings only (see §5) | Cursor cannot read ChatGPT connector identity |
| SBM statement Gmail intake | Infisical token `SBM_GMAIL_ACCESS_TOKEN` (presence only; value not read) | Client bank PDF intake | Open issues #1434 / #1484 (`dispatch:operator-review`) | **Ambiguous** | Finance intake | Confirm mailbox is Workspace, not personal Gmail, before renewing OAuth | GitHub issues #1434, #1484 |
| Gmail client-reply monitor | Code has no hardcoded personal address | LuxeMaurice thread classification | Code present; runtime mailbox unverified | **Ambiguous** | Client-reply ops | Confirm runtime uses company Gmail | `lib/email/client-reply-monitor.js`; issue #607 |
| CIPC / Business Admin Desk `swart829@gmail.com` | Third-party contact | Public desk mailto | Active in demo/landing | **Historical / tenant contact** | Client-facing contact for that desk | Retain; not Anton personal auth | `components/BusinessAdminDeskContactActions.js` and related |
| `antonlvandenberg@gmail.com` in git | — | — | **Not present** | — | — | No repo cleanup | Repo-wide search: zero matches |
| `antonlvandenberg@google.com` in git | — | — | **Not present** | — | — | No action | Repo-wide search: zero matches |
| Private tax reconstruction paths | — | — | **Not present** | — | — | Keep out of this repo | Repo-wide search: no `private-sars` / IRP5 |

Chrome Profile 5 is unsigned; Profile 2 is a separate visibili-t identity and is **out of CorpFlowAI Google auth** (not Anton's personal Gmail).

## 2. Personal-account exposure

**Verified (original pass):** the **corpflowai.com Chrome profile (Profile 1)** has the personal Gmail identity signed in **in addition to** `antonvdberg@corpflowai.com`. That is the only demonstrated personal-auth adjacency on the professional workstation profile used by Playwright MCP.

This is **not** a repository secret leak and **not** proof that n8n or ChatGPT currently send as personal Gmail.

**Not flagged as incidents:** tenant contact gmail addresses; empty env-template keys; CMP “drive” workflow name.

**Closeout:** see §9. The Profile 1 secondary personal login was not present on independent re-read after Anton's reported corrective action.

## 3. Changes made

| Change | Result |
| --- | --- |
| This audit document | Added `docs/operations/GOOGLE_ACCOUNT_BOUNDARY_AUDIT_V1.md` |
| OAuth / n8n / ChatGPT / Vercel env / Chrome account list | **No change** (approval gate) |
| GitHub issues #1434 #1484 #607 | Status reported; not duplicated |

No application code diff. No production behaviour change.

## 4. Checks

| Check | Result |
| --- | --- |
| Repo search for personal Gmail / google.com alias | Zero hits |
| Repo search for private tax workspace identifiers | Zero hits |
| Authorised company address in operator allowlists/docs | Present |
| Chrome Profile 1 primary hosted domain | `corpflowai.com` |
| Chrome Profile 1 secondary personal Gmail | Present **on original pass** |
| Playwright MCP profile | Profile 1 (company profile) |
| GitHub Actions Google user OAuth | Not found |
| n8n live credential subject | Not inspected (would require n8n UI / secrets) |
| ChatGPT connector identity | Not inspectable from Cursor |
| Business Gmail send path functional | **Unverified** this pass (no test send, per policy) |

## 5. Outstanding protected actions (Anton)

Original list (28 October 2026, first pass):

1. **Chrome Profile 1:** Chrome → the corpflowai.com profile → Settings → Google services / accounts → remove **only** the personal Gmail entry. Keep `antonvdberg@corpflowai.com`. Do not delete Default (personal) profile. Do not wipe company Drive.
2. **ChatGPT:** Settings → Connectors (Gmail, Drive, Calendar, Contacts). Each connector must show `antonvdberg@corpflowai.com`. If any shows personal Gmail, disconnect **that connector only** and reconnect with the company account. Cursor cannot do this.
3. **n8n:** Open the Gmail OAuth credential (documented name pattern `corpflowai-gmail`) and confirm the Google identity is Workspace, not `@gmail.com`. Do not revoke if it already is company.
4. **SBM intake (#1484):** Before renewing `SBM_GMAIL_ACCESS_TOKEN`, confirm the mailbox is a CorpFlowAI Workspace inbox (or a dedicated company mailbox), not personal Gmail.
5. Optional: confirm Vercel/Infisical `GOOGLE_API_KEY` / `GOOGLE_SCRIPT_URL` belong to a company GCP/Workspace project.

Do **not** revoke all Google integrations as a batch.

Closeout status of this list is in §9.10.

## 6. Business impact

- Removing the personal account from **Profile 1 only** reduces accidental personal Drive/Gmail use in professional Chrome and Playwright. Company Gmail in that profile should keep working.
- Disconnecting ChatGPT personal connectors (if any) stops personal mail/Drive leaking into business chats; reconnect company connectors to restore ChatGPT Gmail/Drive for work.
- Wrongly revoking n8n Gmail would break `password_reset` and other transactional mail. Inspect before any revoke.

## 7. Next owner

Anton (operator) for items in §5. Cursor: no implementation workstream unless n8n/SBM identity is proven personal **and** a code change is required (unlikely; usually credential reconnect).

Existing Gmail delivery work remains on #1434 / #1484 / #607 — do not open a duplicate identity ticket unless Anton wants a tracker issue that only points at this audit.

## 8. Operational learning

- Professional Chrome profiles must have **one** Google identity: `@corpflowai.com`. Never add personal Gmail as a secondary account on that profile.
- Playwright and other local browser automation must keep targeting **Profile 1**, not Default.
- ChatGPT Google connectors are operator Settings, not git. Treat them as a standing identity check after any Google login prompt.
- “Drive” in GitHub Actions (`factory-cmp-drive.yml`) means CMP ticket drive, not Google Drive.
- Contact `mailto:` addresses on tenant desks are not authentication.

---

## 9. Verification and closeout — 28 October 2026

**Scope:** Confirm Anton's Chrome corrective action, record ChatGPT controller-reported connector identities, classify n8n and SBM without reconnecting credentials, and close this documentation workstream. No new development. No credential, env, workflow, or production change.

### 9.1 Original exposure and cause

**Cause:** Chrome Profile 1 (professional `corpflowai.com` profile, used by Playwright MCP) had **two** Google identities in `Preferences` `account_info`: authorised Workspace `antonvdberg@corpflowai.com` **and** personal `antonlvandenberg@gmail.com`.

That is a profile-switcher / silent-use adjacency, not a git leak and not proof that n8n or ChatGPT sent as personal Gmail.

### 9.2 Anton's reported corrective action

Anton reported that he removed the personal Google account from Chrome Profile 1. Default (personal) Chrome profile was to remain intact. Cursor did not perform the removal.

### 9.3 Independent Chrome verification

Non-sensitive identity sources only: Chrome `Local State` `profile.info_cache`, each profile's `Preferences` `account_info` emails, and a string scan of Profile 1 `Preferences` for `@gmail.com` / `@corpflowai.com`. No Gmail messages, Drive files, or browsing history were read. No personal Chrome profile was modified.

| Surface | Verified identity | Classification |
| --- | --- | --- |
| Chrome Profile 1 (`Local State` `user_name` / `hosted_domain`) | `antonvdberg@corpflowai.com` / `corpflowai.com`; shortcut `Anton (corpflowai.com)` | **VERIFIED COMPLIANT** |
| Chrome Profile 1 `account_info` | Single row: `antonvdberg@corpflowai.com` | **VERIFIED COMPLIANT** |
| Chrome Profile 1 `Preferences` text for `@gmail.com` | No matches | Supports removal of personal login from this profile |
| Chrome Profile 1 `Preferences` for `@corpflowai.com` | `antonvdberg@corpflowai.com` only | **VERIFIED COMPLIANT** |
| Playwright MCP (`%USERPROFILE%\.cursor\mcp.json`) | `--profile-dir-name Profile 1` | **VERIFIED COMPLIANT** |
| Chrome Default | Primary `antonlvandenberg@gmail.com` still present (plus other personal/family Gmail entries already on Default) | Personal profile **intact**; out of CorpFlowAI auth |
| Chrome Profile 2 directory | Still present; signed-in identity `visibilit.digital@gmail.com` (not Anton's personal Gmail) | Out of CorpFlowAI Google auth; not modified |

**Correction to earlier assumption:** original §1 stated Profile 5 unsigned and Profile 2 visibili-t. On closeout re-read, `Local State` `info_cache` listed Default, Profile 1, and unsigned Profile 5. Profile 2 still exists on disk with the visibili-t Gmail identity even though it is not in the current `info_cache` shortcut set. Profiles 3–4 exist; Profile 4 has a separate `valuemarktraininghub@gmail.com` identity. None of those are CorpFlowAI Workspace; they were not changed.

**Verification limitation:** this check uses Chrome's `account_info` / `info_cache` and a Preferences string scan. Token stores, Gaia cookies, and Google account SQLite databases were **not** opened. If Chrome retained a secondary session only in those stores and not in `Preferences`, that would not appear here. Within the inspectable signed-in account list, personal Gmail is **no longer authenticated on Profile 1**.

### 9.4 ChatGPT connector verification (controller-reported)

ChatGPT independently verified its four Google connectors on 28 October 2026. Cursor did **not** open ChatGPT Settings and cannot independently attest these identities.

| Connector | Controller-reported identity | Cursor classification |
| --- | --- | --- |
| Gmail | `antonvdberg@corpflowai.com` | **VERIFIED COMPLIANT** as **controller-reported**; not independently verified by Cursor |
| Google Drive | `antonvdberg@corpflowai.com` | same |
| Google Calendar | `antonvdberg@corpflowai.com` | same |
| Google Contacts | `antonvdberg@corpflowai.com` | same |

No reconnection or disconnection of these four connectors is required on current evidence.

### 9.5 n8n identity findings

**Intended mailbox (configuration, not live OAuth proof):** CorpFlowAI Workspace account with Send-as aliases `support@`, `info@`, `sales@`, `help@corpflowai.com`; password-reset From hint `EMAIL_FROM=support@corpflowai.com`. Documented credential name pattern `corpflowai-gmail`. Sources: `docs/n8n/password-reset-email-recipe.md`, `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`, `docs/operations/SELF_HOSTED_OPS_STACK_V1.md`.

**Active workflows that depend on that Gmail OAuth (documented):** outbound transactional / password-reset webhook (`N8N_EMAIL_WEBHOOK_URL`) using the Gmail Send Email node. Automation-forward n8n channel is documented as a **separate** webhook and must not share the email secret; templates in `docs/n8n/templates/` do not embed Gmail OAuth subjects.

**Live OAuth subject:** **UNVERIFIED.**

**Exact blocker:** Cursor has no authorised n8n API session in this workspace. Repo docs use placeholder `<N8N_ORIGIN>` only. Inspecting the Gmail OAuth credential's Google mailbox would require opening the n8n credential UI or calling n8n's credentials API with an operator API key. Retrieving that key from Infisical/Vercel, reconnecting OAuth, or triggering a workflow/test send is out of scope.

A documented `EMAIL_FROM` alias is **not** an authenticated connection. Do not treat n8n as proven company-identity send without the credential subject.

### 9.6 SBM identity findings (#1434 / #1484)

**Intended mailbox:** the Gmail inbox that receives `from:SBM.EStatement@sbmgroup.mu subject:"Account e-statement" has:attachment` (code constant `SBM_GMAIL_QUERY` on merged #1434 path and on open PR #1485). Issue #1434 authorised inbound read-only Gmail attachment retrieval only.

**Controller-reported live Gmail search (16 October 2026, on #1434):** connected controller Gmail identity **`antonvdberg@corpflowai.com`**, and that search found the SBM e-statement PDFs. That is **not** Cursor-independent proof of the **worker** Infisical token's subject.

**Currently authorised worker mailbox:** **UNVERIFIED.** Last protected boolean check recorded on #1434 (16 October 2026): `SBM_STATEMENT_PASSWORD=AVAILABLE`, `SBM_GMAIL_ACCESS_TOKEN=MISSING`. No worker Gmail OAuth subject can be established while the token is missing.

**Credential renewal:** **pending.** #1484 / draft PR #1485 (`cursor/factory-handoff-issue-1484-3f12`, SHA `9c60cd743efc54850d33d1659ae599c6b5f098c2`) adds offline `--input` PDF intake and a renewable OAuth refresh client. PR #1485 is **open, draft, behind `main`**. Cloud executor recorded April acceptance blocked on finance host/systemd/Infisical configuration. This audit did **not** renew OAuth, rotate tokens, or change env.

**Operational status:** **awaiting another gate**, not a live authenticated worker mailbox. Do not declare SBM Gmail intake operational because the intended query and controller search mailbox are documented.

Existing issues were reused. No duplicate identity ticket was opened.

### 9.7 Remaining uncertainties

| Item | Classification | Why it stays open |
| --- | --- | --- |
| n8n Gmail OAuth subject | **UNVERIFIED** | No authorised n8n credential metadata access without reconnect/API key |
| SBM worker token / OAuth subject | **UNVERIFIED** | Token historically MISSING; renewable OAuth not merged/enabled |
| Issue #607 client-reply monitor runtime mailbox | **UNVERIFIED** | Code has no personal address; live runtime not inspected this pass |
| Vercel/Infisical `GOOGLE_API_KEY` / `GOOGLE_SCRIPT_URL` project ownership | **UNVERIFIED** | Names only; secrets out of scope |
| Chrome token-store residual sessions | **UNVERIFIED** (limitation) | Preferences/account_info only |

None of these is a **verified personal identity actively connected** to the professional Chrome profile after the corrective action.

### 9.8 Corrections to earlier assumptions

1. ChatGPT four Google connectors are no longer “unknown”: they are **controller-reported company identities**. Cursor still cannot independently inspect ChatGPT Settings.
2. Chrome Profile 1 secondary personal Gmail is **no longer present** in inspectable signed-in account metadata.
3. Profile 2 visibili-t identity remains on disk even when absent from current `Local State` shortcut cache.
4. SBM intended mailbox is company Gmail **by controller search and by query design**; the **worker** connection is not authorised/live. Configuration ≠ authenticated worker.

### 9.9 Additional implementation

**Not justified** for this identity-isolation workstream. Remaining n8n/SBM items are operator credential inspection or the existing #1484 finance OAuth gate. Do not rebuild integrations, reconnect ChatGPT, or change Playwright profile targeting.

### 9.10 Reusable operational lessons

- One Google identity per professional Chrome profile; never add personal Gmail as a secondary account on Profile 1.
- After an operator removes a secondary Google account, re-read `account_info` rather than trusting the report alone.
- Record ChatGPT connector checks as controller-reported unless Cursor can see Settings.
- Documented From aliases and Gmail search queries are not OAuth subjects.
- Close a documentation/security-housekeeping task with explicit **UNVERIFIED** gates instead of holding it open forever for third-party UIs Cursor cannot inspect.
- Keep Playwright on Profile 1. Keep Default as the personal profile.
- Do not copy ChatGPT/browser tokens into Infisical for SBM (already recorded on #1434).

### 9.11 Next owner and Anton decision

**Documentation/closeout owner:** Cursor (this PR). **Do not merge without Anton's approval.**

**Chrome isolation:** no further Anton action required on current evidence.

**Optional Anton decision (does not block closing this document):** open n8n → Gmail OAuth credential (documented name `corpflowai-gmail`) and confirm the Google identity is Workspace. Report the email locally; do not paste tokens. Do **not** revoke if it already is company.

**SBM OAuth enablement** remains on #1434 / #1484 / PR #1485 — finance operator/Anton, not this audit. Before any renewal, confirm Workspace mailbox (intended: `antonvdberg@corpflowai.com`).

**Anton merge decision required:** approve or reject the documentation PR that lands this closeout.

### 9.12 Closeout classification summary

| Connection | Classification |
| --- | --- |
| Chrome Profile 1 professional Google identity | **VERIFIED COMPLIANT** |
| Chrome Profile 1 personal Gmail secondary | Remediated; not present in inspectable account list |
| Chrome Default personal profile | Intact; **NOT APPLICABLE** to CorpFlowAI auth |
| Playwright MCP | **VERIFIED COMPLIANT** |
| ChatGPT Gmail / Drive / Calendar / Contacts | **VERIFIED COMPLIANT** (controller-reported) |
| n8n Gmail OAuth live subject | **UNVERIFIED** |
| SBM worker Gmail OAuth | **UNVERIFIED**; renewal pending; intake not operational |
| SBM intended mailbox / controller Gmail search | Company Workspace **as documented / controller-reported**, not a live worker connection |
| Repo operator allowlists / GitHub Actions Google user OAuth | **VERIFIED COMPLIANT** / **NOT APPLICABLE** |
| Client-reply monitor runtime; optional GCP env keys | **UNVERIFIED** |

**Workstream status:** documentation **closed**. No verified personal-on-business Chrome exposure remains. Genuine credential-subject gaps stay classified **UNVERIFIED** on their existing issues, not as open Chrome isolation work.
