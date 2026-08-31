# Temporal Factory real-production pilot — exact activation packet

**Issue:** [#1130](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1130)  
**Who runs this:** Anton, in the GitHub UI, after the #1130 PR is merged to `main`.  
**Who must not run this:** Cursor Cloud / this factory worker.

<!-- TEMPORAL_FACTORY_PILOT_ACTIVATION -->

This is the **only** remaining protected action for the 72-hour real-work pilot.
Do not SSH. Do not mint a token. Do not add a Vercel / `.env.template` secret.
Do not disable Queue Reconcile, lifecycle, CI repair, or n8n.

## Exact clicks (in this order)

1. **Merge** the #1130 PR to `main` after CI is green (ordinary merge authority).
2. On issue **#1130**, comment exactly:

   ```text
   OPERATOR APPROVAL — PROCEED THROUGH TEMPORAL REAL-PRODUCTION PILOT ACTIVATION
   ```

3. GitHub → this repository → **Settings** → **Secrets and variables** → **Actions** → **Variables** → **New repository variable**:
   - Name: `CORPFLOW_TEMPORAL_PILOT`
   - Value: `active`
4. GitHub → **Actions** → workflow **CorpFlowAI Factory Temporal Pilot** → **Run workflow** → branch `main` → **Run workflow**.

That is the entire activation. The gated 5-minute schedule then supervises real GitHub factory work and may `workflow_call` **CorpFlowAI Cursor Factory Handoff** when eligible work exists and WIP permits.

`CORPFLOW_TEMPORAL_PILOT=active` does not increase Cursor capacity: #1249 enforces one active Cursor implementation lane across every wake path. This activation packet still does **not** change any other secret or live variable beyond the existing `CORPFLOW_TEMPORAL_PILOT` contract.

## What this does not authorize

- Starting or configuring Temporal on `corpflow-exec-01`
- New GitHub / Vercel / box secret or PAT
- Disabling `CorpFlowAI Factory Queue Reconcile` or any other live supervisor
- Production / client deploy, schema, env, payment, send, or public launch
- Creating synthetic factory tickets to make Temporal look busy

## Immediate verification (after step 4)

1. The Temporal Pilot workflow run on `main` succeeds.
2. If it wakes Handoff, the Handoff run shows `wake_reason=temporal_supervisory` and still uses the current Cloud Agents / Handoff executor — not the legacy API dispatcher.
3. No second Cursor run appears on an issue that already has a current-generation `bc-*` / `run-*`.
4. Queue Reconcile is still enabled.

If any of those fail: use `docs/runbooks/TEMPORAL_FACTORY_PILOT_ROLLBACK.md` and stop.
