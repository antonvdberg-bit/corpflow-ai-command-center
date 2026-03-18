import json

def extract_lead_details(chat_transcript):
    """
    Analyzes the chat to extract structured lead data.
    In production, this is a specialized prompt to Llama-3.1.
    """
    # Simulated extraction logic for the demo
    extracted = {
        "name": "Unknown",
        "service": "General Inquiry",
        "phone": "Not Provided",
        "intent_score": 0
    }
    
    # Basic logic for extraction (AI-powered version is more robust)
    if "Botox" in chat_transcript: extracted["service"] = "Botox"
    if "Hydrafacial" in chat_transcript: extracted["service"] = "Hydrafacial"
    
    return extracted
