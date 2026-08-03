## 1. Slice 1 — audit and canonical contract

- [x] 1.1 Inventory Action Queue, Prospect Workbench, and Kanban surfaces (routes, components, APIs)
- [x] 1.2 Document shared fields, actions, duplication, and gaps in `docs/operations/PROSPECT_OPERATIONS_V1.md`
- [x] 1.3 Implement pure view-model module (`lib/cmp/_lib/prospect-operations-view-model.js`)
- [x] 1.4 Add focused unit tests for mapping, transitions, exceptions, queue sort, safe interventions
- [x] 1.5 Record #711 date impact and Anton blocker status (none for Slice 1)
- [x] 1.6 Open PR only (no merge, no deploy, no schema/env)

## 2. Slice 2 — shared detail/action layer

- [ ] 2.1 Add shared Prospect detail drawer/page under `components/prospect-ops/`
- [ ] 2.2 Adopt Rapid Delivery JSON keys for owner / next_action / next_action_due / priority / waiting_on / closure_reason via existing PATCH (no Prisma migration)
- [ ] 2.3 Wire note + activity interventions through product adapters
- [ ] 2.4 Preserve audit actor/timestamp; prove no external send
- [ ] 2.5 Permission tests for factory-admin gate

## 3. Slice 3 — connect the three views

- [ ] 3.1 Action Queue uses shared view-model sort/filters (My Work / Today as saved filter)
- [ ] 3.2 Extract Prospect Workbench from Lead Rescue-branded list component
- [ ] 3.3 Wire Kanban `/change/revenue` to Postgres leads via canonical stages (localStorage no longer authoritative)
- [ ] 3.4 Ensure edits in any view update the same lead and appear after refresh in the others

## 4. Slice 4 — exceptions and verification

- [ ] 4.1 Render shared exception signals in all three views
- [ ] 4.2 Stage-age / stale defaults (`PROSPECT_STALE_DAYS_DEFAULT`)
- [ ] 4.3 Cross-view update tests + synthetic LR / Website Rescue / discovery fixtures
- [ ] 4.4 Invalid transition + missing-action cases
- [ ] 4.5 Screenshots / runtime evidence; link integrated scenario to #711
- [ ] 4.6 Relevant full test suite + build + `git diff --check`
