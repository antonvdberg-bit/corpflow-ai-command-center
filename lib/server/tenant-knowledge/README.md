# Tenant knowledge atoms v1

Approved, tenant-scoped knowledge units for future retrieval-assisted AI and chatbot answers.

## Table

`tenant_knowledge_atoms` — one row per knowledge atom with approval, visibility, expiry, and answer-eligibility flags.

## Retrieval

Use `lib/server/tenant-knowledge/atoms.js`:

- `getKnowledgeAtomsForTenant(prisma, tenantId, { purpose, category, approvedOnly })`
- `buildApprovedKnowledgeWhere` — always scopes `tenant_id`, filters expired rows, optional `chatbot_answer_eligible` / `ai_answer_eligible`

## Living Word seed

```bash
node scripts/seed-knowledge-living-word.mjs
```

## Operator read API

Factory master on Core:

`GET /api/factory/tenant-knowledge/atoms?tenant_id=living-word-mauritius&approved_only=true`

## v1 out of scope

- No AI/LLM calls
- No embeddings / vector DB
- No automatic WordPress sync
