import os
from fastapi import FastAPI
from core.services.response_engine import get_tenant_response

app = FastAPI()

@app.get("/api/chat")
def chat(tenant_id: str, message: str):
    # Ensure environment variables are loaded in Vercel
    response = get_tenant_response(tenant_id, message)
    return {"response": response}

@app.get("/api/health")
def health():
    return {"status": "online"}

@app.get("/api/stats")
def stats(tenant_id: str):
    # This would normally pull from Baserow
    # For the demo, we'll return mock data that matches your table
    return {
        "count": 12,
        "leads": [
            {"name": "Sarah J.", "status": "Booking Confirmed"},
            {"name": "Mike R.", "status": "Consultation Inquiry"},
            {"name": "Leila M.", "status": "Lead Captured"}
        ]
    }
