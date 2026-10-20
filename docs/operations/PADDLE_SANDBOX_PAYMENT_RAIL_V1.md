# Paddle Sandbox Payment Rail v1

**Status:** Architecture and implementation packet only. No runtime payment code.  
**Owner:** Anton van den Berg.  
**Linked issue:** #1398  
**Related PR:** #1397 installs the official Paddle agent skills and remains unmerged.

## 1. Objective

Prepare CorpFlowAI for a clean, testable Paddle sandbox payment flow while keeping production payment risk at zero.

The immediate target is:

> Catalog -> checkout -> verified webhook -> subscription/payment state -> minimal entitlement decision -> sandbox evidence.

This document does not authorise production deployment, live credentials, live Paddle API/MCP access, schema changes, real charges, merges, or client-visible production activation.

## 2. Current implementation state

Current verified GitHub state:

- PR #1397 is open, mergeable, and unmerged.
- PR #1397 adds only the ten Paddle skills under `.agents/skills/` and `skills-lock.json`.
- No Paddle checkout runtime exists.
- No Paddle webhook endpoint exists.
- No subscription synchronization exists.
- No Paddle entitlement/provisioning logic exists.
- No Paddle sandbox verification evidence exists.
- No production payment runtime is authorised.

## 3. Product and catalog model

CorpFlowAI is positioned as software / SaaS / AI automation. The initial Paddle catalog must remain deliberately narrow.

### Product A — CorpFlowAI Platform

**Purpose:** recurring access to the CorpFlowAI software platform.

Recommended Paddle configuration:

- Product name: `CorpFlowAI Platform`
- Description: `Recurring access to the CorpFlowAI software and AI automation platform.`
- Tax category: `saas`
- Price type: recurring
- Initial billing interval: monthly
- Trial: none for v1
- Annual price: not included in v1
- Regional overrides: not included in v1
- Metadata recommendation:
  - `offering_key=corpflowai-platform`
  - `commercial_model=subscription`
  - `environment=sandbox`

**Price amount and currency are an operator decision. Do not guess.**

### Product B — CorpFlowAI Implementation & Configuration

**Purpose:** one-time setup, implementation and configuration of the CorpFlowAI software platform.

Recommended Paddle configuration:

- Product name: `CorpFlowAI Implementation & Configuration`
- Description: `One-time implementation and configuration of CorpFlowAI software for the customer environment.`
- Tax category: `implementation-services`
- Price type: one-time
- Billing interval: none
- Trial: not applicable
- Regional overrides: not included in v1
- Metadata recommendation:
  - `offering_key=corpflowai-implementation`
  - `commercial_model=one-time`
  - `environment=sandbox`

**Price amount and currency are an operator decision. Do not guess.**

### Explicit catalog exclusions

Do not add in v1:

- generic consulting;
- advisory retainers;
- training;
- custom development line items;
- support tiers;
- annual plans;
- trials;
- discount ladders;
- broad service menus.

## 4. Checkout architecture

### Recommended implementation

Use Paddle's **overlay checkout** for the first sandbox slice.

Reason:

- lowest UI and integration complexity;
- minimal impact on the current CorpFlowAI application;
- avoids a pricing-page redesign;
- consistent with the installed `paddle-checkout-web` skill;
- easier to verify in isolation.

### Placement

Use a dedicated CorpFlowAI purchase/billing surface rather than altering the public marketing homepage or the existing AI Lead Rescue flow.

Recommended route concept:

`/billing/paddle-sandbox`

The route is a sandbox/proof surface only and must not be linked from production-facing navigation.

### Client-side configuration

Required non-secret client configuration:

- `NEXT_PUBLIC_PADDLE_ENV=sandbox`
- sandbox Paddle client token
- sandbox price IDs

The client token may be public by design. Secret API keys and webhook secrets must never be committed.

### Checkout success behavior

Browser completion must only:

- show a success/processing state;
- optionally show the Paddle transaction reference;
- tell the user that account activation depends on verified payment processing.

Browser success must **not** directly grant entitlement.

