# CorpFlowAI video optimisation workflow

## Purpose and separation

Use this workflow only after content approval. It creates a smaller website copy with free, open-source FFmpeg; it does not publish, deploy, or upload anything.

- Approved immutable masters: `artifacts/video-masters/`
- Generated website assets: `public/media/corpflowai/`

Master MP4 files are ignored by Git. Keep them as the recovery source and never use a master path as the output.

## Prerequisites and command

The primary execution home is the operator-controlled repo clone on `corpflow-exec-01-u69678`, not Anton's laptop. This remains an interactive L3 tool: no daemon, cron, public port, production secret, database access, or deploy capability is added.

Per `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`, Anton performs installation in his SSH session. Cursor authors the command but does not execute L3 changes:

```bash
ssh anton@5.78.213.185

set -Eeuo pipefail
hostname
sudo apt-get update
sudo apt-get install -y ffmpeg
command -v ffmpeg
command -v ffprobe
ffmpeg -version | awk 'NR == 1'
ffprobe -version | awk 'NR == 1'
```

Expected hostname: `corpflow-exec-01-u69678`. Stop if the hostname differs. The package comes from Ubuntu's free repository and requires no account or secret.

After an approved merge, update the existing server clone:

```bash
cd ~/corpflow-ai-command-center
git switch main
git pull --ff-only origin main
```

For pre-merge verification, use the draft PR branch in a separate server worktree so the main clone is not disturbed:

```bash
cd ~/corpflow-ai-command-center
git fetch origin feat/video-optimisation-workflow
git worktree add --force ~/corpflow-video-optimisation \
  origin/feat/video-optimisation-workflow
cd ~/corpflow-video-optimisation
```

Transfer an approved master to that ignored server directory once, from the operator's SSH-capable terminal:

```bash
scp "<approved-master.mp4>" \
  anton@5.78.213.185:~/corpflow-video-optimisation/artifacts/video-masters/approved-master.mp4
```

Compare SHA-256 checksums before and after transfer. Do not delete the handoff source until the server copy and its backup posture are separately confirmed.

```bash
npm run video:optimise -- \
  artifacts/video-masters/ai-lead-rescue-final-master.mp4 \
  public/media/corpflowai/ai-lead-rescue-final-web.mp4
```

Defaults are H.264, CRF 24, preset `slow`, AAC 128 kb/s, MP4 fast start, and the source resolution and frame rate. Explicit overrides are available only when an approved delivery specification requires them:

```bash
VIDEO_CRF=23 VIDEO_SCALE=1280:-2 VIDEO_FPS=30 npm run video:optimise -- \
  artifacts/video-masters/example-final-master.mp4 \
  public/media/corpflowai/example-final-web.mp4
```

## Output and quality gates

The command prints a `VIDEO_OPTIMISATION_RESULT` block with:

- input and output size;
- compression percentage;
- input/output duration and difference;
- resolution and frame rate;
- video and audio codecs;
- output bitrate;
- SHA-256 checksum.

It fails and removes a newly generated invalid output when the input is missing/unprobeable, audio is absent, output already exists, output is not H.264/AAC MP4, an audio stream is lost, resolution or frame rate changes without an override, duration differs by more than 0.5 seconds, or output exceeds input size.

The script never overwrites an existing file. Delete a rejected web copy deliberately before retrying.

## Recommended size targets

- Aim for **8–25 MiB** for a typical 60–90 second website video.
- Treat **25–50 MiB** as acceptable only after Preview performance checks.
- Keep web assets below GitHub's practical 50 MiB warning threshold.
- Stop before commit near 100 MiB; review CRF or an explicitly approved resolution reduction.

CRF controls quality, not exact size. Start at 24 and compare motion, text, image quality, and audio against the master.

## Local and Preview verification

Before opening or updating the PR:

1. Save the complete result block.
2. Play the local output through the end; test audio and seeking.
3. Confirm duration, resolution, file size, and SHA-256.
4. Run `npm test`, `npm run build`, and `git diff --check`.
5. Confirm only the intended web MP4 is tracked and the master remains ignored.

After Vercel creates a Preview:

1. Test the CorpFlowAI page on desktop and a 390 px mobile viewport.
2. Confirm clean 16:9 presentation, usable controls, audio, seeking, no sound autoplay, and no horizontal overflow.
3. Check the browser console for video errors.
4. Confirm `video/mp4` delivery and byte-range support.
5. Confirm Core, LuxeMaurice, Living Word Mauritius, AI Lead Rescue, and other tenant surfaces are unchanged.
6. Record the Preview URL and evidence in the PR.

The path-filtered `Verify website videos` GitHub Action installs FFmpeg and probes tracked MP4 assets. It never generates commits, pushes files, or deploys.

## Rollback

Before merge, remove the generated web MP4 and any page reference from the branch. After a future approved release, revert the website-asset commit through the normal reviewed process. The master is not part of rollback.

To remove the server tool if this execution path is retired:

```bash
sudo apt-get remove --purge -y ffmpeg
```

Do not run `autoremove` as part of this rollback; unrelated server packages must remain untouched.

Masters must remain untouched because encoding is lossy. Re-encoding a web copy compounds quality loss and destroys the trustworthy source needed for checksums, alternate delivery sizes, and corrected exports.
