import os
import json
from pathlib import Path

def get_tenant_response(tenant_id, user_query):
    tenant_base = Path(f"tenants/{tenant_id}")
    config_path = tenant_base / "config"
    
    if not tenant_base.exists():
        return "System Error: Tenant not found."

    # 1. Load the Identity & DNA
    with open(config_path / "identity.json", "r") as f:
        identity = json.load(f)
    
    with open(config_path / "knowledge_base.txt", "r") as f:
        knowledge = f.read()

    # 2. Construct the "Living" System Prompt
    system_prompt = f"""
    You are the following AI Worker: {identity['name']}
    Your Specific Persona/Role: {knowledge}
    
    CRITICAL INSTRUCTIONS:
    - Only answer based on the knowledge provided above.
    - If you don't know the answer, politely offer to have a human follow up.
    - Maintain the tone specified in your Persona.
    """

    # 3. Logic for AI Call (Placeholder for now)
    return f"BOT RESPONSE FOR {identity['name']} (Tenant: {tenant_id}): I have received your message: '{user_query}'. I am processing this using my {identity['service']} DNA."

if __name__ == "__main__":
    # Test simulation for our Showroom
    print(get_tenant_response("showroom_test", "What are your opening hours?"))
