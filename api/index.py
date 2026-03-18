import os
from fastapi import FastAPI
from groq import Groq

app = FastAPI()

# Initialize Groq only if key exists
client = None
if os.getenv("GROQ_API_KEY"):
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@app.get("/api/chat")
async def chat(message: str):
    if not client:
        return {"response": "API Key missing. Please set GROQ_API_KEY in Vercel."}
    
    try:
        completion = client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[
                {"role": "system", "content": "You are the Serenity Wellness Concierge. Be professional, luxury-focused, and helpful."},
                {"role": "user", "content": message}
            ],
        )
        return {"response": completion.choices[0].message.content}
    except Exception as e:
        return {"response": f"System error: {str(e)}"}

# Health check
@app.get("/api/health")
def health():
    return {"status": "operational"}
