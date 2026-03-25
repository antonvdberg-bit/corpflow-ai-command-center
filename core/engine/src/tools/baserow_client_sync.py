"""
Baserow Client Sync Tool

This tool provides functions to synchronize client configurations from the Baserow System_Docs table.
"""

import os
import requests
from typing import Dict, Any, Optional
from pydantic import BaseModel


class ClientConfig(BaseModel):
    """Configuration model for client-specific settings."""
    client_id: str
    n8n_url: str
    mission_statement: str


# Baserow API configuration - Update these with your actual values
BASEROW_BASE_URL = os.getenv("BASEROW_BASE_URL", "https://api.baserow.io/api/")
DATABASE_ID = os.getenv("BASEROW_DATABASE_ID", "")
TABLE_ID = os.getenv("BASEROW_TABLE_ID", "")


def get_client_config(client_id: str) -> Optional[ClientConfig]:
    """
    Fetch client configuration from Baserow System_Docs table.

    Args:
        client_id: The unique identifier for the client.

    Returns:
        ClientConfig object if found, None otherwise.

    Raises:
        ValueError: If BASEROW_TOKEN is not set or API errors occur.
    """
    # To fetch client config, we:
    # 1. Read BASEROW_TOKEN from the environment.
    # 2. Query the System_Docs table for the given client_id.
    # 3. Parse the response and return a ClientConfig.

    token = os.getenv('BASEROW_TOKEN')
    if not token:
        raise ValueError("BASEROW_TOKEN environment variable not set")
    if not DATABASE_ID or not TABLE_ID:
        raise ValueError(
            "BASEROW_DATABASE_ID and BASEROW_TABLE_ID must be configured for Baserow client sync"
        )

    url = f"{BASEROW_BASE_URL}database/{DATABASE_ID}/table/{TABLE_ID}/"
    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json'
    }

    # Query with filter for client_id
    params = {
        'user_field_names': 'true',
        'filter__client_id__equal': client_id
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()
        results = data.get('results', [])

        if not results:
            return None  # Client not found

        # Assuming one row per client
        row = results[0]
        return ClientConfig(
            client_id=client_id,
            n8n_url=row.get('n8n_url', ''),
            mission_statement=row.get('mission_statement', '')
        )

    except requests.RequestException as e:
        raise ValueError(f"Failed to fetch client config from Baserow: {e}")
    except KeyError as e:
        raise ValueError(f"Invalid response structure from Baserow: missing {e}")