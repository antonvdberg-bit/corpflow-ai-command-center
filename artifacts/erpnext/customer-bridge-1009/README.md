# #1009 WP1 Customer bridge evidence (synthetic)

Hosted ERPNext test, 2026-08-20 UTC, identity `integrations@corpflowai.com`. No secrets. No live Postgres write. Do not send. Do not submit.

| File | What it shows |
| --- | --- |
| `apply-log.json` | First run CREATE, second run UPDATE, `duplicate_count=1`, GET read-back of mapped identity |

Live names:

- CorpFlowAI lead id `cf1009-synthetic-qualified-customer`
- Customer `CF1009 Synthetic Customer Bridge Ltd`
- Contact `Sam Synthetic-CF1009 Synthetic Customer Bridge Ltd`
- Address `CF1009 Synthetic Customer Bridge Ltd-Billing`
- Idempotency key `corpflow.customer_bridge.v1:lead=cf1009-synthetic-qualified-customer`

Canonical write-up: `docs/erpnext/ERPNEXT_CUSTOMER_BRIDGE_V1.md`.

**Verdict: WP1 CUSTOMER BRIDGE READY FOR REVIEW.**
