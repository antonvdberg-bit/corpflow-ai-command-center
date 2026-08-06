#!/usr/bin/env python3
"""CorpFlowAI commissioning short system prompt + sanitised wire-payload analyzer.

Used by:
  - live_status override (inline Agent.system_prompt when flag on)
  - agent-server sitecustomize wire-capture hook
  - offline node/policy tests (string presence only)

No secrets. No client data.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from typing import Any

# Fail-closed commissioning policy — keep short; isolation is enforced outside.
CORPFLOWAI_COMMISSIONING_SYSTEM_PROMPT = """You are CorpFlowAI OpenHands commissioning agent (synthetic only).

Rules:
- Work only inside the supplied disposable workspace.
- Use only terminal and file_editor.
- Complete the user task directly; do not plan at length.
- Do not access GitHub, production systems, host files outside the workspace, or client data.
- Do not install packages. Do not browse the web.
- Create required files, run tests with local Python, report the result, then stop.

Retain sandbox boundaries. Prefer minimal tool calls.
"""

WIRE_CAPTURE_PATH = os.environ.get(
    "CORPFLOWAI_WIRE_CAPTURE_PATH",
    "/tmp/corpflowai-wire-capture.json",
)
WIRE_CAPTURE_DRY = str(os.environ.get("CORPFLOWAI_WIRE_CAPTURE_DRY", "0")).strip().lower() in (
    "1",
    "true",
    "yes",
    "on",
)

# Absolute stop for combined_requested (input + reserved output) before Groq.
WIRE_TOKEN_SOFT_TARGET = 5000
WIRE_TOKEN_HARD_STOP = 7000
GROQ_TPM_LIMIT = 8000
# Commissioning completion reservation (must override LiteLLM model default 32768).
COMMISSIONING_MAX_OUTPUT_TOKENS = 1024
# Prior Groq-observed reservation when max_output_tokens was unset.
LITELLM_GPT_OSS_20B_DEFAULT_MAX_OUTPUT = 32768


def estimate_tokens(text: str) -> int:
    """Chars/4 estimate — record method explicitly when tokenizer unavailable."""
    if not text:
        return 0
    return max(1, (len(text) + 3) // 4)


def _sha16(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="replace")).hexdigest()[:16]


def _redact(text: str) -> str:
    """Strip secret-like substrings from durable evidence text."""
    if not text:
        return text
    out = text
    out = re.sub(r"(?i)(api[_-]?key|token|secret|password)\s*[:=]\s*\S+", r"\1=REDACTED", out)
    out = re.sub(r"gsk_[A-Za-z0-9]+", "gsk_REDACTED", out)
    out = re.sub(r"sk-[A-Za-z0-9]+", "sk_REDACTED", out)
    return out


def analyze_completion_kwargs(kwargs: dict[str, Any]) -> dict[str, Any]:
    """Sanitised breakdown of a LiteLLM/OpenAI chat.completions payload."""
    messages = kwargs.get("messages") or []
    tools = kwargs.get("tools") or []
    model = str(kwargs.get("model") or "")

    # Provider-bound completion caps (Groq TPM counts input + reservation).
    max_completion_tokens = kwargs.get("max_completion_tokens")
    max_tokens = kwargs.get("max_tokens")
    max_output_tokens = kwargs.get("max_output_tokens")
    reasoning_effort = kwargs.get("reasoning_effort")
    # Prefer explicit max_completion_tokens, else max_tokens, else max_output_tokens
    reserved_output = None
    for candidate in (max_completion_tokens, max_tokens, max_output_tokens):
        if candidate is None:
            continue
        try:
            reserved_output = int(candidate)
            break
        except (TypeError, ValueError):
            continue

    msg_rows: list[dict[str, Any]] = []
    hashes: dict[str, list[int]] = {}
    total_msg_chars = 0
    for i, msg in enumerate(messages):
        if not isinstance(msg, dict):
            content = str(msg)
            role = "unknown"
        else:
            role = str(msg.get("role") or "unknown")
            content = msg.get("content")
            if isinstance(content, list):
                parts = []
                for p in content:
                    if isinstance(p, dict) and p.get("type") == "text":
                        parts.append(str(p.get("text") or ""))
                    else:
                        parts.append(json.dumps(p, ensure_ascii=False)[:500])
                content = "\n".join(parts)
            elif content is None:
                content = json.dumps(
                    {k: v for k, v in msg.items() if k != "role"},
                    ensure_ascii=False,
                )
            else:
                content = str(content)
        content = _redact(content)
        chars = len(content)
        total_msg_chars += chars
        h = _sha16(content)
        hashes.setdefault(h, []).append(i)
        preview = content[:120].replace("\n", "\\n")
        msg_rows.append(
            {
                "index": i,
                "role": role,
                "chars": chars,
                "tokens_est": estimate_tokens(content),
                "sha16": h,
                "preview": preview,
                "component_guess": _guess_component(role, content),
            }
        )

    tools_raw = json.dumps(tools, ensure_ascii=False) if tools else ""
    tools_raw = _redact(tools_raw)
    tool_names: list[str] = []
    for t in tools:
        if isinstance(t, dict):
            fn = t.get("function") if isinstance(t.get("function"), dict) else t
            if isinstance(fn, dict) and fn.get("name"):
                tool_names.append(str(fn["name"]))

    # Full serialized request estimate (messages + tools + model framing)
    framing = json.dumps(
        {k: v for k, v in kwargs.items() if k not in ("messages", "tools", "api_key")},
        ensure_ascii=False,
        default=str,
    )
    framing = _redact(framing)
    total_chars = total_msg_chars + len(tools_raw) + len(framing)
    input_tokens = estimate_tokens("x" * total_chars)
    combined = input_tokens + (reserved_output or 0)

    duplicates = [
        {"sha16": h, "message_indexes": idxs}
        for h, idxs in hashes.items()
        if len(idxs) > 1
    ]

    system_msgs = [m for m in msg_rows if m["role"] == "system"]
    system_dup = len(system_msgs) > 1 and len({m["sha16"] for m in system_msgs}) < len(
        system_msgs
    )

    # Tool descriptions duplicated into messages?
    tool_in_messages = False
    if tool_names and msg_rows:
        joined = " ".join(m.get("preview", "") for m in msg_rows)
        hits = sum(1 for n in tool_names if n in joined)
        tool_in_messages = hits >= max(1, len(tool_names) // 2)

    largest = max(msg_rows, key=lambda m: m["tokens_est"], default=None)

    return {
        "tokenizer": "chars/4 (LiteLLM/OpenHands tokenizer unavailable in hook)",
        "model": model,
        "message_count": len(msg_rows),
        "messages": msg_rows,
        "tool_count": len(tools) if isinstance(tools, list) else 0,
        "tool_names": tool_names,
        "tool_schema_chars": len(tools_raw),
        "tool_schema_tokens_est": estimate_tokens(tools_raw),
        "framing_chars": len(framing),
        "framing_tokens_est": estimate_tokens(framing),
        "total_serialized_chars": total_chars,
        "total_tokens_est": input_tokens,
        "input_tokens_est": input_tokens,
        "max_completion_tokens": max_completion_tokens,
        "max_tokens": max_tokens,
        "max_output_tokens": max_output_tokens,
        "reasoning_effort": reasoning_effort,
        "reserved_output_tokens": reserved_output,
        "combined_requested_tokens_est": combined,
        "duplicate_blocks": duplicates,
        "duplicated_system_block": system_dup,
        "tool_descriptions_also_in_messages": tool_in_messages,
        "largest_message": largest,
        "hidden_reasoning_or_metadata_keys": [
            k
            for k in kwargs.keys()
            if any(
                x in str(k).lower()
                for x in ("reasoning", "metadata", "extra_body", "thinking")
            )
        ],
        "soft_target": WIRE_TOKEN_SOFT_TARGET,
        "hard_stop": WIRE_TOKEN_HARD_STOP,
        "groq_tpm_limit": GROQ_TPM_LIMIT,
        "commissioning_max_output_tokens": COMMISSIONING_MAX_OUTPUT_TOKENS,
        "under_hard_stop": combined < WIRE_TOKEN_HARD_STOP if reserved_output is not None else input_tokens < WIRE_TOKEN_HARD_STOP,
        "under_soft_target": combined <= WIRE_TOKEN_SOFT_TARGET if reserved_output is not None else input_tokens <= WIRE_TOKEN_SOFT_TARGET,
        "output_cap_ok": reserved_output is not None and reserved_output <= COMMISSIONING_MAX_OUTPUT_TOKENS,
    }


def _guess_component(role: str, content: str) -> str:
    c = content.lower()
    if role == "system":
        if "commissioning agent" in c:
            return "corpflowai_short_system_prompt"
        if "browser" in c or "navigate" in c:
            return "system_prompt_with_browser_guidance"
        if "github" in c or "pull request" in c:
            return "system_prompt_with_github_guidance"
        return "system_prompt"
    if role == "user":
        if "arithmetic" in c:
            return "user_arithmetic_task"
        return "user_message"
    if role == "tool":
        return "tool_result"
    if role == "assistant":
        return "assistant_message"
    return role


def write_wire_capture(analysis: dict[str, Any], path: str | None = None) -> str:
    out = path or WIRE_CAPTURE_PATH
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(analysis, f, indent=2, ensure_ascii=False)
    return out


class WireCaptureDryAbort(RuntimeError):
    """Raised after sanitised capture when CORPFLOWAI_WIRE_CAPTURE_DRY=1."""


def maybe_capture_and_abort(kwargs: dict[str, Any]) -> dict[str, Any]:
    analysis = analyze_completion_kwargs(kwargs)
    path = write_wire_capture(analysis)
    analysis["capture_path"] = path
    if WIRE_CAPTURE_DRY:
        raise WireCaptureDryAbort(
            f"CORPFLOWAI wire capture dry-run complete tokens_est={analysis['total_tokens_est']} path={path}"
        )
    return analysis
