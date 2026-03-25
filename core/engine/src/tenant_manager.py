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
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


class SecurityTransgressionError(RuntimeError):
    """Raised when an agent attempts a forbidden filesystem read."""


class AutonomyLevelRestrictionError(RuntimeError):
    """Raised when tenant autonomy_level violates tenant tier policy."""


class PromotionGateViolationError(RuntimeError):
    """Raised when ATF promotion gate disallows rank advancement."""


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
    def vanguard_root(self) -> Path:
        # Factory governance schemas/artifacts (non-proprietary).
        return self.project_root / "vanguard"

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
            persona = json.loads(text)
            if isinstance(persona, dict):
                self.validate_autonomy_restrictions(persona)
            return persona
        except SecurityTransgressionError:
            raise
        except AutonomyLevelRestrictionError:
            raise
        except Exception:
            return {}

    def get_token_credit_balance_usd(self) -> float:
        """
        Best-effort read of token_credit_balance (USD) without raising.

        If missing, falls back to `DEFAULT_TOKEN_CREDIT_BALANCE_USD`
        (default: 0.0) to enforce the Cash-Positive guardrail.
        """
        default_balance = float(os.getenv("DEFAULT_TOKEN_CREDIT_BALANCE_USD", "0.0"))
        try:
            if not self.persona_file.exists():
                return default_balance
            text = self.guarded_read_text(
                self.persona_file,
                source="core/engine/src/tenant_manager.py:get_token_credit_balance_usd",
            )
            persona = json.loads(text) if text else {}
            if isinstance(persona, dict):
                raw = persona.get("token_credit_balance")
                if raw is None:
                    return default_balance
                return float(raw)
        except Exception:
            return default_balance
        return default_balance

    def persona_context_block(self) -> str:
        """Format persona into a system prompt block."""
        persona = self.load_persona()
        token_balance = self.get_token_credit_balance_usd()
        if not persona:
            # Provide a minimal persona context even when the tenant has not
            # yet provisioned `tenants/<tenant_id>/persona.json`.
            persona = {
                "assistant_name": self.tenant_id,
                "specialized_expertise": [],
                "knowledge_boundaries": {"allowed_sources": [], "blocked_sources": []},
                "autonomy_level": 1 if token_balance <= 0 else 1,
                "trust_score": None,
                "current_rank": "Intern",
                "token_credit_balance": token_balance,
            }

        assistant_name = persona.get("assistant_name", self.tenant_id)
        expertise = persona.get("specialized_expertise") or []
        kb = persona.get("knowledge_boundaries") or {}
        allowed = kb.get("allowed_sources") or []
        blocked = kb.get("blocked_sources") or []

        autonomy_level = persona.get("autonomy_level", 1)
        try:
            autonomy_level_int = int(autonomy_level)
        except Exception:
            autonomy_level_int = 1

        trust_score = persona.get("trust_score")
        current_rank = persona.get("current_rank")

        parts = [
            "\n--- TENANT PERSONA ---\n"
            f"Tenant assistant name: {assistant_name}\n"
            f"Specialized expertise: {', '.join(expertise) if expertise else '[none]'}\n"
            f"Allowed sources: {', '.join(allowed) if allowed else '[none specified]'}\n"
            f"Blocked sources: {', '.join(blocked) if blocked else '[none specified]'}\n"
            f"Autonomy level (1-4): {autonomy_level_int}\n"
            f"Token credit balance (USD): {persona.get('token_credit_balance', 0.0)}\n"
            f"Trust score: {trust_score if trust_score is not None else '[unset]'}\n"
            f"Current rank: {current_rank if current_rank else '[unset]'}\n"
        ]
        return "".join(parts)

    def _get_client_tier(self) -> str:
        """Best-effort: read client tier from `vanguard/secrets-manifest.json`."""
        try:
            manifest_path = self.vanguard_root / "secrets-manifest.json"
            manifest_text = self.guarded_read_text(
                manifest_path,
                source="core/engine/src/tenant_manager.py:_get_client_tier",
            )
            manifest = json.loads(manifest_text)
            tier = (
                manifest.get("tenant_access", {})
                .get(self.tenant_id, {})
                .get("client_tier", "PERIODIC")
            )
            tier = str(tier).upper()
            if tier in {"STATIC", "PERIODIC", "EVOLVING"}:
                return tier
        except Exception:
            pass
        return "PERIODIC"

    def validate_autonomy_restrictions(self, persona: Dict[str, Any]) -> None:
        """
        Enforce RIGOR:
        - Level 4 ('Principal') restricted to Tier 3 ('EVOLVING') clients only.
        - Any attempt to set Level 4 on non-EVOLVING tenants is auto-blocked.
        """
        try:
            autonomy_level = persona.get("autonomy_level", 1)
            autonomy_level_int = int(autonomy_level)
        except Exception:
            autonomy_level_int = 1

        tier = self._get_client_tier()
        if autonomy_level_int == 4 and tier != "EVOLVING":
            details = (
                "Autonomy Level 4 requires tenant_access.client_tier=EVOLVING "
                f"(found {tier}) for tenant_id={self.tenant_id}."
            )
            self.autonomy_restriction_telemetry(details=details)
            raise AutonomyLevelRestrictionError(details)

        # Cash-Positive guardrail (Token Reservoir):
        # If token_credit_balance <= 0, hard-lock autonomy to Level 1.
        token_balance_raw = persona.get("token_credit_balance")
        try:
            token_balance_usd = (
                float(token_balance_raw)
                if token_balance_raw is not None
                else float(os.getenv("DEFAULT_TOKEN_CREDIT_BALANCE_USD", "0.0"))
            )
        except Exception:
            token_balance_usd = float(os.getenv("DEFAULT_TOKEN_CREDIT_BALANCE_USD", "0.0"))

        if token_balance_usd <= 0:
            persona["token_credit_balance"] = 0.0
            persona["autonomy_level"] = 1
            persona["current_rank"] = "Intern"
            self._cash_positive_lock_telemetry()

        # ATF promotion gates (8-week + high-severity logic failure window).
        self._validate_atf_promotion_gates(persona)

    def _cash_positive_lock_telemetry(self) -> None:
        """Emit telemetry for Cash-Positive token exhaustion lock."""
        try:
            from core.services.vanguard_telemetry import emit_logic_failure  # type: ignore

            emit_logic_failure(
                source="core/engine/src/tenant_manager.py:cash-positive-lock",
                severity="fatal",
                error=Exception("token_credit_balance <= 0; hard-locking autonomy_level=1"),
                recommended_action="Top up token_credit_balance to re-enable autonomous and expensive tool usage.",
                cmp={"ticket_id": "n/a", "action": "cash-positive-lock"},
                meta={"tenant_id": self.tenant_id, "guardrail": "token-reservoir"},
            )
        except Exception:
            pass

    def _dashboard_path(self) -> Path:
        return self.tenant_root / "dashboard.json"

    def _load_dashboard(self) -> Dict[str, Any]:
        try:
            p = self._dashboard_path()
            if not p.exists():
                return {"atf": {"current_rank": "Intern", "last_rank_change_at": None}}
            txt = self.guarded_read_text(p, source="core/engine/src/tenant_manager.py:_load_dashboard")
            data = json.loads(txt)
            if not isinstance(data, dict):
                return {"atf": {"current_rank": "Intern", "last_rank_change_at": None}}
            atf = data.get("atf") or {}
            if not isinstance(atf, dict):
                atf = {}
            data["atf"] = atf
            return data
        except Exception:
            return {"atf": {"current_rank": "Intern", "last_rank_change_at": None}}

    def _save_dashboard(self, dashboard: Dict[str, Any]) -> None:
        try:
            p = self._dashboard_path()
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(json.dumps(dashboard, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass

    def _parse_iso_datetime(self, s: Any) -> Optional[datetime]:
        if s is None:
            return None
        try:
            return datetime.fromisoformat(str(s))
        except Exception:
            return None

    def _count_high_severity_logic_failures_last_100(self) -> int:
        """
        Count high-severity logic failures in the last 100 autonomous actions.

        For now we approximate using decision logs:
        - action_type in {tool_call, final_answer}
        - logic_failure_severity == 'fatal'
        """
        audit_dir = self.project_root / "vanguard" / "audit"
        if not audit_dir.exists():
            return 0

        decision_files = sorted(
            [p for p in audit_dir.glob("*.json") if p.is_file()],
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )

        tenant_files: List[Path] = []
        for f in decision_files:
            if len(tenant_files) >= 100:
                break
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                if isinstance(data, dict) and data.get("tenant_id") == self.tenant_id:
                    tenant_files.append(f)
            except Exception:
                continue

        fatal_count = 0
        for f in tenant_files:
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                if not isinstance(data, dict):
                    continue
                if data.get("logic_failure_severity") == "fatal":
                    fatal_count += 1
            except Exception:
                continue

        return fatal_count

    def _validate_atf_promotion_gates(self, persona: Dict[str, Any]) -> None:
        """
        8-Week Promotion Gate:
        - Disallow promotion to 'Principal' until:
          a) 0 High-Severity logic failures in last 100 autonomous actions
          b) the promotion occurs only after an 8-week waiting window from
             the tenant's last rank change timestamp.
        """
        try:
            desired_rank = str(persona.get("current_rank") or "").strip()
        except Exception:
            desired_rank = ""

        dashboard = self._load_dashboard()
        atf = dashboard.get("atf") or {}
        prior_rank = str(atf.get("current_rank") or "Intern")
        last_rank_change_at = self._parse_iso_datetime(atf.get("last_rank_change_at"))

        now = datetime.now(timezone.utc)

        # If rank is changing (non-principal included), update dashboard so the
        # 8-week window can be enforced on future promotions.
        if desired_rank and desired_rank != prior_rank and desired_rank != "Principal":
            atf["current_rank"] = desired_rank
            atf["last_rank_change_at"] = now.isoformat()
            dashboard["atf"] = atf
            self._save_dashboard(dashboard)
            return

        if desired_rank != "Principal":
            return

        # Promotion to Principal:
        if prior_rank != "Principal":
            if last_rank_change_at is None:
                details = (
                    "ATF Promotion Gate: cannot promote to Principal without a dashboard "
                    "rank-change timestamp (expected last_rank_change_at)."
                )
                self._promotion_gate_telemetry(details=details)
                raise PromotionGateViolationError(details)

            delta = now - last_rank_change_at
            if delta < timedelta(days=56):
                details = (
                    f"ATF Promotion Gate: cannot promote to Principal before 8 weeks. "
                    f"Elapsed_days={delta.days}, tenant_id={self.tenant_id}."
                )
                self._promotion_gate_telemetry(details=details)
                raise PromotionGateViolationError(details)

        fatal_count = self._count_high_severity_logic_failures_last_100()
        if fatal_count > 0:
            details = (
                "ATF Promotion Gate: promotion to Principal blocked due to "
                f"{fatal_count} high-severity (fatal) logic failures in the last 100 autonomous actions."
            )
            self._promotion_gate_telemetry(details=details)
            raise PromotionGateViolationError(details)

        # Promotion allowed -> update dashboard timestamps.
        atf["current_rank"] = "Principal"
        atf["last_rank_change_at"] = now.isoformat()
        dashboard["atf"] = atf
        self._save_dashboard(dashboard)

    def _promotion_gate_telemetry(self, *, details: str) -> None:
        """Emit telemetry for ATF promotion gate violations."""
        try:
            from core.services.vanguard_telemetry import emit_logic_failure  # type: ignore

            emit_logic_failure(
                source="core/engine/src/tenant_manager.py:atf-promotion-gate",
                severity="fatal",
                error=Exception(details),
                recommended_action="Wait the required promotion window and resolve high-severity logic failures before retrying.",
                cmp={"ticket_id": "n/a", "action": "atf-promotion-gate"},
                meta={"tenant_id": self.tenant_id, "details": details[:200]},
            )
        except Exception:
            pass

    def autonomy_restriction_telemetry(self, *, details: str) -> None:
        """Emit telemetry for autonomy restriction violations (best-effort)."""
        try:
            from core.services.vanguard_telemetry import emit_logic_failure  # type: ignore

            emit_logic_failure(
                source="core/engine/src/tenant_manager.py:autonomy_restriction",
                severity="fatal",
                error=Exception(details),
                recommended_action="Block the session and downgrade autonomy_level to 1-3 unless client_tier=EVOLVING.",
                cmp={"ticket_id": "n/a", "action": "autonomy-level-restriction"},
                meta={"tenant_id": self.tenant_id, "details": details[:200]},
            )
        except Exception:
            pass

    def code_graph_context_block(self) -> str:
        """Return a compact block from `vanguard/code-graph.json`."""
        code_graph_path = self.vanguard_root / "code-graph.json"
        if not code_graph_path.exists():
            return ""
        try:
            text = self.guarded_read_text(
                code_graph_path, source="core/engine/src/tenant_manager.py:code_graph_context_block"
            )
            graph = json.loads(text)
            actions = graph.get("actions") or []
            imports = graph.get("imports") or []
            requires = graph.get("requires") or []

            import_sources: List[str] = []
            if isinstance(imports, list):
                for imp in imports:
                    if isinstance(imp, dict) and imp.get("source"):
                        import_sources.append(str(imp["source"]))

            payload = {
                "target_file": graph.get("target_file"),
                "actions": actions[:50] if isinstance(actions, list) else [],
                "import_sources": sorted(list(set(import_sources)))[:50],
                "require_sources": requires[:50] if isinstance(requires, list) else [],
            }
            return "\n--- CODE GRAPH (vanguard/code-graph.json) ---\n" + json.dumps(
                payload, ensure_ascii=False
            )
        except Exception:
            return ""

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
            _normalize_path(self.vanguard_root),
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

