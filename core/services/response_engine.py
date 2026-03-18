import os, json, requests
from pathlib import Path
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def sync_lead_to_baserow(tenant_id, name, details):
    # This sends the data back to your Baserow table
    url = f"{os.getenv('BASEROW_URL')}{os.getenv('BASEROW_TABLE_ID')}/?user_field_names=true"
    headers = {"Authorization": f"Token {os.getenv('BASEROW_TOKEN')}", "Content-Type": "application/json"}
    payload = {
        "Client Name": f"LEAD: {name}",
        "Onboarding Status": "Lead Captured",
        "Notes": details
    }
    requests.post(url, headers=headers, json=payload)

def get_tenant_response(tenant_id, user_query):
    base = Path(f"tenants/{tenant_id}/config")
    with open(base / "identity.json", "r") as f: id_data = json.load(f)
    with open(base / "knowledge_base.txt", "r") as f: kb = f.read()
    
    # Use Llama 3.1 to talk and detect if a lead is present
    chat = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": f"You are {id_data.get('name')}. Context: {kb}. If the user gives their name/phone, end your response with 'SIGNAL_LEAD'"},
            {"role": "user", "content": user_query}
        ]
    )
    response = chat.choices[0].message.content
    
    if "SIGNAL_LEAD" in response:
        sync_lead_to_baserow(tenant_id, "New Web Lead", user_query)
        return response.replace("SIGNAL_LEAD", "(Lead captured in CRM ✅)")
    
    return response

if __name__ == "__main__":
    print(get_tenant_response("showroom_test", "My name is Anton and my number is 555-0199"))
