# #712 WS1 — Market activation unit-gate evidence

**Issue:** [#712](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/712)  
**Parent:** #711 · **Controller:** #710 · **Sources:** #699, #700, PR #708  
**Branch:** `cursor/dispatcher-issue-712-caf8`  
**Cursor agent:** https://cursor.com/agents/bc-79b2f699-7d5d-4439-b8a2-2f7b72174a17  
**Owner:** Cursor (implementation/testing/evidence)  
**ANTON ACTION:** NONE for this unit gate (no merge/deploy/outreach from this PR)

## Outcome for this PR

Verify conversion-critical market path for Lead Rescue and Website Rescue; fix only blockers that prevent operator handoff of consent / urgency / next action on Lead Rescue intakes.

## Live URL verification (corpflow_test / marketing production hosts)

| URL | HTTP | Notes |
|-----|------|-------|
| `https://corpflowai.com/` | **200** | Homepage; primary CTA → `/contact#discovery` |
| `https://corpflowai.com/contact#discovery` | **200** | Qualified enquiry form |
| `https://corpflowai.com/lead-rescue` | **200** | USD 150 pilot; CTA → `#intake` |
| `https://corpflowai.com/offers/premium-landing-page-rescue` | **200** | Website Rescue sellable offer |
| `https://corpflowai.com/demo/website-rescue` | **200** | Fictional before/after demo |
| `https://corpflowai.com/offers/ai-lead-rescue` | **200** | MUR sprint (separate path; not primary #712 CTA) |

## Desktop / mobile evidence

Screenshots under `/opt/cursor/artifacts/issue-712/screenshots/`:

- `homepage-desktop.png` / `homepage-mobile.png`
- `contact-discovery-desktop.png` / `contact-discovery-mobile.png`
- `lead-rescue-desktop.png` / `lead-rescue-mobile.png`
- `website-rescue-offer-desktop.png` / `website-rescue-offer-mobile.png`
- `website-rescue-demo-desktop.png` / `website-rescue-demo-mobile.png`

## Five-second offer review

| Product | Within ~5s buyer sees | Primary CTA | Verdict |
|---------|----------------------|-------------|---------|
| CorpFlowAI homepage | Managed workflow offer + path to conversation | **Request a qualified conversation** → `/contact#discovery` | Pass |
| AI Lead Rescue (`/lead-rescue`) | Stop losing leads; USD 150; 48-hour setup | **Start my 48-hour setup** → `#intake` | Pass |
| Website Rescue (`/offers/premium-landing-page-rescue`) | Weak landing → credible enquiry path; MUR from 45k | **Request discovery** → `#discovery` | Pass |

## Safe-claims review

| Surface | Finding |
|---------|---------|
| Homepage | Explicit: “We do not promise guaranteed revenue…” |
| Lead Rescue | Explicit no revenue/lead-volume guarantee; FAQ reinforces |
| Website Rescue offer/demo | No SEO/traffic/revenue guarantees; demo marked fictional |
| Forbidden CTA “Choose payment path” | Absent on verified product paths |

## Synthetic qualified enquiries (live `POST /api/tenant/intake`)

| Product | lead_id | reference | Key meta |
|---------|---------|-----------|----------|
| Website Rescue | `cmse9k7qf0000ji042lvyxpj8` | `CF-VYXPJ8` | `corpflow-rapid-delivery` / `premium-landing-page-rescue` / `website-digital` / urgency `asap` / consent true / source `corpflow-market-gateway` |
| Lead Rescue | `cmse9k7yl0005ji04fgzqyv8e` | *(lead_id)* | `ai-lead-rescue` / urgency `this-month` / consent true / source `ai-lead-rescue` / page `/lead-rescue` |
| Contact gateway (extra) | `cmse9xbdh000aji04eiytdgkt` | `CF-YTDGKT` | `client-lead-service` → offer `ai-lead-rescue` |

Validation negatives (live):

- Missing consent → `400 CONSENT_REQUIRED`
- Lead Rescue missing phone → `400 phone is required`

Full mapping JSON: `artifacts/issue-712-synthetic-enquiry-evidence.json`

## Operator-queue evidence

| Desk | Record | Source | Product | Consent | Urgency | Next action | Auto-send |
|------|--------|--------|---------|---------|---------|-------------|-----------|
| `/admin/rapid-delivery` | CF-VYXPJ8 | `corpflow-market-gateway` | Premium Landing Page Rescue | true | asap / As soon as practical | Review Website Rescue fit; share demo; book discovery… | **None** (copy draft only) |
| `/admin/lead-rescue` | `cmse9k7yl…` | `ai-lead-rescue` + `/lead-rescue` | AI Lead Rescue | true (surfaced after #712 fix) | this-month / Within this month | Review and reply within 2 business hours | **None** |

## Conversion-blocker fix in this PR

**Blocker:** Lead Rescue public form collected urgency + consent and `tenant-intake` persisted them, but operator parse/list/detail/UI did not surface them; NEW_INTAKE next action was empty until an operator typed one.

**Fix (narrow):**

- `lib/cmp/_lib/ai-lead-rescue-operator.js` — parse + project urgency, consent, website, source; default NEW_INTAKE next action
- `lib/server/tenant-intake.js` — require consent (and validate urgency) for AI Lead Rescue
- `components/AiLeadRescueAdminDetail.js` — show website, urgency, consent, source

**Not changed:** public shell redesign, campaign infra, paid ads, messaging automation, unrelated visuals.

## Defect classification

| ID | Defect | Class | Disposition |
|----|--------|-------|-------------|
| D1 | LR operator desk hid consent / urgency / default next action | **Blocker** | Fixed in this PR |
| D2 | LR intake accepted missing consent when field omitted from API body | **Blocker** | Fixed — consent now required |
| D3 | Docs/register still mention older mailto-primary offer CTAs | Non-blocker | Documented; live pages are form-first |
| D4 | Dual Lead Rescue surfaces (USD `/lead-rescue` vs MUR `/offers/ai-lead-rescue`) can confuse if linked wrongly | Non-blocker / enhancement | Homepage nav correctly points to `/lead-rescue`; MUR sprint remains separate |
| D5 | Authenticated admin desk screenshot of live synthetic rows not captured in-agent (no factory session) | Non-blocker for unit gate | Mapping proven via live create + same operator helpers; desk UI source contract tested |
| D6 | Flagship video / beauty polish on homepage | Enhancement | Out of anti-sidetrack scope |

## Requirements → test matrix

| Requirement | Test / evidence |
|-------------|-----------------|
| Live pages reachable | curl HTTP 200 table + screenshots |
| Desktop/mobile evidence | Playwright screenshots listed above |
| Synthetic WR + LR enquiry | Live POST results + JSON artifact |
| Operator source/product/consent/urgency/next action | `corpflow-market-path-712.test.mjs` + synthetic JSON |
| Five-second offer / one primary CTA | #712 tests + screenshot review |
| Safe claims | #712 tests + live HTML review |
| No auto-send | Desk source contract + intake success without outbound |
| Focused unit tests | `node-tests/corpflow-market-path-712.test.mjs` (+ LR operator test update) |
| Relevant suite + build | Recorded in PR verification section |

## Recording-ready script / shot list

See `artifacts/issue-712-recording-script-and-shot-list.md` — aligned to the verified screens above. **Do not start video production until ChatGPT conversion review accepts screens.**

## Delivery Reality Audit (unit gate only)

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO (PR only; do not merge)
- Production deployment ID: n/a — no deploy from this lane
- Commit deployed: n/a for fix (live create used currently deployed #708 path; LR operator UI fix pending merge/deploy)
- Live URLs tested: corpflowai.com /, /contact#discovery, /lead-rescue, /offers/premium-landing-page-rescue, /demo/website-rescue
- Expected vs actual result: pages 200; synthetic intakes created; operator mapping proven; LR consent/urgency UI fix in PR only
- Client-facing flow usable: YES for intake create on live hosts; YES for operator mapping helpers; PARTIAL for LR desk UI until fix deploys
- Final verdict: PARTIAL (unit-gate evidence complete; no merge/deploy; system test 12 Aug and integrated test 14 Aug remain)
```

## Explicit non-actions

- No merge, no Vercel deploy, no env/secrets, no schema/DB migrations beyond existing lead rows created via public API
- No client outreach / email / WhatsApp / SMS send
- No campaign infrastructure, paid ads, or public-shell refactor
