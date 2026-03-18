from fastapi import FastAPI
from core.services.response_engine import get_tenant_response

app = FastAPI()

@app.get("/api/chat")
def chat(tenant_id: str, message: str):
    response = get_tenant_response(tenant_id, message)
    return {"response": response}
