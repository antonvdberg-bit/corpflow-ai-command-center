# OpenHands commissioning profile v1 — minimal first-request context

**Status:** WIRE DRY PASS / GROQ-NATIVE PATH STILL OVERSIZE — further packet required.  
**Controlling issue:** [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743)  
**Draft PR:** [#747](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/747) (do not merge)  
**Dataclass hotfix:** `dd65b9ea8105daf358528c4b58fb8963d01c7fc5`  
**Condensation + dry harness head (example):** `d4d87adb…` on `ops/openhands-private-worker-package`  
**OpenHands state on box (last verified):** INSTALLED — INACTIVE  

This document is the durable **known-good commissioning profile** target and the
**measured root cause** of the Groq free-tier HTTP 413 / `rate_limit_exceeded`
failure (~33 270–47 591 tokens originally; **33 166–38 261** after tool-only
reduction vs **8 000 TPM** on `groq/openai/gpt-oss-20b`).

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
| Default `system_prompt.j2` + builtins | ~11 kB rendered prompt + FinishTool/ThinkTool |

No Settings API field turns browser or default MCP off on this path. Same
**Option D** pattern as the spawn override: a bind-mounted bounded patch.

**Tool-schema reduction alone is insufficient.** With
`CORPFLOWAI_MINIMAL_TOOLS=1` (terminal + file_editor only; skills/MCP/browser
off), live Groq still rejected **~33 166–38 261** tokens. Offline schema
estimates (~5–6 k) understated the wire payload. **Authoritative measurement
is the LiteLLM/OpenAI chat.completions body** (via
`scripts/ops/openhands/wire-capture-dry.sh` capture proxy), not source-schema
guesses.

---

## 2. Context breakdown (not a guess)

Method:

1. **Live Groq rejection** (issue #743 functional commissioning): requested
   **~33 270–47 591** tokens; limit **8 000** TPM; HTTP **413** /
   `rate_limit_exceeded`; no model response; no file/shell tools run.
2. **Live Groq rejection after minimal tools** (same issue): **~33 166–38 261**
   with only terminal + file_editor loaded.
3. **OpenHands 1.8.0 + software-agent-sdk source** inspected offline
   (tag `1.8.0` / SDK `get_default_tools`, prompt snapshots, `mcp_router.py`).
4. Token figures for components are **ranges** (chars÷4 + schema inflation)
   except the Groq-reported totals.
5. **Wire dry capture** (capture proxy on control plane `:3901`) records
   per-message roles/sizes, tool-schema size, duplicates, and total
   `tokens_est` (chars÷4) without calling Groq.

| Component | Est. tokens | Evidence |
|-----------|-------------|----------|
| System prompt (DEFAULT, cli_mode=false) | **2 700–4 300** | Rendered `system_prompt.j2` ≈ 10 886 chars; live event ≈ 13 685 chars |
| Browser tool JSON schemas (14 tools) | **12 000–22 000** | `get_default_tools(enable_browser=True)` |
| Terminal + FileEditor + TaskTracker schemas | **4 000–9 000** | Always in `get_default_tools` even with browser off |
| Default MCP tool schemas | **5 000–15 000** | `mcp_router.py` create_* tools |
| Public / global skills | **2 000–10 000+** | `load_public=True` |
| Builtins (think/finish) + framing | **500–2 000** | SDK builtins + LiteLLM/OpenAI tools message |
| User message + history | **50–200** | Synthetic arithmetic instruction only |
| **Residual after tool gates (unexplained by schema est.)** | **~27 000+** | Live Groq 33k–38k with 2 tools — **requires wire capture** |
| **TOTAL (default path)** | **~26 000–55 000** | Matches live **33 270–47 591** |

---

## 3. Context reductions applied (package)

| # | Reduction | Mechanism |
|---|-----------|-----------|
| 1 | Disable public skill discovery | `CORPFLOWAI_LOAD_PUBLIC_SKILLS=0` (+ user/project/org) via `app_conversation_service_base.py` override |
| 2 | Local-skills-only / no-skills for arithmetic | All skill source flags default **0** |
| 3 | Disable default MCP tool group | `CORPFLOWAI_INJECT_DEFAULT_MCP=0` skips `_add_system_mcp_servers` (OH_WEB_URL retained) |
| 4 | Minimum tools | `CORPFLOWAI_MINIMAL_TOOLS=1` → **terminal + file_editor only** |
| 5 | Remove browser / web / GitHub MCP tools | `CORPFLOWAI_ENABLE_BROWSER=0` + default MCP off |
| 6 | Minimal agent profile | `CORPFLOWAI_ENABLE_BUILTIN_AGENTS=0` |
| 7 | **Short commissioning system prompt** | `CORPFLOWAI_SHORT_SYSTEM_PROMPT=1` → inline `Agent.system_prompt` (normal `system_prompt.j2` when flag off) |
| 8 | Drop ThinkTool / SwitchLLM | `CORPFLOWAI_DISABLE_DEFAULT_BUILTIN_TOOLS=1` → `include_default_tools=[FinishTool]` |
| 9 | Skip `<HOST>` web_url suffix | `CORPFLOWAI_SKIP_WEB_HOST_SUFFIX=1` |
| 10 | No duplicated CorpFlow system instructions | Do not load `corpflowai-agent-instructions.md` for this synthetic run |
| 11 | Minimal synthetic workspace | Disposable volume; no CorpFlow clone |
| 12 | Short conversation history | Single `initial_message` with `run=true` |
| 13 | Wire dry capture before Groq | `scripts/ops/openhands/wire-capture-dry.sh` + capture proxy (no credential) |
| 14 | Bounded runtime override | Bind-mounts (Option D), not a fork |

**Isolation is not weakened** to save tokens.

### Condensation targets

| Gate | Tokens |
|------|--------|
| Soft target | **≤ 6 000** |
| Absolute stop (no Groq) | **≥ 7 500** |
| Groq free `gpt-oss-20b` TPM | **8 000** |

### Live wire dry vs Groq-native (2026-08-06)

| Path | Tokens | Notes |
|------|--------|-------|
| Capture proxy (OpenAI-format body to `:3901`) | **2 749** est (chars÷4) | system≈371; tools terminal+file_editor+finish≈2270; GATE=PASS |
| Groq free API rejection (same short-prompt profile) | **33 166–35 210** | HTTP 413 / `rate_limit_exceeded` — no files created |
| Gap | **~30 k** | LiteLLM/Groq-native serialization still inflates vs OpenAI-format dry capture; do not treat dry GATE alone as Groq-ready until a **forwarding** capture of the Groq-bound body exists |

Also observed: agent-server still logs `Loaded 1 skills` even with all `CORPFLOWAI_LOAD_*_SKILLS=0`.

---

## 4. Known-good profile (target after live success)

| Field | Target / package default | Live (fill on exec-01) |
|-------|--------------------------|------------------------|
| Model | `groq/openai/gpt-oss-20b` (do not silent-switch) | |
| Enabled tools | terminal, file_editor (+ FinishTool) | |
| System prompt | commissioning short inline | |
| Approx first-request tokens | wire dry capture `< 7500` (prefer ≤6000) | |
| Initial payload | `initial_message.run=true` | |
| Sandbox limits | 512 MiB / 0.5 CPU / 256 PIDs | |
| Network | `corpflowai-openhands-net`; ExtraHosts empty | |

---

## 5. Alternative free model (requires Anton approval — do not silent-switch)

Anton has **not** approved Llama 4 Scout / Compound / paid upgrades for this
packet. Prefer wire condensation on `gpt-oss-20b`. If live wire capture still
cannot fit **7 500** estimated tokens, stop and ask — do not silent-switch.

---

## 6. L3 resume (Cursor Desktop / operator SSH)

```bash
cd ~/corpflow-ai-command-center
git fetch origin ops/openhands-private-worker-package
git checkout ops/openhands-private-worker-package
./scripts/ops/openhands/wire-capture-dry.sh
# Only if GATE=PASS (tokens_est < 7500):
./scripts/ops/openhands/commission-arithmetic-minimal.sh
```

---

## 7. Explicit non-actions

- Do not merge PR #747.
- Do not enable dispatcher / GitHub credentials / paid models / silent model switch.

---

## 8. Package files

| Path | Role |
|------|------|
| `ops/openhands/runtime-overrides/live_status_app_conversation_service.py` | Browser / MCP / short-prompt / FinishTool gates |
| `ops/openhands/runtime-overrides/app_conversation_service_base.py` | Skill source gates |
| `ops/openhands/runtime-overrides/commissioning_prompt.py` | Short prompt + wire analyzer |
| `ops/openhands/runtime-overrides/wire_capture_proxy.py` | Capture proxy (dry) |
| `scripts/ops/openhands/wire-capture-dry.sh` | L3 wire dry capture (no Groq) |
| `scripts/ops/openhands/commission-arithmetic-minimal.sh` | L3 commissioning harness |
| `node-tests/openhands-commissioning-context.test.mjs` | Static tests |
| `node-tests/openhands-override-dataclass.test.mjs` | `@dataclass` placement regression |
