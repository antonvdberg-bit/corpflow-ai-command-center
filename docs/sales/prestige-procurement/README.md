# Prestige Procurement — proposal package (#919)

**Status:** Decision-ready internal commercial packet for Anton. **Not sent. Not a live ERPNext quotation. Not a client_production launch.**
**Client:** Prestige Procurement
**Currency:** MUR
**Commercial model:** one-off CorpFlowAI project fee; **no recurring CorpFlowAI fee** in the base offer
**Environment:** `local` planning artefacts + ERPNext sandbox/test mapping (`corpflow_test` commercial record later). **Not** `client_production`.
**Related:** #882 (ERPNext quotation/PDF quality), #918 (ERPNext-first commercial records), #714 (proposal/acceptance rail), #766 (ERPNext proof / controlled-pilot)
**Anchor sentinel:** `<!-- PRESTIGE_PROCUREMENT_PROPOSAL_PACKET_V1 -->`

<!-- PRESTIGE_PROCUREMENT_PROPOSAL_PACKET_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: local (planning) / corpflow_test (ERPNext mapping only)
GitHub state refreshed: YES
Source item: #919
```

## Verdict

```text
PRESTIGE PROCUREMENT PROPOSAL READY FOR CLIENT REVIEW
```

Anton can walk into a Prestige meeting with a defensible MUR price band, a milestone payment plan (not 50/50), a recommended independent-hosting architecture, a 12-phase schedule with ranges, a quotation draft, and a client presentation — without redesigning the engagement live.

**This is not permission to send.** External client send remains a protected action. Live ERPNext quotation/PDF remains controlled by #882.

## What Anton has in this folder

| Deliverable | File |
|-------------|------|
| Scope matrix (REQUIRED / OPTIONAL / OUT OF SCOPE / CLIENT DECISION) | [SCOPE_MATRIX.md](./SCOPE_MATRIX.md) |
| Architecture comparison + independence proof | [ARCHITECTURE_AND_INDEPENDENCE.md](./ARCHITECTURE_AND_INDEPENDENCE.md) |
| WBS, owners, dependencies, duration ranges | [PROJECT_PLAN_AND_SCHEDULE.md](./PROJECT_PLAN_AND_SCHEDULE.md) |
| Effort, third-party costs, recommended one-off MUR fee, payment milestones | [PRICING_PACKET.md](./PRICING_PACKET.md) |
| ERPNext Customer → Quotation → Project → Task mapping (no schema change) | [ERPNEXT_PROJECT_MAPPING.md](./ERPNEXT_PROJECT_MAPPING.md) |
| Formal MUR quotation draft (repo-safe; not the commercial source of truth until ERPNext) | [QUOTATION_DRAFT.md](./QUOTATION_DRAFT.md) |
| Client-specific presentation | [CLIENT_PRESENTATION.md](./CLIENT_PRESENTATION.md) |
| Open client questions + exact Anton decisions before send | [OPEN_QUESTIONS_AND_DECISIONS.md](./OPEN_QUESTIONS_AND_DECISIONS.md) |

## Confirmed commercial direction (from #919)

- Quote in **MUR**.
- **One-off** CorpFlowAI project fee; no CorpFlowAI retainer in the base package.
- Prestige must be able to **operate the website independently** after handover.
- Hosting is **client-selected and client-paid** unless Anton later includes it.
- Payment plan follows **delivery milestones**, not a default 50/50 split.
- Calendar dates are **not committed** until Prestige agrees scope and plan.

## Recommended commercial shape (for Anton — not yet approved)

| Field | Recommendation |
|-------|----------------|
| **Base offer** | Custom-designed independent WordPress website + self-management suite + training/handover |
| **Recommended one-off fee** | **MUR 285,000** |
| **Planning range** | MUR 245,000–335,000 depending on page count and catalogue depth |
| **Leaner alternative** | MUR 165,000 (premium theme + brand customization, fewer custom templates) |
| **Client-paid hosting** | Excluded from CorpFlowAI fee (typical MUR 400–2,500 / month depending on host) |
| **Payment** | Five milestones: 20% / 20% / 25% / 20% / 15% |
| **Duration baseline** | 8–12 weeks after mobilisation payment clears and required inputs arrive |
| **Platform** | Self-hosted WordPress on a host Prestige owns (Cloudways / SiteGround / equivalent). Not a CorpFlowAI tenant site. |

Numbers are **recommendations for Anton’s decision**. They are not an approved commercial commitment and must not be sent until Anton signs the price.

## Hard limits honoured by this packet

- No production deploy, DNS change, or public client launch.
- No external client send (email / WhatsApp / SMS / other).
- No payment action, paid purchase, or hosting commitment.
- No ERPNext schema/custom fields; no production accounting/tax/bank mutation.
- No env or secret changes.
- No merge or deploy from this execution packet.
- No bank account numbers, SWIFT, IBAN, or payment links in this repo.
- No revenue, traffic, or ranking guarantees.

## How to use this in a meeting

1. Open [CLIENT_PRESENTATION.md](./CLIENT_PRESENTATION.md) and walk Hook → independence → phases → price → next step.
2. Keep [SCOPE_MATRIX.md](./SCOPE_MATRIX.md) beside you for “is X included?”
3. If Prestige pushes on price, drop to the leaner option or remove OPTIONAL rows — do not invent a new architecture live.
4. After verbal alignment, Anton approves the MUR figure, then an ERPNext quotation is created (#882 for PDF quality). **Do not send this markdown as the commercial original.**
