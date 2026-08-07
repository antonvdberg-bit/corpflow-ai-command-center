# Rare & Exclusive / Jan — v15.3.1 RC verification evidence packet

**Date (UTC):** 2026-08-07  
**Operator:** Cursor Web (delivery acceleration)  
**Controlling client stream:** Rare & Exclusive / Lux (#651 spoke; doctrine #795)  
**Production spine SHA observed:** `33e2aff8b95cecf628cb4d5f803e1e242da12f6d`  
**Verdict for requested RC proof:** **FAIL / BLOCKED** (RC archive not present in cloud-accessible repo state)  
**CorpFlow Lux live floor (parallel):** **PASS** (see §7)

---

## 1. Requested proof (exact)

| Element | Required |
|---------|----------|
| Offline regression evidence | Yes |
| Upstash evidence | Yes |
| Supabase/Postgres evidence | Yes |
| Archive identity | Yes |
| SHA256 | Yes |
| Exact pass/fail table | Yes |
| Known defect: `migrate:test` checks `escalations` while migration creates `lead_escalations` | Document + classify |
| Governance: no secrets, no real client data, no merge, no tag, no release, no production integration, no subsequent development | Confirm |

---

## 2. Archive identity search (cloud-first)

| Search surface | Result |
|----------------|--------|
| GitHub open/closed issues + PRs (`v15.3.1`, `Upstash`, `lead_escalations`, `migrate:test`) | **No matches** |
| Repo paths / artifacts / tags / releases | **No RC archive, no `v15.3.1` tag** |
| Cloud env secrets (`UPSTASH_*`, `SUPABASE_*`, `POSTGRES_URL`) | **Unset** (correct for this gate) |
| In-repo Lux AI DB pack (`artifacts/luxe-maurice-ai-db-delivery-pack/`) | Present — **not** the Jan v15.3.1 RC; portable schema only; explicitly excludes hosted Supabase/credentials |
| Google Drive handoff stub (`artifacts/luxe-maurice-ai-handoff/`) | README only — **Drive folder not synced into cloud workspace** |

**Archive identity:** `NOT FOUND`  
**SHA256 of Jan v15.3.1 RC:** `NOT COMPUTABLE` (no archive bytes)

**Blocker (one owner / one action):**  
**Owner:** Anton  
**Action:** Place the Jan v15.3.1 RC archive (zip/tarball) where cloud Cursor can read it **without secrets**, and paste the operator-claimed SHA256. Then re-run this packet’s §8 protocol.

---

## 3. Exact pass/fail table (requested RC)

| Check | Result | Evidence |
|-------|--------|----------|
| RC archive present in cloud workspace | **FAIL** | Search §2 — not found |
| Archive SHA256 matches claimed identity | **FAIL** | No archive |
| Offline regression suite executable | **FAIL** | No RC tree / `package.json` / test runner from RC |
| Upstash connectivity / fixture proof (non-secret) | **FAIL** | No RC harness; no Upstash env in cloud (by design) |
| Supabase/Postgres migration + verify | **FAIL** | No RC; no Supabase/Postgres URL in cloud |
| `migrate:test` vs `lead_escalations` defect reproduced | **FAIL (not reproduced)** | Defect recorded as operator-known; cannot execute without RC |
| Secrets absent from evidence | **PASS** | No secrets written |
| Real client data absent | **PASS** | No client DB accessed |
| No merge / tag / release / prod integration / subsequent RC development | **PASS** | This agent did none |

**Overall RC verification:** **FAIL / BLOCKED**

---

## 4. Known defect (recorded; not fixed tonight)

| ID | Finding | Class | Disposition tonight |
|----|---------|-------|---------------------|
| KD-RC-1 | `migrate:test` checks table/name **`escalations`** while migration creates **`lead_escalations`** | **Release blocker** for any claim that Jan RC migrations are green | **Do not fix** without RC source in-repo. Document only. When archive arrives: confirm fail, then one-line rename in test **or** migration — Anton chooses which side is canonical before any merge/tag. |

**Defect rule applied:** This is a release blocker for *RC acceptance*, but the RC is not in this repo’s delivery path tonight. Fixing speculative CorpFlow code would be wrong-lane work.

---

## 5. Governance confirmation

```text
GOVERNANCE (2026-08-07 Jan v15.3.1 RC packet):
- Secrets inspected/printed/rotated: NO
- Real client data used: NO
- Merge performed: NO
- Tag created: NO
- Release published: NO
- Production integration of Jan RC: NO
- Subsequent development on RC: NO
- Production deploy: NO
- DB/schema change on CorpFlow production: NO
```

---

## 6. What is *not* the Jan RC (avoid false completion)

| Artifact | Role | SHA256 |
|----------|------|--------|
| `artifacts/luxe-maurice-ai-db-delivery-pack/schema.sql` | CorpFlow portable demo schema | `e1e895b67fe9a3c69f54e45a68c219fd3d420cf52fe5a1d8b2b77ad32bafe3b8` |
| `artifacts/luxe-maurice-ai-db-delivery-pack/verify.sql` | Demo verify SQL | `6f29196967ad55887f2cd75061107500c1e02fd17bd6713a9797443372ec6f79` |
| `docs/LUX/JAN_CALLBACK_PACKET_651_CORPFLOW_TEST.md` | Jan review callback (corpflow_test site) | `3839ae5aac8be17bffa1718513184bd4d26754ac7716b0a98d5cffd1225b8382` |

These must **not** be labeled as v15.3.1 RC evidence.

---

## 7. Parallel CorpFlow Lux live floor (client-usable today)

Not a substitute for the RC packet. Confirms the Rare & Exclusive **corpflow_test** surface Anton can still show Jan.

| URL | HTTP | Checks | Result |
|-----|------|--------|--------|
| `https://lux.corpflowai.com/` | 200 | Private curator present; “Luxury real estate portal” absent | **PASS** |
| `https://lux.corpflowai.com/concierge` | 200 | Email + Telephone present | **PASS** |
| `https://lux.corpflowai.com/properties` | 200 | Reachable | **PASS** |
| `https://lux.corpflowai.com/change` | 200 | Reachable | **PASS** |
| `https://lux.corpflowai.com/client/luxe-maurice-ai` | 200 | Reachable | **PASS** |
| `https://core.corpflowai.com/api/factory/health` | 200 | `ok:true` | **PASS** |

```text
Delivery Reality Audit (Lux corpflow_test floor only):
- Local fix exists: n/a (verification only)
- Merged to main: YES (spine 33e2aff8…)
- Production deployment ID: GitHub deployment 5790735595 (Production)
- Commit deployed: 33e2aff8b95cecf628cb4d5f803e1e242da12f6d
- Live URLs tested: lux home/concierge/properties/change/luxe-maurice-ai; core health
- Expected vs actual: 200 + brand/concierge checks as table
- Client-facing flow usable: YES on corpflow_test
- Final verdict: COMPLETE for live floor only — NOT COMPLETE for Jan v15.3.1 RC
```

---

## 8. Completion protocol (when Anton supplies the archive)

1. Record `ARCHIVE_PATH`, `CLAIMED_SHA256`, `BYTES`.  
2. `sha256sum` → must match claimed.  
3. Offline: install **local/synthetic only**; run RC regression; capture log.  
4. Upstash: use **RC-documented synthetic/local** proof only — never CorpFlow production Redis.  
5. Supabase/Postgres: local Docker or client-owned sandbox only — never `POSTGRES_URL` production.  
6. Reproduce KD-RC-1; classify; fix **only** if Anton authorizes which name is canonical.  
7. Update this file’s §3 table to PASS/FAIL with paths; still **no** merge/tag/release/prod integration unless separately authorized.

---

## 9. Client-handable output tonight

| Audience | Output |
|----------|--------|
| Anton | This packet: RC **blocked**; one action = supply archive+SHA256 |
| Jan | Do **not** send an RC “green” claim. Lux corpflow_test URLs in §7 remain the showable CorpFlow surface |
| Cursor follow-up | Re-run §8 only after archive lands |
