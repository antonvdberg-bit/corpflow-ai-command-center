# Living Word Knowledge Atoms v1 — live production verification

**Date:** 2026-06-19  
**Tenant:** `living-word-mauritius`  
**Live URLs:** `https://living-word-mauritius.corpflowai.com/site-preview`, `https://core.corpflowai.com/factory/living-word-workflows`  
**Mode:** sandbox/demo foundation — approved knowledge layer only. No AI calls, no embeddings, no external WordPress/GHL/DNS changes.

---

## 1. Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: PENDING (PR open)
- Production deployment ID: PENDING (post-merge Vercel Production)
- Commit deployed: PENDING
- Live URLs tested:
  - https://living-word-mauritius.corpflowai.com/site-preview (200 — pre-code-deploy baseline)
  - https://living-word-mauritius.corpflowai.com/api/chat-widget/loader.js?tenant_id=living-word-mauritius (200, x-corpflow-chat-widget=enabled)
  - https://core.corpflowai.com/factory/living-word-workflows (307 login redirect — route intact)
  - https://core.corpflowai.com/api/factory/health (200, ok:true)
- Expected vs actual:
  - DB table tenant_knowledge_atoms created + seeded on Production Neon
  - 10 approved non-expired answerable atoms for living-word-mauritius
  - Retrieval tenant-scoped; luxe-maurice returns 0 rows
  - Approved-only excludes unapproved placeholder; expired fixture excluded
  - chatbot/ai purpose filters return 10 eligible rows each
  - Site-preview knowledge debug panel + footer count — PENDING post-deploy
  - Factory GET /api/factory/tenant-knowledge/atoms — PENDING post-deploy
- Client-facing flow usable: PARTIAL (DB + seed live; UI/API code pending merge/deploy)
- Final verdict: PARTIAL
```

---

## 2. Source PR + delivery chain

| Field | Value |
|---|---|
| Branch | `feat/living-word-knowledge-atoms-v1` |
| PR | [#423 — feat(knowledge): Living Word knowledge atoms v1](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/423) |
| Design sources | `ai-dynamic-scheduling-design.md`, `living-word-sandbox-content.js`, `living-word-flow-v3.js` |
| Workflow foundation | KEEP custom `workflow_*` per `workflow-engine-adoption-review.md` |

---

## 3. Schema + seed (Production Neon)

| Step | Method | Result |
|---|---|---|
| Migration `20260621000000_tenant_knowledge_atoms_v1` | `npx prisma db execute --file prisma/migrations/20260621000000_tenant_knowledge_atoms_v1/migration.sql` | Table `tenant_knowledge_atoms` created |
| Mark migration applied | `npx prisma migrate resolve --applied 20260621000000_tenant_knowledge_atoms_v1` | Recorded in `_prisma_migrations` |
| Seed | `node scripts/seed-knowledge-living-word.mjs` | 12 rows upserted |
| Verify | `node scripts/verify-knowledge-living-word.mjs` | See counts below |

### Counts (2026-06-19)

| Metric | Count |
|---|---:|
| Total rows (`living-word-mauritius`) | 12 |
| Approved (includes expired fixture) | 11 |
| Unapproved | 1 |
| Approved + non-expired + answerable | 10 |
| chatbot_answer_eligible (approved, current) | 10 |
| ai_answer_eligible (approved, current) | 10 |
| luxe-maurice rows | 0 |

### By category

| Category | Rows |
|---|---:|
| service_times | 1 |
| location | 1 |
| contact | 1 |
| prayer_safeguarding | 1 |
| youth_children | 1 |
| wordgroups | 2 (1 approved + 1 unapproved placeholder) |
| volunteer_serve | 1 |
| business_network | 1 |
| schedule_policy | 1 |
| general_church_info | 2 (1 welcome + 1 expired fixture) |

### Approved answerable atom keys

- `service_times.sunday_in_person`
- `location.grand_baie_church`
- `contact.public_channels`
- `prayer_safeguarding.crisis_handoff`
- `youth_children.no_child_sensitive_data`
- `wordgroups.general_routing`
- `volunteer_serve.team_follow_up`
- `business_network.neutral_posture`
- `schedule_policy.approved_entries_only`
- `general_church_info.welcome_summary`

**Fixtures (must not appear in approved-only retrieval):**

- `wordgroups.meeting_times_placeholder` — `approved=false`
- `general_church_info.expired_fixture` — `approved=true`, `expires_at=2020-01-01`

---

## 4. Live verification checks

| # | Check | Evidence | Result |
|---|---|---|:---:|
| 1 | Migration applied safely | `db execute` + `migrate resolve` exit 0 | ✓ |
| 2 | Seed applied safely | seed script exit 0 | ✓ |
| 3 | Category counts | verify script JSON | ✓ |
| 4 | Approved vs unapproved | 11 / 1 | ✓ |
| 5 | Tenant isolation | luxe-maurice retrieval = 0 | ✓ |
| 6 | Approved-only filter | 10 answerable; placeholder excluded | ✓ |
| 7 | Expiry filter | expired fixture excluded (10 not 11) | ✓ |
| 8 | chatbot / ai eligibility filters | 10 each | ✓ |
| 9 | No AI call added | code review: read helpers + seed only | ✓ |
| 10 | Chatbot enabled on sandbox | loader `x-corpflow-chat-widget: enabled` | ✓ |
| 11 | `/site-preview` returns 200 | HTTP 200 | ✓ |
| 12 | Operator workflow inbox | HTTP 307 (login gate) — route exists | ✓ |
| 13 | External WP/GHL/DNS untouched | no changes in packet | ✓ |
| 14 | No outbound messages | no send paths added | ✓ |
| 15 | Site-preview knowledge debug panel | PENDING post-deploy | ⏳ |
| 16 | Factory knowledge atoms API | PENDING post-deploy | ⏳ |

---

## 5. Rollback plan

1. **Code:** revert merge on `main` — `/site-preview` knowledge panel disappears; retrieval helpers unused until re-deployed.
2. **Data (preferred):** set `approved=false` on rows rather than delete audit evidence.
3. **Schema (destructive):** `DROP TABLE IF EXISTS tenant_knowledge_atoms;` then `npx prisma migrate resolve --rolled-back 20260621000000_tenant_knowledge_atoms_v1`.
4. **Do not delete:** chatbot, workflow, schedule, or automation event evidence.

---

## 6. Out of scope (confirmed unchanged)

- AI / LLM / Groq / OpenAI integration
- Embeddings / vector DB
- livingwordmauritius.com / network.livingwordmauritius.com / GoHighLevel / DNS
- Chatbot `enabled` state change (remains enabled for sandbox demo)
- Workflow ingestion changes
- Luxe / `lux_listings` / multi-tenant operator switching

---

## 7. Next packet

1. Wire knowledge retrieval into chatbot answer path (still no free-form hallucination)
2. Operator approval UI for new/edited atoms
3. Embeddings layer (separate packet, gated)
