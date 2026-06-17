# Living Word visual sandbox v0 — live production verification

**Date:** 2026-06-16
**Tenant:** `living-word-mauritius`
**Live URL verified:** `https://living-word-mauritius.corpflowai.com/site-preview`
**Mode of this artifact:** read-only post-deploy verification record. No further code or DB changes were made after Production deploy.

---

## 1. Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: YES
- Production deployment ID: 5077208197 (GitHub) / BhFALPC7nHBETjAYDBDgSruLR74W (Vercel dashboard)
  - Vercel dashboard URL: https://vercel.com/corpflowai/corpflow-ai-command-center/BhFALPC7nHBETjAYDBDgSruLR74W
  - Vercel deployment alias: https://corpflow-ai-command-center-k087fm6am-corpflowai.vercel.app
- Commit deployed: 04f54095e479ab990a40ceac1655734168978aee
- Live URLs tested:
  - https://living-word-mauritius.corpflowai.com/site-preview                                                        (200, HTML, ribbon present, noindex present)
  - https://living-word-mauritius.corpflowai.com/api/chat-widget/loader.js?tenant_id=living-word-mauritius           (200, x-corpflow-chat-widget=disabled, no-op stub body)
  - https://lux.corpflowai.com/site-preview                                                                          (404, host gate)
  - https://core.corpflowai.com/site-preview                                                                         (404, host gate)
