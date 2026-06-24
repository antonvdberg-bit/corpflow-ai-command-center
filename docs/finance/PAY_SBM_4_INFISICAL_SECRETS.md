# PAY-SBM-4 — Infisical secrets (MPGS TEST)

**Status:** Operator reference. **TEST only.** Stable TEST host: **`https://test.corpflowai.com`** (factory core on Production — not Vercel Preview).

**Do not** paste Merchant ID, Password 1, Operator ID, API responses, or gateway credentials into Cursor, GitHub, ChatGPT, docs, comments, screenshots, or logs.

---

## PAY-SBM-4 TEST platform (2026-06)

| Item | Value |
|------|--------|
| **TEST hostname** | `https://test.corpflowai.com` — add to Vercel Domains (Production) + `CORPFLOW_CORE_HOSTS` |
| **MPGS public base URL** | `https://test.corpflowai.com` (`CORPFLOW_MPGS_PUBLIC_BASE_URL`) |
| **Vercel env target** | **Production** only (`CORPFLOW_MPGS_MODE=test`, TEST gateway) |
| **Preview / `*.vercel.app`** | **Not used** for MPGS TEST (deprecated for this spike) |

Code allows `test.corpflowai.com` as TEST `CORPFLOW_MPGS_PUBLIC_BASE_URL` while blocking lux/apex/core (`lib/server/payments/mpgs-config.js`).

---

## Source of truth

Per `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` §2 and `docs/operations/POSTGRES_PROVIDER.md` §4a:

1. **Infisical** holds the values (authoritative).
2. **Vercel Production** receives them via the existing **Infisical → Vercel sync** path (or `npm run vercel:env:*` upsert from Infisical-sourced local file — not manual Vercel UI entry unless sync is broken).
3. **Redeploy Production** after sync so serverless functions pick up new env (Vercel ties env to deployments).

**Preview:** Do **not** add MPGS secrets to Vercel Preview for PAY-SBM-4 TEST.

**Agent CI:** `.github/workflows/test.yml` Infisical OIDC slice does **not** need MPGS vars — CI uses mock/off defaults.

---

## Superseded — Preview-only deviation (do not use)

The following applied only while TEST ran on Vercel Preview; **use `test.corpflowai.com` on Production instead.**

<details>
<summary>Archived Preview spike notes</summary>

**Why (historical):** Infisical→Vercel mapping landed MPGS on Production while Preview was empty; operators temporarily used Preview URLs.

| Safeguard | Requirement |
|-----------|-------------|
| Production | Remove MPGS keys from Production **during Preview spike only** |
| Preview | Add 13 keys on Preview |
| `CORPFLOW_MPGS_PUBLIC_BASE_URL` | `https://<preview-host>.vercel.app` |

</details>

## Infisical target (where Anton enters values)

| Field | Value |
|-------|--------|
| **Project** | Same CorpFlow Infisical project as other `CORPFLOW_*` / `POSTGRES_URL` secrets — matches GitHub repository variable **`INFISICAL_PROJECT_SLUG`** (Settings → Secrets and variables → Actions → Variables). |
| **Environment** | The Infisical **Preview** environment slug — the one configured to sync to **Vercel Preview**, **not** the production slug used for live `POSTGRES_URL` on Vercel Production. If unsure which slug is Preview vs Production, open Infisical → Project → **Environments** and use the environment tied to Vercel **Preview** in your Infisical→Vercel integration (do not use the Production-linked slug). |
| **Secret path / folder** | **Project root** (flat keys). CorpFlow uses top-level env names matching `.env.template` — no subfolder path. |

Domain for OIDC/CLI (if pulling locally): GitHub variable **`INFISICAL_DOMAIN`**.

---

## Exact variable names (Infisical keys = Vercel keys)

Enter these **names** in Infisical under the Preview environment. Values are operator-only (never in repo).

