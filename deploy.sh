#!/bin/bash
echo "🏗️ Starting CorpFlowAI Production Build..."

# 1. Install System Requirements
pip install -r requirements.txt

# 2. Verify Environment
if [ -f .env ]; then
    echo "✅ .env file found."
else
    echo "❌ ERROR: .env file missing. Deployment aborted."
    exit 1
fi

# 3. Run Self-Diagnostics
echo "🩺 Running Self-Diagnostics..."
python3 -m core.maintenance.model_updater

# 4. Final Instructions
echo "------------------------------------------------"
echo "✅ BUILD COMPLETE"
echo "To start the production server, run:"
echo "python3 -m core.services.api_gateway"
echo "------------------------------------------------"
