# scripts/video/ — LR-Proof-2 video pipeline runtime

Operator-facing notes for the server-side video generation pipeline implemented per `docs/marketing/LR_PROOF_2_VIDEO_PIPELINE_PROPOSAL.md` and approved on Operator Bridge #249 (eight § 16 decisions, 2026-05-29).

## Files

| File | Purpose |
|---|---|
| `validate.mjs` | Validates a walkthrough YAML against `data/walkthroughs/_shared/walkthrough.schema.json` and refuses any `mock.real_*` flag set to `true`. |
| `serve-mock.mjs` | Tiny static HTTP server (no deps) that serves the YAML's `mock.served_from` directory on `mock.base_url`. Used during a render. |
| `run-walkthrough.mjs` | Drives headless Chromium through the YAML's beats and records the raw WebM at `.artifacts/raw/<basename>.webm` plus a per-beat actual-timing log at `.artifacts/raw/<basename>.run.log.json`. |
| `encode-mp4.mjs` | FFmpeg wrapper that re-encodes the WebM to MP4, burns in captions per beat (`drawtext` with the shared `captions.style.json`), and writes a companion `.vtt`. |
| `write-provenance.mjs` | Emits `.artifacts/<basename>.provenance.json` — the audit-trail anchor (YAML SHA, repo commit, runner versions, sign-off fields ready to fill in at Phase 2). |

## End-to-end (CI)

The GitHub Actions workflow `.github/workflows/generate-walkthrough-video.yml` chains the scripts in order and uploads `.artifacts/` as a single workflow artifact. Trigger is `workflow_dispatch` only — no automatic runs on push, no schedule.

## End-to-end (local — for development only)

The pipeline is designed to run in CI. Local runs require Node 22+, Playwright browsers (`npx playwright install chromium`), and FFmpeg on `PATH`. The pipeline does not depend on any production env var, secret, or network resource.

```sh
# Validate the YAML
node scripts/video/validate.mjs --id CF-VID-0001

# Start the mock server in the background (serves data/walkthroughs/_mocks/lead-rescue-v1/)
node scripts/video/serve-mock.mjs --id CF-VID-0001 &

# Record (writes .artifacts/raw/lead-rescue-walkthrough-v1.webm + run.log.json)
node scripts/video/run-walkthrough.mjs --id CF-VID-0001

# Encode (writes .artifacts/lead-rescue-walkthrough-v1.mp4 + .vtt + encode.summary.json)
node scripts/video/encode-mp4.mjs --id CF-VID-0001

# Provenance (writes .artifacts/lead-rescue-walkthrough-v1.provenance.json)
node scripts/video/write-provenance.mjs --id CF-VID-0001
```

## Hard limits

Per `docs/marketing/LR_PROOF_2_VIDEO_PIPELINE_PROPOSAL.md` § 11 and the Operator decision recording the eight § 16 defaults:

- No real client data, no real PII, no real `tenant_id`, no real Telegram resources may appear in any frame, caption, mock, or provenance file.
- The runner refuses to start if any `mock.real_*` flag is `true`.
- No `.mp4` / `.vtt` / video files are committed to the repo by this pipeline. Outputs land in `.artifacts/` (gitignored). Phase 2 commits them under `public/assets/video/<surface>/` only after Anton signs off the cut.
- Captions cannot assert a number or claim that the live `https://corpflowai.com/lead-rescue` page does not already assert.

## Sign-off (LR-Proof-1 Decision 7 — unchanged)

After the workflow finishes, Anton downloads the artifact (`gh run download <run-id>` or via the Actions UI), watches the `.mp4`, reads the `.vtt`, inspects the `.provenance.json`, and posts an `### Operator decision` on #249 either approving the cut (which authorises Phase 2) or rejecting (the YAML or mocks are edited; workflow re-runs).

## Outputs (where things land)

| File | Pre-sign-off | Post-sign-off (Phase 2 PR) |
|---|---|---|
| `<basename>.mp4` | `.artifacts/` (in workflow artifact, 90-day retention) | `public/assets/video/<surface>/<basename>.mp4` |
| `<basename>.vtt` | `.artifacts/` | `public/assets/video/<surface>/<basename>.vtt` |
| `<basename>.provenance.json` | `.artifacts/` | `public/assets/video/<surface>/<basename>.provenance.json` |

## See also

- `docs/marketing/LR_PROOF_2_VIDEO_PIPELINE_PROPOSAL.md` — full design (677 lines)
- `docs/marketing/PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` — buyer-trust rationale
- `docs/runbooks/OPERATOR_BRIDGE.md` — bridge protocol for sign-off
- `.github/workflows/generate-walkthrough-video.yml` — CI orchestration
