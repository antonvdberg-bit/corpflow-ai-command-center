import os
from fastapi import FastAPI
from groq import Groq

app = FastAPI()

# Initialize Groq
client = None
if os.getenv("GROQ_API_KEY"):
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@app.get("/api/chat")
async def chat(message: str):
    if not client:
        return {"response": "API Key missing. Please set GROQ_API_KEY in Vercel."}
    
    try:
        completion = client.chat.completions.create(
            # Built-in default matches lib/server/groq-client.js (issue #1013).
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "You are the Serenity Wellness Concierge. You are professional, empathetic, and luxury-focused. You assist clients in Mauritius with beauty and wellness inquiries."},
                {"role": "user", "content": message}
            ],
        )
        return {"response": completion.choices[0].message.content}
    except Exception as e:
        return {"response": f"System error: {str(e)}"}

@app.get("/api/health")
def health():
    return {"status": "operational", "model": "openai/gpt-oss-120b"}
