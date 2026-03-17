import os
import json
import shutil
from pathlib import Path

def setup_client(client_id, client_name, blueprint_type="receptionist"):
    tenant_dir = Path(f"tenants/{client_id}")
    blueprint_dir = Path(f"core/blueprints/{blueprint_type}")
    
    if tenant_dir.exists():
        return f"INFO: Client {client_id} already has a workspace."

    # 1. Create Tenant Folders
    tenant_dir.mkdir(parents=True, exist_ok=True)
    (tenant_dir / "config").mkdir(exist_ok=True)
    (tenant_dir / "data").mkdir(exist_ok=True)

    # 2. Inject Blueprint DNA
    if blueprint_dir.exists():
        shutil.copy(blueprint_dir / "base_kb.txt", tenant_dir / "config/knowledge_base.txt")
    
    # 3. Create Client Identity File
    client_meta = {
        "id": client_id,
        "name": client_name,
        "type": blueprint_type,
        "status": "active"
    }
    with open(tenant_dir / "config/identity.json", "w") as f:
        json.dump(client_meta, f, indent=4)

    return f"SUCCESS: {client_name} provisioned in tenants/{client_id}"

if __name__ == "__main__":
    # Test run
    print(setup_client("showroom_test", "CorpFlow Showroom"))
