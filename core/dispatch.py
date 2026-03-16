#!/usr/bin/env python3
"""
Dispatch script for CorpFlow AI Command Center.

This script initializes a GeminiAgent for a specific client by fetching
client-specific settings from the Baserow System_Docs table.
"""

import os
import sys
import requests
from typing import Dict, Any

# Baserow API configuration - Update these with your actual values
BASEROW_BASE_URL = "https://api.baserow.io/api/"  # Or your custom Baserow instance URL
DATABASE_ID = "your_database_id_here"  # Replace with actual database ID
TABLE_ID = "your_table_id_here"  # Replace with System_Docs table ID

def get_client_settings(client_name: str) -> Dict[str, Any]:
    """
    Fetch client settings from Baserow System_Docs table.

    Assumes the table has columns: client_name, gemini_api_key, baserow_token, n8n_api_key
    """
    token = os.getenv('BASEROW_TOKEN')
    if not token:
        raise ValueError("BASEROW_TOKEN environment variable not set")

    url = f"{BASEROW_BASE_URL}database/{DATABASE_ID}/table/{TABLE_ID}/"
    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json'
    }

    # Query with filter for client_name
    params = {
        'user_field_names': 'true',
        'filter__client_name__equal': client_name
    }

    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()

    data = response.json()
    results = data.get('results', [])

    if not results:
        raise ValueError(f"No settings found for client: {client_name}")

    # Assuming one row per client
    row = results[0]
    return {
        'gemini_api_key': row.get('gemini_api_key'),
        'baserow_token': row.get('baserow_token'),
        'n8n_api_key': row.get('n8n_api_key')
    }

def main():
    if len(sys.argv) != 2:
        print("Usage: python dispatch.py <client_name>")
        sys.exit(1)

    client_name = sys.argv[1]

    try:
        settings = get_client_settings(client_name)
    except Exception as e:
        print(f"Error fetching client settings: {e}")
        sys.exit(1)

    # Set environment variables for the agent
    os.environ['GOOGLE_API_KEY'] = settings['gemini_api_key'] or ''
    os.environ['BASEROW_TOKEN'] = settings['baserow_token'] or ''
    os.environ['N8N_API_KEY'] = settings['n8n_api_key'] or ''

    # Set workspace path to the client's folder
    client_workspace = os.path.join(os.path.dirname(__file__), 'clients', client_name)
    os.environ['WORKSPACE_PATH'] = client_workspace

    # Now initialize the GeminiAgent
    try:
        # Import after setting env vars
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'engine'))
        from src.agent import GeminiAgent

        agent = GeminiAgent()
        print(f"GeminiAgent initialized successfully for client: {client_name}")

        # Optionally, you can add code here to run the agent or perform initial tasks

    except Exception as e:
        print(f"Error initializing GeminiAgent: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()