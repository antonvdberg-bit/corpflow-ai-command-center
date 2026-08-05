# GTM Integrated Scenarios — Result (#711)

**Status:** EXECUTED against final merged `main`  
**Anchor:** `<!-- GTM_INTEGRATED_SCENARIOS_711_RESULT_V1 -->`

<!-- GTM_INTEGRATED_SCENARIOS_711_RESULT_V1 -->

**Final verdict:** READY FOR CONTROLLED CLIENT PILOT

This is **synthetic simulation evidence**. It does **not** claim live client delivery, active messaging, real Website Rescue DNS/cutover, or production acceptance for a real client.

---

## 1. Final main

| Field | Value |
| ----- | ----- |
| HEAD | `ce496c0a983341b25f2022a21bef5989360abf3a` |
| Includes #755 | YES (`dee46d35250ccfa34c6c083e598b699d4dbca0a1`) |
| Includes #745 | YES (`b9a766cf9669d7b52e615257dfe5271f2a8db3e0`) |
| Includes #742 | YES (`ce496c0a983341b25f2022a21bef5989360abf3a`) |
| Working tree at verification start | clean |
| Agent run | `bc-3632b03b-f16a-4103-ae41-f18b36afffd0` |
| Run ID | `GTM-711-FINAL-MAIN-20260805` |

---

## 2. Combined test totals (final main)

| Command | Result |
| ------- | ------ |
| Focused GTM suites (14 files) | **294 pass / 0 fail** |
| `npm test` | **2069 pass / 0 fail** |
| `npm run build` | **exit 0** |
| `git diff --check` | **clean (exit 0)** |

Focused files included: prospect maturation unit + system-proof; Lead Rescue onboarding/delivery + system-proof; Website Rescue onboarding/delivery + system-proof; commercial approval rail; buyer-need / market path / market gateway; AI Lead Rescue operator; rapid-delivery GTM; prospect operations view-model; Website Rescue sellable slice.

---

## 3. System-proof CLI re-runs (final main)

| CLI | Outcome | Notes |
| --- | ------- | ----- |
| `node scripts/prospect-maturation-system-proof.mjs` | `ok: true` | LR → `proposal_sent`; WR → `proposal_ready`; `external_sends_executed: []` |
| `node scripts/lead-rescue-system-proof.mjs` | `ok: true` | → `acceptance_ready`; messaging unauthorized; `external_sends_executed: []` |
| `node scripts/website-rescue-system-proof.mjs` | `ok: true` | → `acceptance_ready`; deploy/DNS simulated; no real DNS/deploy |

Package fixture IDs (stable for those CLIs): `OPP-SYN-LR-SYS-715-001`, `OPP-SYN-WR-SYS-716-001`, maturation `PM-SYS-*`.  
**Fresh integrated IDs** for this programme run are under Scenario A/B below (do not treat fixture IDs as the #711 run IDs).

---

## 4. Market-path regression

Live GET (corpflow_test / production spine):

- `https://corpflowai.com/contact` → 200; single `What do you need help with?`; `name="buyer_need"` present; **Preferred service path** / **Related product sprint** absent
- `/lead-rescue` → 200
- `/offers/premium-landing-page-rescue` → 200

Deterministic regression (`runMarketPathRegression`):

- five buyer-need options
- Lead Rescue / Website Rescue internal maps correct
- contradictory service/product pair rejected
- locked offer paths retain product context
- no automatic external action

---

## 5. Scenario A — Lead Rescue (PASS)

| Field | Value |
| ----- | ----- |
| Enquiry | `INT-SYN-711A-20260805-001` |
| Prospect | `PM-INT-711A-LR-20260805-001` |
| Opportunity | `OPP-SYN-711A-LR-20260805-001` |
| FA ref | `FA-SYN-711A-LR-20260805-001` |
| Final prospect stage | `proposal_sent` |
| Final delivery state | `acceptance_ready` |
| Messaging runtime | unauthorized |
| External sends | `[]` |
| Production client deploy | false |

Ledger steps (all ok): market classification → ack draft-only → owner gate blocks → maturation walk → FA missing blocks → FA handoff → delivery gate blocks → delivery to `acceptance_ready`.

Artifact: `artifacts/gtm-integrated-711/scenario-a-ledger.json`

---

## 6. Scenario B — Website Rescue (PASS)

| Field | Value |
| ----- | ----- |
| Enquiry | `INT-SYN-711B-20260805-001` |
| Prospect | `PM-INT-711B-WR-20260805-001` |
| Opportunity | `OPP-SYN-711B-WR-20260805-001` |
| FA ref | `FA-SYN-711B-WR-20260805-001` |
| Final prospect stage | `proposal_ready` |
| Final delivery state | `acceptance_ready` |
| Deploy approval | simulated |
| Real DNS cutover | false |
| Real client production deploy | false |
| External sends | `[]` |

Ledger steps (all ok): locked-offer classification → ack draft-only → maturation walk → FA missing blocks → FA handoff → content/assets/access gates block → delivery with revision + simulated deploy/DNS → `acceptance_ready`.

Artifact: `artifacts/gtm-integrated-711/scenario-b-ledger.json`

---

## 7. Defects

**NONE**

---

## 8. Explicit non-claims

- Not a live client delivery
- Messaging is **not** active
- No real Website Rescue DNS or production cutover
- No production acceptance for a real client based on this simulation alone

---

## 9. How to re-run

```bash
git checkout main && git pull --ff-only origin main
node --test node-tests/prospect-maturation.test.mjs node-tests/prospect-maturation-system-proof.test.mjs \
  node-tests/lead-rescue-onboarding-delivery.test.mjs node-tests/lead-rescue-system-proof.test.mjs \
  node-tests/website-rescue-onboarding-delivery.test.mjs node-tests/website-rescue-system-proof.test.mjs \
  node-tests/commercial-approval-rail.test.mjs node-tests/corpflow-discovery-buyer-need-712.test.mjs \
  node-tests/corpflow-market-path-712.test.mjs
node scripts/prospect-maturation-system-proof.mjs
node scripts/lead-rescue-system-proof.mjs
node scripts/website-rescue-system-proof.mjs
node scripts/gtm-integrated-scenarios-711.mjs
```

Composer: `lib/gtm/integrated-scenarios-711.js`
