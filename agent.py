#!/usr/bin/env python3
"""Entry point for running the CorpFlow AI Command Center agent.

This file exists for convenience so you can run:
    python agent.py "Your task here"

It delegates to src/agent.py, which wraps the engine implementation.
"""

import runpy
from pathlib import Path


def main() -> None:
    """
    Delegate to the real engine entrypoint.

    The repo contains multiple historical/templated entrypoints; this function
    ensures `python agent.py ...` consistently runs the factory agent.
    """
    target = Path(__file__).resolve().parent / "core" / "engine" / "agent.py"
    runpy.run_path(str(target), run_name="__main__")


if __name__ == "__main__":
    main()