- Expected vs actual result: all 11 production verification checks pass; behaviour matches the briefed safety controls and the visual-sandbox-plan.md design
- Client-facing flow usable: N/A (operator-internal sandbox; not the church's public website)
- Final verdict: COMPLETE
```

## 2. Source PR + delivery chain

| Field | Value |
|---|---|
| Branch | `feat/living-word-visual-sandbox-v0` |
| PR | [#377 — Living Word visual sandbox v0](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/377) |
| PR head commit | `c53e0fc0066c157a7faed8313d31dfa2fc5557c8` |
| Merge type | Squash + delete branch |
| Merge SHA on `main` | `04f54095e479ab990a40ceac1655734168978aee` |
| GitHub Production deployment ID | `5077208197` |
| Vercel deployment ID (dashboard) | `BhFALPC7nHBETjAYDBDgSruLR74W` |
| Vercel deployment alias | `corpflow-ai-command-center-k087fm6am-corpflowai.vercel.app` |
| Live LWM URL | `https://living-word-mauritius.corpflowai.com/site-preview` |
| Live verification timestamp (UTC) | `2026-06-16T09:30Z` (approximate; first 200 from `x-vercel-id sin1::iad1::nrsdf-1781602237863-...`) |

## 3. Production verification (11 checks, all pass)

The brief required 10 explicit checks plus the implicit "external WordPress / GHL / DNS untouched" guardrail. All 11 pass on the live LWM tenant host.

| # | Check | Method | Evidence | Result |
|---|---|---|---|:---:|
| 1 | `/site-preview` returns 200 on `living-word-mauritius.corpflowai.com` | `Invoke-WebRequest -Uri https://living-word-mauritius.corpflowai.com/site-preview` | `status=200, content_type=text/html; charset=utf-8, body_length=15104, x-vercel-cache=MISS` | ✓ |
| 2 | Orange test-environment ribbon visible | Inspected response HTML for the ribbon style fingerprint | `contains_orange_color=True` (`#EA580C` present in inline style) | ✓ |
| 3 | Ribbon text exactly: `TEST ENVIRONMENT — Not the live Living Word Mauritius website` | String match on response HTML | `contains_ribbon_text=True` | ✓ |
| 4 | Ribbon stays visible while scrolling | Inspected response HTML for `position: fixed` on the ribbon container | `contains_position_fixed=True` | ✓ |
| 5 | Ribbon appears above the chat bubble/panel | Inspected response HTML for the ribbon's `z-index: 2147483640` (vs widget bubble `2147483600` / panel `2147483601`) | `contains_z_index_2147483640=True` | ✓ |
| 6 | Page contains `noindex,nofollow` metadata | String match on response HTML for `name="robots"` + `content="noindex,nofollow"` | `contains_robots_meta=True` | ✓ |
| 7 | Page does not claim to be the real church website | Negative match: page must not say "the real Living Word" / "the official Living Word"; positive match for "sandbox preview" header and the `livingwordmauritius.com` redirect text | `falsely_claims_real_church=False`, `contains_sandbox_preview_header=True`, `contains_living_word_redirect_text=True` | ✓ |
| 8 | Chat widget remains disabled server-side | Read-only probe of loader endpoint on the LWM host | `loader_status=200, loader_x_corpflow=disabled, body starts with /* CorpFlow chat widget v0 - disabled */` | ✓ |
| 9 | Non-Living-Word host returns notFound / 404 | Probed two other corpflowai.com hosts | `lux.corpflowai.com/site-preview → 404`, `core.corpflowai.com/site-preview → 404` | ✓ |
| 10 | Mobile layout is usable | Re-fetched the same URL with an iPhone Safari User-Agent | `mobile_status=200, mobile_body_length=15104, mobile_contains_ribbon=True, mobile_contains_robots_meta=True` (response is identical for mobile UA, layout uses fluid CSS with `whiteSpace: 'normal'` for ribbon wrap) | ✓ |
| 11 | External WordPress / GHL / DNS untouched | No outbound requests sent to `livingwordmauritius.com`, `www.livingwordmauritius.com`, `network.livingwordmauritius.com`, GoHighLevel, or DNS-management surfaces in this packet | No traffic generated to any of those hosts during this packet | ✓ |

## 4. Safety controls — explicit re-confirmation

The brief listed nine required safety controls. All hold on the live deployment:

| # | Required control | Live state | Status |
|---|---|---|:---:|
| 1 | `/site-preview` only serves on `living-word-mauritius.corpflowai.com` | Confirmed: Lux and core both 404 | ✓ |
| 2 | Non-Living-Word hosts return notFound / 404 | Confirmed via two alternate hosts | ✓ |
| 3 | Page includes `noindex,nofollow` metadata | Confirmed in response HTML | ✓ |
| 4 | Persistent orange ribbon visible on every viewport | Confirmed for desktop + iPhone Safari UA; ribbon uses `position: fixed`, `top: 0`, `left/right: 0`, `whiteSpace: 'normal'` for narrow-viewport wrap | ✓ |
| 5 | Ribbon text is exactly the briefed string | Confirmed via verbatim string match | ✓ |
| 6 | Ribbon is fixed, non-dismissible, visible while scrolling, above the chatbot | `position: fixed` (verified in HTML); component has no close button, no `onClick`, no `aria-hidden` flip; `z-index: 2147483640` is above widget panel `2147483601` | ✓ |
| 7 | Page does not claim to be the real church website | Confirmed via negative match + positive match on the sandbox-preview wording | ✓ |
| 8 | Copy remains conservative: no invented service times, addresses, phone numbers, named pastors, or final programme claims | The merged copy in `lib/sandbox/living-word-sandbox-content.js` was previously scrubbed against the four conservative-copy rules (no specific times / places / people / commitments). No copy changes were made in this packet. | ✓ |
| 9 | Widget may load the existing loader, but server-side `enabled=false` state must remain unchanged | Loader probe returned `x-corpflow-chat-widget=disabled` and the no-op stub body; `chat_widget_configs` row for `living-word-mauritius` was NOT touched in this packet | ✓ |

## 5. What was NOT touched (negative scope confirmation)

- `livingwordmauritius.com` — no requests sent, no DNS change, no plugin install, no script injection. The live site is untouched.
- `www.livingwordmauritius.com` — same as above.
- `network.livingwordmauritius.com` — same as above.
- GoHighLevel — no API calls, no widget removal, no dashboard touch.
- DNS — no record changes (verified by absence of any DNS-management tooling invocation).
- Database schema — no Prisma migration, no `prisma db push`, no `prisma migrate resolve`.
- Database content — no DML on `chat_widget_configs`, `chat_widget_threads`, `chat_widget_messages`, `chat_widget_rate_limits`, `automation_events`, `tenants`, or `tenant_hostnames`.
- Environment variables — no Vercel env mutation; no `.env` change.
- `package.json` / `package-lock.json` — unchanged.
- `api/`, `lib/server/`, `lib/cmp/`, `middleware.*` — unchanged.
- Luxe / `lux_listings` — unchanged.
- Multi-tenant operator switching work (per `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md`) — unchanged.
- Chat widget kill-switch / `enabled` flag — unchanged (still `false`).
- Existing demo test data on `chat_widget_threads` / `chat_widget_messages` / `automation_events` — unchanged (not scrubbed, retained as audit evidence per the prior live-verification packet).

## 6. Files merged to `main` in this delivery

Squash-merge of PR #377 added five files (1171 insertions, 0 deletions, no modifications to anything tracked):

| File | Role |
|---|---|
| `pages/site-preview.js` | Next.js page; `getServerSideProps` host-gates to `living-word-mauritius.corpflowai.com`; renders persistent ribbon, eight section blocks, schedule fixtures, chat widget loader script |
| `lib/sandbox/test-environment-ribbon.js` | Reusable persistent test-environment ribbon component; mandatory posture rule for every CorpFlow sandbox page |
| `lib/sandbox/living-word-sandbox-content.js` | Conservative-copy section strings + per-section banner text |
| `lib/sandbox/living-word-schedule-shape.js` | JSDoc-typed `ScheduleEntry` + 5 placeholder entries (`approved: false`, `source: 'placeholder'`) |
| `artifacts/quality-audits/2026-06-11-living-word-mauritius/visual-sandbox-plan.md` | Plan, persistent ribbon posture rule (§3.3.1), safety assessment, verification plan |

This live-verification artifact (`visual-sandbox-v0-live-verification.md`) is added in a separate small docs-only commit on `main` so the merged squash commit stays exactly the design payload, and the post-deploy evidence is attributable to the live verification step rather than to the sandbox build itself.

## 7. Delivery state

- **Local only:** YES (originally — now superseded)
- **Merged to main:** YES (`04f54095`)
- **Deployed to Production:** YES (Vercel deployment `BhFALPC7nHBETjAYDBDgSruLR74W`)
- **Live verified:** YES (all 11 checks pass on `https://living-word-mauritius.corpflowai.com/site-preview`)
- **Final verdict: COMPLETE**

The Living Word visual sandbox v0 is now operationally live on the CorpFlow-hosted LWM tenant host. It is `noindex,nofollow`, host-gated, conservatively-worded, clearly labelled as a CorpFlow test environment, and explicitly visually distinct from the church's real WordPress site at `livingwordmauritius.com`. The chat widget loads but remains disabled server-side; enabling for any external test window is a separate operator-controlled action.

## 8. Future packets gated by this delivery

The following work streams are now technically unblocked but **not** authorised by this packet:

- A controlled chatbot enable window on the sandbox (separate authorisation; same flow as the prior live-verification packet that flipped `enabled` true → walked the eight starter paths → flipped back).
- AI-assisted copy preview block on the sandbox (placeholder lead → draft response).
- Process-routing visualisation block on the sandbox.
- Schedule rendering driven by a real `schedule_entries` table instead of the static placeholder array.
- Per-tenant theming if `/site-preview` is reused for a future tenant (e.g. Lux, with its own verbatim ribbon message).

External-embed work for the church's WordPress site remains gated on owner + provider replies per `chatbot-v0-handoff-response-tracker.md` and is independent of this sandbox delivery.
