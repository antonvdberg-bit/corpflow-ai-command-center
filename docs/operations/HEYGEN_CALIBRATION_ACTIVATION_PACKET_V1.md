# HeyGen calibration activation packet v1

**Status:** Prepared only. **Not authorised.** Phase B of [#1078](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1078) / follow-on from [#1143](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1143).  
**Protected actions:** `approval:env-secrets`, `approval:paid-tool`, `approval:payment`.  
**Anton action now:** **NONE.** Do not provision, spend, or render until this packet is explicitly approved.  
**Anchor sentinel:** `<!-- HEYGEN_CALIBRATION_ACTIVATION_PACKET_V1 -->`

<!-- HEYGEN_CALIBRATION_ACTIVATION_PACKET_V1 -->

This is the **exact** later gate for one 20–30 second calibration render. It does not authorise the two launch videos, website embed, YouTube upload, or any amount of spend until Anton fills the blanks below.

## Why this exists

Phase A proved the Video Spec, mock HeyGen adapter, and QC loop with **zero vendor calls**. Phase C of #1078 then needs one short calibration so machine QC can be compared with Anton’s own score **before** generating the two Website Rescue launch videos.

## What must be true before anyone calls HeyGen

1. Phase A specs remain valid: `npm run video-factory:validate`.
2. Anton has transferred/corporatised the HeyGen account (existing UI licence retained; **do not** buy Business/Enterprise).
3. Anton has assigned **fixed** avatar id and voice id (no generative selection).
4. Anton has approved an **exact** initial PAYG credit/spend cap for **one** calibration render only.
5. The API key is placed only in the approved secret store (Vercel Production or operator vault). **Never** in git, issues, chat, or logs.

## Exact consequential actions (each needs durable approval)

| Gate | Exact action | Fill in only when approving |
|------|----------------|-----------------------------|
| `approval:env-secrets` | Create secret **`HEYGEN_API_KEY`** in the approved store. Placeholder only until then. Do not add it to `.env.template` until this gate is approved. | store = ________ · date = ________ |
| `approval:paid-tool` | Enable HeyGen **PAYG API** on the existing account. Do not purchase a higher monthly licence. | confirmation = ________ |
| `approval:payment` | Authorise spend not exceeding **________** (Anton fills amount) for **one** calibration job of spec `cf-vid-wr-calibration-20s`. | cap = ________ · currency = ________ |

Wrong-scope approval (merge, deploy, public launch) does **not** unlock this packet.

## Exact render to run after approval

| Field | Value |
|-------|--------|
| Spec | `data/video-factory/specs/cf-vid-wr-calibration-20s.v1.json` |
| Duration window | 20–30 seconds |
| Aspect | 16:9 · 1920×1080 · 30 fps |
| Avatar id | replace `PENDING_ANTON_AVATAR_ID` with the fixed vendor id |
| Voice id | replace `PENDING_ANTON_VOICE_ID` with the fixed vendor id |
| Product / CTA / URL | Website Rescue · Request discovery · `https://corpflowai.com/website-rescue` |
| Publication | **Do not publish.** Do not embed. Do not upload to YouTube. |

Suggested later command (still blocked today):

```bash
# FORBIDDEN in Phase A. After durable approval only:
# 1. Set avatar.assignment=fixed and voice.assignment=fixed on the calibration spec.
# 2. Flip spec status from blocked_pending_phase_b to approved_for_calibration.
# 3. Use a future live transport that still refuses publication.
npm run video-factory:qc -- --id cf-vid-wr-calibration-20s --fixture pass
```

Live generate remains `LIVE_HEYGEN_CALL_BLOCKED` until a **separate** follow-up PR enables a guarded live transport **after** the three approvals above exist as durable comments.

## After the calibration file exists

1. Run QC (`PASS` / `FAIL` / `REVIEW`).
2. Anton scores the same render independently.
3. Compare machine score vs Anton verdict; adjust thresholds only in a bounded PR.
4. Only then consider Phase D (the two launch videos) as a **new** protected spend packet — not this one.

## Explicit non-actions

- No second video platform or database.
- No Website Rescue page publication.
- No YouTube publication.
- No live enquiry send.
- No schema/env change in Phase A.
- No spend above the cap Anton writes in the table.
