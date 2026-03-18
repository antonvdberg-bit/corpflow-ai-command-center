import os, requests

def verify_sync():
    url = f"{os.getenv('BASEROW_URL')}{os.getenv('BASEROW_TABLE_ID')}/?user_field_names=true"
    headers = {"Authorization": f"Token {os.getenv('BASEROW_TOKEN')}"}
    
    print("🔍 Checking Baserow for recent leads...")
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        count = data.get('count', 0)
        print(f"✅ Connection Successful! Total Leads in Table: {count}")
        if count > 0:
            last_lead = data['results'][0]
            print(f"📌 Latest Entry: {last_lead.get('Client Name', 'N/A')}")
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    verify_sync()
