import os
import requests
import time
from core.onboarding.onboard_client import setup_client

# --- Configuration ---
BASEROW_TOKEN = os.getenv("BASEROW_TOKEN")
BASEROW_TABLE_ID = os.getenv("BASEROW_TABLE_ID") # The 'Prospects' or 'Clients' table
BASEROW_URL = "https://api.baserow.io/api/database/rows/table/"

def check_for_new_onboarding():
    if not BASEROW_TOKEN or not BASEROW_TABLE_ID:
        print("❌ Error: BASEROW_TOKEN or TABLE_ID missing in .env")
        return

    headers = {"Authorization": f"Token {BASEROW_TOKEN}"}
    # We filter for rows where 'Status' is 'To Onboard'
    # Adjust 'field_status' to match your actual Baserow field name
    params = {"filter__field_status__equal": "To Onboard"} 
    
    try:
        response = requests.get(f"{BASEROW_URL}{BASEROW_TABLE_ID}/", headers=headers, params=params)
        rows = response.json().get("results", [])
        
        for row in rows:
            client_name = row.get("Name")
            phone = row.get("Phone")
            client_id = f"CF_{phone[-4:]}" # Creating a unique ID from phone
            
            print(f"🚀 Found new client: {client_name}. Starting Onboarding...")
            result = setup_client(client_id, client_name)
            print(result)
            
            # TODO: Add logic here to update Baserow status to 'Completed'
            
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    print("📡 Monitoring Baserow for new clients...")
    check_for_new_onboarding()
