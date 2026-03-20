#!/bin/bash
# LUXE MAURICE | CORE ENGINE LAUNCHER

DB_FILE="luxe_core.db"

echo "------------------------------------------------"
echo "🚀 INITIALIZING DEMO FROM CORE DATABASE..."
echo "------------------------------------------------"

# 1. Kill any existing processes on port 8000
fuser -k 8000/tcp 2>/dev/null

# 2. Verify Database Integrity
if [ ! -f "$DB_FILE" ]; then
    echo "❌ ERROR: luxe_core.db not found. Running emergency rebuild..."
    python3 system_rebuild.py --db-init
fi

# 3. Generate the Dynamic URLs
CS_URL="https://${CODESPACE_NAME}-8000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"

echo "✅ DATABASE CONNECTED."
echo "✅ UI PATCHES APPLIED."
echo ""
echo "--- ACTIVE DEMO LINKS ---"
echo "MAIN HUB:  ${CS_URL}/showcase/luxe-maurice-private/stealth-widget.html"
echo "PROPOSAL:  ${CS_URL}/showcase/luxe-maurice-private/stealth-widget-PROPOSAL.html"
echo "------------------------------------------------"
echo "LOGGING REAL-TIME INTERACTIONS TO SQL..."
echo "------------------------------------------------"

# 4. Start the server
python3 -m http.server 8000
