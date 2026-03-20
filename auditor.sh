#!/bin/bash
echo "🛡️ AUDITING CORPFLOW AI FACTORY..."

# Run the core engine
python3 core/engine/sync_sheets.py

# Update the Showcase
cp core/web/data_cache.json showcase/aura-wellness/data_cache.json

echo "✅ CORE Protected. SHOWCASE Updated."
