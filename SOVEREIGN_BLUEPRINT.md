# Sovereign Factory Blueprint (v1)
Version: `1.0`
Last Updated: `2026-03-26`

This blueprint describes how to run the CorpFlow AI “Sovereign Factory” in a Cloud Codespace environment with durable governance (Vanguard schemas + secret manifests) and robust self-improvement loops (researcher + architect + memory).

---

## Bypass Architecture: Unified Serverless Gateway

**Problem:** Managed hosts (notably Vercel **Hobby**) limit how many **serverless functions** a project may deploy. Flat `api/**/*.js` layouts consume one function per file, which collides with a lean production stance and with caps that block shipping Sentinel, CMP/Notary, factory helpers, and crons together.

**Production shape today:** one public Node entry — `api/factory_router.js` — fronts every `/api/*` request. Routing is declarative in `vercel.json` (path → `factory_router` with an `__path` parameter). Implementation code is **not** in `api/` except that single file; handlers and CMP live in `lib/server/`, `lib/cmp/`, and `lib/factory/`.

**Why consolidate (operating principle):**

- **Governance:** Fewer deploy units means fewer surfaces to audit for env vars, cold-start behavior, and version skew.
- **Execution:** One bundle path improves caching and reduces duplicate runtime initialization—aligned with “high-speed execution” on small plans.
- **Compatibility:** External URLs are unchanged (`/api/cmp/...`, `/api/audit`, cron paths, etc.), so tenants and static assets do not need rewrites when you move logic between `lib/` modules.

When reasoning about HTTP in this repo, treat **`api/factory_router.js` + `vercel.json`** as the gateway contract and **`lib/**` as the machinery factory floor.

---

## Online Researcher (Gemini 1.5 Pro Search → Factory Logic Updates)

Goal: keep Factory behavior aligned with new APIs, security guidance, and known reliability patterns by using Gemini 1.5 Pro’s **search tools** to pull the latest verified information, then propose changes via PRs.

Key requirements:
- Use search-capable Gemini 1.5 Pro (not the default agent runtime model).
- All proposed changes must be validated by CI (tests + schema validation).
- No secrets may be committed; proposals must reference env var names only.

Workflow (high level):
1. Detect triggers (cron daily, or when “telemetry-v1” reports recurrent logic failures).
2. Search for “Agent runtime updates” scoped to:
   - MCP best practices
   - Baserow database API reliability changes
   - Vercel serverless constraints (read-only FS, timeouts, function-count caps — see **Bypass Architecture: Unified Serverless Gateway** above)
   - Gemini tool/search changes
3. Produce a “Research→Diff” artifact:
   - summary (what changed)
   - evidence links (sources)
   - proposed patch list (file paths + intent)
4. Validate “candidate changes” locally (CI in the GitHub Action section below).
5. Create a PR targeting `main` or the appropriate release branch.

Suggested implementation approach:
- Implement `research/online_researcher.py` (or JS) as a pure “proposal generator”:
  - Input: list of failure signatures from Vanguard telemetry (logic_failure events).
  - Output: a change proposal object + patch suggestions.
- Gate changes by schema validation:
  - `vanguard/*.json` JSON schema validation
  - `python -m py_compile` for touched Python files
  - `pytest` for touched modules

Env variables (template):
- `GOOGLE_API_KEY` (or Gemini auth)
- `GEMINI_MODEL_NAME` (for non-search agent runtime; researcher may override to `gemini-1.5-pro`)

---

## Self-Learning Memory (Cloud Vector Index of Our Code)

Goal: move from append-only local memory files to a durable, searchable “Vector Index” that improves:
- tool selection
- correct invocation formatting
- error recovery patterns

Strategy:
1. Canonicalize code + context:
   - chunk `core/`, `api/factory_router.js`, `lib/` (server, cmp, factory, python), `vanguard/`, and `.context/*.md`
   - include file headers (module purpose) and signatures
   - embed each chunk with deterministic settings
