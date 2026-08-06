# OpenHands commissioning profile v1 — minimal first-request context

**Status:** PACKAGE PREPARED — LIVE COMMISSIONING BLOCKED ON CURSOR WEB (no SSH to `corpflow-exec-01-u69678`).  
**Controlling issue:** [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743)  
**Draft PR:** [#747](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/747) (do not merge)  
**Approved baseline commit (prior live state):** `b2034944359a1424ae4bd3889a4362239dfd5122`  
**OpenHands state on box (last verified):** INSTALLED — INACTIVE  

This document is the durable **known-good commissioning profile** target and the
**measured root cause** of the Groq free-tier HTTP 413 / `rate_limit_exceeded`
failure (~33 270–47 591 tokens requested vs **8 000 TPM** on
`groq/openai/gpt-oss-20b`).

---

## 1. Root cause (confirmed from OpenHands 1.8 source + live Groq rejection)

The first LLM completion failed because the **request payload was too large for
Groq free-tier TPM**, not because of sandbox RAM, Docker isolation, networking,
the `run` flag, or MCP reachability (those were already fixed).

OpenHands app **1.8** hardcodes on the conversation-start path
(`live_status_app_conversation_service.py` / `app_conversation_service_base.py`):

| Hardcode | Effect on first request |
|----------|-------------------------|
| `get_default_tools(enable_browser=True)` | Registers **BrowserToolSet** → **14** browser tools + terminal + file_editor + task_tracker |
| `register_builtins_agents(enable_browser=True)` | Builtin sub-agent definitions |
| `_add_system_mcp_servers` → `{web_url}/mcp/mcp` | Always injects default MCP tools: `create_pr`, `create_mr`, `create_bitbucket_pr`, `create_bitbucket_data_center_pr`, `create_azure_devops_pr` (+ Tavily if keyed) |
| `load_public=True` (and user/project/org) | Public/global skills loaded during `SETTING_UP_SKILLS` |

No Settings API field turns browser or default MCP off on this path. Same
**Option D** pattern as the spawn override: a bind-mounted bounded patch.

---

## 2. Context breakdown (not a guess)

Method:

1. **Live Groq rejection** (issue #743 functional commissioning): requested
   **~33 270–47 591** tokens; limit **8 000** TPM; HTTP **413** /
   `rate_limit_exceeded`; no model response; no file/shell tools run.
2. **OpenHands 1.8.0 + software-agent-sdk source** inspected offline
   (tag `1.8.0` / SDK `get_default_tools`, prompt snapshots, `mcp_router.py`).
3. Token figures for components are **ranges** (chars÷4 + schema inflation)
   except the Groq-reported totals.

| Component | Est. tokens | Evidence |
|-----------|-------------|----------|
| System prompt (DEFAULT, cli_mode=false) | **4 000–4 300** | SDK snapshot `openai__browser-off__secana-on__cli-off.txt` ≈ 16 346 chars |
| Browser tool JSON schemas (14 tools) | **12 000–22 000** | `BrowserToolSet.create` expands Navigate/Click/GetState/GetContent/Type/Scroll/GoBack/ListTabs/SwitchTab/CloseTab/GetStorage/SetStorage/StartRecording/StopRecording |
| Terminal + FileEditor + TaskTracker schemas | **4 000–9 000** | Always in `get_default_tools` even with browser off |
| Default MCP tool schemas | **5 000–15 000** | `mcp_router.py` create_* tools always mounted when web_url set |
| Public / global skills | **2 000–10 000+** | `load_public=True`; live path reached `SETTING_UP_SKILLS` → READY |
| Builtins (think/finish) + framing | **500–2 000** | SDK builtins + LiteLLM/OpenAI tools message |
| User message + history | **50–200** | Synthetic arithmetic instruction only |
| Workspace / CorpFlow repo context | **~0** | Disposable workspace; CorpFlow repo **not** cloned into sandbox |
| **TOTAL (default path)** | **~26 000–55 000** | Matches live **33 270–47 591** |

Largest contributors (order): **browser schemas → default MCP schemas →
skills → core tools → system prompt**.

CorpFlow `config/openhands/corpflowai-agent-instructions.md` was **not** proven
to be auto-injected on the failed run (no settings wiring observed); treat as
optional / not the primary oversize driver.

---

## 3. Context reductions applied (package)

| # | Reduction | Mechanism |
|---|-----------|-----------|
| 1 | Disable public skill discovery | `CORPFLOWAI_LOAD_PUBLIC_SKILLS=0` (+ user/project/org) via `app_conversation_service_base.py` override |
| 2 | Local-skills-only / no-skills for arithmetic | All skill source flags default **0** |
| 3 | Disable default MCP tool group | `CORPFLOWAI_INJECT_DEFAULT_MCP=0` skips `_add_system_mcp_servers` (OH_WEB_URL retained for prior MCP DNS fix when MCP is re-enabled) |
| 4 | Minimum tools | `CORPFLOWAI_MINIMAL_TOOLS=1` → **terminal + file_editor only** (no task_tracker) |
| 5 | Remove browser / web / GitHub MCP tools | `CORPFLOWAI_ENABLE_BROWSER=0` + default MCP off |
| 6 | Minimal agent profile | `CORPFLOWAI_ENABLE_BUILTIN_AGENTS=0` |
| 7 | No duplicated CorpFlow system instructions | Do not load `corpflowai-agent-instructions.md` for this synthetic run |
| 8 | Minimal synthetic workspace | Disposable volume; no CorpFlow clone |
| 9 | Short conversation history | Single `initial_message` with `run=true` |
| 10 | Bounded runtime override | Bind-mounts (Option D), not a fork |

**Isolation is not weakened** to save tokens (named net, ExtraHosts empty, no
published ports, no docker.sock, 512 MiB / 0.5 CPU / 256 PIDs, dedicated
rootless daemon).

### Estimated size after reduction

| Estimate | Tokens |
|----------|--------|
| Low | ~5 500 |
| High | ~9 500 |
| Groq free `gpt-oss-20b` TPM | **8 000** |
| 70 % pre-run budget | **5 600** |

Honest package note: the **low** estimate is near the 5 600 budget; the **high**
estimate may still exceed 8 000 because the system prompt alone is ~4.1k.
**Live measurement on exec-01 is mandatory before any Groq call.** If still
over budget: further shorten system prompt, or stop for Anton approval of a
higher-TPM free model (see §5).

---

## 4. Known-good profile (target after live success)

Fill in live columns only after L3 verification.

| Field | Target / package default | Live (fill on exec-01) |
|-------|--------------------------|------------------------|
| OpenHands app | `docker.openhands.dev/openhands/openhands:1.8` | |
| Agent-server | `ghcr.io/openhands/agent-server:1.26.0-python` | |
| Model | `groq/openai/gpt-oss-20b` (approved; do not silent-switch) | |
| Enabled tools | terminal, file_editor | |
| Disabled tools | all browser_*; task_tracker; default MCP create_*; builtin agents | |
| Enabled skills | none | |
| Disabled skills | all public/user/project/org sources | |
| MCP servers | none injected (`CORPFLOWAI_INJECT_DEFAULT_MCP=0`) | |
| Approx first-request tokens | measure before send; target ≤5 600 | |
| Initial payload | `initial_message.run=true` + arithmetic instruction | |
| Timeouts | `SANDBOX_TIMEOUT=600`, grace 120s, `max_iterations` low (≤8–30) | |
| Sandbox limits | 512 MiB / 0.5 CPU / 256 PIDs | |
| Network | `corpflowai-openhands-net` only; ExtraHosts empty | |
| Egress | rootless `iptables: true`; `DOCKERD_ROOTLESS_ROOTLESSKIT_MTU=1500` | |
| Files to create | `arithmetic.py`, `test_arithmetic.py` | |
| Test command | `python -m unittest test_arithmetic.py` (or pytest if present — prefer unittest; no pip install) | |
| Cleanup | remove sandbox + volume; scrub runtime LLM key; host file mode 600; dispatcher still disabled | |

---

## 5. Alternative free model (requires Anton approval — do not silent-switch)

If live measure still cannot fit **8 000** TPM on `gpt-oss-20b` after
reductions:

| Field | Recommendation |
|-------|----------------|
| Exact model | `meta-llama/llama-4-scout-17b-16e-instruct` (Groq free plan) |
| Published free-tier TPM | **~30 000** TPM (Groq rate-limits docs / public 2026 free-plan tables; confirm on console Limits page before use) |
| Expected request size after reduction | ~7 500–12 000 (same payload; higher headroom) |
| Why it should work | 30k TPM ≫ reduced first request; still free; no payment method |
| Anton approval required? | **YES** — do not change the approved model silently |

Do **not** upgrade to paid Groq, OpenAI paid, or any charged provider.

---

## 6. L3 resume (when SSH is available)

Cursor **web** cloud agents in this environment have **no SSH private key** to
`corpflow-exec-01-u69678` (`Permission denied (publickey)`). Prior live
OpenHands work was executed from Cursor Desktop / operator SSH.

On the box (operator or Desktop agent with existing SSH):

```bash
cd ~/corpflow-ai-command-center   # or the install checkout path
git fetch origin ops/openhands-private-worker-package
git checkout ops/openhands-private-worker-package
# ensure HEAD includes commissioning overrides
./scripts/ops/openhands/commission-arithmetic-minimal.sh
```

The harness:

1. Runs pre-run gates (draft PR, health, dispatcher, isolation, credential mode 600).
2. Recreates control plane with commissioning env/mounts.
3. Estimates / captures first-request size **before** Groq.
4. Aborts if over 70 % of applicable TPM.
5. Runs one arithmetic conversation with `run=true`.
6. Cleans up sandbox + runtime credential; leaves pilot inactive.

---

## 7. Explicit non-actions

- Do not merge PR #747.
- Do not resolve `artifacts/chat_history.md` conflict in this packet.
- Do not enable dispatcher.
- Do not add GitHub credentials to OpenHands.
- Do not clone CorpFlow into the sandbox.
- Do not purchase / upgrade / use paid models.

---

## 8. Package files

| Path | Role |
|------|------|
| `ops/openhands/runtime-overrides/live_status_app_conversation_service.py` | Browser / MCP / builtin agent gates |
| `ops/openhands/runtime-overrides/app_conversation_service_base.py` | Skill source gates |
| `ops/openhands/compose.yaml` | Bind-mounts + env defaults `0` |
| `lib/openhands/commissioning-context-policy.js` | Offline audit + breakdown constants |
| `scripts/ops/openhands/estimate-first-request-context.sh` | Sanitised size estimate helper |
| `scripts/ops/openhands/commission-arithmetic-minimal.sh` | L3 commissioning harness |
| `node-tests/openhands-commissioning-context.test.mjs` | Static tests |
