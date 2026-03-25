"""
Tenant Manager + File Guard

Implements TenantContext scoping for the agent runtime.

Hard rule:
Any attempt by an agent to read a file outside of:
  - /tenants/{current_id}/
or
  - the read-only /core/ library
must trigger a Vanguard "Security Transgression" telemetry event and
auto-terminate the session.

This module focuses on controlling reads performed by:
- TenantContext-controlled context loading (this file)
- Memory tools (patched to enforce allowed paths)
- Sandbox execution (patched: open()/os.open() are guarded at runtime)
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional


class SecurityTransgressionError(RuntimeError):
    """Raised when an agent attempts a forbidden filesystem read."""


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_path(p: Path) -> Path:
    try:
        return p.expanduser().resolve()
    except Exception:
        # Fallback: best-effort normalization for paths that can't resolve.
        return Path(str(p)).expanduser()


@dataclass(frozen=True)
class TenantContext:
    """Tenant-scoped runtime context for the agent."""

    tenant_id: str
    project_root: Path

    @property
    def tenant_root(self) -> Path:
        return self.project_root / "tenants" / self.tenant_id

    @property
    def core_root(self) -> Path:
        return self.project_root / "core"

    @property
    def core_docs_root(self) -> Path:
        # `.context` is used as the shared, read-only prompt/rules injection area.
        return self.project_root / ".context"

    @property
    def memory_dir(self) -> Path:
        return self.tenant_root / "memory"

    @property
    def memory_file(self) -> Path:
        return self.memory_dir / "agent_memory.md"

    @property
    def memory_summary_file(self) -> Path:
        return self.memory_dir / "agent_summary.md"

    @property
    def persona_file(self) -> Path:
        # Optional tenant-defined identity for the assistant.
        return self.tenant_root / "persona.json"

    def ensure_dirs(self) -> None:
        self.tenant_root.mkdir(parents=True, exist_ok=True)
        self.memory_dir.mkdir(parents=True, exist_ok=True)

    def load_persona(self) -> Dict[str, Any]:
        """Load optional tenant persona (best-effort, never raises)."""
        try:
            if not self.persona_file.exists():
                return {}
            text = self.guarded_read_text(
                self.persona_file,
                source="core/engine/src/tenant_manager.py:load_persona",
            )
            return json.loads(text)
        except SecurityTransgressionError:
            raise
        except Exception:
            return {}

    def persona_context_block(self) -> str:
        """Format persona into a system prompt block."""
        persona = self.load_persona()
        if not persona:
            return ""

        assistant_name = persona.get("assistant_name", self.tenant_id)
        expertise = persona.get("specialized_expertise") or []
        kb = persona.get("knowledge_boundaries") or {}
        allowed = kb.get("allowed_sources") or []
        blocked = kb.get("blocked_sources") or []

        parts = [
            "\n--- TENANT PERSONA ---\n"
            f"Tenant assistant name: {assistant_name}\n"
            f"Specialized expertise: {', '.join(expertise) if expertise else '[none]'}\n"
            f"Allowed sources: {', '.join(allowed) if allowed else '[none specified]'}\n"
            f"Blocked sources: {', '.join(blocked) if blocked else '[none specified]'}\n"
        ]
        return "".join(parts)

    def apply_to_env(self) -> None:
        """
        Export guard variables for sandbox execution.

        The sandbox wrapper uses these to enforce file read allowlists.
        """
        os.environ["TENANT_ID"] = self.tenant_id
        os.environ["AG_TENANT_ID"] = self.tenant_id
        os.environ["AG_TENANT_ROOT"] = str(_normalize_path(self.tenant_root))
        os.environ["AG_CORE_ROOT"] = str(_normalize_path(self.core_root))
        # Sandbox guard accepts additional core-docs roots as well.
        os.environ["AG_CORE_DOCS_ROOT"] = str(_normalize_path(self.core_docs_root))
        os.environ["AG_REPO_ROOT"] = str(_normalize_path(self.project_root))
        os.environ.setdefault(
            "AG_TELEMETRY_FILE_PATH", "vanguard/audit-trail/telemetry-v1.jsonl"
        )
        os.environ.setdefault("AG_FACTORY_ID", "corpflow-factory")

    def _allowed_roots(self) -> list[Path]:
        return [
            _normalize_path(self.tenant_root),
            _normalize_path(self.core_root),
            _normalize_path(self.core_docs_root),
        ]

    def _is_path_allowed(self, target_path: Path) -> bool:
        target = _normalize_path(target_path)
        for root in self._allowed_roots():
            try:
                if str(target).startswith(str(root) + os.sep) or str(target) == str(root):
                    return True
            except Exception:
                continue
        return False

    def security_transgression_telemetry(self, *, source: str, details: str) -> None:
        """
        Emit telemetry for security transgressions (best-effort, never raises).
        """
        try:
            # Import lazily; do not fail if telemetry infra isn't available.
            from core.services.vanguard_telemetry import emit_logic_failure  # type: ignore

            emit_logic_failure(
                source=source,
                severity="fatal",
                error=Exception(details),
                recommended_action="Auto-terminate session and audit requested tool invocation.",
                cmp={"ticket_id": "n/a", "action": "security_transgression"},
                meta={"tenant_id": self.tenant_id},
            )
        except Exception:
            # Fallback: JSONL write
            try:
                telemetry_file = os.getenv(
                    "AG_TELEMETRY_FILE_PATH", "vanguard/audit-trail/telemetry-v1.jsonl"
                )
                tf = Path(telemetry_file)
                tf.parent.mkdir(parents=True, exist_ok=True)
                payload = {
                    "schema_version": "1",
                    "event_type": "logic_failure",
                    "occurred_at": _now_iso(),
                    "factory_id": os.getenv("AG_FACTORY_ID", "corpflow-factory"),
                    "report_target": os.getenv("TELEMETRY_TARGET", "file_local"),
                    "tenant_id": self.tenant_id,
                    "cmp": {"ticket_id": "n/a", "action": "security_transgression"},
                    "payload": {
                        "source": source,
                        "severity": "fatal",
                        "error_message": details[:500],
                        "error_class": "SecurityTransgressionError",
                        "stack_trace_redacted": "",
                        "recommended_action": "Auto-terminate session and audit requested tool invocation.",
                        "meta": {"tenant_id": self.tenant_id},
                    },
                }
                with open(tf, "a", encoding="utf-8") as f:
                    f.write(json.dumps(payload) + "\n")
            except Exception:
                pass

    def guarded_read_text(self, file_path: Path, *, source: str) -> str:
        """
        Read file text under allowlist.

        Raises:
            SecurityTransgressionError: when file is outside tenant/core allowlist.
        """
        if not self._is_path_allowed(file_path):
            details = f"Forbidden read attempt: {file_path}"
            self.security_transgression_telemetry(source=source, details=details)
            raise SecurityTransgressionError(details)
        return file_path.read_text(encoding="utf-8")

    def maybe_export_core_pattern(self, task: str, agent_output: str) -> None:
        """
        Core Learning export: store a non-proprietary Pattern (not data).

        Heuristic triggers:
        - Task contains bug/fix/exception keywords
        - Agent output includes 'Pattern:' or 'CORE_PATTERN:'
        """
        task_l = (task or "").lower()
        keywords = ["bug", "fix", "exception", "error", "crash", "failed", "timeout"]
        if not any(k in task_l for k in keywords):
            return

        m = re.search(r"(?:CORE_PATTERN|Pattern)\s*:\s*([\s\S]{20,4000})", agent_output or "")
        if not m:
            return

        pattern = m.group(1).strip()
        # Redact obvious sensitive tokens in exported patterns.
        pattern = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "[REDACTED_EMAIL]", pattern)
        pattern = re.sub(r"\b\+?\d[\d\s\-]{8,}\b", "[REDACTED_NUMBER]", pattern)

        kb_dir = self.project_root / "core" / "knowledge_base"
        kb_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        safe_id = re.sub(r"[^a-zA-Z0-9_-]+", "-", self.tenant_id)[:32]
        out_path = kb_dir / f"pattern_{safe_id}_{ts}.md"
        out_path.write_text(
            f"# Core Pattern Export\n\n"
            f"Tenant: {self.tenant_id}\n"
            f"Task: {task}\n"
            f"ExportedAt: {_now_iso()}\n\n"
            f"## Pattern\n\n{pattern}\n",
            encoding="utf-8",
        )


def get_tenant_context(tenant_id: Optional[str] = None) -> TenantContext:
    """Create a TenantContext for the current runtime."""
    from engine.src.config import settings  # local import to avoid cycles

    tid = (tenant_id or os.getenv("TENANT_ID") or "root").strip() or "root"
    ctx = TenantContext(tenant_id=tid, project_root=settings.project_root_path)
    ctx.ensure_dirs()
    ctx.apply_to_env()
    return ctx

