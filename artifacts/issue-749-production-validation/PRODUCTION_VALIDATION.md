# PR #749 production validation — LIVE VERIFIED

**Issue:** #712 · **PR:** #749 · **Ran:** 2026-08-04  
**Agent:** `bc-3632b03b-f16a-4103-ae41-f18b36afffd0`

## Deployed commit / deployment

| Field | Value |
| ----- | ----- |
| Merge commit on `main` | `3020d534dd4f5b56949432c9d99bad987654f17b` |
| PR #749 head | `0d3f31783c609c8e1449b42cdd56755e4b3eb0d8` |
| GitHub Production deployment | `5752542316` (state success, created 2026-08-04T22:26:04Z) |
| Production deployment SHA | `3020d534dd4f5b56949432c9d99bad987654f17b` |
| Vercel environment URL (GitHub status) | `https://corpflow-ai-command-center-9rbltcfy3-corpflowai.vercel.app` |
| Live host tested | `https://corpflowai.com` |
| Next buildId observed on `/contact` | `rRYKX6nUkFGD0uGL4Rbez` |

Note: Vercel `dpl_…` id is not exposed via GitHub Deployments API in this environment; GitHub deployment id `5752542316` + matching Production SHA is the durable correlation used here.

## Live URLs tested

| URL | HTTP | Assertion |
| --- | ---- | --------- |
| `https://corpflowai.com/contact#discovery` | 200 | One buyer-need question; five options; old dual fields absent |
| `https://corpflowai.com/lead-rescue` | 200 | Dedicated Lead Rescue intake; no Preferred service path / Related product sprint |
| `https://corpflowai.com/offers/premium-landing-page-rescue#discovery` | 200 | Locked product context; no buyer re-classification |
| `https://corpflowai.com/demo/website-rescue` | 200 | Demo surface reachable |
| `https://core.corpflowai.com/api/factory/health` | 200 | `ok: true` |

## Expected vs actual

| Check | Expected | Actual |
| ----- | -------- | ------ |
| General routing question | Only “What do you need help with?” | PASS (SSR + browser) |
| Old fields | Absent | PASS — Preferred service path / Related product sprint absent |
| Five options | All present | PASS |
| Locked Website Rescue | No buyer-need select; locked context | PASS |
| Lead Rescue page | Product intake retained; no dual taxonomy selects | PASS |
| Downstream mapping | buyer_need / service_interest / service_path / offer_slug | PASS via synthetic POST results |
| Contradiction | Rejected | PASS — HTTP 400 `CONTRADICTORY_SERVICE_PRODUCT` |
| External send | None | PASS — form/API only create lead + reference; no messaging runtime |

## Synthetic records (fresh)

| Label | Reference | Lead ID | service_path | offer_slug |
| ----- | --------- | ------- | ------------ | ---------- |
| losing-enquiries (API) | CF-2S5BW9 | cmsf9cq1o0005jo04fo2s5bw9 | client-lead-service | ai-lead-rescue |
| website-improvement | CF-5STVP4 | cmsf9cq6s000ajo041l5stvp4 | website-digital | premium-landing-page-rescue |
| admin-workflow | CF-09ZGB5 | cmsf9cqan000fjo04hx09zgb5 | workflow-administration | null |
| ai-receptionist | CF-CTW1CT | cmsf9cqee000kjo046vctw1ct | client-lead-service | null |
| unsure | CF-UG3Q74 | cmsf9cqic000pjo041eug3q74 | workflow-administration | null |
| locked-wr | CF-25HUBN | cmsf9cqmd000ujo04cy25hubn | website-digital | premium-landing-page-rescue |
| browser submit (losing-enquiries) | CF-L2NYCT | (browser capture) | client-lead-service | ai-lead-rescue |
| contradiction | — | — | rejected 400 | — |

Full JSON: `artifacts/issue-749-production-validation/synthetic-intake-results.json`

## Desktop / mobile evidence

- `artifacts/issue-749-production-validation/contact-discovery-desktop.png`
- `artifacts/issue-749-production-validation/contact-discovery-desktop-options.png`
- `artifacts/issue-749-production-validation/contact-discovery-mobile.png`
- `artifacts/issue-749-production-validation/website-rescue-discovery-desktop.png`
- `artifacts/issue-749-production-validation/lead-rescue-desktop.png`
- `artifacts/issue-749-production-validation/contact-discovery-submit-success.png`

Also mirrored under `/opt/cursor/artifacts/screenshots/`.

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES (merged #749)
- Merged to main: YES — 3020d534dd4f5b56949432c9d99bad987654f17b
- Production deployment ID: GitHub deployment 5752542316 (Production, success); Vercel alias corpflow-ai-command-center-9rbltcfy3-corpflowai.vercel.app
- Commit deployed: 3020d534dd4f5b56949432c9d99bad987654f17b
- Live URLs tested: https://corpflowai.com/contact#discovery ; /lead-rescue ; /offers/premium-landing-page-rescue#discovery ; /demo/website-rescue ; https://core.corpflowai.com/api/factory/health
- Expected vs actual result: buyer-need UX live; locked product paths correct; mappings + contradiction gate proven with synthetic IDs
- Client-facing flow usable: YES
- Final verdict: COMPLETE for #749 / #712 unit-gate conversion fix (LIVE VERIFIED)
```

**Scope note:** This closes the #712 **unit gate / conversion blocker** only. It does **not** claim the 12 Aug system test or 14 Aug integrated scenarios complete.

**ANTON ACTION:** NONE for #749 validation.
