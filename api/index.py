import os, requests
from fastapi import FastAPI
from core.services.response_engine import get_tenant_response

app = FastAPI()

@app.get("/api/chat")
def chat(tenant_id: str, message: str):
    return {"response": get_tenant_response(tenant_id, message)}

@app.get("/api/stats")
def stats(tenant_id: str):
    # This fetches the ACTUAL count from your Baserow Onboarding table
    url = f"{os.getenv('BASEROW_URL')}{os.getenv('BASEROW_TABLE_ID')}/?user_field_names=true"
    headers = {"Authorization": f"Token {os.getenv('BASEROW_TOKEN')}"}
    try:
        res = requests.get(url, headers=headers)
        data = res.json()
        leads = [{"name": r.get('Client Name', 'Inquiry'), "status": "Captured"} for r in data.get('results', [])[:5]]
        return {"count": data.get('count', 0), "leads": leads}
    except:
        return {"count": 0, "leads": []}
