# Jan decision flow evidence (#1080)

Synthetic local/test surface. No production deployment. No protected action.

## Flow
1. Reviewer signs in as Jan (`jan@luxemaurice.com` on tenant `luxe-maurice`).
2. Opens `/rare-exclusive/review`.
3. Sees one review item and Issue #35 in a separate “Before we can release” section.
4. Chooses Approve / Request changes / Hold / Ask AI.
5. System records the decision against the exact head SHA and writes durable GitHub-shaped evidence.
6. Repeat of the same decision on the same SHA is idempotent.
7. A changed SHA is rejected (`STALE_SHA`). Factory operators cannot record Jan’s decision.

## Commands
```bash
node --test node-tests/jan-approval-control.test.mjs
```
