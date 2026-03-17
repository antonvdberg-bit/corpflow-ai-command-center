import os
import requests
from core.onboarding.onboard_client import setup_client

# Load variables
BASEROW_TOKEN = os.getenv("BASEROW_TOKEN")
BASEROW_TABLE_ID = os.getenv("BASEROW_TABLE_ID")
# Use the custom URL from .env, fallback to cloud if missing
BASEROW_URL = os.getenv("BASEROW_URL", "https://api.baserow.io/api/database/rows/table/")

def sync_from_baserow():
    if not BASEROW_TOKEN or not BASEROW_TABLE_ID:
        print("❌ Error: Missing credentials in .env")
        return

    headers = {"Authorization": f"Token {BASEROW_TOKEN}"}
    
    try:
        print(f"📡 Connecting to {BASEROW_URL}{BASEROW_TABLE_ID}...")
        response = requests.get(f"{BASEROW_URL}{BASEROW_TABLE_ID}/?user_field_names=true", headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Connection Failed ({response.status_code}): {response.text}")
            return

        data = response.json()
        results = data.get("results", [])
        print(f"✅ Connection Successful. Found {len(results)} rows.")

        for row in results:
            if row.get("Onboarding Status") == "To Onboard":
                name = row.get("Client Name", "Unknown")
                phone = str(row.get("Phone Number", "0000"))
                client_id = f"CF_{phone[-4:]}"
                print(f"🛠️ Provisioning {name}...")
                print(setup_client(client_id, name))
                
    except Exception as e:
        print(f"❌ Script Error: {e}")

if __name__ == "__main__":
    sync_from_baserow()
