"""
Python Tools MCP Server

Expose this repo's local Python tools (`core/engine/src/tools/*.py`) as MCP tools.

Why this exists:
- MCP can provide a uniform tool surface across environments (Cloud Codespaces, local dev).
- The agent already loads local tools directly, but this server enables “execute via MCP”
  and keeps a consistent integration story.

Security model:
- Only tools from `core/engine/src/tools/` are exposed.
- Only public functions (no leading underscore) are callable.
"""

from __future__ import annotations

import importlib.util
import inspect
from functools import lru_cache
from pathlib import Path
from typing import Any, Callable, Dict, List

from mcp.server.fastmcp import FastMCP
from engine.src.tenant_manager import SecurityTransgressionError


mcp = FastMCP("python-tools")

TOOLS_DIR = Path(__file__).resolve().parent / "tools"


@lru_cache(maxsize=1)
def load_python_tools() -> Dict[str, Callable[..., Any]]:
    """
    Load and return public tool functions from `TOOLS_DIR`.

    Returns:
        Mapping of tool name -> callable function.
    """
    tools: Dict[str, Callable[..., Any]] = {}
    if not TOOLS_DIR.exists():
        return tools

    for tool_file in TOOLS_DIR.glob("*.py"):
        if tool_file.name.startswith("_"):
            continue
        module_name = tool_file.stem
        spec = importlib.util.spec_from_file_location(f"mcp_tools.{module_name}", tool_file)
        if not spec or not spec.loader:
            continue

        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        for name, obj in inspect.getmembers(module, inspect.isfunction):
            if name.startswith("_"):
                continue
            if obj.__module__ != module.__name__:
                continue
            tools[name] = obj

    return tools


@mcp.tool()
def list_python_tools() -> List[str]:
    """
    List all exposed local Python tools.

    Returns:
        Tool names that can be passed to `run_python_tool`.
    """
    return sorted(load_python_tools().keys())


@mcp.tool()
def run_python_tool(tool_name: str, args: Dict[str, Any]) -> str:
    """
    Execute a local Python tool function by name.

    Args:
        tool_name: Tool function name as returned by `list_python_tools()`.
        args: JSON-compatible arguments dictionary.

    Returns:
        Stringified tool result.
    """
    tools = load_python_tools()
    if tool_name not in tools:
        return f"Error: tool '{tool_name}' not found."

    fn = tools[tool_name]
    try:
        result = fn(**args)
        return str(result)
    except SecurityTransgressionError:
        # Security violation must not be swallowed; let the agent terminate.
        raise
    except Exception as e:
        # Best-effort: surface tool failures to the agent as text.
        return f"Error executing tool '{tool_name}': {e}"


if __name__ == "__main__":
    mcp.run()