| Infisical / Vercel key | Required for TEST | Set to (conceptual — no real values here) |
|------------------------|-------------------|-------------------------------------------|
| `CORPFLOW_MPGS_ENABLED` | Yes | `true` |
| `CORPFLOW_MPGS_MODE` | Yes | `test` (never `production` until separately authorized) |
| `CORPFLOW_MPGS_MOCK` | Yes | `false` (real TEST gateway) |
| `CORPFLOW_MPGS_GATEWAY_BASE_URL` | Yes | SBM TEST REST host (default shape: `https://test-gateway.mastercard.com`) |
| `CORPFLOW_MPGS_API_VERSION` | Yes | `66` |
| `CORPFLOW_MPGS_MERCHANT_ID` | Yes | TEST merchant ID from MPGS portal |
| `CORPFLOW_MPGS_API_PASSWORD` | Yes | Password 1 (Integration Settings) |
| `CORPFLOW_MPGS_RETURN_PATH` | Yes | `/pay/return` |
| `CORPFLOW_MPGS_CANCEL_PATH` | Yes | `/pay/cancel` |
| `CORPFLOW_MPGS_PAYMENT_LINK_EXPIRY_HOURS` | Optional | `72` |
| `CORPFLOW_MPGS_PAYMENT_LINK_ALLOWED_ATTEMPTS` | Optional | `3` |
| `CORPFLOW_MPGS_HOSTED_CHECKOUT_ENABLED` | Yes | `false` (Payment Link v1) |
| `CORPFLOW_MPGS_PUBLIC_BASE_URL` | Yes | `https://test.corpflowai.com` — no trailing slash, no path |

Code reads these via `cfg()` in `lib/server/payments/mpgs-config.js` and `.env.template` § MPGS.

---

## Deployment sync (after Infisical entry)

1. **Sync Infisical → Vercel Preview** using your existing integration (preferred). Infisical wins on drift — do not copy stale Vercel values back into Infisical (`POSTGRES_PROVIDER.md` §4a).
2. **Verify key names only** (no values): `npm run vercel:env:diff -- --targets=preview` from an operator machine with Vercel API access, or Infisical/Vercel UI key lists.
3. **Redeploy** the PAY-SBM-4 **Preview** deployment (merge PR or Redeploy in Vercel). Env changes do not affect already-built serverless bundles until redeploy.
4. **`CORPFLOW_MPGS_PUBLIC_BASE_URL`:** set to the **stable Preview hostname** for the PAY-SBM-4 TEST run (`https://<preview-host>.vercel.app`). Do not use `corpflowai.com` for TEST. Update in Infisical if the Preview URL changes, re-sync, redeploy.
5. **MPGS merchant portal:** whitelist `{CORPFLOW_MPGS_PUBLIC_BASE_URL}{CORPFLOW_MPGS_RETURN_PATH}` and `{CORPFLOW_MPGS_PUBLIC_BASE_URL}{CORPFLOW_MPGS_CANCEL_PATH}` on TEST portal (`https://test-gateway.mastercard.com/ma/`).

### When manual Vercel Preview entry is allowed

**PAY-SBM-4 TEST (current):** Manual Vercel **Preview** entry is **approved** — see § *Temporary deviation* above. Infisical has no Preview-equivalent target in the current mapping.

**General rule:** If Infisical → Vercel Preview sync works in future, prefer Infisical-first (`POSTGRES_PROVIDER.md` §4a). Until then: upsert **Preview target only** via Vercel UI; **never** Production for MPGS TEST. Document any deviation in `artifacts/chat_history.md` when scope changes.

### Why Vercel still holds copies

Vercel serverless reads `process.env` at deploy time. Infisical is the **write** path; Vercel Preview is the **runtime** surface for TEST. Production must not receive MPGS credentials.

---

## Verification (no secrets exposed)

Factory master on Preview:

`GET /api/factory/payments/mpgs/diagnostics`

Expect: `operational: true`, `mode: "test"`, `api_version: "66"`, `merchant_id_present: true`, `mpgs_public_base_url_present: true`, `mpgs_public_base_url_valid: true` — booleans/metadata only.

Full TEST flow: `docs/finance/PAY_SBM_4_OPERATOR_TEST_RUNBOOK.md`.

---

## Rollback

1. Set `CORPFLOW_MPGS_ENABLED=false` in Infisical (Preview environment) → sync → redeploy Preview.
2. Remove TEST return URLs from MPGS portal if abandoning spike.

---

## References

- `docs/operations/SECRETS_SYNC.md` (stub; distributed sources until Packet 2.1)
- `docs/operations/POSTGRES_PROVIDER.md` §4a (Infisical-first pattern)
- `artifacts/audits/2026-05-23-weekend/01-infisical-vercel-sync.md`
- `scripts/vercel-env.mjs` — `npm run vercel:env:list|diff|pull|push`
- `.env.template` § MPGS — placeholder names only
