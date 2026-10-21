## 1. Schema and documentation

- [x] 1.1 Add Prisma models and unapplied migration SQL
- [x] 1.2 Document rollout, rollback, and the durable flag
- [x] 1.3 Keep statements out of ensure-schema DDL

## 2. Integration

- [x] 2.1 Share the synthetic ownership engine with a Prisma adapter
- [x] 2.2 Bind/retrieve HTTP from corpflow_session only, flag-gated
- [x] 2.3 Webhook updates bound state only; cannot create ownership
- [x] 2.4 Postgres transaction, advisory lock, and terminal compare-and-set

## 3. Tests

- [x] 3.1 Memory regressions including refund resurrection
- [x] 3.2 Durable fake-Prisma adapter and HTTP/feature-flag tests
- [x] 3.3 Static inspection that the migration is not auto-applied
- [x] 3.4 Independent-connection concurrency tests for refund resurrection, duplicate events, and unbound refund
