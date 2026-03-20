#!/bin/bash

echo "------------------------------------------------"
echo " LUXE MAURICE | STRATEGIC DEMO ACTIVATION "
echo "------------------------------------------------"

# 1. Ensure permissions are correct
chmod -R 755 showcase/luxe-maurice-private/

# 2. Kill any old server processes to prevent 'Address already in use'
fuser -k 8000/tcp 2>/dev/null

# 3. Get the Codespace URL
CS_URL="https://${CODESPACE_NAME}-8000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"

echo "STATUS: Optimization Complete."
echo "VIEW ORIGINAL: ${CS_URL}/showcase/luxe-maurice-private/stealth-widget.html"
echo "VIEW PROPOSAL: ${CS_URL}/showcase/luxe-maurice-private/stealth-widget-PROPOSAL.html"
echo "------------------------------------------------"
echo "PRESS CTRL+C TO TERMINATE SESSION"
echo "------------------------------------------------"

# 4. Start the server
python3 -m http.server 8000
