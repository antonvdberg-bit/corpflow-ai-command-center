# Issue #651 — corpflow_test delivery evidence (2026-07-30)

**Environment:** `corpflow_test` (`https://lux.corpflowai.com`) — not client_production.  
**Source issue:** [#651](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/651)  
**Merged implementation PRs:** [#672](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/672) (monogram / hierarchy), [#675](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/675) (concierge operator workflow)  
**Bounded repair in this follow-up:** document `<title>` hijack from SVG monogram `<title>` (Next.js Head).

## Production identification

| Field | Value |
|-------|-------|
| Commit on Production | `1c54cfb1baaf3154edb0cecdb136c1d00aaa08ae` |
| Includes #672 | YES (`32898c88` ancestor) |
| Includes #675 | YES (tip commit message) |
| GitHub Production deployment ID | `5666738690` |
| Deployment state | success (2026-07-29T23:54:27Z) |
| Vercel environment URL (from deployment status) | `https://corpflow-ai-command-center-esmhvmykm-corpflowai.vercel.app` |
| Client-facing host verified | `https://lux.corpflowai.com` |

## Live GET checks (2026-07-30 UTC)

| URL | HTTP | Notes |
|-----|------|-------|
| `https://lux.corpflowai.com/` | 200 | Hero headline: *Private curator of the world’s rarest residences.*; CTA *Private Access*; homepage monogram SVG **150×150** |
| `https://lux.corpflowai.com/concierge` | 200 | Separate **Email** (`type=email`, `required`, `aria-required`) and **Telephone** (`type=tel`, `required`, `aria-required`) |
| `https://lux.corpflowai.com/properties` | 200 | No agency terms: *property listings / available now / for sale / price reduced / newest / luxury real estate portal* |
| `https://lux.corpflowai.com/about` | 200 | Reachable |
| `https://lux.corpflowai.com/contact` | 200 | Reachable |
| `https://lux.corpflowai.com/property/lm-nc-ridge` | 200 | Reachable |
| `https://lux.corpflowai.com/change` | 200 | Change Console shell loads; lead list requires tenant session |
| `https://core.corpflowai.com/api/factory/health` | 200 | `ok: true` |

## Synthetic enquiry (no real client data)

```text
POST https://lux.corpflowai.com/api/cmp/router?action=concierge-lead-create
→ HTTP 200 {"ok":true,"lead":{"id":"cms6rpj460004kw04y6v9mitq","created_at":"2026-07-30T00:20:53.383Z","status":"new"}}
```

- Contact payload shape preserved: `email | phone` in `contact`, phone also in message body.
- Name/email use synthetic `example.invalid` only.

## Operator CRM / lifecycle

- `concierge-leads-list` and `concierge-lead-operator-patch` correctly return **403 Dormant Gate: session token required** without Lux tenant session (tenant isolation intact).
- Lifecycle stages `new → contacted → qualified → invited → closed` covered by unit tests in `node-tests/lux-concierge-operator-workflow-673.test.mjs`.
- **Logged-in operator progression on `/change`** still needs a Lux tenant session (Jan or Anton) — not available to the unauthenticated validation agent.

## Defect found during live validation

- **Browser tab titles** on live Lux routes rendered as `Rare & Exclusive Collection monogram` because `RareExclusiveMonogram` emitted an SVG `<title>` that Next.js `Head` collected into `document.head`.
- Bounded repair: remove SVG `<title>`; keep `aria-label` for accessibility; add regression test.

## Explicit non-actions

- No merge by this agent.
- No production deploy action by this agent (repair PR only).
- No env/secrets, DB/schema, payment, WhatsApp/SMS/email runtime, or tenant routing changes.
- No broad visual redesign before Jan reviews this slice.
- No live email/WhatsApp/SMS to Jan from this agent.

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES (title hijack repair + evidence docs)
- Merged to main: PARTIAL — #672/#675 already on main; title repair awaits merge of this PR
- Production deployment ID: 5666738690 (serving 1c54cfb1 — pre-title-repair)
- Commit deployed: 1c54cfb1baaf3154edb0cecdb136c1d00aaa08ae
- Live URLs tested: lux.corpflowai.com /, /concierge, /properties, /about, /contact, /property/lm-nc-ridge, /change; core.corpflowai.com/api/factory/health
- Expected vs actual result: P0 concierge fields + monogram prominence + private-curator positioning LIVE; synthetic lead created; tab-title defect found and patched in this PR (not yet on Production)
- Client-facing flow usable: YES (with known tab-title defect until this PR deploys)
- Final verdict: PARTIAL — corpflow_test validation of merged slice succeeded; title repair + Jan acceptance + logged-in CRM walkthrough remain
```
