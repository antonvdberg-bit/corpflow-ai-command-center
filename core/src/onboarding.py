import os
import json
from pathlib import Path
from pydantic import BaseModel

class ClientRegistration(BaseModel):
    client_id: str
    client_name: str
    n8n_base_url: str
    required_modules: list[str]

class OnboardingManager:
    """Handles the creation of new client workspaces and API registration."""

    def __init__(self, base_path: str = "tenants"):
        self.base_path = Path(base_path)

    def create_client_workspace(self, client: ClientRegistration):
        client_dir = self.base_path / client.client_id.lower().replace(" ", "_")

        # 1. Create Folder Structure
        client_dir.mkdir(parents=True, exist_ok=True)
        (client_dir / "overrides").mkdir(exist_ok=True)

        # 2. Generate Client Config (The Identity)
        config = {
            "client_id": client.client_id,
            "name": client.client_name,
            "n8n_url": client.n8n_base_url,
            "active_modules": client.required_modules,
            "status": "provisioning"
        }

        with open(client_dir / "config.json", "w") as f:
            json.dump(config, f, indent=4)

        print(f"✅ Workspace created for {client.client_name} at {client_dir}")
        return client_dir

# --- Usage Example (How you would run it) ---
# manager = OnboardingManager()
# new_client = ClientRegistration(
#     client_id="CF-3",
#     client_name="Future_Client_B",
#     n8n_base_url="https://client-b.n8n.cloud",
#     required_modules=["sentinel", "leads"]
# )
# manager.create_client_workspace(new_client)