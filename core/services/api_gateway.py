from fastapi import FastAPI
import uvicorn
import asyncio
from core.services.response_engine import get_tenant_response
from core.maintenance.model_updater import get_best_model

app = FastAPI(title="CorpFlowAI API Gateway")

# Global variable to store the "Fresh" model ID
CURRENT_MODEL = "llama-3.1-8b-instant"

@app.on_event("startup")
async def startup_event():
    global CURRENT_MODEL
    print("🚀 System Booting... Checking for freshest Groq models.")
    CURRENT_MODEL = get_best_model()
    print(f"✅ Using Model: {CURRENT_MODEL}")

@app.get("/chat")
async def chat(tenant_id: str, message: str):
    # Pass the current model to the engine
    response = get_tenant_response(tenant_id, message)
    return {"status": "success", "model_used": CURRENT_MODEL, "response": response}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
