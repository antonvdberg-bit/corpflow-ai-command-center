import os
import json
import shutil
from pathlib import Path

def setup_client(client_id, client_name, blueprint_type="receptionist"):
    tenant_dir = Path(f"tenants/{client_id}")
    # Normalize blueprint name to lowercase for folder matching
    b_type = blueprint_type.lower().replace(" ", "_")
    blueprint_dir = Path(f"core/blueprints/{b_type}")
    
    if tenant_dir.exists():
        return f"INFO: Workspace for {client_id} already exists. Skipping..."

    # 1. Create Tenant Structure
    tenant_dir.mkdir(parents=True, exist_ok=True)
    for sub in ["config", "data", "logs"]:
        (tenant_dir / sub).mkdir(exist_ok=True)

    # 2. Inject DNA (Fallback to receptionist if specific blueprint missing)
    source_kb = blueprint_dir / "base_kb.txt"
    if not source_kb.exists():
        print(f"⚠️ Blueprint {b_type} not found. Using default receptionist.")
        source_kb = Path("core/blueprints/receptionist/base_kb.txt")

    shutil.copy(source_kb, tenant_dir / "config/knowledge_base.txt")
    
    # 3. Save Client Metadata
    meta = {"id": client_id, "name": client_name, "service": b_type, "status": "active"}
    with open(tenant_dir / "config/identity.json", "w") as f:
        json.dump(meta, f, indent=4)

    return f"✅ SUCCESS: {client_name} provisioned at tenants/{client_id}"
