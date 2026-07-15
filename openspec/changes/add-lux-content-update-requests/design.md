## Context

The repository already has:

- a LuxeMaurice editor allowlist and host/session gate;
- an authenticated property editor at `/properties/admin`;
- tenant-scoped CMP ticket creation persisted in `cmp_tickets`;
- operator visibility through `/change`;
- governed attachment upload/review/link/publish tools.

Jan’s editor/upload loop is not fully production-verified, and `/client/luxe-maurice-ai/properties` remains code-backed seed content. The first slice must therefore create a real request workflow without presenting it as a general CMS or auto-publisher.

## Goals / Non-Goals

### Goals

- Give Jan one protected route for structured website content-update requests.
- Persist each submission through existing tenant-scoped storage.
- Give Jan a clear reference and next step.
- Make the request visible to CorpFlowAI/operator in `/change`.
- Produce screenshots and a PDF section that show the actual UI and confirmation.

### Non-Goals

- No direct public publication.
- No new binary upload subsystem.
- No database schema, migration, secret, email, WhatsApp, or SMS changes.
- No general CMS, document renderer, video host, or transcoding.
- No Production deployment or live client submission in this change.

## Decisions

### Reuse CMP ticket creation

The content page will submit a structured, bounded description to the existing `POST /api/cmp/router?action=ticket-create` endpoint. The authenticated LuxeMaurice host/session determines `tenant_id`; the page will not send or trust a tenant id.

This provides durable persistence and existing `/change` visibility without a second table, API family, or application.

### Protect the page with the existing LuxeMaurice editor boundary

The page will use the existing LuxeMaurice host and password-session editor gate. Anonymous users redirect to login; wrong-host and wrong-tenant requests fail closed; non-editor tenant users receive the existing access-denied treatment.

### Use references, links, and instructions in v1

The form captures an external asset link or file reference. Jan may identify files delivered through an approved human channel and may provide hosted video links. The page does not claim to upload or publish binary content.

### Separate submission from publication

Confirmation text will say that CorpFlowAI reviews the request, applies approved updates, and returns a preview/live link. Public publication remains an explicit operator-controlled action.

## Risks / Trade-offs

- The generic CMP refiner may add guided clarification to the ticket. The original structured request remains in the persisted description.
- A human-readable `CONTENT-REQ-…` token is derived from the CMP ticket id and is a display reference, not a new primary key.
- Existing `ticket-create` operational notifications may run when configured; implementation and tests will not submit to Production or trigger outbound communication.
- Binary uploads are less direct in this slice, but avoiding a second upload path preserves existing media governance.

## Verification / Rollback

- Unit-test the form contract, structured description, reference generation, and route access behavior.
- Browser-test the Preview route using a safe fictional editor session/fixture only.
- Confirm the resulting request shape is compatible with `/change` ticket listing.
- Remove the new page/component and documentation commit to roll back; no data migration is required.