2. Store embeddings in a **Cloud Vector Index**:
   - any managed solution works (Pinecone / Weaviate / pgvector on Postgres / etc.)
   - store metadata:
     - `repo_path`
     - `chunk_id`
     - `language`
     - `sha`
     - `last_modified_at`
3. Retrieval:
   - when the agent builds retrieval context:
     - search top-k relevant chunks by query + tool call intent
     - merge with `memory/agent_memory.md` snippets
4. Continuous update:
   - on every merge:
     - re-index only changed files (by git diff)

How it plugs into the current runtime:
- Today: `core/engine/src/memory.py` performs keyword scoring + markdown retrieval.
- Next: augment `MemoryManager.build_retrieval_context()`:
  - first retrieve semantic candidates from the vector index
  - fall back to markdown keyword search if vector index is unavailable

Data governance:
- never store secrets in vector metadata
- redact tokens in payloads before embedding

---

## Automated Architect (GitHub Action: Self-Test + Merge Proposals)

Goal: let an AI (running in CI) evaluate candidate changes and propose merges only when confidence is high.

High level steps:
1. Trigger: PR opened by Online Researcher OR by human.
2. Self-test:
   - run `pytest`
   - run sandbox execution smoke tests
   - validate vanguard JSON schemas
3. AI review:
   - AI reads CI evidence + git diff
   - outputs:
     - “approve merge”
     - “request changes”
     - or “defer”
4. Merge gate:
   - branch merges only if:
     - tests pass
     - AI review decision is “approve merge”

### GitHub Workflow (blueprint YAML)
Copy this workflow logic into `.github/workflows/ai-architect.yml` (or adapt as needed):

```yaml
name: AI Architect — Self-Test + Merge Proposal

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: write
  pull-requests: write

jobs:
  test-and-propose:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install engine deps
        run: |
          python -m pip install --upgrade pip
          pip install -r core/engine/requirements.txt

      - name: Run tests
        run: |
          pytest

      - name: Validate Vanguard Schemas
        run: |
          python - <<'PY'
          import json, glob
          import jsonschema

          # Validate that telemetry + existing schemas are well-formed JSON
          for path in glob.glob("vanguard/*.json") + glob.glob("vanguard/schema/*.json"):
            with open(path, "r", encoding="utf-8") as f:
              json.load(f)
          print("Vanguard JSON well-formed.")
          PY

      - name: AI Review (approve / request changes)
        env:
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
        run: |
          python - <<'PY'
          import os, subprocess, json

          # Minimal placeholder. Replace with your Gemini search-capable review implementation.
          decision = "request_changes"
          reason = "AI review not implemented in this blueprint runtime."

          payload = {"decision": decision, "reason": reason}
          print(json.dumps(payload))

          # In a real implementation:
          # - read git diff
          # - summarize CI output
          # - ask Gemini 1.5 Pro for a decision
          # - post a PR comment
          PY
      - name: Guard Merge (placeholder)
        if: always()
        run: |
          echo "Merge guard is decided by review output in a real implementation."
```

Notes:
- This blueprint YAML is intentionally “skeleton-safe”: it won’t merge automatically until you wire the real AI review logic.
- The durable truth source remains Vanguard artifacts + CI evidence.

---

## Closing the IDE (How the Factory Stays Running)

To make the system “stand on its own” after you close this IDE:
1. Use `.env.template` + `vanguard/secrets-manifest.json` as the single governance contract.
2. Enable MCP only in the Cloud Codespace environment (and keep filesystem access locked down).
3. Rely on:
   - Vanguard telemetry (`vanguard/telemetry-v1.json`) for consistent health/failure reporting
   - GitHub Actions for continuous self-testing and PR proposals
4. Persist memory by syncing:
   - `memory/agent_memory.md`
   - `memory/agent_summary.md`
   - and (optionally) the vector index

