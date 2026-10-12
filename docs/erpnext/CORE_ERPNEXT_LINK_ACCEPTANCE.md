# Core ↔ ERPNext quotation-link acceptance

Status: bounded read-only reconciliation contract for #1433. This document does
not authorize a backfill, ERPNext mutation, Core mutation, schema change, or
client send.

## What counts as proof

`SELLING_QUOTATION_PATH_PROVEN` remains the historical selling-path meaning.
The older synthetic run records its quotation pointer in memory only:
`reference_durability=memory_only`, `core_link_ready=false`, and
`postgres_written=false`. It is not a durable Core quotation link and is not a
failure of ERPNext quotation creation.

Production acceptance requires all of the following:

1. an explicit stable ERPNext Quotation ID;
2. a durable existing Core pointer containing that ID and approved provenance;
3. an authenticated ERPNext GET read-back;
4. an authenticated PDF read-back; and
5. no test-only marker, fuzzy name/email match, or health/READY result used as
   a substitute.

The normal handoff returns the ERPNext stable IDs and the existing Core ID when
one exists. An ERP-only quotation is reported as
`ERP_RECORD_WITHOUT_CORE_LINK`; it is not forced onto an unrelated prospect.
`CORE_REFERENCE_WITHOUT_ERP_RECORD`, `DANGLING_REFERENCE`,
`CONFLICTING_REFERENCE`, `TEST_ONLY_REFERENCE`, and `AMBIGUOUS_MATCH` remain
non-pass outcomes.

## Read-only audit

Run `node scripts/erpnext/audit-core-quotation-links.mjs` only with existing
authorised read access. The audit has explicit page and page-count limits.
Exhausted limits produce `PARTIAL_SCAN`, never an all-record PASS. It uses
stable IDs and approved pointer namespaces only; it does not join by name or
email and never calls create, update, submit, raw SQL, or a Core persistence
method.

The JSON artifact is private evidence. It may contain exact proposed tuples,
provenance, compare-and-set values, conflicts, and a rollback recommendation.
Console/GitHub evidence must contain only sanitized IDs, counts, and statuses.
No client-private payload, raw `qualificationJson`, bank detail, secret, or
credential belongs in logs.

If Core read access is unavailable, report `ACCESS_BLOCKED` with the exact
read failure. Do not add permissions or credentials. A later separately
approved mutation must compare the current pointer value before writing and
retain the prior value for rollback.

## Destination and runtime package

Application ERP clients built from the configured ERP base URL accept only
the canonical HTTPS ERP root with an optional trailing slash. The low-level
injectable client remains available for isolated tests and historical
read-only inventory. Authenticated requests use manual redirect handling and
fail closed with `FRAPPE_REDIRECT_BLOCKED`; credentials are never forwarded to
another origin.

The quotation GET/PDF runtime package includes the exact public commercial
documents configuration file because `defaultPrintFormat()` reads it:
`config/erpnext-commercial-documents.v1.json`. The package retains Prisma and
the commercial approval policy; no broad `config/**` fallback is used.

## Later protected-action tuples

No tuple is authorized by this packet. If a future operator-approved backfill
is needed, its evidence must name the exact Core ID, ERPNext Quotation ID,
current pointer hash/value, expected new pointer, provenance, compare-and-set
condition, and rollback value. Failure alerts may reuse the existing
exception-only notifier for wrong destination, confirmed dangling links, or
repeated GET/PDF failure, with counts/status only. Unquoted prospects must not
alert. No live n8n management access was available for this packet.
