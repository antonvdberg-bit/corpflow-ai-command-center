import os

import pytest

from engine.src.config import settings
from engine.src.tools.memory_tools import read_memory_md, search_memory_md


@pytest.fixture
def isolated_project_root(tmp_path, monkeypatch):
    """Tenant memory tools only allow paths under <root>/tenants/<id>/."""
    root = tmp_path.resolve()
    monkeypatch.setattr(settings, "PROJECT_ROOT", str(root), raising=False)
    os.environ["AG_TENANT_ROOT"] = str(root / "tenants" / "root")
    yield root
    os.environ.pop("AG_TENANT_ROOT", None)


def test_read_memory_md(isolated_project_root):
    memory_file = isolated_project_root / "tenants" / "root" / "memory" / "agent_memory.md"
    memory_file.parent.mkdir(parents=True, exist_ok=True)
    memory_file.write_text(
        "# Agent Memory Log\n\nMicrosandbox enabled.\n",
        encoding="utf-8",
    )

    result = read_memory_md(max_chars=1000, memory_file=str(memory_file))
    assert "Microsandbox enabled." in result


def test_search_memory_md(isolated_project_root):
    memory_file = isolated_project_root / "tenants" / "root" / "memory" / "agent_memory.md"
    memory_file.parent.mkdir(parents=True, exist_ok=True)
    memory_file.write_text(
        "# Agent Memory Log\n\nMicrosandbox enabled.\nDocker removed.\n",
        encoding="utf-8",
    )

    result = search_memory_md(
        query="microsandbox",
        max_results=5,
        memory_file=str(memory_file),
    )
    assert "microsandbox" in result.lower()


def test_search_memory_md_empty_query(isolated_project_root):
    memory_file = isolated_project_root / "tenants" / "root" / "memory" / "agent_memory.md"
    memory_file.parent.mkdir(parents=True, exist_ok=True)
    memory_file.write_text("any", encoding="utf-8")

    result = search_memory_md(
        query="",
        max_results=5,
        memory_file=str(memory_file),
    )
    assert "cannot be empty" in result.lower()
