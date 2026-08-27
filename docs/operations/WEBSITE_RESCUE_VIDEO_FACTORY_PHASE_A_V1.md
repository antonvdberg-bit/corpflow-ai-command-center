# Website Rescue Video Factory Phase A v1

**Status:** Zero-spend implementation for [#1143](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1143). Parent: [#1078](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1078).  
**Environment:** `local` / repo on current `main`.  
**Anchor sentinel:** `<!-- WEBSITE_RESCUE_VIDEO_FACTORY_PHASE_A_V1 -->`

<!-- WEBSITE_RESCUE_VIDEO_FACTORY_PHASE_A_V1 -->

Phase A converts the recording-ready Website Rescue buyer journey into a machine-executable production packet **without** spending money, activating HeyGen credentials, publishing, or waiting on protected vendor setup.

## What this packet is

| Piece | Path |
|-------|------|
| Video Spec contract | `config/video-factory/video-spec.schema.json` |
| QC report contract | `config/video-factory/qc-report.schema.json` |
| Launch + calibration specs | `data/video-factory/specs/` |
| HeyGen mock fixtures | `data/video-factory/fixtures/heygen/` |
| QC PASS / FAIL / REVIEW fixtures | `data/video-factory/fixtures/qc/` |
| Adapter + QC runtime | `lib/video-factory/` |
| CLI | `scripts/video-factory/cli.mjs` |
| Example QC reports | `artifacts/video-factory/website-rescue-phase-a/` |
| #700 reconciliation | `docs/marketing/WEBSITE_RESCUE_VIDEO_PRODUCTION_PACKET_V1.md` |
| Later 20–30s gate | `docs/operations/HEYGEN_CALIBRATION_ACTIVATION_PACKET_V1.md` |

It reuses the existing walkthrough pipeline (`scripts/video/`) only as a **pattern**. This is not a second video platform, database, or orchestrator.

## Hard boundaries (still in force)

- No live HTTP to `api.heygen.com`.
- No API key activation and no new env var written into runtime config.
- No PAYG purchase or spend.
- No production deploy, website embed, or YouTube upload.
- No enquiry submit, DB/schema mutation, or external send.

If a later step needs live vendor access, stop at `LIVE_HEYGEN_CALL_BLOCKED`.

## Commands

```bash
npm run video-factory:validate
npm run video-factory:heygen-dry-run
npm run video-factory:qc -- --fixture pass
npm run video-factory:qc -- --fixture fail
npm run video-factory:qc -- --fixture review
node --test node-tests/website-rescue-video-factory-phase-a.test.mjs
```

`--live` on the dry-run CLI is a deliberate tripwire: it prints `LIVE_HEYGEN_CALL_BLOCKED` and exits 2.

## Completion verdict for this packet

`WEBSITE RESCUE VIDEO PHASE A READY FOR CALIBRATION GATE`

Anton action for Phase A: **NONE**. Phase B is the protected calibration packet.
