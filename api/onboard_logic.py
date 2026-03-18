import os
from pathlib import Path

def provision_new_tenant(client_name, industry_type):
    # Sanitize name for folder
    slug = client_name.lower().replace(" ", "_")
    path = Path(f"tenants/{slug}/config")
    path.mkdir(parents=True, exist_ok=True)
    
    # Clone the "DNA" from the blueprint
    # In a real app, we'd copy from a 'blueprints/' folder
    identity = {
        "name": client_name,
        "service": "AI Concierge",
        "industry": industry_type
    }
    
    with open(path / "identity.json", "w") as f:
        import json
        json.dump(identity, f)
        
    return {"success": True, "tenant_id": slug}

