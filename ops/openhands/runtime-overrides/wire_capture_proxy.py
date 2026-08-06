#!/usr/bin/env python3
"""Loopback OpenAI-compatible capture proxy for OpenHands wire-size dry runs.

Listens on 0.0.0.0:3901 inside corpflowai-openhands-app (reachable from
agent-server sandboxes as http://corpflowai-openhands-app:3901/v1).

Never logs API keys. Writes sanitised JSON to CORPFLOWAI_WIRE_CAPTURE_PATH.
Returns HTTP 418 so the conversation stops without a model completion.
"""

from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# Prefer in-repo analyzer when bind-mounted beside this script; else embed minimal.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from commissioning_prompt import (  # type: ignore
        WIRE_TOKEN_HARD_STOP,
        analyze_completion_kwargs,
        write_wire_capture,
    )
except Exception:
    # Minimal fallback if import path differs inside the container.
    import hashlib
    import re

    WIRE_TOKEN_HARD_STOP = 7500

    def _est(t: str) -> int:
        return max(1, (len(t) + 3) // 4) if t else 0

    def analyze_completion_kwargs(kwargs):  # type: ignore
        messages = kwargs.get("messages") or []
        tools = kwargs.get("tools") or []
        rows = []
        total = 0
        for i, msg in enumerate(messages):
            role = str(msg.get("role") if isinstance(msg, dict) else "unknown")
            content = msg.get("content") if isinstance(msg, dict) else str(msg)
            if isinstance(content, list):
                content = "\n".join(
                    str(p.get("text") if isinstance(p, dict) else p) for p in content
                )
            content = str(content or "")
            content = re.sub(r"gsk_[A-Za-z0-9]+", "gsk_REDACTED", content)
            total += len(content)
            rows.append(
                {
                    "index": i,
                    "role": role,
                    "chars": len(content),
                    "tokens_est": _est(content),
                    "sha16": hashlib.sha256(content.encode()).hexdigest()[:16],
                    "preview": content[:120].replace("\n", "\\n"),
                }
            )
        tools_raw = json.dumps(tools, ensure_ascii=False)
        tool_names = []
        for t in tools:
            if isinstance(t, dict):
                fn = t.get("function") if isinstance(t.get("function"), dict) else t
                if isinstance(fn, dict) and fn.get("name"):
                    tool_names.append(str(fn["name"]))
        total_chars = total + len(tools_raw)
        return {
            "tokenizer": "chars/4",
            "model": str(kwargs.get("model") or ""),
            "message_count": len(rows),
            "messages": rows,
            "tool_count": len(tools),
            "tool_names": tool_names,
            "tool_schema_chars": len(tools_raw),
            "tool_schema_tokens_est": _est(tools_raw),
            "total_serialized_chars": total_chars,
            "total_tokens_est": _est("x" * total_chars),
            "hard_stop": WIRE_TOKEN_HARD_STOP,
            "under_hard_stop": _est("x" * total_chars) < WIRE_TOKEN_HARD_STOP,
        }

    def write_wire_capture(analysis, path=None):  # type: ignore
        out = path or os.environ.get(
            "CORPFLOWAI_WIRE_CAPTURE_PATH", "/tmp/corpflowai-wire-capture.json"
        )
        with open(out, "w", encoding="utf-8") as f:
            json.dump(analysis, f, indent=2)
        return out


CAPTURE_PATH = os.environ.get(
    "CORPFLOWAI_WIRE_CAPTURE_PATH", "/tmp/corpflowai-wire-capture.json"
)
PORT = int(os.environ.get("CORPFLOWAI_WIRE_CAPTURE_PORT", "3901"))


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:  # noqa: A003
        sys.stderr.write("[wire-capture] " + (fmt % args) + "\n")

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            return json.loads(raw.decode("utf-8", errors="replace"))
        except Exception:
            return {"_parse_error": True, "_raw_chars": len(raw)}

    def do_GET(self) -> None:  # noqa: N802
        if self.path in ("/health", "/v1/health", "/"):
            body = b'{"ok":true,"service":"corpflowai-wire-capture"}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        payload = self._read_json()
        # Never persist Authorization header / api key fields
        if isinstance(payload, dict):
            payload.pop("api_key", None)
            payload.pop("apiKey", None)
        analysis = analyze_completion_kwargs(payload if isinstance(payload, dict) else {})
        analysis["path"] = self.path
        analysis["capture_path"] = write_wire_capture(analysis, CAPTURE_PATH)
        body = json.dumps(
            {
                "error": {
                    "message": (
                        "CORPFLOWAI_WIRE_CAPTURE dry-run: request captured; "
                        f"tokens_est={analysis.get('total_tokens_est')} "
                        f"under_hard_stop={analysis.get('under_hard_stop')}"
                    ),
                    "type": "corpflowai_wire_capture",
                    "code": "wire_capture_dry_abort",
                    "tokens_est": analysis.get("total_tokens_est"),
                    "under_hard_stop": analysis.get("under_hard_stop"),
                }
            }
        ).encode()
        # 418 = intentional dry abort (not a Groq rate limit)
        self.send_response(418)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    sys.stderr.write(
        f"[wire-capture] listening 0.0.0.0:{PORT} capture={CAPTURE_PATH}\n"
    )
    server.serve_forever()


if __name__ == "__main__":
    main()
