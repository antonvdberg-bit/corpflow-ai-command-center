"""Pytest configuration helpers.

Put `core/` on `sys.path` so `engine` resolves to `core/engine/` and imports
match production (`engine.src.*`). Do not also add `core/engine/` — that loads
duplicate modules (`src.*` vs `engine.src.*`) and breaks `isinstance` checks.

GitHub Agent CI runs `pytest core/engine/tests/` from the repo root.
"""
import os
import sys

_TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
_CORE_ROOT = os.path.abspath(os.path.join(_TESTS_DIR, "..", ".."))

if _CORE_ROOT not in sys.path:
    sys.path.insert(0, _CORE_ROOT)