## 5. Webhook and fulfillment architecture

### Source of truth

Verified Paddle webhook events are authoritative for:

- payment confirmation;
- subscription lifecycle;
- entitlement decisions.

The frontend checkout callback is not authoritative.

### Minimum event set for v1

Subscribe only to the smallest useful set:

- `transaction.completed`
- `subscription.created`
- `subscription.updated`
- `subscription.canceled`

Do not subscribe to broad event categories until needed.

### Webhook endpoint

Recommended route concept:

`/api/paddle/webhook`

Requirements:

- read raw request body;
- require `paddle-signature`;
- verify with Paddle Node SDK;
- reject invalid signatures;
- acknowledge valid events promptly;
- keep event routing separate from signature verification;
- log only non-sensitive event identifiers and state transitions;
- never log secrets or full payment details.

### Idempotency

Paddle delivery is at-least-once. Duplicate deliveries are expected.

Use `event.eventId` as the deduplication key.

For the first slice:

- reuse an existing durable repository mechanism if one already safely fits;
- do **not** add a DB table or migration without explicit approval;
- if durable deduplication cannot be achieved without schema change, STOP and request approval instead of improvising.

## 6. State separation

Keep these concepts distinct:

### Payment confirmation
A completed Paddle transaction exists.

### Subscription state
Examples:
- active;
- past_due;
- paused;
- canceled;
- scheduled cancellation.

### Entitlement
Whether the CorpFlowAI account should currently receive platform access.

### Provisioning
The operational act of creating/configuring the customer's CorpFlowAI environment.

These must not collapse into one boolean.

For sandbox v1, the minimum acceptable entitlement rule is:

> active subscription -> platform entitlement eligible

but the implementation must preserve room for account review and provisioning checks.

The one-time implementation payment must not itself imply perpetual platform entitlement.

## 7. Existing Lead Rescue commercial boundary

Current CorpFlowAI Lead Rescue launch doctrine uses a manual invoicing/payment flow and explicitly avoids card checkout on the public Lead Rescue surface.

Therefore this Paddle proof must **not** silently replace or alter that flow.

Paddle v1 is treated as a separate CorpFlowAI Platform payment rail until Anton explicitly approves a commercial migration.

## 8. Sandbox test plan

Evidence must be recorded as PASS or FAIL.

### Checkout tests

1. Valid sandbox card completes checkout.
2. Declined sandbox card shows payment failure.
3. User closes/abandons checkout without entitlement.
4. Browser success does not grant entitlement by itself.

### Webhook tests

5. Valid signed webhook accepted.
6. Invalid signature rejected.
7. Duplicate event does not duplicate processing.
8. Handler completes inside Paddle delivery timeout target.

### Subscription lifecycle

9. Subscription creation produces active state.
10. Subscription update changes state correctly.
11. Scheduled cancellation does not immediately remove access if still active.
12. Final cancellation removes subscription-backed entitlement.
13. Failed renewal / past-due state is represented distinctly if tested.

### Provisioning/entitlement

14. Only verified webhook state can make platform entitlement eligible.
15. One-time implementation payment is recorded separately from recurring entitlement.
16. No production account or tenant is provisioned during sandbox testing.

### Environment isolation

17. Only sandbox client token used.
18. Only sandbox price IDs used.
19. Only sandbox webhook destination used.
20. No live Paddle API/MCP access.
21. No real card used.
22. No production deployment.

## 9. Operator decisions required before catalog creation

Anton must explicitly decide:

1. Platform monthly sandbox test price.
2. Base currency.
3. Implementation/configuration sandbox test price.
4. Whether those sandbox values mirror intended commercial pricing or are nominal test values.

No other business decision is required to prepare the technical sandbox slice.

## 10. Cursor routing decision

Runtime implementation belongs to Cursor because it requires:

- dependency changes;
- Next.js runtime code;
- webhook verification;
- security-sensitive payment handling;
- entitlement behavior;
- executable tests.

Controller-only work is insufficient for runtime implementation under current repo doctrine.

