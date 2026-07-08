# CODEX_PACKET_V1 — Cursor Apply-Ready Execution Packet

## Purpose

Provide a reusable, apply-ready execution packet template for Cursor work in the CorpFlowAI Command Center repository.

This template ensures future implementation work has a clear scope, target files, verification commands, explicit non-actions, warnings, assumptions, and stop conditions before code is changed.

## Business outcome

Increase delivery reliability by reducing ambiguous implementation starts, preventing accidental production-impacting work, and making PR review faster.

This supports CorpFlowAI’s operating model: bounded execution, evidence-based verification, and no claims of operational completion without required delivery evidence.

## Linked issue/ticket

- Issue/ticket: `TBD`
- Replace `TBD` with the GitHub issue, CMP ticket, or internal work packet ID before implementation.

## Target branch suggestion

`codex/packet-v1-cursor-ready`

## Target files

This packet is docs-only.

`docs/execution/CODEX_PACKET_V1_CURSOR_READY.md`

## Implementation instructions

1. Create or update `docs/execution/CODEX_PACKET_V1_CURSOR_READY.md`.
2. Paste this packet into that file.
3. Do not modify application runtime code.
4. Do not modify API routes.
5. Do not modify Prisma schema or migrations.
6. Do not modify environment templates.
7. Do not add payment, email, WhatsApp, SMS, or external outreach runtime behaviour.
8. Do not deploy.
9. Do not use secrets.
10. Run the verification commands below.
11. Commit the documentation-only change.
12. Open a PR using the expected title and body structure below.

## Verification commands

Run these commands from the repository root:

```bash
git status --short
npm test
npm run build
```

## Expected PR title

`docs(execution): add CODEX_PACKET_V1 Cursor apply-ready template`

## Expected PR body

```markdown
## Summary

- Add `docs/execution/CODEX_PACKET_V1_CURSOR_READY.md` as the canonical Cursor apply-ready Codex packet template.
- Linked issue: #553

## Test plan

- [x] `git status --short` shows only the new doc file
- [x] `npm test` passes
- [x] `npm run build` passes
```

## Explicit non-actions

- No runtime or application code changes.
- No API route changes.
- No Prisma schema or migration changes.
- No environment template changes.
- No deployment.
- No secrets in repo, chat, or PR.
- No payment, email, WhatsApp, SMS, or external outreach runtime behaviour.
- No auth or security logic changes.
- No tenant routing changes.
- No client-facing route or copy changes.
- No scope expansion beyond the listed target files.

## Warnings / assumptions

- This packet is **docs-only**; operational completion for runtime work still requires live production verification per `.cursor/rules/delivery-reality.mdc`.
- Replace `TBD` in **Linked issue/ticket** with the real issue or CMP ticket before using this template for implementation work.
- Codex posts `CODEX_PACKET_V1` blocks to the Codex Packet Inbox ([#576](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/576)); Codex does not open PRs or deploy. Cursor applies listed files only.
- If a packet lists application code changes, Cursor must run `npm test` and `npm run build` in addition to any packet-specific verification commands.

## Stop condition

Stop after:

- PR opened against `main` with verification evidence, **or**
- A blocker that prevents safe completion (missing fields, scope violation, failing verification, or ambiguous target files).

Do not merge, deploy, or expand scope after stopping.
