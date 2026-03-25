import os
import sys
import time
import tempfile
import subprocess
from typing import Tuple

from .base import CodeSandbox, ExecutionResult


def _truncate_output(text: str, max_bytes: int) -> Tuple[str, bool]:
    if max_bytes <= 0:
        return text, False
    encoded = text.encode("utf-8", errors="ignore")
    if len(encoded) <= max_bytes:
        return text, False
    truncated = encoded[: max_bytes - 32].decode("utf-8", errors="ignore")
    return truncated + "\n... (output truncated)", True


class LocalSandbox(CodeSandbox):
    """Local subprocess-based sandbox.

    Runs code using the current Python interpreter inside an isolated temp directory.
    Applies timeout and output truncation.
    """

    def execute(self, code: str, language: str = "python", timeout: int = 30) -> ExecutionResult:
        if language.lower() != "python":
            return ExecutionResult(
                stdout="",
                stderr=f"Unsupported language: {language}",
                exit_code=1,
                duration=0.0,
                meta={"runtime": "local", "truncated": False, "timed_out": False},
            )

        max_output_kb = int(os.getenv("SANDBOX_MAX_OUTPUT_KB", "10"))
        max_bytes = max_output_kb * 1024

        start = time.time()
        timed_out = False
        stdout = ""
        stderr = ""
        exit_code = 0

        with tempfile.TemporaryDirectory(prefix="ag_sandbox_") as tmpdir:
            script_path = os.path.join(tmpdir, "main.py")
            with open(script_path, "w", encoding="utf-8") as f:
                # Tenant isolation guard:
                # Deny reading any file under the repo root unless it is inside:
                # - tenants/{tenant_id}/
                # - core/ (library)
                # - .context/ (shared rules)
                guard_code = self._build_tenant_guard_prefix()
                f.write(guard_code + "\n\n" + code)

            try:
                proc = subprocess.run(
                    [sys.executable, script_path],
                    cwd=tmpdir,
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                )
                stdout = proc.stdout or ""
                stderr = proc.stderr or ""
                exit_code = proc.returncode
            except subprocess.TimeoutExpired:
                timed_out = True
                exit_code = -1
                stderr = f"Execution timed out after {timeout}s"
            except Exception as exc:
                exit_code = 1
                stderr = f"Unexpected execution error: {exc}"

        duration = time.time() - start

        stdout, trunc_out = _truncate_output(stdout, max_bytes)
        stderr, trunc_err = _truncate_output(stderr, max_bytes)

        return ExecutionResult(
            stdout=stdout,
            stderr=stderr,
            exit_code=exit_code,
            duration=duration,
            meta={
                "runtime": "local",
                "truncated": bool(trunc_out or trunc_err),
                "timed_out": timed_out,
                "resource_limits": {
                    "timeout_sec": timeout,
                    "max_output_kb": max_output_kb,
                },
            },
        )

    def _build_tenant_guard_prefix(self) -> str:
        """Create a runtime prefix that blocks forbidden repo-root reads."""
        tenant_root = os.getenv("AG_TENANT_ROOT", "")
        core_root = os.getenv("AG_CORE_ROOT", "")
        core_docs_root = os.getenv("AG_CORE_DOCS_ROOT", "")
        repo_root = os.getenv("AG_REPO_ROOT", "")
        telemetry_file = os.getenv(
            "AG_TELEMETRY_FILE_PATH", "vanguard/audit-trail/telemetry-v1.jsonl"
        )
        factory_id = os.getenv("AG_FACTORY_ID", "corpflow-factory")
        tenant_id = os.getenv("AG_TENANT_ID") or os.getenv("TENANT_ID") or "root"

        # NOTE: this is injected into untrusted agent code. Keep it defensive and lightweight.
        return f"""
import os as _os
import sys as _sys
import json as _json
from datetime import datetime as _dt, timezone as _tz
import traceback as _traceback
import builtins as _builtins

_TENANT_ROOT = {tenant_root!r}
_CORE_ROOT = {core_root!r}
_CORE_DOCS_ROOT = {core_docs_root!r}
_REPO_ROOT = {repo_root!r}
_TELEMETRY_FILE = {telemetry_file!r}
_FACTORY_ID = {factory_id!r}
_TENANT_ID = {tenant_id!r}

def _now_iso():
    return _dt.now(_tz.utc).isoformat()

def _telemetry_security_transgression(source: str, details: str) -> None:
    try:
        _os.makedirs(_os.path.dirname(_TELEMETRY_FILE) or '.', exist_ok=True)
        payload = {{
            "schema_version": "1",
            "event_type": "logic_failure",
            "occurred_at": _now_iso(),
            "factory_id": _FACTORY_ID,
            "report_target": "file_local",
            "tenant_id": _TENANT_ID,
            "cmp": {{"ticket_id": "n/a", "action": "security_transgression"}},
            "payload": {{
                "source": source,
                "severity": "fatal",
                "error_message": str(details)[:500],
                "error_class": "SecurityTransgressionError",
                "stack_trace_redacted": "",
                "recommended_action": "Auto-terminate session and audit tool invocation.",
                "meta": {{"tenant_id": _TENANT_ID}}
            }}
        }}
        with open(_TELEMETRY_FILE, "a", encoding="utf-8") as f:
            f.write(_json.dumps(payload) + "\\n")
    except Exception:
        pass

def _is_forbidden_repo_read(path_str: str) -> bool:
    # Hard allowlist:
    # - tenants/{tenant_id}/
    # - core/ (library)
    # - .context/ (shared prompt/rules)
    # - Python stdlib/site-packages (sys.prefix*)
    # - sandbox cwd (temp dir)
    if not path_str:
        return False
    try:
        abs_path = _os.path.abspath(_os.path.expanduser(str(path_str)))
        allowed_roots = []
        for root in (_TENANT_ROOT, _CORE_ROOT, _CORE_DOCS_ROOT):
            if root:
                allowed_roots.append(_os.path.abspath(root))

        cwd = _os.path.abspath(_os.getcwd())

        std_roots = [getattr(_sys, "prefix", ""), getattr(_sys, "base_prefix", "")]
        std_roots = [_os.path.abspath(s) for s in std_roots if s]

        # Allow within allowed roots
        for ar in allowed_roots:
            if abs_path == ar or abs_path.startswith(ar + _os.sep):
                return False

        # Allow within Python runtime directories
        for sr in std_roots:
            if abs_path == sr or abs_path.startswith(sr + _os.sep):
                return False

        # Allow within sandbox cwd (typically the temp dir)
        if abs_path == cwd or abs_path.startswith(cwd + _os.sep):
            return False

        return True
    except Exception:
        return False

_orig_open = _builtins.open

def _open_guard(file, mode='r', *args, **kwargs):
    try:
        if file is not None and 'r' in str(mode):
            if _is_forbidden_repo_read(file):
                _telemetry_security_transgression(
                    source="sandbox:file_read_guard",
                    details="Forbidden read attempt: " + str(file) + " (mode=" + str(mode) + ")",
                )
                print("SECURITY_TRANSGRESSION", file=_sys.stderr)
                raise SystemExit(1)
    except SystemExit:
        raise
    except Exception:
        # Never break execution due to guard failure.
        pass
    return _orig_open(file, mode, *args, **kwargs)

_builtins.open = _open_guard
"""
