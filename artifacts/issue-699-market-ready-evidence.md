# #699 Market-ready CorpFlowAI — evidence packet

**Branch:** `cursor/dispatcher-issue-699-8afc`
**Cursor run:** https://cursor.com/agents/bc-d093f345-31e5-4e0b-bea1-8df7876a0c3d
**Supersedes open PRs:** #707, #708 (same #699 slice, rebased onto current `main` with path-prefill + docs sync)
**Verdict (this PR):** MARKET-READY TEST SLICE pending merge/publish — local/preview evidence complete; live `corpflow_test` URL verification blocked until Anton merge/publish.

## Current-surface audit and reuse

| Existing | Reused for #699 |
| --- | --- |
| `CorpFlowPublicHome` + photo/glass shell | Homepage refresh (copy/sections) |
| `POST /api/tenant/intake` + Prisma `Lead` | Qualified enquiry persistence (no schema change) |
| `qualificationJson.intake_meta` | website, service_path, urgency, consent |
| `/admin/rapid-delivery` + `RapidDeliveryRevenueDesk` | Operator handoff + response draft |
| `/change/revenue` | Points operators to live enquiry desk |
| `/lead-rescue`, Website Rescue offer/demo | Product entry points from gateway |

## Changed files (implementation)

- `lib/public/corpflow-market-service-paths.js` (new)
- `lib/public/corpflow-public-market.js`
- `components/CorpFlowPublicHome.js`
- `components/public/DiscoveryIntakeForm.js`
- `components/public/DeliverySteps.js`
- `components/AiLeadRescueLanding.js`
- `components/RapidDeliveryRevenueDesk.js`
- `lib/server/tenant-intake.js`
- `lib/cmp/_lib/rapid-delivery-operator.js`
- `pages/contact.js`
- `pages/change/revenue.js`
- `node-tests/corpflow-market-gateway-699.test.mjs` (new)
- related readiness/flagship test updates

## Verification

- Focused #699 + related suites: pass
- `npm test`: 1818 pass / 0 fail
- `npm run build`: pass
- `git diff --check`: clean
- Screenshots (local Next on `:3010`): `/opt/cursor/artifacts/issue-699/`
  - `homepage-desktop.png`, `homepage-mobile.png`
  - `contact-enquiry-desktop.png`, `contact-enquiry-mobile.png`
  - `lead-rescue-desktop.png`, `website-rescue-demo-desktop.png`
- Synthetic operator mapping: `/opt/cursor/artifacts/issue-699/synthetic-enquiry-evidence.json`
  - Website Rescue synthetic id `synth699websiterescue` → reference `CF-RESCUE`
  - Lead Rescue synthetic id `synth699leadrescue01`
  - No live Postgres write in this environment (`POSTGRES_URL` unset)

## Tenant / Core boundary

- Apex marketing remains `corpflow_marketing` / tenant surface on `corpflowai.com`
- Lux rewrite and Core factory hosts untouched
- No env/secrets/DNS/schema/payment/messaging runtime changes

## Live corpflow_test after publish

Exact URL after Anton merge/publish: `https://corpflowai.com/` (and `/contact#discovery`, `/lead-rescue`, `/offers/premium-landing-page-rescue`).

## Operator packet (buyer path)

1. Buyer opens CorpFlowAI homepage → understands managed workflow offer within first screen.
2. Chooses a service path or product (Lead Rescue / Website Rescue).
3. Submits qualified enquiry (name, business, email, phone, website, problem, path, timing, consent).
4. Receives on-screen reference; nothing auto-sent externally.
5. Operator reviews at `/admin/rapid-delivery` (gateway/Website Rescue) or `/admin/lead-rescue` (USD pilot); copy-ready response draft available; `/change/revenue` links the desk.
