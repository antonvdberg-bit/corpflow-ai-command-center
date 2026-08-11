# ERPNext API access — Cursor Cloud Infisical wiring (operator)

**Status:** Operator wiring note (secret **names** only).  
**Issue:** [#893](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/893)  
**Parents:** [#879](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/879), [#880](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/880), [#881](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/881), [#882](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/882)  
**Anchor:** `<!-- ERPNEXT_CURSOR_CLOUD_INFISICAL_API_WIRING_V1 -->`

<!-- ERPNEXT_CURSOR_CLOUD_INFISICAL_API_WIRING_V1 -->

## Purpose

Wire the already-authorized **CorpFlowAI Integration** ERPNext API identity into Cursor Cloud so read-only probes (and later #880/#881 work) can authenticate without pasting credentials into chat or GitHub.

Infisical is the vault of record. Cursor Cloud Secrets is the injection surface for cloud agents. Infisical → Vercel sync does **not** inject into Cursor Cloud agents.

## Required Cursor Cloud secret names

| Secret name | Role |
| --- | --- |
| `ERPNEXT_BASE_URL` | ERPNext/Frappe origin reachable from Cursor Cloud (scheme + host [+ port]; no credentials in URL) |
| `ERPNEXT_API_KEY` | API key for CorpFlowAI Integration user |
| `ERPNEXT_API_SECRET` | API secret for CorpFlowAI Integration user |

Never commit values. Never paste values into issues, PRs, chat, or screenshots.

## Operator steps (UI only)

1. Confirm the three names exist in Infisical.
2. Cursor Dashboard → Cloud Agents → Secrets.
3. Create/update the three secrets above (copy Infisical → Cursor UI).
4. Start a fresh Cursor Cloud agent run (existing runs do not pick up new secrets mid-flight).
5. Verify:

```bash
bash scripts/erpnext/cursor-cloud-api-probe.sh
```

Expected on success: `ERPNext access: PASS`, authenticated user identity, reachable DocType list, `#880_#881_can_proceed: YES` or `CONDITIONAL`.

## Probe contract

- Authenticate with Frappe `Authorization: token <key>:<secret>` (values from env only).
- Read identity + safe version metadata.
- GET `limit_page_length=1` for commercial DocTypes only.
- **No** create / update / submit / cancel / delete.

## Still not authorized by this wiring note

- Public ERPNext exposure
- CorpFlowAI production DB/schema changes
- Real payments / client sends / public launch
- Asking Anton to paste secret values into chat

## Related

- Evidence for the first Infisical API probe attempt: `docs/erpnext/ERPNEXT_API_ACCESS_PROBE_893.md`
- Alternate SSH loopback path (separate secret): PR #894 / `docs/runbooks/ERPNEXT_CURSOR_CLOUD_SECURE_ACCESS_WIRING_V1.md` (when merged)
