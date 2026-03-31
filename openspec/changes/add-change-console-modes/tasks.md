## 1. Implementation
- [ ] 1.1 Add `GET /api/ui/context` returning `{ host, surface, tenant_id, mode, session }`.
- [ ] 1.2 Add env `CORPFLOW_HOST_MODE_MAP` (JSON) to override mode by host (e.g. demo host).
- [ ] 1.3 Update shared `public/change.html` to read `/api/ui/context` and apply:
  - [ ] Core/CorpFlowAI/Demo banners + rules
  - [ ] Tenant-safe UI defaults
- [ ] 1.4 Add `public/change.client-template.html` for client sites.

## 2. Test Plan
- [ ] 2.1 Core host returns `surface=core`.
- [ ] 2.2 Tenant host returns `surface=tenant` and correct tenant_id mapping.
- [ ] 2.3 Demo host returns `mode=demo` via host map.

