## 1. Implementation
- [ ] 1.1 Add Prisma model + SQL ensure-schema for `tenant_hostnames`.
- [ ] 1.2 Update factory router host context attachment to consult Postgres mapping first.
- [ ] 1.3 Add `POST /api/factory/host-map/upsert` (factory-master only) to manage mappings.
- [ ] 1.4 Ensure `/api/ui/context` reports mode/surface/tenant_id from DB mapping.

## 2. Test Plan
- [ ] 2.1 Insert mapping for `legal.corpflowai.com` → `legal` + `mode=demo`; verify `/api/ui/context`.
- [ ] 2.2 Insert mapping for apex `corpflowai.com` → `corpflowai` + `mode=corpflowai`.
- [ ] 2.3 Ensure `core.corpflowai.com` remains `surface=core` and never derives tenant_id.

