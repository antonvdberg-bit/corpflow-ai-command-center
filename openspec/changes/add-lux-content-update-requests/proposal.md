# Change: Add LuxeMaurice content-update requests

## Why

Jan needs a visible, usable answer to “how do I provide content so it appears on the LuxeMaurice website?” The current training pack describes a managed process but does not provide a client-facing submission surface or show a real request flow.

## What Changes

- Add a protected LuxeMaurice content-update page at `/client/luxe-maurice-ai/content`.
- Reuse the existing tenant-scoped CMP `ticket-create` path and `cmp_tickets` storage; do not add a database, schema, migration, secret, or outbound publication mechanism.
- Let an authorised LuxeMaurice editor submit structured requests for photos, documents, video links/file references, property/listing details, and page-copy changes.
- Return a client-facing `CONTENT-REQ-…` reference while retaining the underlying CMP ticket id for operator handling.
- Make submitted requests visible in the existing `/change` tenant/operator queue.
- State clearly that submission is not publication: CorpFlowAI/operator review and explicit publication remain required.
- Add route tests, preview screenshots 09–11, and rebuild the Jan PDF/HTML with the workflow near the front.

## Impact

- Affected specs: `lux-content-update-requests` (new)
- Affected runtime: a new protected Next.js page/component using existing auth, tenancy, CMP persistence, and operator visibility
- Affected documentation: LuxeMaurice training pack source, screenshots, generator, PDF/HTML, follow-up email, checklist, and send packet
- Security: LuxeMaurice host + allowlisted password-session editor gate; tenant id is derived server-side; no client-supplied tenant scope; no direct public publishing
- Data: existing `cmp_tickets` only; no schema or production data migration
- Deployment: Preview verification only until Anton separately approves merge/Production