No duplicate executor is currently active for Paddle implementation.

## 11. CODEX_PACKET_V1

Purpose:
Implement the smallest safe Paddle sandbox payment proof for CorpFlowAI.

Business outcome:
Demonstrate a complete sandbox path from checkout to verified subscription/payment state and minimal entitlement decision without production risk.

Linked issue or ticket:
#1398

Target branch suggestion:
`cursor/paddle-sandbox-payment-proof`

Target files:
Cursor must inspect the current repository first and choose the smallest existing architecture-compatible file set. Expected areas may include:
- `package.json` / lockfile
- a dedicated sandbox billing page
- a Paddle client helper
- a Paddle server helper
- a webhook API route
- isolated Paddle event-processing logic
- tests/fixtures
- a short implementation evidence document if required by repo rules

Do not touch unrelated client surfaces.

Patch or full file contents:
Implementation must follow the installed Paddle skills in PR #1397, especially:
- `paddle-checkout-web`
- `paddle-webhooks`
- `paddle-subscription-sync`
- `paddle-sandbox-testing`

If PR #1397 is still unmerged, Cursor may read that branch as reference but must not merge it.

Implementation requirements:
- use Paddle overlay checkout;
- sandbox only;
- webhook is authoritative;
- separate payment, subscription, entitlement and provisioning;
- minimum event set only;
- no schema change;
- stop if durable idempotency cannot be achieved safely without schema change;
- no live credentials;
- no production deploy;
- no change to Lead Rescue payment flow;
- no secrets in code, tests, fixtures, logs or GitHub.

Verification commands:
- repository-standard test command;
- repository-standard build command;
- targeted Paddle unit/integration tests;
- sandbox checkout test;
- Paddle webhook simulator tests;
- duplicate-event test;
- invalid-signature test.

Expected PR title:
`Add Paddle sandbox checkout and verified webhook proof`

Explicit non-actions:
- no merge;
- no production deploy;
- no production Paddle environment;
- no live payment credentials;
- no live Paddle MCP/API access;
- no real transactions;
- no DB/schema/data mutation;
- no existing client payment-flow changes;
- no catalog expansion;
- no secret commits.

Warnings / assumptions:
- Product amounts and base currency remain operator decisions.
- PR #1397 is reference guidance until merged.
- Existing repo patterns override generic sample file locations in the Paddle skills.
- If a conflict appears between Paddle sample code and CorpFlowAI repo rules, stop and report the conflict.

Stop condition:
Stop when the review PR is open with passing local/CI verification and complete sandbox evidence, or earlier if any protected action, schema change, secret handling, production environment, or commercial-scope decision is required.

## 12. Delivery Reality Audit — architecture step

```text
Local fix exists: YES — durable architecture/work packet documented
Merged to main: NO
Production deployment ID: n/a
Commit deployed: n/a
Live URLs tested: n/a
Expected vs actual result: expected a sandbox-only architecture and bounded implementation packet; actual result matches
Client-facing flow usable: NO — no runtime payment implementation exists yet
Final verdict: PARTIAL
```

## 13. Closeout

What changed:
- established Paddle sandbox v1 architecture;
- defined minimal catalog model;
- defined checkout and webhook boundaries;
- defined state separation and test evidence;
- defined Cursor implementation scope and stop conditions.

Verification:
- based on current PR #1397 state;
- based on current CorpFlowAI operating doctrine;
- based on the installed Paddle skills on the PR branch.

Failures/corrections:
- no runtime implementation attempted because payment runtime is protected and must be routed.

Learning:
- existing Lead Rescue payment doctrine conflicts with silently adding card checkout to that product, so Paddle should start as a separate CorpFlowAI Platform rail.

Routing implication:
- Cursor owns runtime implementation after operator price/currency decision.

Durable source:
- GitHub issue #1398;
- this document.

Superseded facts:
- none.

Unresolved:
- platform monthly amount;
- base currency;
- implementation/configuration amount.

Next owner:
- Anton for the three commercial values;
- Cursor for bounded runtime implementation once those values are supplied.
