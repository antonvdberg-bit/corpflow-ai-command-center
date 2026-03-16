#!/usr/bin/env python3
"""Entry point for running the CorpFlow AI Command Center agent.

This file exists for convenience so you can run:
    python agent.py "Your task here"

It delegates to src/agent.py, which wraps the engine implementation.
"""

from src.agent import main

if __name__ == "__main__":
    main()
