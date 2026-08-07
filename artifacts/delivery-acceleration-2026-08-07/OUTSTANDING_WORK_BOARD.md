# CorpFlowAI Outstanding-Work Board

**Generated:** 2026-08-07T10:55:00Z (cloud agent, laptop-independent)  
**Repo HEAD / Production spine SHA:** `33e2aff8b95cecf628cb4d5f803e1e242da12f6d`  
**Production deployment id (GitHub):** `5790735595` (environment Production)  
**Doctrine:** Delivery is the controlling measure (#795). Docs/PRs/branches ≠ completion.

**Live floor (this run):**

| URL | HTTP |
|-----|------|
| `https://lux.corpflowai.com/` | 200 |
| `https://lux.corpflowai.com/concierge` | 200 |
| `https://lux.corpflowai.com/properties` | 200 |
| `https://lux.corpflowai.com/change` | 200 |
| `https://lux.corpflowai.com/client/luxe-maurice-ai` | 200 |
| `https://core.corpflowai.com/api/factory/health` | 200 `ok:true` |

Homepage content probe: **Private curator** present; **Luxury real estate portal** absent. Concierge: Email + Telephone present.

---

## Inventory snapshots

### 1. All open PRs (14)

| # | Title | Draft | Mergeable | CI | Notes |
|---|-------|-------|-----------|-----|-------|
| 780 | feat(app): #778 Core/Tenant foundation | **No** | MERGEABLE | green | **Only ready non-draft** — Anton merge gate (shared Core/Tenant) |
| 792 | Sarah Annual Returns v1 → docs + test site (#791) | Yes | MERGEABLE | green | CIPC Desk client path |
| 794 | #699 deep-link service paths → contact prefill | Yes | MERGEABLE | green | Revenue / market-ready |
| 759 | Lux purchase-readiness after viewing | Yes | MERGEABLE | green | Next Lux client slice |
| 779 | #778 Slice 1 shell (duplicate of 780 path) | Yes | MERGEABLE | green | **Kill/close** — superseded by #780 |
| 774 | #773 route audit (first packet) | Yes | MERGEABLE | green | Duplicate pair with #775 |
| 775 | #773 route audit | Yes | CONFLICTING | green | **Kill/close** — keep one of 774/775 |
| 771 | #766 controlled-pilot go-live packet | Yes | MERGEABLE | green | Docs/process |
| 768 | ElevenLabs text fallback (#767) | Yes | MERGEABLE | green | Duplicate of #769 |
| 769 | ElevenLabs text fallback (#767) | Yes | MERGEABLE | green | Keep one of 768/769 |
| 788 | #661 lifecycle proof marker | Yes | MERGEABLE | green | Synthetic / process drag |
| 789 | #661 lifecycle proof marker | Yes | MERGEABLE | green | Duplicate of #788 — **kill one** |
| 677 | Anton Decision Inbox (#676) | Yes | CONFLICTING | green | Stale / conflicting |
| 719 | #696 test users (superseded by #722) | Yes | CONFLICTING | green | **Kill/close** |

### 2. Draft PRs

All open PRs except **#780** are drafts (13 drafts).

### 3. Stale / conflicting / superseded PRs

| # | Disposition |
|---|-------------|
| 719 | Close — superseded by merged #722 |
| 779 | Close — superseded by non-draft #780 |
| 775 | Close or rebase — conflicting; prefer single #773 audit PR |
| 677 | Pause — conflicting; needs Anton scope decision |
| 788 + 789 | Close one duplicate synthetic marker |
| 768 + 769 | Close one duplicate voice-pilot docs PR |

### 4. Mergeable, waiting for review (Anton)

| # | Client impact | Anton approval required |
|---|---------------|-------------------------|
| **780** | Internal foundation for client progress UX | **YES** (shared Core/Tenant risk) |
| 792 (mark ready) | CIPC Desk / Sarah Annual Returns test site | YES before corpflow_test claim; no prod secrets |
| 794 (mark ready) | Buyer intake deep-links | YES if buyer-facing copy changes claim market-ready |
| 759 (mark ready) | Lux purchase-readiness for Jan journey | YES before merge + deploy |

### 5. Open priority / client issues (selected)

See lanes below. Full open set ≈ 60 issues; many claimed/`in-progress` with no client-handable output.

### 6. Lux / Rare & Exclusive issues and PRs

| # | Title | State | Client-handable? |
|---|-------|-------|------------------|
| 651 | Jan concierge test + visual positioning | OPEN (work largely merged) | Live site yes; issue still open = process drag |
| 645 | LUX MVP first usable release | OPEN (MVP merged #646+) | Live yes; close or re-scope |
| 619 | Rare & Exclusive rename | OPEN (rename shipped) | Live yes; **close** |
| 673 | Operator concierge workflow | OPEN (#675 merged) | Operator usable on `/change`; **close or verify Jan** |
| 717 | Confidential presentation | OPEN (#718 merged; Jan happy 2026-08-04) | **Close** after recording acceptance |
| 759 | Purchase readiness PR | DRAFT open | Not client-handable until merge+deploy |
| — | Jan v15.3.1 RC verification | **BLOCKED** — RC archive not in repo/cloud | See evidence packet |

### 7. Promised but not client-handable

| Item | Why not handable |
|------|------------------|
| Jan v15.3.1 RC evidence | RC archive / Upstash / Supabase not cloud-accessible |
| #780 Core/Tenant shell | Draft-free but not merged/deployed; Anton gate |
| #759 purchase readiness | Draft; not on Production |
| #794 market-ready deep-links | Draft |
| #792 Sarah Annual Returns | Draft; test-site only until Anton publishes |
| Visual comm pack (#777 merged) | Concepts only — not an operable client product |
| Café International #760/#784/#785 | Baseline / concepts; no live tenant handoff proven |
| GTM programme #710–#716 | Many docs/proof artifacts; paid-pilot path still Anton-gated |
| Dispatcher activations | Repeated `SKIP_GATED` on #249 — no agent started |

### 8. Deployment / verification gaps

| Gap | Owner action |
|-----|--------------|
| No Jan acceptance recorded on open Lux issues after live merges | Anton: close #619/#645/#673/#717/#651 with acceptance notes |
| #759 not deployed | Merge+Production only with Anton approval |
| #780 Production impact unknown until merge | Anton review + explicit deploy approval |
| Path B verification for #717 called outstanding historically | Confirm or waive |
| Cursor live dispatcher gated (`SKIP_GATED`) | Anton unlock or accept blocked automation |
| Jan RC Upstash/Supabase | Provide RC archive hash + non-secret verification harness |

### 9. Docs/artifacts creating process drag (no client output)

| Item | Recommendation |
|------|----------------|
| Duplicate #773 audit PRs (#774/#775) | Keep one; close other |
| Duplicate #787 markers (#788/#789) | Keep one; close other |
| Duplicate #767 voice PRs (#768/#769) | Keep one; close other |
| Control board doc stale vs live issues | Update only after decisions — do not expand |
| Lux visual pack / training packs without send evidence | Pause until Anton authorizes client send |
| Synthetic #787 lifecycle proof | Low client value — archive after one merge |

### 10. Finish / merge / deploy / send / pause / kill / escalate

| Action | Items |
|--------|-------|
| **Finish tonight (no Anton)** | This board + Jan RC evidence packet (gap-honest); ready-to-paste issue comments; duplicate-PR kill list |
| **Merge (Anton)** | #780 (if scope accepted); then mark-ready #759/#792/#794 as chosen |
| **Deploy (Anton)** | Only after merge; verify Lux + Core live floor |
| **Send (Anton)** | Jan: purchase-readiness test package after #759 live; Sarah: Annual Returns page after #792 |
| **Pause** | #677 Decision Inbox until conflict resolved; voice pilot until one PR remains |
| **Kill/close** | #719, #779, one of #774/#775, one of #788/#789, one of #768/#769; close delivered Lux issues |
| **Escalate** | Jan RC archive missing; dispatcher SKIP_GATED; laptop-only secrets for Upstash/Supabase |

---

## Priority lanes

### Lane 1 — Client rescue / trust recovery

| ID | Title | Client/internal | Trust | Revenue | State | Blocker | Next action | Owner | Anton? | Client-handable output |
|----|-------|-----------------|-------|---------|-------|---------|-------------|-------|--------|------------------------|
| RC | Jan v15.3.1 RC evidence | Client | **High** | High (trust) | **BLOCKED** | RC archive not in GitHub/cloud; no Upstash/Supabase creds (correct) | Anton places RC zip + SHA256 in agreed non-secret channel or attaches path | Anton → Cursor verifies | YES (archive) | Pass/fail evidence packet Jan can read |
| 651 | Concierge + visual | Client | High | Medium | Live OK; issue open | Issue hygiene / Jan formal close | Close issue with live URL acceptance or list remaining deltas | Anton | YES to close | Live `lux.corpflowai.com` review links |
| 759 | Purchase readiness | Client | High | Medium | Draft PR | Merge+deploy | Anton mark ready + merge OR request changes | Anton | YES | Operator panel + Jan test package on live `/change` |
| 717/673/619/645 | Delivered Lux slices still OPEN | Client | Medium | Low | Shipped | Open-issue noise implies unfinished | Close with Delivery Reality note | Anton | YES | Clean client narrative: what’s live vs next |

### Lane 2 — Revenue this week

| ID | Title | C/I | Trust | Revenue | State | Blocker | Next | Owner | Anton? | Output |
|----|-------|-----|-------|---------|-------|---------|------|-------|--------|--------|
| 699/794 | Market-ready + contact prefill | Both | Medium | **High** | Draft PR #794 | Merge + live verify | Review #794; merge if copy OK | Anton | YES | Buyer can deep-link into need form |
| 654/716/760 | Website Rescue sellable + Café pilot | Client | Medium | **High** | Open issues | Live pilot tenant not handable | Pick one pilot surface; kill concept sprawl | Anton | YES | One demo URL + intake |
| 715/550 | Lead Rescue onboard / paid pilot | Both | Medium | **High** | Open | Quote/payment Anton-gated | Manual pro-forma path only | Anton | YES | Paid pilot packet |
| 791/792 | Sarah Annual Returns | Client | High | Medium | Draft #792 | Anton merge + test-site confirm | Mark ready; merge; Sarah reviews test page | Anton | YES | Sarah-usable Annual Returns review page |
| 640 | CIPC Desk launch | Client | High | Medium | In progress | Commercial/test boundaries | Keep on corpflow_test; no public launch claim | Cursor+Anton | YES for launch | Tenant workflow Sarah can click |

### Lane 3 — Delivery pipeline acceleration

| ID | Title | State | Blocker | Next | Owner | Anton? |
|----|-------|-------|---------|------|-------|--------|
| 780 | Core/Tenant Slice 1 | Mergeable non-draft | Anton shared-risk approval | Review screenshots + merge decision | Anton | YES |
| 661/249 | Control loop / Bridge | Activations SKIP_GATED | Gate unlock | Decide: unlock lead or stop spam | Anton | YES |
| Dup PRs | 719/779/775/788/789/768/769 | Open drafts | None for close | Close duplicates | Cursor (comment) / Anton (close) | Close = Anton or maintainers |
| 795 | Delivery doctrine | Open | Adoption | Reference in every Lux dispatch | All | No for citing |

### Lane 4 — Production safety gates

| Gate | Status |
|------|--------|
| No prod deploy without Anton | **HOLD** — respected this run |
| No DB/schema/env/secrets | **HOLD** — no Upstash/Supabase/Postgres creds used |
| No messaging/email runtime | **HOLD** |
| Shared Core/Tenant (#780) | Needs Anton explicit merge |

### Lane 5 — Kill / pause / archive

| ID | Action |
|----|--------|
| 719 | Close superseded |
| 779 | Close superseded by 780 |
| 775 or 774 | Close duplicate |
| 788 or 789 | Close duplicate |
| 768 or 769 | Close duplicate |
| 677 | Pause until rebase plan |
| Lux visual-only packs without send | Pause |
| Synthetic #787 | Archive after one marker merged |

---

## Top 10 actions for tonight (execution order)

1. **Anton:** Supply Jan v15.3.1 RC archive + SHA256 *or* accept RC verification **FAIL/BLOCKED** (packet complete).
2. **Anton:** Mark **#792** ready → **merge** → deploy → clear `SARAH CONFIRM` on `cipc.corpflowai.com/annual-returns`.
3. **Anton:** Delete/ignore duplicate branch `cursor/dispatcher-issue-791-d259`.
4. **Anton:** Mark **#794** ready → merge → verify `/contact?path=…#discovery`.
5. **Recorded:** LR/WR unit-gate **PASS** (175/175 + system-proof) — no release-blocker code fix tonight.
6. **Anton:** Close superseded **#719**, **#779**; pick/close duplicates **#775**, **#788/#789**, **#768/#769**.
7. **Anton:** Close delivered Lux issues **#619/#645/#673/#717** (and trim #651) to stop false unfinished signal.
8. **Pause:** Architecture **#780/#773*** — do not displace Sarah/revenue merges.
9. **Anton:** Unlock or silence dispatcher **SKIP_GATED** on #249.
10. **Optional:** Mark **#759** ready when Jan next purchase-readiness slice is authorized.

## Companion files

- `JAN_V15_3_1_RC_EVIDENCE_PACKET.md` — Jan RC **FAIL/BLOCKED** + Lux live floor PASS
- `UNIT_GATE_LR_WR_2026-08-07.md` — LR/WR unit-gate **PASS**
- `ANTON_DECISION_PACK.md` — merge/deploy/close/pause checklist
- `READY_TO_PASTE_COMMENTS.md` — issue/PR comments (gh issue write blocked)
- `PROCESS_DRAG.md` — drag inventory
- `live-market-probes.json` / `unit-gate-test-log.txt` / `system-proof-log.txt` — raw evidence
