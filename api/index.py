import os
from fastapi import FastAPI
from core.services.response_engine import get_tenant_response
# We will import your onboarding logic here

app = FastAPI()

@app.get("/api/chat")
def chat(tenant_id: str, message: str):
    return {"response": get_tenant_response(tenant_id, message)}

@app.get("/api/onboard")
def onboard(name: str, type: str):
    # This is where we trigger the start_onboarding.sh logic
    # For now, we'll simulate success to test the UI
    return {"success": True, "client": name}
