#!/usr/bin/env python3
"""
Wrapper script for the CorpFlow AI Command Center Agent.

This script delegates to the main agent implementation in engine/agent.py.
"""

import sys
import os
from pathlib import Path

# Ensure we're in the project root
project_root = Path(__file__).parent.parent
os.chdir(project_root)

# Delegate to the engine agent
sys.path.insert(0, str(project_root / "engine"))
from agent import main

if __name__ == "__main__":
    main()